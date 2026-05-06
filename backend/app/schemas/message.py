from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from app.models.message import Message

class MessageSchema(Schema):
    id = fields.Integer(dump_only=True)
    sender_id = fields.Integer(required=True)
    sender_type = fields.String(dump_only=True)
    recipient_id = fields.Integer(required=True)
    recipient_type = fields.String(
        required=True,
        validate=validate.OneOf(['admin', 'teacher', 'student', 'parent', 'class'])
    )
    subject = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True, validate=validate.Length(min=1))
    is_read = fields.Boolean(dump_only=True)
    attachments = fields.List(fields.String(), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class MessageCreateSchema(Schema):
    recipient_id = fields.Integer(required=True)
    recipient_type = fields.String(
        required=True,
        validate=validate.OneOf(['admin', 'teacher', 'student', 'parent', 'class'])
    )
    subject = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True, validate=validate.Length(min=1))
    attachments = fields.Raw(missing=None)  # Handle file uploads

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
        validate=validate.OneOf(['admin', 'teacher', 'student', 'parent'])
    )
    subject = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True, validate=validate.Length(min=1))
    attachments = fields.Raw(missing=None)  # Handle file uploads