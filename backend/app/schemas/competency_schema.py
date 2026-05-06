from marshmallow import Schema, fields

class CoreCompetencySchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    code = fields.Str(required=True)
    description = fields.Str(allow_none=True)
    category = fields.Str(required=True)
    applicable_key_phases = fields.List(fields.Str(), allow_none=True)
    assessment_indicators = fields.List(fields.Raw(), allow_none=True)
    is_active = fields.Bool()

core_competency_schema = CoreCompetencySchema()
core_competencies_schema = CoreCompetencySchema(many=True)