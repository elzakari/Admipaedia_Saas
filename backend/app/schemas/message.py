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
    attachments = fields.List(fields.String(), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

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