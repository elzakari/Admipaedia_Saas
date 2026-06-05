# Create announcements routes
from flask import request, jsonify, current_app
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.announcements import announcements_bp
from app.services.announcement_service import AnnouncementService
from app.utils.auth_utils import teacher_required
from marshmallow import ValidationError
from app.models.user import User
from app.models.teacher import Teacher
from datetime import datetime

@announcements_bp.route('', methods=['POST'])
@jwt_required()
@teacher_required
def create_announcement():
    """Create a new announcement."""
    try:
        data = request.get_json() or {}

        title = (data.get('title') or '').strip()
        content = (data.get('content') or '').strip()
        class_id = data.get('class_id')
        recipients = (data.get('recipients') or 'all').strip().lower()
        send_email = bool(data.get('send_email', False))

        if not title or not content or not class_id:
            return jsonify({'success': False, 'message': 'title, content and class_id are required'}), 400

        if recipients not in ('all', 'students', 'parents', 'teachers', 'admins'):
            recipients = 'all'

        scheduled_date = None
        scheduled_date_raw = data.get('scheduled_date')
        if scheduled_date_raw:
            try:
                scheduled_date = datetime.fromisoformat(str(scheduled_date_raw).replace('Z', '+00:00')).replace(tzinfo=None)
            except Exception:
                scheduled_date = None

        target_roles = None
        target_roles_raw = data.get('target_roles')
        if isinstance(target_roles_raw, list):
            target_roles = ','.join([str(x).strip().lower() for x in target_roles_raw if str(x).strip()])
        elif isinstance(target_roles_raw, str) and target_roles_raw.strip():
            target_roles = target_roles_raw.strip().lower()

        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        teacher_id = None
        if user.role == 'teacher':
            teacher = Teacher.query.filter_by(user_id=user_id).first()
            if not teacher:
                return jsonify({'success': False, 'message': 'Teacher record not found'}), 403
            teacher_id = teacher.id

            from app.models.class_ import ClassTeacherMapping
            is_assigned = ClassTeacherMapping.query.filter_by(class_id=class_id, teacher_id=teacher.id).first() is not None
            current_app.logger.info(f"Announcement permission check: user_id={user_id}, teacher_id={teacher.id}, class_id={class_id}, is_assigned={is_assigned}")
            if not is_assigned:
                return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

        if teacher_id is None:
            try:
                from app.models.class_ import Class as ClassModel
                class_obj = ClassModel.query.get(class_id)
                teacher_id = getattr(class_obj, 'teacher_id', None)
            except Exception:
                teacher_id = None

        announcement_data = {
            'title': title,
            'content': content,
            'class_id': class_id,
            'teacher_id': teacher_id,
            'recipients': recipients,
            'send_email': send_email,
            'scheduled_date': scheduled_date,
            'target_roles': target_roles,
            'is_published': bool(data.get('is_published', True))
        }

        announcement, error = AnnouncementService.create_announcement(announcement_data)
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        from app.schemas.announcement import AnnouncementSchema
        announcement_schema = AnnouncementSchema()

        return jsonify({
            'success': True,
            'message': 'Announcement created successfully',
            'announcement': announcement_schema.dump(announcement)
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating announcement: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create announcement'
        }), 500

@announcements_bp.route('', methods=['GET'])
@jwt_required()
def get_announcements():
    """Get announcements for the current user."""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        announcements, total = AnnouncementService.get_announcements_for_user(
            user_id=user_id,
            page=page,
            per_page=per_page
        )
        
        return jsonify({
            'success': True,
            'announcements': announcements,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching announcements: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch announcements'
        }), 500


