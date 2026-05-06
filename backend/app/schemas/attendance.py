from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from datetime import date

class AttendanceSchema(Schema):
    """Schema for serializing and deserializing Attendance objects"""
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer(required=True)
    class_id = fields.Integer(required=True)
    subject_id = fields.Integer(allow_none=True)
    date = fields.Date(required=True)
    status = fields.String(required=True, validate=validate.OneOf(['present', 'absent', 'late', 'excused']))
    remarks = fields.String(allow_none=True)
    recorded_by = fields.Integer(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include related data when needed
    student = fields.Nested('StudentSchema', dump_only=True)
    class_ = fields.Nested('ClassSchema', dump_only=True)
    subject = fields.Nested('SubjectSchema', dump_only=True)

class AttendanceCreateSchema(Schema):
    """Schema for creating a new attendance record"""
    student_id = fields.Integer(required=True)
    class_id = fields.Integer(required=True)
    subject_id = fields.Integer(allow_none=True)
    date = fields.Date(required=True)
    status = fields.String(required=True, validate=validate.OneOf(['present', 'absent', 'late', 'excused']))
    remarks = fields.String(allow_none=True)
    recorded_by = fields.Integer(allow_none=True)
    
    @post_load
    def set_defaults(self, data, **kwargs):
        """Set default values after loading."""
        if 'date' not in data:
            data['date'] = date.today()
        return data
    
    @validates('date')
    def validate_date(self, value):
        if value > date.today():
            raise ValidationError("Attendance date cannot be in the future")

class AttendanceUpdateSchema(Schema):
    """Schema for updating an existing attendance record"""
    status = fields.String(validate=validate.OneOf(['present', 'absent', 'late', 'excused']))
    remarks = fields.String(allow_none=True)
    recorded_by = fields.Integer(allow_none=True)

class AttendanceBulkCreateSchema(Schema):
    """Schema for creating multiple attendance records at once"""
    class_id = fields.Integer(required=True)
    subject_id = fields.Integer(allow_none=True)
    date = fields.Date(required=True)
    recorded_by = fields.Integer(allow_none=True)
    attendances = fields.List(fields.Dict(), required=True)
    
    @post_load
    def set_defaults(self, data, **kwargs):
        """Set default values after loading."""
        if 'date' not in data:
            data['date'] = date.today()
        return data
    
    @validates('date')
    def validate_date(self, value):
        if value > date.today():
            raise ValidationError("Attendance date cannot be in the future")
            
    @validates('attendances')
    def validate_attendances(self, value):
        if not value:
            raise ValidationError("At least one attendance record is required")
        
        valid_statuses = ['present', 'absent', 'late', 'excused']
        for attendance in value:
            if 'student_id' not in attendance:
                raise ValidationError("Each attendance record must have a student_id")
            if 'status' not in attendance:
                raise ValidationError("Each attendance record must have a status")
            if attendance.get('status') not in valid_statuses:
                raise ValidationError(f"Status must be one of: {', '.join(valid_statuses)}")