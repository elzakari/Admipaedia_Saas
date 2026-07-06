from flask import Blueprint, send_file, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.attachment import Attachment
from app.models.user import User
from app.models.message import Message
from app.models.dashboard import Notification
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.announcement import Announcement
from app.models.student import Student
from app.models.parent import Parent
from app.models.teacher import Teacher
from app.models.tenant import TenantMembership
from app.utils.response import error_response
import os
import logging

logger = logging.getLogger(__name__)

attachments_bp = Blueprint('attachments', __name__)

@attachments_bp.route('/<id>/download', methods=['GET'])
@jwt_required()
def download_attachment(id):
    current_user_id = int(get_jwt_identity())
    
    attachment = Attachment.query.get(id)
    if not attachment:
        # Check if id starts with 'legacy_' (for backward compatibility)
        if id.startswith('legacy_'):
            parts = id.split('_', 2)
            if len(parts) >= 3:
                msg_id = int(parts[1])
                filename = parts[2]
                from app.services.message_service import MessageService
                
                message = MessageService.get_message_by_id(msg_id, current_user_id)
                if not message:
                    return error_response(message="Access denied to legacy attachment", status_code=403)
                
                file_path = MessageService.get_attachment_path(msg_id, filename)
                if not file_path or not os.path.exists(file_path):
                    return error_response(message="Legacy attachment file not found", status_code=404)
                from flask import make_response
                response = make_response(send_file(file_path, download_name=filename))
                response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
        return error_response(message="Attachment not found", status_code=404)
        
    # 1. Authorize: Is current user uploader?
    if attachment.uploader_id == current_user_id:
        pass
    else:
        # 2. Check tenant admin
        is_admin = False
        if attachment.tenant_id:
            membership = TenantMembership.query.filter_by(
                user_id=current_user_id,
                tenant_id=attachment.tenant_id
            ).first()
            if membership and membership.role in ('admin', 'school_admin', 'super_admin'):
                is_admin = True
                
        if not is_admin:
            # 3. Check entity specific authorization
            authorized = False
            entity_type = attachment.entity_type
            entity_id = attachment.entity_id
            
            if entity_type == 'message':
                msg = Message.query.get(entity_id)
                if msg and (msg.sender_id == current_user_id or msg.recipient_id == current_user_id):
                    authorized = True
                    
            elif entity_type == 'notification':
                notif = Notification.query.get(entity_id)
                if notif and notif.recipient_id == current_user_id:
                    authorized = True
                    
            elif entity_type == 'assignment':
                assignment = Assignment.query.get(entity_id)
                if assignment:
                    teacher_profile = Teacher.query.filter_by(user_id=current_user_id).first()
                    if teacher_profile and assignment.teacher_id == teacher_profile.id:
                        authorized = True
                    else:
                        student_profile = Student.query.filter_by(user_id=current_user_id).first()
                        if student_profile and student_profile.class_id == assignment.class_id:
                            authorized = True
                        else:
                            parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
                            if parent_profile:
                                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                                if any(c.class_id == assignment.class_id for c in children):
                                    authorized = True

            elif entity_type == 'assignment_submission':
                submission = AssignmentSubmission.query.get(entity_id)
                if submission and submission.assignment:
                    teacher_profile = Teacher.query.filter_by(user_id=current_user_id).first()
                    if teacher_profile and submission.assignment.teacher_id == teacher_profile.id:
                        authorized = True
                    else:
                        student_profile = Student.query.filter_by(user_id=current_user_id).first()
                        if student_profile and submission.student_id == student_profile.id:
                            authorized = True
                        else:
                            parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
                            if parent_profile:
                                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                                if any(c.id == submission.student_id for c in children):
                                    authorized = True
                                    
            elif entity_type == 'announcement':
                announcement = Announcement.query.get(entity_id)
                if announcement:
                    teacher_profile = Teacher.query.filter_by(user_id=current_user_id).first()
                    if teacher_profile and announcement.teacher_id == teacher_profile.id:
                        authorized = True
                    else:
                        student_profile = Student.query.filter_by(user_id=current_user_id).first()
                        if student_profile and student_profile.class_id == announcement.class_id:
                            authorized = True
                        else:
                            parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
                            if parent_profile:
                                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                                if any(c.class_id == announcement.class_id for c in children):
                                    authorized = True
                                    
            if not authorized:
                return error_response(message="You are not authorized to download this attachment", status_code=403)
                
    full_path = os.path.join(current_app.root_path, attachment.file_path)
    if not os.path.exists(full_path):
        return error_response(message="File not found on server", status_code=404)
        
    from flask import make_response
    response = make_response(send_file(full_path, download_name=attachment.filename))
    response.headers['Content-Disposition'] = f'attachment; filename="{attachment.filename}"'
    return response
