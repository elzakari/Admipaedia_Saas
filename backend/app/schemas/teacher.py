from marshmallow import Schema, fields, validate, validates, ValidationError, pre_load
from datetime import datetime

class TeacherSchema(Schema):
    """Schema for serializing and deserializing Teacher objects"""
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(required=True)
    employee_id = fields.String(required=False, validate=validate.Length(min=3, max=20), allow_none=True)
    first_name = fields.String(required=True, validate=validate.Length(min=2, max=50))
    middle_name = fields.String(validate=validate.Length(max=50), allow_none=True)
    last_name = fields.String(required=True, validate=validate.Length(min=2, max=50))
    date_of_birth = fields.Date(allow_none=True)
    gender = fields.String(validate=validate.OneOf(['male', 'female', 'other']), allow_none=True)
    nationality = fields.String(validate=validate.Length(max=50), allow_none=True)
    blood_group = fields.String(validate=validate.Length(max=5), allow_none=True)
    address = fields.String(validate=validate.Length(max=255), allow_none=True)
    phone_number = fields.String(validate=validate.Length(max=20), allow_none=True)
    qualification = fields.String(validate=validate.Length(max=100), allow_none=True)
    specialization = fields.String(validate=validate.Length(max=100), allow_none=True)
    joining_date = fields.Date(allow_none=True)
    department_id = fields.Integer(allow_none=True)
    bio = fields.String(allow_none=True)
    emergency_contact_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    emergency_contact_phone = fields.String(validate=validate.Length(max=20), allow_none=True)
    status = fields.String(validate=validate.OneOf(['active', 'inactive', 'on_leave']), allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Computed fields
    full_name = fields.String(dump_only=True)
    
    @validates('joining_date')
    def validate_joining_date(self, value, **kwargs):
        """Validate that joining date is not in the future"""
        if value and value > datetime.now().date():
            raise ValidationError("Joining date cannot be in the future")
    
    @pre_load
    def handle_empty_employee_id(self, data, **kwargs):
        """Remove empty employee_id so service can auto-generate"""
        if 'employee_id' in data and data['employee_id'] == '':
            data.pop('employee_id')
        return data

class TeacherListSchema(Schema):
    """Schema for listing teachers with minimal information"""
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer()
    employee_id = fields.String()
    first_name = fields.String()
    last_name = fields.String()
    full_name = fields.String(dump_only=True)
    specialization = fields.String()
    status = fields.String()
    phone_number = fields.String()
    qualification = fields.String()
    joining_date = fields.Date()
    email = fields.Method('get_email')

    def get_email(self, obj, **kwargs):
        try:
            return getattr(getattr(obj, 'user', None), 'email', None)
        except Exception:
            return None
