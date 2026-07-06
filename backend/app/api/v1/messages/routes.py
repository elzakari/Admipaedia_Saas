from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from app.api.v1.messages import messages_bp
from app.services.message_service import MessageService
from app.services.enhanced_student_service import EnhancedStudentService
from app.schemas.message import MessageSchema, MessageCreateSchema, MessageUpdateSchema
from app.utils.auth_utils import admin_required, teacher_required, parent_required
from app.utils.rbac_decorators import require_permission, require_role
from app.utils.response import success_response, error_response, paginated_response
from app.utils.tenant_context import tenant_required
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

# Initialize schemas
message_schema = MessageSchema()
messages_schema = MessageSchema(many=True)
message_create_schema = MessageCreateSchema()
message_update_schema = MessageUpdateSchema()

@messages_bp.route('/recipients', methods=['GET'])
@jwt_required()
@tenant_required
def get_recipients():
    """Search/list allowed message recipients based on query parameters and security context."""
    try:
        current_user_id = get_jwt_identity()
        from app.models.user import User
        current_user = User.query.get(current_user_id)
        if not current_user:
            return error_response(message="User not found", status_code=404)
            
        current_role = MessageService._get_user_type(current_user)
        tenant_id = g.tenant_id
        
        type_filter = request.args.get('type')  # parent | student | teacher | admin | class
        search = request.args.get('search')
        class_id = request.args.get('class_id', type=int)
        audience = request.args.get('audience')  # students | parents | all
        
        if not type_filter:
            return error_response(message="Missing required parameter: type", status_code=400)
            
        if type_filter not in ('parent', 'student', 'teacher', 'admin', 'class'):
            return error_response(message="Invalid type parameter", status_code=400)
            
        # Call the scoping function
        results = MessageService.get_allowed_recipient_queries(
            current_user_id=current_user_id,
            current_role=current_role,
            tenant_id=tenant_id,
            type_filter=type_filter,
            search=search,
            class_id=class_id,
            audience=audience
        )
        
        recipients = []
        
        if type_filter == 'class':
            for c in results:
                audiences_to_add = [audience] if audience else ['all', 'students', 'parents']
                for aud in audiences_to_add:
                    if aud == 'all':
                        label = f"{c.name} (All)"
                        sub = f"All students and parents in {c.name}"
                        ref = f"class:{c.id}:all"
                    elif aud == 'students':
                        label = f"{c.name} (Students)"
                        sub = f"All students in {c.name}"
                        ref = f"class:{c.id}:students"
                    elif aud == 'parents':
                        label = f"{c.name} (Parents)"
                        sub = f"All parents in {c.name}"
                        ref = f"class:{c.id}:parents"
                    else:
                        continue
                        
                    recipients.append({
                        "ref": ref,
                        "recipient_type": "class",
                        "label": label,
                        "subtitle": sub,
                        "avatar_initials": "C"
                    })
                    
        elif type_filter == 'student':
            for s in results:
                class_name = s.class_.name if s.class_ else "No Class"
                recipients.append({
                    "ref": f"student:{s.id}",
                    "recipient_type": "student",
                    "label": f"{s.first_name} {s.last_name}",
                    "subtitle": f"Student in class {class_name} ({s.admission_number})",
                    "user_id": s.user_id,
                    "participant_avatar": EnhancedStudentService.build_profile_picture_url(s.profile_picture),
                    "avatar_initials": f"{s.first_name[0] if s.first_name else ''}{s.last_name[0] if s.last_name else ''}".upper() or "S"
                })
                
        elif type_filter == 'parent':
            for p in results:
                display_name = MessageService.get_parent_display_name(p)
                child_names = [f"{c.first_name} {c.last_name}" for c in p.children]
                subtitle = f"Parent of {', '.join(child_names)}" if child_names else "Parent"
                recipients.append({
                    "ref": f"parent:{p.id}",
                    "recipient_type": "parent",
                    "label": display_name,
                    "subtitle": subtitle,
                    "user_id": p.user_id,
                    "participant_avatar": getattr(getattr(getattr(p, 'user', None), 'profile', None), 'avatar_url', None),
                    "avatar_initials": f"{display_name[0] if display_name else ''}".upper() or "P"
                })
                
        elif type_filter == 'teacher':
            for t in results:
                recipients.append({
                    "ref": f"teacher:{t.id}",
                    "recipient_type": "teacher",
                    "label": f"{t.first_name} {t.last_name}",
                    "subtitle": f"Teacher - {t.specialization or 'General'}",
                    "user_id": t.user_id,
                    "participant_avatar": getattr(getattr(getattr(t, 'user', None), 'profile', None), 'avatar_url', None),
                    "avatar_initials": f"{t.first_name[0] if t.first_name else ''}{t.last_name[0] if t.last_name else ''}".upper() or "T"
                })
                
        elif type_filter == 'admin':
            for u in results:
                display_name = MessageService.get_user_display_name(u)
                recipients.append({
                    "ref": f"user:{u.id}",
                    "recipient_type": "admin",
                    "label": display_name,
                    "subtitle": f"Administrator ({u.email})",
                    "user_id": u.id,
                    "participant_avatar": getattr(getattr(u, 'profile', None), 'avatar_url', None),
                    "avatar_initials": f"{display_name[0] if display_name else ''}".upper() or "A"
                })
                
        return success_response(
            data={"recipients": recipients},
            message="Recipients retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error in get_recipients: {str(e)}")
        return error_response(message="Failed to retrieve recipients", status_code=500)

