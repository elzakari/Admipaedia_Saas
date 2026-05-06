from marshmallow import Schema, fields, validate

class CurriculumSchema(Schema):
    """Schema for serializing and deserializing Curriculum objects"""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    grade_level = fields.String(required=True, validate=validate.Length(min=1, max=20))
    subject_id = fields.Integer(required=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=4, max=20))
    created_by = fields.Integer(dump_only=True)
    status = fields.String(validate=validate.OneOf(['draft', 'published', 'archived']), load_default='draft')
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include subject name for display purposes
    subject_name = fields.String(dump_only=True)

class CurriculumCreateSchema(Schema):
    """Schema for creating a new curriculum"""
    title = fields.String(required=True, validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    grade_level = fields.String(required=True, validate=validate.Length(min=1, max=20))
    subject_id = fields.Integer(required=True)
    academic_year = fields.String(required=True, validate=validate.Length(min=4, max=20))
    status = fields.String(validate=validate.OneOf(['draft', 'published', 'archived']), load_default='draft')

class CurriculumUpdateSchema(Schema):
    """Schema for updating an existing curriculum"""
    title = fields.String(validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    grade_level = fields.String(validate=validate.Length(min=1, max=20))
    subject_id = fields.Integer()
    academic_year = fields.String(validate=validate.Length(min=4, max=20))
    status = fields.String(validate=validate.OneOf(['draft', 'published', 'archived']))

class CurriculumListSchema(Schema):
    """Schema for listing curricula with minimal information"""
    id = fields.Integer(dump_only=True)
    title = fields.String()
    grade_level = fields.String()
    subject_id = fields.Integer()
    subject_name = fields.String(allow_none=True)
    academic_year = fields.String()
    status = fields.String()