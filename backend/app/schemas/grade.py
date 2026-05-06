from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from datetime import date

class GradeSchema(Schema):
    """Schema for serializing and deserializing Grade objects"""
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer(required=True)
    exam_id = fields.Integer(required=True)
    marks_obtained = fields.Float(required=True, validate=validate.Range(min=0))
    percentage = fields.Float(dump_only=True)
    grade_letter = fields.String(dump_only=True)
    remarks = fields.String(allow_none=True)
    graded_by = fields.Integer(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include related data when needed
    student = fields.Nested('StudentSchema', dump_only=True)
    exam = fields.Nested('ExamSchema', exclude=('grades',), dump_only=True)
    grader = fields.Nested('UserSchema', only=('id', 'email', 'username', 'first_name', 'last_name'), dump_only=True)
    
    @validates('marks_obtained')
    def validate_marks_obtained(self, value, **kwargs):
        """Validate that marks obtained are not greater than total marks of the exam"""
        from app.models.exam import Exam
        if 'exam_id' in kwargs.get('data', {}):
            exam = Exam.query.get(kwargs['data']['exam_id'])
            if exam and value > exam.total_marks:
                raise ValidationError(f"Marks obtained cannot be greater than total marks ({exam.total_marks})")

class GradeCreateSchema(Schema):
    """Schema for creating a new grade"""
    student_id = fields.Integer(required=True)
    exam_id = fields.Integer(required=True)
    marks_obtained = fields.Float(required=True, validate=validate.Range(min=0))
    remarks = fields.String(allow_none=True)
    graded_by = fields.Integer(allow_none=True)  # Will be set to current user if not provided
    
    @validates('marks_obtained')
    def validate_marks_obtained(self, value, **kwargs):
        """Validate that marks obtained are not greater than total marks of the exam"""
        from app.models.exam import Exam
        if 'exam_id' in kwargs.get('data', {}):
            exam = Exam.query.get(kwargs['data']['exam_id'])
            if exam and value > exam.total_marks:
                raise ValidationError(f"Marks obtained cannot be greater than total marks ({exam.total_marks})")
    
    @post_load
    def calculate_percentage_and_grade(self, data, **kwargs):
        """Calculate percentage and grade letter based on marks obtained"""
        from app.models.exam import Exam
        if 'exam_id' in data and 'marks_obtained' in data:
            exam = Exam.query.get(data['exam_id'])
            if exam:
                # Calculate percentage
                percentage = (data['marks_obtained'] / exam.total_marks) * 100
                data['percentage'] = round(percentage, 2)
                
                # Determine grade letter based on percentage
                if percentage >= 90:
                    data['grade_letter'] = 'A+'
                elif percentage >= 80:
                    data['grade_letter'] = 'A'
                elif percentage >= 70:
                    data['grade_letter'] = 'B+'
                elif percentage >= 60:
                    data['grade_letter'] = 'B'
                elif percentage >= 50:
                    data['grade_letter'] = 'C+'
                elif percentage >= 40:
                    data['grade_letter'] = 'C'
                else:
                    data['grade_letter'] = 'F'
        return data

class GradeUpdateSchema(Schema):
    """Schema for updating an existing grade"""
    marks_obtained = fields.Float(validate=validate.Range(min=0))
    remarks = fields.String(allow_none=True)
    
    @validates('marks_obtained')
    def validate_marks_obtained(self, value, **kwargs):
        """Validate that marks obtained are not greater than total marks of the exam"""
        from app.models.exam import Exam
        if 'exam_id' in kwargs.get('data', {}):
            exam = Exam.query.get(kwargs['data']['exam_id'])
            if exam and value > exam.total_marks:
                raise ValidationError(f"Marks obtained cannot be greater than total marks ({exam.total_marks})")
    
    @post_load
    def recalculate_percentage_and_grade(self, data, **kwargs):
        """Recalculate percentage and grade letter if marks obtained are updated"""
        if 'marks_obtained' in data and hasattr(kwargs, 'context') and 'exam' in kwargs.context:
            exam = kwargs.context['exam']
            # Calculate percentage
            percentage = (data['marks_obtained'] / exam.total_marks) * 100
            data['percentage'] = round(percentage, 2)
            
            # Determine grade letter based on percentage
            if percentage >= 90:
                data['grade_letter'] = 'A+'
            elif percentage >= 80:
                data['grade_letter'] = 'A'
            elif percentage >= 70:
                data['grade_letter'] = 'B+'
            elif percentage >= 60:
                data['grade_letter'] = 'B'
            elif percentage >= 50:
                data['grade_letter'] = 'C+'
            elif percentage >= 40:
                data['grade_letter'] = 'C'
            else:
                data['grade_letter'] = 'F'
        return data

class GradeListSchema(Schema):
    """Schema for listing grades with minimal information"""
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer()
    exam_id = fields.Integer()
    marks_obtained = fields.Float()
    percentage = fields.Float()
    grade_letter = fields.String()
    student = fields.Nested('StudentSchema', only=('id', 'first_name', 'last_name', 'full_name'), dump_only=True)
    exam = fields.Nested('ExamSchema', only=('id', 'title', 'exam_date', 'total_marks'), dump_only=True)
    
    @validates('marks_obtained')
    def validate_marks_obtained(self, value, **kwargs):
        # This validation would ideally check against the exam's total marks
        # but would require fetching the exam from the database
        if value < 0:
            raise ValidationError("Marks obtained cannot be negative")

class GradeBulkCreateSchema(Schema):
    """Schema for creating multiple grade records at once"""
    exam_id = fields.Integer(required=True)
    grades = fields.List(fields.Dict(), required=True)
    
    @validates('grades')
    def validate_grades(self, value):
        if not value:
            raise ValidationError("At least one grade record is required")
        
        for grade in value:
            if 'student_id' not in grade:
                raise ValidationError("Each grade record must have a student_id")
            if 'marks_obtained' not in grade:
                raise ValidationError("Each grade record must have marks_obtained")
            if grade.get('marks_obtained', 0) < 0:
                raise ValidationError("Marks obtained cannot be negative")