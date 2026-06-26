from marshmallow import EXCLUDE, Schema, ValidationError, fields, pre_load, validate

class ParentSchema(Schema):
    """Schema for Parent model."""
    class Meta:
        unknown = EXCLUDE

    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))
    status = fields.Method("get_status")
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    first_name = fields.Method("get_first_name", dump_only=True)
    last_name = fields.Method("get_last_name", dump_only=True)
    full_name = fields.Method("get_full_name", dump_only=True)
    display_name = fields.Method("get_display_name", dump_only=True)
    email = fields.Method("get_email", dump_only=True)
    phone = fields.Method("get_phone", dump_only=True)
    
    # Include user information
    user = fields.Nested('UserSchema', exclude=['password'], dump_only=True)
    
    # Include children dynamically
    children = fields.Method("get_children", dump_only=True)

    def get_children(self, obj):
        from app.models.student import Student
        from flask import g
        
        tenant_id = getattr(g, 'tenant_id', None)
        
        # Safely query children linked to this parent
        query = Student.query.filter(Student.parent_id == obj.id)
        if tenant_id:
            students = query.filter(Student.tenant_id == tenant_id).all()
        else:
            students = query.all()
            
        return [
            {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "class_name": s.class_.name if s.class_ else None
            }
            for s in students
        ]

    def _resolve_name_parts(self, obj):
        user = getattr(obj, 'user', None)
        profile = getattr(user, 'profile', None) if user else None

        first_name = (
            getattr(profile, 'first_name', None)
            or getattr(user, 'first_name', None)
            or ''
        )
        last_name = (
            getattr(profile, 'last_name', None)
            or getattr(user, 'last_name', None)
            or ''
        )

        if first_name or last_name:
            return str(first_name).strip(), str(last_name).strip()

        full_name = ''
        if user and hasattr(user, 'get_full_name'):
            full_name = (user.get_full_name() or '').strip()

        if not full_name and profile:
            full_name = (
                getattr(profile, 'display_name', None)
                or getattr(profile, 'legal_name', None)
                or ''
            ).strip()

        if not full_name and user:
            full_name = (getattr(user, 'username', '') or '').strip()

        if not full_name:
            return '', ''

        parts = [part for part in full_name.split() if part]
        if len(parts) == 1:
            return parts[0], ''
        return parts[0], ' '.join(parts[1:])

    def get_first_name(self, obj):
        first_name, _ = self._resolve_name_parts(obj)
        return first_name

    def get_last_name(self, obj):
        _, last_name = self._resolve_name_parts(obj)
        return last_name

    def get_full_name(self, obj):
        first_name, last_name = self._resolve_name_parts(obj)
        return ' '.join(part for part in [first_name, last_name] if part).strip()

    def get_display_name(self, obj):
        full_name = self.get_full_name(obj)
        if full_name:
            return full_name
        user = getattr(obj, 'user', None)
        return getattr(user, 'username', '') if user else ''

    def get_email(self, obj):
        user = getattr(obj, 'user', None)
        return getattr(user, 'email', None) if user else None

    def get_phone(self, obj):
        user = getattr(obj, 'user', None)
        profile = getattr(user, 'profile', None) if user else None
        return getattr(profile, 'phone', None) or getattr(obj, 'emergency_contact', None)

    def get_status(self, obj):
        user = getattr(obj, 'user', None)
        return getattr(user, 'status', 'active') if user else 'active'


class ParentCreateSchema(Schema):
    """Schema for creating a parent."""
    class Meta:
        unknown = EXCLUDE

    user_id = fields.Int(load_default=None)
    first_name = fields.Str(load_default='')
    last_name = fields.Str(load_default='')
    email = fields.Email(load_default=None)
    phone = fields.Str(load_default=None)
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))
    password = fields.Str(load_default=None)
    status = fields.Str(validate=validate.OneOf(['active', 'inactive']), load_default='active')

    @pre_load
    def normalize_payload(self, data, **kwargs):
        payload = dict(data or {})
        if 'firstName' in payload and 'first_name' not in payload:
            payload['first_name'] = payload.pop('firstName')
        if 'lastName' in payload and 'last_name' not in payload:
            payload['last_name'] = payload.pop('lastName')
        if 'emergencyContact' in payload and 'emergency_contact' not in payload:
            payload['emergency_contact'] = payload.pop('emergencyContact')
        if 'phone' in payload and 'emergency_contact' not in payload:
            payload['emergency_contact'] = payload['phone']
        return payload

class ParentUpdateSchema(Schema):
    """Schema for updating a parent."""
    class Meta:
        unknown = EXCLUDE

    first_name = fields.Str(load_default=None)
    last_name = fields.Str(load_default=None)
    email = fields.Email(load_default=None)
    phone = fields.Str(load_default=None)
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))
    status = fields.Str(validate=validate.OneOf(['active', 'inactive']), load_default=None)

    @pre_load
    def normalize_payload(self, data, **kwargs):
        payload = dict(data or {})
        if 'firstName' in payload and 'first_name' not in payload:
            payload['first_name'] = payload.pop('firstName')
        if 'lastName' in payload and 'last_name' not in payload:
            payload['last_name'] = payload.pop('lastName')
        if 'emergencyContact' in payload and 'emergency_contact' not in payload:
            payload['emergency_contact'] = payload.pop('emergencyContact')
        if 'phone' in payload and 'emergency_contact' not in payload:
            payload['emergency_contact'] = payload['phone']
        return payload
