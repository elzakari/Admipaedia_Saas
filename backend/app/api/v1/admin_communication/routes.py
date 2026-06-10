from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.auth_utils import admin_required
from app.utils.tenant_context import tenant_required
from app.extensions import db
from app.models.user import User
from app.models.message import Message
from app.models.dashboard import Notification
from app.models.announcement import Announcement
from app.models.attachment import Attachment
from app.services.message_service import MessageService
import os
import logging

logger = logging.getLogger(__name__)

admin_comm_bp = Blueprint('admin_communication', __name__)

def resolve_audience(tenant_id, recipient_type, recipient_id, audience_scope=None):
    from app.models.user import User
    from app.models.student import Student
    from app.models.parent import Parent
    from app.models.teacher import Teacher
    from app.models.tenant import TenantMembership
    from app.models.class_ import Class, ClassTeacherMapping
    
    user_ids = set()
    
    if recipient_type == 'individual':
        user = User.query.get(int(recipient_id))
        if user:
            user_ids.add(user.id)
            
    elif recipient_type == 'role':
        role_name = str(recipient_id).lower()
        memberships = TenantMembership.query.filter_by(tenant_id=tenant_id).all()
        for m in memberships:
            user = User.query.get(m.user_id)
            if user:
                user_role = MessageService._get_user_type(user)
                if user_role == role_name:
                    user_ids.add(user.id)
                    
    elif recipient_type == 'class':
        class_id = int(recipient_id)
        students = Student.query.filter_by(tenant_id=tenant_id, class_id=class_id).all()
        scope = audience_scope or 'students'
        
        if scope in ('students', 'students+parents'):
            for s in students:
                if s.user_id:
                    user_ids.add(s.user_id)
                    
        if scope in ('parents', 'students+parents'):
            for s in students:
                if s.parent_id:
                    parent = Parent.query.get(s.parent_id)
                    if parent and parent.user_id:
                        user_ids.add(parent.user_id)
                        
        if scope == 'class_teachers':
            cls = Class.query.filter_by(tenant_id=tenant_id, id=class_id).first()
            if cls and cls.teacher_id:
                teacher = Teacher.query.get(cls.teacher_id)
                if teacher and teacher.user_id:
                    user_ids.add(teacher.user_id)
            mappings = ClassTeacherMapping.query.filter_by(class_id=class_id).all()
            for m in mappings:
                user_exists = User.query.get(m.teacher_id) is not None
                if user_exists:
                    user_ids.add(m.teacher_id)
                else:
                    teacher = Teacher.query.get(m.teacher_id)
                    if teacher and teacher.user_id:
                        user_ids.add(teacher.user_id)
                        
    elif recipient_type == 'school':
        scope = audience_scope or 'all'
        
        if scope in ('teachers', 'all'):
            teachers = Teacher.query.filter_by(tenant_id=tenant_id).all()
            for t in teachers:
                if t.user_id:
                    user_ids.add(t.user_id)
                    
        if scope in ('students', 'all'):
            students = Student.query.filter_by(tenant_id=tenant_id).all()
            for s in students:
                if s.user_id:
                    user_ids.add(s.user_id)
                    
        if scope in ('parents', 'all'):
            parents = Parent.query.filter_by(tenant_id=tenant_id).all()
            for p in parents:
                if p.user_id:
                    user_ids.add(p.user_id)
                    
        if scope in ('admins', 'all'):
            memberships = TenantMembership.query.filter_by(tenant_id=tenant_id).all()
            for m in memberships:
                if m.role in ('admin', 'school_admin', 'super_admin'):
                    user_ids.add(m.user_id)

    active_user_ids = []
    for uid in user_ids:
        user = User.query.get(uid)
        if user:
            active_user_ids.append(user.id)
            
    return active_user_ids

