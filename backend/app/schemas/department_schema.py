from marshmallow import Schema, fields, validate

class DepartmentSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    code = fields.String(required=True, validate=validate.Length(min=1, max=10))
    description = fields.String(allow_none=True)
    head_id = fields.Integer(allow_none=True)
    is_active = fields.Boolean(load_default=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Nested fields for related data
    head = fields.Nested('UserSchema', only=('id', 'name', 'email'), dump_only=True)
    subjects_count = fields.Method('get_subjects_count', dump_only=True)
    staff_count = fields.Method('get_staff_count', dump_only=True)
    
    def get_subjects_count(self, obj):
        return obj.subjects.count() if hasattr(obj, 'subjects') else 0
    
    def get_staff_count(self, obj):
        return len(obj.staff) if hasattr(obj, 'staff') else 0