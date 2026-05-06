from marshmallow import Schema, fields, validate, pre_load

class StaffSchema(Schema):
    """Schema for serializing and deserializing Staff objects"""
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(required=True)
    employee_id = fields.String(required=False, validate=validate.Length(min=3, max=20), allow_none=True)
    first_name = fields.String(required=True, validate=validate.Length(min=2, max=50))
    last_name = fields.String(required=True, validate=validate.Length(min=2, max=50))
    job_title = fields.String(validate=validate.Length(max=100), allow_none=True)
    date_of_birth = fields.Date(allow_none=True)
    gender = fields.String(validate=validate.OneOf(['male', 'female', 'other']), allow_none=True)
    address = fields.String(validate=validate.Length(max=255), allow_none=True)
    phone_number = fields.String(validate=validate.Length(max=20), allow_none=True)
    joining_date = fields.Date(allow_none=True)
    status = fields.String(validate=validate.OneOf(['active', 'inactive', 'on_leave']), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    full_name = fields.String(dump_only=True)

    @pre_load
    def strip_blank_employee_id(self, data, **kwargs):
        if isinstance(data, dict) and data.get('employee_id', None) == '':
            data.pop('employee_id', None)
        return data

class StaffListSchema(Schema):
    """Schema for listing staff with minimal information"""
    id = fields.Integer(dump_only=True)
    employee_id = fields.String()
    first_name = fields.String()
    last_name = fields.String()
    full_name = fields.String()
    job_title = fields.String()
    status = fields.String()