@messages_bp.route('', methods=['GET'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def get_messages():
    """Get messages with pagination and filtering"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        folder = request.args.get('folder', 'inbox')  # inbox, sent, trash
        is_read = request.args.get('is_read', type=bool)
        
        # Get messages from service
        messages, total = MessageService.get_user_messages(
            user_id=current_user_id,
            folder=folder,
            is_read=is_read,
            page=page,
            per_page=per_page,
            tenant_id=g.tenant_id,
        )
        
        return paginated_response(
            data=messages_schema.dump(messages),
            page=page,
            per_page=per_page,
            total=total,
            message="Messages retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving messages: {str(e)}")
        return error_response(message="Failed to retrieve messages", status_code=500)

@messages_bp.route('/<int:message_id>', methods=['GET'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def get_message(message_id):
    """Get a specific message by ID"""
    try:
        current_user_id = get_jwt_identity()
        
        message = MessageService.get_message_by_id(message_id, current_user_id, tenant_id=g.tenant_id)
        if not message:
            return error_response(message="Message not found", status_code=404)
        
        # Mark as read if it's the recipient viewing
        if message.recipient_id == current_user_id and not message.is_read:
            MessageService.mark_as_read(message_id)
            message.is_read = True
        
        return success_response(
            data=message_schema.dump(message),
            message="Message retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving message {message_id}: {str(e)}")
        return error_response(message="Failed to retrieve message", status_code=500)

@messages_bp.route('', methods=['POST'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def create_message():
    """Create a new message"""
    try:
        current_user_id = get_jwt_identity()
        
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            # Handle file attachments
            attachments = request.files.getlist('attachments')
            if attachments:
                data['attachments'] = attachments
        
        # Validate input
        try:
            validated_data = message_create_schema.load(data)
        except ValidationError as err:
            return error_response(message="Validation error", errors=err.messages, status_code=400)
        
        # Add sender information
        validated_data['sender_id'] = current_user_id
        
        # Create message
        message = MessageService.create_message(validated_data, tenant_id=g.tenant_id)
        
        return success_response(
            data=message_schema.dump(message),
            message="Message sent successfully",
            status_code=201
        )
    except ValueError as val_err:
        logger.error(f"Validation error in create_message: {str(val_err)}")
        return error_response(message=str(val_err), status_code=400)
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}")
        return error_response(message="Failed to send message", status_code=500)

@messages_bp.route('/send', methods=['POST'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def send_message_http():
    """Send a message via HTTP POST, committing to DB first and then emitting realtime event."""
    try:
        current_user_id = get_jwt_identity()
        
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            # Handle file attachments
            attachments = request.files.getlist('attachments')
            if attachments:
                data['attachments'] = attachments
        
        # Validate input
        try:
            validated_data = message_create_schema.load(data)
        except ValidationError as err:
            return error_response(message="Validation error", errors=err.messages, status_code=400)
        
        # Add sender information
        validated_data['sender_id'] = current_user_id
        
        # Create message (commits to DB inside MessageService.create_message)
        message = MessageService.create_message(validated_data, tenant_id=g.tenant_id)
        
        return success_response(
            data=message_schema.dump(message),
            message="Message sent successfully",
            status_code=201
        )
    except ValueError as val_err:
        logger.error(f"Validation error in send_message_http: {str(val_err)}")
        return error_response(message=str(val_err), status_code=400)
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return error_response(message="Failed to send message", status_code=500)

@messages_bp.route('/bulk', methods=['POST'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def create_bulk_message():
    """Create bulk messages to multiple recipients"""
    try:
        current_user_id = get_jwt_identity()
        
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            # Convert recipient_ids from string to list
            if 'recipient_ids' in data:
                data['recipient_ids'] = data['recipient_ids'].split(',')
            # Handle file attachments
            attachments = request.files.getlist('attachments')
            if attachments:
                data['attachments'] = attachments
        
        # Add sender information
        data['sender_id'] = current_user_id
        
        # Create bulk messages
        count = MessageService.create_bulk_message(data, tenant_id=g.tenant_id)
        
        return success_response(
            data={'count': count},
            message=f"Messages sent to {count} recipients successfully",
            status_code=201
        )
    except ValueError as val_err:
        logger.error(f"Validation error in create_bulk_message: {str(val_err)}")
        return error_response(message=str(val_err), status_code=400)
    except Exception as e:
        logger.error(f"Error creating bulk message: {str(e)}")
        return error_response(message="Failed to send bulk message", status_code=500)

@messages_bp.route('/<int:message_id>', methods=['PUT'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def update_message(message_id):
    """Update a message (mainly for marking as read/unread)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate input
        try:
            validated_data = message_update_schema.load(data)
        except ValidationError as err:
            return error_response(message="Validation error", errors=err.messages, status_code=400)
        
        # Update message
        message = MessageService.update_message(message_id, current_user_id, validated_data, tenant_id=g.tenant_id)
        if not message:
            return error_response(message="Message not found or access denied", status_code=404)
        
        return success_response(
            data=message_schema.dump(message),
            message="Message updated successfully"
        )
    except Exception as e:
        logger.error(f"Error updating message {message_id}: {str(e)}")
        return error_response(message="Failed to update message", status_code=500)

@messages_bp.route('/<int:message_id>', methods=['DELETE'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def delete_message(message_id):
    """Delete a message (move to trash or permanent delete)"""
    try:
        current_user_id = get_jwt_identity()
        permanent = request.args.get('permanent', 'false').lower() == 'true'
        
        success = MessageService.delete_message(message_id, current_user_id, permanent, tenant_id=g.tenant_id)
        if not success:
            return error_response(message="Message not found or access denied", status_code=404)
        
        action = "permanently deleted" if permanent else "moved to trash"
        return success_response(message=f"Message {action} successfully")
    except Exception as e:
        logger.error(f"Error deleting message {message_id}: {str(e)}")
        return error_response(message="Failed to delete message", status_code=500)

@messages_bp.route('/<int:message_id>/attachments/<attachment_name>', methods=['GET'])
@jwt_required()
@tenant_required
@require_role(['admin', 'teacher', 'student', 'parent', 'user'])
def download_attachment(message_id, attachment_name):
    """Download a message attachment"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this message
        message = MessageService.get_message_by_id(message_id, current_user_id, tenant_id=g.tenant_id)
        if not message:
            return error_response(message="Message not found or access denied", status_code=404)
        
        # Download attachment
        file_path = MessageService.get_attachment_path(message_id, attachment_name)
        if not file_path:
            return error_response(message="Attachment not found", status_code=404)
        
        from flask import send_file
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        logger.error(f"Error downloading attachment: {str(e)}")
        return error_response(message="Failed to download attachment", status_code=500)

# Error handlers
@messages_bp.errorhandler(404)
def not_found(error):
    return error_response(message="Message endpoint not found", status_code=404)

@messages_bp.errorhandler(500)
def internal_error(error):
    return error_response(message="Internal server error in messages", status_code=500)
