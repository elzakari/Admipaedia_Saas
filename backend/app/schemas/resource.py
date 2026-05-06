from marshmallow import Schema, fields, validate

class ResourceSchema(Schema):
    """Schema for resource model."""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    type = fields.String(required=True, validate=validate.OneOf(['document', 'link', 'video', 'image', 'other']))
    url = fields.String(allow_none=True, validate=validate.Length(max=512))
    file_path = fields.String(allow_none=True, validate=validate.Length(max=512))
    description = fields.String(allow_none=True)
    class_id = fields.Integer()
    teacher_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(format='iso', dump_only=True)
    updated_at = fields.DateTime(format='iso', dump_only=True)

class ResourceCreateSchema(ResourceSchema):
    """Schema for creating a resource."""
    class_id = fields.Integer(required=True)

class ResourceUpdateSchema(ResourceSchema):
    """Schema for updating a resource."""
    title = fields.String(validate=validate.Length(min=1, max=255))
    type = fields.String(validate=validate.OneOf(['document', 'link', 'video', 'image', 'other']))
    class_id = fields.Integer(dump_only=True)

class ResourceListSchema(Schema):
    """Schema for listing resources."""
    id = fields.Integer()
    title = fields.String()
    type = fields.String()
    url = fields.String()
    file_path = fields.String()
    description = fields.String()
    class_id = fields.Integer()
    teacher_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(format='iso')