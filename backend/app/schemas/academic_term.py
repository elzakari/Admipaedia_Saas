from marshmallow import Schema, fields, validate, validates_schema, ValidationError


class AcademicTermSchema(Schema):
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    created_at = fields.DateTime(format='iso', dump_only=True)
    updated_at = fields.DateTime(format='iso', dump_only=True)

    @validates_schema
    def validate_dates(self, data, **kwargs):
        start = data.get('start_date')
        end = data.get('end_date')
        if start and end and end < start:
            raise ValidationError({'end_date': ['end_date must be on or after start_date']})

