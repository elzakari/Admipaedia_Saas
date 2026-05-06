from marshmallow import Schema, fields, validate, validates, ValidationError
from datetime import datetime

class ClassSchema(Schema):
    """Schema for serializing and deserializing Class objects"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    grade_level = fields.String(required=True, validate=validate.Length(min=1, max=20))
    section = fields.String(validate=validate.Length(max=20), allow_none=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=4, max=20))
    capacity = fields.Integer(allow_none=True)
    teacher_id = fields.Integer(allow_none=True)
    start_time = fields.String(validate=validate.Length(max=20), allow_none=True)
    end_time = fields.String(validate=validate.Length(max=20), allow_none=True)
    days = fields.String(validate=validate.Length(max=100), allow_none=True)
    room = fields.String(validate=validate.Length(max=50), allow_none=True)
    description = fields.String(allow_none=True)
    status = fields.String(validate=validate.Length(max=20), load_default='active')
    
    # Read-only fields for frontend
    current_enrollment = fields.Integer(dump_only=True)
    class_teacher_name = fields.String(dump_only=True)
    class_teacher = fields.String(dump_only=True)
    academic_year_name = fields.String(dump_only=True)
    room_number = fields.String(dump_only=True)
    
    created_at = fields.DateTime(format='iso', dump_only=True)
    updated_at = fields.DateTime(format='iso', dump_only=True)

class ClassCreateSchema(Schema):
    """Schema for creating a new class"""
    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    grade_level = fields.String(required=True, validate=validate.Length(min=1, max=20))
    section = fields.String(validate=validate.Length(max=20), allow_none=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=4, max=20))
    capacity = fields.Integer(allow_none=True)
    teacher_id = fields.Integer(allow_none=True)
    start_time = fields.String(validate=validate.Length(max=20), allow_none=True)
    end_time = fields.String(validate=validate.Length(max=20), allow_none=True)
    days = fields.String(validate=validate.Length(max=100), allow_none=True)
    room = fields.String(validate=validate.Length(max=50), allow_none=True)
    description = fields.String(allow_none=True)
    status = fields.String(validate=validate.Length(max=20), load_default='active')

class ClassUpdateSchema(Schema):
    """Schema for updating an existing class"""
    name = fields.String(validate=validate.Length(min=2, max=100))
    grade_level = fields.String(validate=validate.Length(min=1, max=20))
    section = fields.String(validate=validate.Length(max=20), allow_none=True)
    academic_year = fields.String(validate=validate.Length(min=4, max=20))
    capacity = fields.Integer(allow_none=True)
    teacher_id = fields.Integer(allow_none=True)
    start_time = fields.String(validate=validate.Length(max=20), allow_none=True)
    end_time = fields.String(validate=validate.Length(max=20), allow_none=True)
    days = fields.String(validate=validate.Length(max=100), allow_none=True)
    room = fields.String(validate=validate.Length(max=50), allow_none=True)
    description = fields.String(allow_none=True)
    status = fields.String(validate=validate.Length(max=20))

class ClassListSchema(Schema):
    """Schema for listing classes with minimal information"""
    id = fields.Integer(dump_only=True)
    name = fields.String()
    grade_level = fields.String()
    section = fields.String()
    academic_year = fields.String()
    teacher_id = fields.Integer(allow_none=True)
    start_time = fields.String()
    end_time = fields.String()
    days = fields.String()
    room = fields.String()
    
    # Extra fields for list view
    current_enrollment = fields.Integer(dump_only=True)
    capacity = fields.Integer(dump_only=True)
    class_teacher = fields.String(dump_only=True)
    status = fields.String(dump_only=True)