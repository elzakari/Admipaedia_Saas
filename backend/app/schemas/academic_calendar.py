from marshmallow import Schema, fields, validate, post_load
from app.models.academic_calendar import AcademicYear, Term

class AcademicYearSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    is_current = fields.Boolean(missing=False)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class AcademicYearCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    is_current = fields.Boolean(missing=False)

class AcademicYearUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=50))
    start_date = fields.Date()
    end_date = fields.Date()
    is_current = fields.Boolean()

class TermSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    academic_year_id = fields.Integer(required=True)
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    is_current = fields.Boolean(missing=False)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    academic_year_name = fields.Method("get_academic_year_name")

    def get_academic_year_name(self, obj):
        if obj.academic_year:
            return obj.academic_year.name
        return None

class TermCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    academic_year_id = fields.Integer(required=True)
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    is_current = fields.Boolean(missing=False)

class TermUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=50))
    academic_year_id = fields.Integer()
    start_date = fields.Date()
    end_date = fields.Date()
    is_current = fields.Boolean()
