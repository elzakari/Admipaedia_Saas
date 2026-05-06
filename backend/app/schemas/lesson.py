from marshmallow import Schema, fields, validate
from datetime import date

class LessonSchema(Schema):
    """Schema for lesson model."""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    description = fields.String(allow_none=True)
    date = fields.Date(required=True)
    status = fields.String(validate=validate.OneOf(['planned', 'in-progress', 'completed']), load_default='planned')
    materials = fields.List(fields.Dict(), load_default=list)
    class_id = fields.Integer()
    teacher_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(format='iso', dump_only=True)
    updated_at = fields.DateTime(format='iso', dump_only=True)

class LessonCreateSchema(LessonSchema):
    """Schema for creating a lesson."""
    class_id = fields.Integer(required=True)

class LessonUpdateSchema(LessonSchema):
    """Schema for updating a lesson."""
    title = fields.String(validate=validate.Length(min=1, max=255))
    date = fields.Date()
    class_id = fields.Integer(dump_only=True)

class LessonListSchema(Schema):
    """Schema for listing lessons."""
    id = fields.Integer()
    title = fields.String()
    description = fields.String()
    date = fields.Date()
    status = fields.String()
    materials = fields.List(fields.Dict())
    class_id = fields.Integer()
    teacher_id = fields.Integer(allow_none=True)
    subject_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(format='iso')