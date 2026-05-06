from marshmallow import Schema, fields, validate
from datetime import datetime

class NotificationSchema(Schema):
    """Schema for serializing and deserializing Notification objects"""
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(required=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    message = fields.String(required=True, validate=validate.Length(min=1, max=1000))
    type = fields.String(required=True, validate=validate.OneOf([
        'attendance', 'grade', 'announcement', 'fee', 'exam', 'general'
    ]))
    priority = fields.String(validate=validate.OneOf(['low', 'medium', 'high', 'urgent']), load_default='medium')
    is_read = fields.Boolean(load_default=False)
    read_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include related data when needed
    user = fields.Nested('UserSchema', only=('id', 'email', 'username', 'first_name', 'last_name'), dump_only=True)

class NotificationCreateSchema(Schema):
    """Schema for creating a new notification"""
    user_id = fields.Integer(required=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    message = fields.String(required=True, validate=validate.Length(min=1, max=1000))
    type = fields.String(required=True, validate=validate.OneOf([
        'attendance', 'grade', 'announcement', 'fee', 'exam', 'general'
    ]))
    priority = fields.String(validate=validate.OneOf(['low', 'medium', 'high', 'urgent']), load_default='medium')

class NotificationUpdateSchema(Schema):
    """Schema for updating an existing notification"""
    is_read = fields.Boolean()
    read_at = fields.DateTime(allow_none=True)

class NotificationListSchema(Schema):
    """Schema for listing notifications with minimal information"""
    id = fields.Integer(dump_only=True)
    title = fields.String()
    message = fields.String()
    type = fields.String()
    priority = fields.String()
    is_read = fields.Boolean()
    created_at = fields.DateTime()