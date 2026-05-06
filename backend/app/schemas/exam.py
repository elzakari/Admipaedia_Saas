from marshmallow import Schema, fields, validate, validates, ValidationError, post_load, EXCLUDE
from datetime import datetime, timedelta

class ExamSchema(Schema):
    """Schema for serializing and deserializing Exam objects"""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=3, max=100))
    description = fields.String(allow_none=True)
    exam_date = fields.DateTime(required=True)
    duration = fields.Integer(required=True, validate=validate.Range(min=5))  # At least 5 minutes
    total_marks = fields.Float(required=True, validate=validate.Range(min=0))
    passing_marks = fields.Float(required=True, validate=validate.Range(min=0))
    class_id = fields.Integer(required=True)
    subject_id = fields.Integer(required=True)
    created_by = fields.Integer(required=True)
    status = fields.String(validate=validate.OneOf(['scheduled', 'ongoing', 'completed', 'cancelled']))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include related data when needed
    class_ = fields.Nested('ClassSchema', only=('id', 'name', 'grade_level', 'section', 'academic_year'), dump_only=True)
    subject = fields.Nested('SubjectSchema', only=('id', 'name', 'code'), dump_only=True)
    creator = fields.Nested('UserSchema', only=('id', 'email', 'username', 'first_name', 'last_name'), dump_only=True)
    grades = fields.Nested('GradeSchema', many=True, exclude=('exam',), dump_only=True)
    
    @validates('exam_date')
    def validate_exam_date(self, value):
        """Validate that exam date is not in the past"""
        if value and value < (datetime.utcnow() - timedelta(minutes=1)):
            raise ValidationError("Exam date cannot be in the past")
    
    @validates('passing_marks')
    def validate_passing_marks(self, value, **kwargs):
        """Validate that passing marks are not greater than total marks"""
        if 'total_marks' in kwargs.get('data', {}) and value > kwargs['data']['total_marks']:
            raise ValidationError("Passing marks cannot be greater than total marks")

class ExamCreateSchema(Schema):
    """Schema for creating a new exam"""
    title = fields.String(required=True, validate=validate.Length(min=3, max=100))
    description = fields.String(allow_none=True)
    exam_date = fields.DateTime(required=True)
    duration = fields.Integer(required=True, validate=validate.Range(min=5))
    total_marks = fields.Float(required=True, validate=validate.Range(min=0))
    passing_marks = fields.Float(required=True, validate=validate.Range(min=0))
    class_id = fields.Integer(required=True)
    subject_id = fields.Integer(required=True)
    created_by = fields.Integer(allow_none=True)  # Will be set to current user if not provided
    status = fields.String(validate=validate.OneOf(['scheduled', 'ongoing', 'completed', 'cancelled']))
    
    # Add a class Meta with default values
    class Meta:
        unknown = EXCLUDE  # Ignore unknown fields
    
    # Set defaults in post_load
    @post_load
    def set_defaults(self, data, **kwargs):
        if 'status' not in data or data['status'] is None:
            data['status'] = 'scheduled'
        return data
    
    @validates('exam_date')
    def validate_exam_date(self, value):
        """Validate that exam date is not in the past"""
        if value and value < (datetime.utcnow() - timedelta(minutes=1)):
            raise ValidationError("Exam date cannot be in the past")
    
    @validates('passing_marks')
    def validate_passing_marks(self, value, **kwargs):
        """Validate that passing marks are not greater than total marks"""
        if 'total_marks' in kwargs.get('data', {}) and value > kwargs['data']['total_marks']:
            raise ValidationError("Passing marks cannot be greater than total marks")

class ExamUpdateSchema(Schema):
    """Schema for updating an existing exam"""
    title = fields.String(validate=validate.Length(min=3, max=100))
    description = fields.String(allow_none=True)
    exam_date = fields.DateTime()
    duration = fields.Integer(validate=validate.Range(min=5))
    total_marks = fields.Float(validate=validate.Range(min=0))
    passing_marks = fields.Float(validate=validate.Range(min=0))
    status = fields.String(validate=validate.OneOf(['scheduled', 'ongoing', 'completed', 'cancelled']))
    
    @validates('exam_date')
    def validate_exam_date(self, value):
        """Validate that exam date is not in the past"""
        if value and value < (datetime.utcnow() - timedelta(minutes=1)):
            raise ValidationError("Exam date cannot be in the past")
    
    @validates('passing_marks')
    def validate_passing_marks(self, value, **kwargs):
        """Validate that passing marks are not greater than total marks"""
        if 'total_marks' in kwargs.get('data', {}) and value > kwargs['data']['total_marks']:
            raise ValidationError("Passing marks cannot be greater than total marks")

class ExamListSchema(Schema):
    """Schema for listing exams with minimal information"""
    id = fields.Integer(dump_only=True)
    title = fields.String()
    exam_date = fields.DateTime()
    status = fields.String()
    class_id = fields.Integer()
    subject_id = fields.Integer()
    class_ = fields.Nested('ClassSchema', only=('id', 'name', 'grade_level', 'section'), dump_only=True)
    subject = fields.Nested('SubjectSchema', only=('id', 'name', 'code'), dump_only=True)
