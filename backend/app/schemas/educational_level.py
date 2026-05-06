from marshmallow import Schema, fields, validate

class EducationalLevelSchema(Schema):
    """Schema for EducationalLevel model"""
    id = fields.Integer(dump_only=True)
    level_code = fields.String(required=True, validate=validate.Length(min=1, max=10))
    level_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    key_phase = fields.String(required=True, validate=validate.Length(min=1, max=50))
    key_phase_description = fields.String(dump_only=True)
    min_age = fields.Integer(allow_none=True)
    max_age = fields.Integer(allow_none=True)
    curriculum_focus = fields.String(allow_none=True)
    is_active = fields.Boolean()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class CoreCompetencySchema(Schema):
    """Schema for CoreCompetency model"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True)
    category = fields.String(required=True, validate=validate.Length(min=1, max=50))
    is_active = fields.Boolean()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class StudentCompetencyAssessmentSchema(Schema):
    """Schema for StudentCompetencyAssessment model"""
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer(required=True)
    competency_id = fields.Integer(required=True)
    assessment_date = fields.Date(required=True)
    term = fields.String(required=True)
    academic_year = fields.String(required=True)
    level_achieved = fields.Integer(required=True, validate=validate.Range(min=1, max=4))
    level_description = fields.String(dump_only=True)
    evidence = fields.String(allow_none=True)
    teacher_comments = fields.String(allow_none=True)
    assessed_by = fields.Integer(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
