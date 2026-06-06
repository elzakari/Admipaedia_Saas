from marshmallow import Schema, fields, validate, pre_load

class AnnouncementSchema(Schema):
    """Schema for announcement model."""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True)
    recipients = fields.String(validate=validate.OneOf(['all', 'selected', 'parents']), load_default='all')
    send_email = fields.Boolean(load_default=False)
    target_roles = fields.String(load_default='all')
    scheduled_date = fields.DateTime(allow_none=True)
    is_published = fields.Boolean(load_default=True)
    class_id = fields.Integer()
    teacher_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(format='iso', dump_only=True)
    updated_at = fields.DateTime(format='iso', dump_only=True)

    @pre_load
    def process_target_roles(self, data, **kwargs):
        if data and 'target_roles' in data:
            tr = data['target_roles']
            if isinstance(tr, list):
                data['target_roles'] = ','.join([str(x).strip().lower() for x in tr if str(x).strip()])
            elif isinstance(tr, str):
                data['target_roles'] = tr.strip().lower()
        return data

class AnnouncementCreateSchema(AnnouncementSchema):
    """Schema for creating an announcement."""
    class_id = fields.Integer(required=True)

class AnnouncementUpdateSchema(AnnouncementSchema):
    """Schema for updating an announcement."""
    title = fields.String(validate=validate.Length(min=1, max=255))
    content = fields.String()
    class_id = fields.Integer(dump_only=True)

class AnnouncementListSchema(Schema):
    """Schema for listing announcements."""
    id = fields.Integer()
    title = fields.String()
    content = fields.String()
    recipients = fields.String()
    send_email = fields.Boolean()
    target_roles = fields.String()
    scheduled_date = fields.DateTime(allow_none=True)
    is_published = fields.Boolean()
    class_id = fields.Integer()
    teacher_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(format='iso')