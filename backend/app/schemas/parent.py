from marshmallow import Schema, fields, validate, validates, ValidationError

class ParentSchema(Schema):
    """Schema for Parent model."""
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include user information
    user = fields.Nested('UserSchema', exclude=['password'], dump_only=True)

class ParentCreateSchema(Schema):
    """Schema for creating a parent."""
    user_id = fields.Int(required=True)
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))

class ParentUpdateSchema(Schema):
    """Schema for updating a parent."""
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))