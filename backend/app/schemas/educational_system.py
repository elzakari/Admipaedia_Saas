from marshmallow import Schema, fields, validate


class EducationalSystemApplySchema(Schema):
    template_key = fields.String(required=True, validate=validate.Length(min=1, max=100))

