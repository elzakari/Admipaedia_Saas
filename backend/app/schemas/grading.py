from marshmallow import Schema, fields, validate, post_dump
from app.models.grading_system import GradingStandard

class GradeBoundarySchema(Schema):
    """Schema for GradeBoundary model"""
    id = fields.Integer(dump_only=True)
    grade_symbol = fields.String(required=True)
    grade_name = fields.String(allow_none=True)
    min_score = fields.Float(required=True)
    max_score = fields.Float(required=True)
    is_passing = fields.Boolean()
    grade_points = fields.Float(allow_none=True)
    sequence_order = fields.Integer(required=True)
    color_code = fields.String(allow_none=True)

class GradingSchemeSchema(Schema):
    """Schema for GradingScheme model"""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    standard = fields.Method("get_standard_name")
    description = fields.String(allow_none=True)
    is_active = fields.Boolean()
    is_default = fields.Boolean()
    class_score_weight = fields.Float()
    external_exam_weight = fields.Float()
    grade_boundaries = fields.Nested(GradeBoundarySchema, many=True)
    
    def get_standard_name(self, obj):
        if hasattr(obj.standard, 'value'):
            return obj.standard.value
        return str(obj.standard)

class EnhancedGradeSchema(Schema):
    """Schema for EnhancedGrade model"""
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer(required=True)
    subject_id = fields.Integer(required=True)
    class_id = fields.Integer(required=True)
    grading_scheme_id = fields.Integer(required=True)
    assessment_name = fields.String(required=True)
    assessment_date = fields.Date(required=True)
    term = fields.String(required=True)
    academic_year = fields.String(required=True)
    raw_score = fields.Float(required=True)
    total_marks = fields.Float(required=True)
    percentage = fields.Float(dump_only=True)
    grade_symbol = fields.String(dump_only=True)
    is_passing = fields.Boolean(dump_only=True)
    teacher_comments = fields.String(allow_none=True)
