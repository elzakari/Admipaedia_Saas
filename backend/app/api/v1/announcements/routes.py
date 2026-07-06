# Create announcements routes
from flask import request, jsonify, current_app
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.announcements import announcements_bp
from app.services.announcement_service import AnnouncementService
from app.utils.auth_utils import teacher_required
from app.utils.tenant_context import resolve_tenant_for_request
from marshmallow import ValidationError
from app.models.user import User
from app.models.teacher import Teacher
from app.models.class_ import Class as ClassModel
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
        scope = AnnouncementService.normalize_scope(data.get('scope'))
        class_id = data.get('class_id') if scope == 'class_bound' else None
        send_email = bool(data.get('send_email', False))

        if not title or not content:
            return jsonify({'success': False, 'message': 'title and content are required'}), 400
        if scope == 'class_bound' and not class_id:
            return jsonify({'success': False, 'message': 'class_id is required when scope is class_bound'}), 400

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
            target_roles = [str(x).strip().lower() for x in target_roles_raw if str(x).strip()]
        elif isinstance(target_roles_raw, str) and target_roles_raw.strip():
            target_roles = [item.strip().lower() for item in target_roles_raw.split(',') if item.strip()]
        else:
            target_roles = ['all']

        tenant_id, request_user, tenant_error = resolve_tenant_for_request(require_explicit=False)
        if tenant_error and scope == 'global':
            return jsonify({'success': False, 'message': tenant_error}), 403

        tenant_id = AnnouncementService.normalize_tenant_id(tenant_id)
        if scope == 'class_bound' and class_id:
            class_obj = ClassModel.query.get(class_id)
            if not class_obj:
                return jsonify({'success': False, 'message': 'Class not found'}), 404
            class_tenant_id = AnnouncementService.normalize_tenant_id(getattr(class_obj, 'tenant_id', None))
            if tenant_id and class_tenant_id and tenant_id != class_tenant_id:
                return jsonify({'success': False, 'message': 'Selected class is outside the active tenant context'}), 403
            tenant_id = class_tenant_id

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

            if scope == 'class_bound':
                from app.services.identity_resolver import IdentityResolver
                is_assigned = IdentityResolver.can_user_access_class(user_id, class_id)
                current_app.logger.info(f"Announcement permission check: user_id={user_id}, teacher_id={teacher.id}, class_id={class_id}, is_assigned={is_assigned}")
                if not is_assigned:
                    return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

        if teacher_id is None:
            try:
                class_obj = ClassModel.query.get(class_id) if class_id else None
                teacher_id = getattr(class_obj, 'teacher_id', None)
            except Exception:
                teacher_id = None

        announcement_data = {
            'title': title,
            'content': content,
            'scope': scope,
            'tenant_id': tenant_id,
            'class_id': class_id,
            'teacher_id': teacher_id,
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
        tenant_id, _, tenant_error = resolve_tenant_for_request(require_explicit=False)
        if tenant_error:
            tenant_id = None
        
        announcements, total = AnnouncementService.get_announcements_for_user(
            user_id=user_id,
            page=page,
            per_page=per_page,
            tenant_id=tenant_id,
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
        for key in ('title', 'content', 'send_email', 'is_published', 'target_roles', 'scheduled_date', 'scope', 'class_id'):
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
                updates['target_roles'] = [str(x).strip().lower() for x in tr if str(x).strip()]
            elif isinstance(tr, str):
                updates['target_roles'] = [item.strip().lower() for item in tr.split(',') if item.strip()]
            else:
                updates['target_roles'] = ['all']

        if 'scope' in updates:
            updates['scope'] = AnnouncementService.normalize_scope(updates.get('scope'))

        if updates.get('scope') == 'global':
            updates['class_id'] = None

        tenant_id, _, tenant_error = resolve_tenant_for_request(require_explicit=False)
        if tenant_error:
            tenant_id = None
        if tenant_id:
            updates['tenant_id'] = AnnouncementService.normalize_tenant_id(tenant_id)

        if user.role in ('admin', 'super_admin', 'superadmin', 'super_manager'):
            announcement, err = AnnouncementService.update_announcement_admin(announcement_id, updates)
        else:
            announcement = AnnouncementService.get_announcement_by_id(announcement_id)
            if not announcement:
                return jsonify({'success': False, 'message': 'Announcement not found'}), 404

            from app.services.identity_resolver import IdentityResolver
            is_assigned = IdentityResolver.can_user_access_class(user_id, announcement.class_id)
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

            from app.services.identity_resolver import IdentityResolver
            is_assigned = IdentityResolver.can_user_access_class(user_id, announcement.class_id)
            if not is_assigned:
                return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

            ok, err = AnnouncementService.delete_announcement(announcement_id, announcement.class_id, teacher.id)

        if err:
            return jsonify({'success': False, 'message': err}), 400
        return jsonify({'success': True}), 200

    except Exception as e:
        current_app.logger.error(f"Error deleting announcement: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete announcement'}), 500
