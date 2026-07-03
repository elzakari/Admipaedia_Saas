"""
Marshmallow schemas for Subject.
Aligns with Subject model which uses department_id (FK) not a bare string.
"""
from marshmallow import Schema, fields, validate


class SubjectSchema(Schema):
    """Full schema used for single-record responses."""
    id            = fields.Int(dump_only=True)
    name          = fields.String(required=True, validate=validate.Length(min=2, max=100))
    code          = fields.String(required=True, validate=validate.Length(min=2, max=20))
    description   = fields.String(validate=validate.Length(max=1000), allow_none=True)

    # FK (load) + resolved name (dump)
    department_id   = fields.Integer(allow_none=True, load_default=None)
    department_name = fields.Method("get_department_name", dump_only=True)

    # Legacy string field accepted on load for backward compat; ignored on dump
    department = fields.String(
        validate=validate.Length(max=100),
        allow_none=True,
        load_only=True,
    )

    credit_hours  = fields.Float(allow_none=True)
    is_active     = fields.Boolean()
    classes       = fields.Method("get_classes", dump_only=True)
    teachers      = fields.Method("get_teachers", dump_only=True)
    created_at    = fields.DateTime(format="iso", dump_only=True)
    updated_at    = fields.DateTime(format="iso", dump_only=True)

    def get_department_name(self, obj):
        try:
            rel = getattr(obj, "department_relation", None)
            return rel.name if rel else None
        except Exception:
            return None

    def get_classes(self, obj):
        try:
            classes = getattr(obj, "classes", None) or []
            return [{'id': item.id, 'name': getattr(item, 'name', f'Class {item.id}')} for item in classes]
        except Exception:
            return []

    def get_teachers(self, obj):
        try:
            teachers = getattr(obj, "teachers", None) or []
            payload = []
            for teacher in teachers:
                user = getattr(teacher, 'user', None)
                first_name = getattr(user, 'first_name', None) or getattr(teacher, 'first_name', '') or ''
                last_name = getattr(user, 'last_name', None) or getattr(teacher, 'last_name', '') or ''
                full_name = f"{first_name} {last_name}".strip() or f"Teacher {teacher.id}"
                payload.append({'id': teacher.id, 'name': full_name})
            return payload
        except Exception:
            return []


class SubjectCreateSchema(Schema):
    """Schema for POST /subjects."""
    name          = fields.String(required=True, validate=validate.Length(min=2, max=100))
    code          = fields.String(required=True, validate=validate.Length(min=2, max=20))
    description   = fields.String(validate=validate.Length(max=1000), allow_none=True)
    department_id = fields.Integer(allow_none=True, load_default=None)
    # also accepted for legacy callers that still send department text
    department    = fields.String(validate=validate.Length(max=100), allow_none=True, load_only=True)
    credit_hours  = fields.Float(allow_none=True)
    is_active     = fields.Boolean(load_default=True)


class SubjectUpdateSchema(Schema):
    """Schema for PUT /subjects/:id."""
    name          = fields.String(validate=validate.Length(min=2, max=100))
    code          = fields.String(validate=validate.Length(min=2, max=20))
    description   = fields.String(validate=validate.Length(max=1000), allow_none=True)
    department_id = fields.Integer(allow_none=True)
    department    = fields.String(validate=validate.Length(max=100), allow_none=True, load_only=True)
    credit_hours  = fields.Float(allow_none=True)
    is_active     = fields.Boolean()


class SubjectListSchema(Schema):
    """Slim schema for list responses."""
    id              = fields.Int(dump_only=True)
    name            = fields.String(required=True)
    code            = fields.String(required=True)
    department_id   = fields.Integer(allow_none=True)
    department_name = fields.Method("get_department_name", dump_only=True)
    is_active       = fields.Boolean()
    classes         = fields.Method("get_classes", dump_only=True)
    teachers        = fields.Method("get_teachers", dump_only=True)

    def get_department_name(self, obj):
        try:
            rel = getattr(obj, "department_relation", None)
            return rel.name if rel else None
        except Exception:
            return None

    def get_classes(self, obj):
        try:
            classes = getattr(obj, "classes", None) or []
            return [{'id': item.id, 'name': getattr(item, 'name', f'Class {item.id}')} for item in classes]
        except Exception:
            return []

    def get_teachers(self, obj):
        try:
            teachers = getattr(obj, "teachers", None) or []
            payload = []
            for teacher in teachers:
                user = getattr(teacher, 'user', None)
                first_name = getattr(user, 'first_name', None) or getattr(teacher, 'first_name', '') or ''
                last_name = getattr(user, 'last_name', None) or getattr(teacher, 'last_name', '') or ''
                full_name = f"{first_name} {last_name}".strip() or f"Teacher {teacher.id}"
                payload.append({'id': teacher.id, 'name': full_name})
            return payload
        except Exception:
            return []
