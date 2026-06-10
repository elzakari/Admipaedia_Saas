from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from app.models.message import Message

class MessageSchema(Schema):
    id = fields.Integer(dump_only=True)
    sender_id = fields.Integer(required=True)
    sender_type = fields.String(dump_only=True)
    recipient_id = fields.Integer(required=True)
    recipient_type = fields.String(
        required=True,
        validate=validate.OneOf(['admin', 'teacher', 'student', 'parent', 'class', 'user'])
    )
    subject = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True, validate=validate.Length(min=1))
    is_read = fields.Boolean(dump_only=True)
    attachments = fields.Method("get_attachments_info")
    sender = fields.Method("get_sender_info")
    recipient = fields.Method("get_recipient_info")
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    def get_sender_info(self, obj):
        from app.services.message_service import MessageService
        from app.models.user import User
        user = User.query.get(obj.sender_id)
        if not user:
            return None
        return {
            'id': user.id,
            'username': user.username,
            'role': MessageService._get_user_type(user),
            'display_name': MessageService.get_user_display_name(user)
        }

    def get_recipient_info(self, obj):
        from app.services.message_service import MessageService
        from app.models.user import User
        user = User.query.get(obj.recipient_id)
        if not user:
            return None
        return {
            'id': user.id,
            'username': user.username,
            'role': MessageService._get_user_type(user),
            'display_name': MessageService.get_user_display_name(user)
        }

    def get_attachments_info(self, obj):
        from app.models.attachment import Attachment
        db_attachments = Attachment.query.filter_by(entity_type='message', entity_id=str(obj.id)).all()
        if db_attachments:
            return [att.to_dict() for att in db_attachments]
        if obj.attachments:
            fallback = []
            for path in obj.attachments:
                att_record = Attachment.query.filter_by(file_path=path).first()
                if att_record:
                    fallback.append(att_record.to_dict())
                else:
                    filename = path.replace('\\', '/').split('/')[-1]
                    fallback.append({
                        'id': f"legacy_{obj.id}_{filename}",
                        'filename': filename,
                        'size': None,
                        'mime_type': None,
                        'download_url': f'/api/v1/messages/{obj.id}/attachments/{filename}'
                    })
            return fallback
        return []


class MessageCreateSchema(Schema):
    recipient_id = fields.Integer(required=False)
    recipient_type = fields.String(
        required=False,
        validate=validate.OneOf(['admin', 'teacher', 'student', 'parent', 'class', 'user'])
    )
    recipient_ref = fields.String(required=False)
    subject = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True, validate=validate.Length(min=1))
    attachments = fields.Raw(missing=None)  # Handle file uploads

    @validates_schema
    def validate_recipient(self, data, **kwargs):
        if not data.get('recipient_ref') and (not data.get('recipient_id') or not data.get('recipient_type')):
            raise ValidationError("Either recipient_ref or recipient_id + recipient_type must be provided.")

class MessageUpdateSchema(Schema):
    is_read = fields.Boolean()
    
    @validates_schema
    def validate_update_data(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one field must be provided for update")

class BulkMessageCreateSchema(Schema):
    recipient_ids = fields.List(fields.Integer(), required=True, validate=validate.Length(min=1))
    recipient_type = fields.String(
        required=True,
        validate=validate.OneOf(['admin', 'teacher', 'student', 'parent', 'user'])
    )
    subject = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True, validate=validate.Length(min=1))
    attachments = fields.Raw(missing=None)  # Handle file uploads