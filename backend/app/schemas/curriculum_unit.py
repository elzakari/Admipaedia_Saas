from marshmallow import Schema, fields, validate

class CurriculumUnitSchema(Schema):
    """Schema for serializing and deserializing CurriculumUnit objects"""
    id = fields.Integer(dump_only=True)
    curriculum_id = fields.Integer(required=True)
    title = fields.String(required=True, validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    objectives = fields.String(validate=validate.Length(max=1000), allow_none=True)
    resources = fields.String(validate=validate.Length(max=1000), allow_none=True)
    duration_weeks = fields.Integer(required=True)
    sequence_order = fields.Integer(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class CurriculumUnitCreateSchema(Schema):
    """Schema for creating a new curriculum unit"""
    curriculum_id = fields.Integer(required=True)
    title = fields.String(required=True, validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    objectives = fields.String(validate=validate.Length(max=1000), allow_none=True)
    resources = fields.String(validate=validate.Length(max=1000), allow_none=True)
    duration_weeks = fields.Integer(required=True)
    sequence_order = fields.Integer(required=True)

class CurriculumUnitUpdateSchema(Schema):
    """Schema for updating an existing curriculum unit"""
    title = fields.String(validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    objectives = fields.String(validate=validate.Length(max=1000), allow_none=True)
    resources = fields.String(validate=validate.Length(max=1000), allow_none=True)
    duration_weeks = fields.Integer()
    sequence_order = fields.Integer()