@admin_comm_bp.route('/communicate', methods=['POST'])
@jwt_required()
@admin_required
@tenant_required
def admin_communicate():
    current_user_id = int(get_jwt_identity())
    tenant_id = g.tenant_id
    
    if request.is_json:
        data = request.get_json()
        files = []
    else:
        data = request.form.to_dict()
        files = request.files.getlist('attachments')
        
    comm_type = data.get('comm_type')
    recipient_type = data.get('recipient_type')
    recipient_id = data.get('recipient_id')
    audience_scope = data.get('audience_scope')
    
    subject = data.get('subject', 'Admin Communication')
    content = data.get('content', '')
    
    if not comm_type or not recipient_type or not recipient_id or not content:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
    recipient_user_ids = resolve_audience(tenant_id, recipient_type, recipient_id, audience_scope)
    
    if not recipient_user_ids:
        return jsonify({
            'success': False, 
            'message': 'No valid recipients resolved for the target audience.'
        }), 400
        
    attachment_paths = []
    if files:
        attachment_paths = MessageService._save_attachments(files)
        
    delivered_count = 0
    failed_count = 0
    total_recipients = len(recipient_user_ids)
    
    try:
        sender = User.query.get(current_user_id)
        sender_type = MessageService._get_user_type(sender)
        
        created_entities = []
        
        if comm_type == 'direct_message':
            for r_id in recipient_user_ids:
                try:
                    if not MessageService.validate_sender_recipient_relation(current_user_id, r_id):
                        failed_count += 1
                        continue
                    
                    msg = Message(
                        sender_id=current_user_id,
                        sender_type=sender_type,
                        recipient_id=r_id,
                        recipient_type=MessageService._get_user_type(User.query.get(r_id)),
                        subject=subject,
                        content=content,
                        attachments=attachment_paths if attachment_paths else None
                    )
                    db.session.add(msg)
                    db.session.flush()  # Populates msg.id
                    created_entities.append(('message', msg, r_id))
                    delivered_count += 1
                except Exception as inner_err:
                    logger.error(f"Failed to create DM for user {r_id}: {str(inner_err)}")
                    failed_count += 1
                    
        elif comm_type == 'broadcast_notification':
            for r_id in recipient_user_ids:
                try:
                    notif = Notification(
                        title=subject,
                        message=content,
                        type='info',
                        user_id=current_user_id,
                        recipient_id=r_id,
                        scope=audience_scope or 'all'
                    )
                    db.session.add(notif)
                    db.session.flush()
                    created_entities.append(('notification', notif, r_id))
                    delivered_count += 1
                except Exception as inner_err:
                    logger.error(f"Failed to create notification for user {r_id}: {str(inner_err)}")
                    failed_count += 1
                    
        elif comm_type == 'announcement':
            class_id = int(recipient_id) if recipient_type == 'class' else None
            classes_to_announce = [class_id] if class_id else []
            if not classes_to_announce:
                from app.models.class_ import Class
                classes_to_announce = [c.id for c in Class.query.filter_by(tenant_id=tenant_id).all()]
                
            for c_id in classes_to_announce:
                try:
                    ann = Announcement(
                        title=subject,
                        content=content,
                        recipients=audience_scope or 'all',
                        class_id=c_id,
                        teacher_id=None
                    )
                    db.session.add(ann)
                    db.session.flush()
                    created_entities.append(('announcement', ann, None))
                    delivered_count += 1
                except Exception as inner_err:
                    logger.error(f"Failed to create announcement for class {c_id}: {str(inner_err)}")
                    failed_count += 1
                    
        db.session.commit()
        
        # Save attachment metadata
        if attachment_paths and created_entities:
            for file_path in attachment_paths:
                filename = os.path.basename(file_path).split('_', 1)[-1] if '_' in os.path.basename(file_path) else os.path.basename(file_path)
                for ent_type, entity, r_id in created_entities:
                    att = Attachment(
                        filename=filename,
                        file_path=file_path,
                        uploader_id=current_user_id,
                        tenant_id=tenant_id,
                        entity_type=ent_type,
                        entity_id=str(entity.id)
                    )
                    db.session.add(att)
            db.session.commit()
            
        # Real-time websocket notifications (non-blocking)
        try:
            from app.extensions import socketio
            from app.schemas.message import MessageSchema
            schema = MessageSchema()
            
            for ent_type, entity, r_id in created_entities:
                if ent_type == 'message':
                    msg_data = schema.dump(entity)
                    socketio.emit('new_message', msg_data, room=f"user_{r_id}", namespace='/messages')
                elif ent_type == 'notification':
                    notif_data = {
                        'id': entity.id,
                        'title': entity.title,
                        'message': entity.message,
                        'time': entity.time.isoformat() if entity.time else '',
                        'read': entity.read,
                        'type': entity.type
                    }
                    socketio.emit('new_notification', notif_data, room=f"user_{r_id}", namespace='/notifications')
        except Exception as socket_err:
            logger.warning(f"Socket emit failed after commit: {str(socket_err)}")
            
        return jsonify({
            'success': True,
            'delivery_summary': {
                'total_recipients': total_recipients,
                'delivered_count': delivered_count,
                'failed_count': failed_count
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in admin_communicate: {str(e)}")
        return jsonify({'success': False, 'message': f"Failed to send communication: {str(e)}"}), 500
