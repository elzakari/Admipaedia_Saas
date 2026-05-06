from marshmallow import Schema, fields, validate, post_load
from datetime import date

class TeacherAttendanceSchema(Schema):
    """Schema for serializing and deserializing TeacherAttendance objects"""
    id = fields.Integer(dump_only=True)
    teacher_id = fields.Integer(required=True)
    date = fields.Date(required=True)
    status = fields.String(required=True, validate=validate.OneOf(['present', 'absent', 'late']))
    note = fields.String(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include related data when needed
    teacher = fields.Nested('TeacherSchema', exclude=('attendances',), dump_only=True)

class TeacherAttendanceCreateSchema(Schema):
    """Schema for creating a new teacher attendance record"""
    date = fields.Date(required=True)
    status = fields.String(required=True, validate=validate.OneOf(['present', 'absent', 'late']))
    note = fields.String(allow_none=True)
    
    @post_load
    def set_defaults(self, data, **kwargs):
        """Set default values after loading."""
        if 'date' not in data:
            data['date'] = date.today()
        return data