from marshmallow import Schema, fields, validate

class SubjectSchema(Schema):
    """Schema for the Subject model"""
    id = fields.Int(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    code = fields.String(required=True, validate=validate.Length(min=2, max=20))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    department = fields.String(validate=validate.Length(max=100), allow_none=True)
    credit_hours = fields.Integer(allow_none=True)
    is_active = fields.Boolean()
    created_at = fields.DateTime(format='iso', dump_only=True)
    updated_at = fields.DateTime(format='iso', dump_only=True)

class SubjectCreateSchema(Schema):
    """Schema for creating a new subject"""
    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    code = fields.String(required=True, validate=validate.Length(min=2, max=20))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    department = fields.String(validate=validate.Length(max=100), allow_none=True)
    credit_hours = fields.Integer(allow_none=True)
    is_active = fields.Boolean()

class SubjectUpdateSchema(Schema):
    """Schema for updating an existing subject"""
    name = fields.String(validate=validate.Length(min=2, max=100))
    code = fields.String(validate=validate.Length(min=2, max=20))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    department = fields.String(validate=validate.Length(max=100), allow_none=True)
    credit_hours = fields.Integer(allow_none=True)
    is_active = fields.Boolean()

class SubjectListSchema(Schema):
    """Schema for listing subjects with minimal information"""
    id = fields.Int(dump_only=True)
    name = fields.String(required=True)
    code = fields.String(required=True)
    department = fields.String(allow_none=True)
    is_active = fields.Boolean()