@announcements_bp.route('/<int:announcement_id>', methods=['PUT'])
@jwt_required()
@teacher_required
def update_announcement(announcement_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        teacher = None
        if user.role not in ('admin', 'super_admin', 'superadmin', 'super_manager'):
            teacher = Teacher.query.filter_by(user_id=user_id).first()
            if not teacher:
                return jsonify({'success': False, 'message': 'Teacher record not found'}), 403

        data = request.get_json() or {}
        updates = {}
        for key in ('title', 'content', 'recipients', 'send_email', 'is_published', 'target_roles', 'scheduled_date'):
            if key in data:
                updates[key] = data.get(key)

        if 'title' in updates:
            updates['title'] = (updates['title'] or '').strip()
            if not updates['title']:
                return jsonify({'success': False, 'message': 'title cannot be empty'}), 400
        if 'content' in updates:
            updates['content'] = (updates['content'] or '').strip()
            if not updates['content']:
                return jsonify({'success': False, 'message': 'content cannot be empty'}), 400

        if 'recipients' in updates:
            r = (updates['recipients'] or 'all').strip().lower()
            if r not in ('all', 'students', 'parents', 'teachers', 'admins'):
                return jsonify({'success': False, 'message': 'Invalid recipients'}), 400
            updates['recipients'] = r

        if 'scheduled_date' in updates:
            raw = updates['scheduled_date']
            if raw:
                try:
                    updates['scheduled_date'] = datetime.fromisoformat(str(raw).replace('Z', '+00:00')).replace(tzinfo=None)
                except Exception:
                    return jsonify({'success': False, 'message': 'Invalid scheduled_date'}), 400
            else:
                updates['scheduled_date'] = None

        if 'target_roles' in updates:
            tr = updates['target_roles']
            if isinstance(tr, list):
                updates['target_roles'] = ','.join([str(x).strip().lower() for x in tr if str(x).strip()])
            elif isinstance(tr, str):
                updates['target_roles'] = tr.strip().lower() if tr.strip() else None
            else:
                updates['target_roles'] = None

        if user.role in ('admin', 'super_admin', 'superadmin', 'super_manager'):
            announcement, err = AnnouncementService.update_announcement_admin(announcement_id, updates)
        else:
            announcement = AnnouncementService.get_announcement_by_id(announcement_id)
            if not announcement:
                return jsonify({'success': False, 'message': 'Announcement not found'}), 404

            from app.models.class_ import ClassTeacherMapping
            is_assigned = ClassTeacherMapping.query.filter_by(class_id=announcement.class_id, teacher_id=teacher.id).first() is not None
            if not is_assigned:
                return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

            announcement, err = AnnouncementService.update_announcement(announcement_id, updates, announcement.class_id, teacher.id)

        if err:
            return jsonify({'success': False, 'message': err}), 400

        from app.schemas.announcement import AnnouncementSchema
        return jsonify({'success': True, 'announcement': AnnouncementSchema().dump(announcement)}), 200

    except Exception as e:
        current_app.logger.error(f"Error updating announcement: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update announcement'}), 500


@announcements_bp.route('/<int:announcement_id>', methods=['DELETE'])
@jwt_required()
@teacher_required
def delete_announcement(announcement_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        teacher = None
        if user.role not in ('admin', 'super_admin', 'superadmin', 'super_manager'):
            teacher = Teacher.query.filter_by(user_id=user_id).first()
            if not teacher:
                return jsonify({'success': False, 'message': 'Teacher record not found'}), 403

        if user.role in ('admin', 'super_admin', 'superadmin', 'super_manager'):
            ok, err = AnnouncementService.delete_announcement_admin(announcement_id)
        else:
            announcement = AnnouncementService.get_announcement_by_id(announcement_id)
            if not announcement:
                return jsonify({'success': False, 'message': 'Announcement not found'}), 404

            from app.models.class_ import ClassTeacherMapping
            is_assigned = ClassTeacherMapping.query.filter_by(class_id=announcement.class_id, teacher_id=teacher.id).first() is not None
            if not is_assigned:
                return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

            ok, err = AnnouncementService.delete_announcement(announcement_id, announcement.class_id, teacher.id)

        if err:
            return jsonify({'success': False, 'message': err}), 400
        return jsonify({'success': True}), 200

    except Exception as e:
        current_app.logger.error(f"Error deleting announcement: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete announcement'}), 500
