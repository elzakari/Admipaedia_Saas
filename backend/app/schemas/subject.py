"""
Marshmallow schemas for Subject.
Aligns with Subject model which uses department_id (FK) not a bare string.
"""

from marshmallow import Schema, fields, validate


class SubjectSchema(Schema):
    """Full schema used for single-record responses."""

    id = fields.Int(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    # On CREATE payloads the code is optional: SubjectService auto-generates it.
    # Use SubjectCreateSchema below; this field stays required on dump only to
    # guarantee responses always include the final code.
    code = fields.String(
        validate=validate.Length(min=2, max=20),
        load_default=None,
        allow_none=True,
    )
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)

    department_id = fields.Integer(allow_none=True, load_default=None)
    department_name = fields.Method("get_department_name", dump_only=True)

    department = fields.String(
        validate=validate.Length(max=100),
        allow_none=True,
        load_only=True,
    )

    credit_hours = fields.Float(allow_none=True)
    is_active = fields.Boolean(load_default=True)

    # Stripped on load so frontends can send the full shape from detail screens
    # without the server rejecting assigned_* arrays on POST/PUT.
    assigned_class_ids = fields.List(fields.Int(), load_only=True, allow_none=True)
    assigned_teacher_ids = fields.List(fields.Int(), load_only=True, allow_none=True)
    classes = fields.Method("get_classes", dump_only=True)
    teachers = fields.Method("get_teachers", dump_only=True)
    created_at = fields.DateTime(format="iso", dump_only=True)
    updated_at = fields.DateTime(format="iso", dump_only=True)

    def get_department_name(self, obj):
        try:
            rel = getattr(obj, "department_relation", None)
            return rel.name if rel else None
        except Exception:
            return None

    def get_classes(self, obj):
        try:
            classes = getattr(obj, "classes", None) or []
            return [
                {
                    "id": item.id,
                    "name": getattr(item, "display_name", None)
                    or getattr(item, "name", f"Class {item.id}"),
                    "display_name": getattr(item, "display_name", None)
                    or getattr(item, "name", f"Class {item.id}"),
                    "section": getattr(item, "section", None),
                }
                for item in classes
            ]
        except Exception:
            return []

    def get_teachers(self, obj):
        try:
            teachers = getattr(obj, "teachers", None) or []
            payload = []
            for teacher in teachers:
                user = getattr(teacher, "user", None)
                first_name = (
                    getattr(user, "first_name", None)
                    or getattr(teacher, "first_name", "")
                    or ""
                )
                last_name = (
                    getattr(user, "last_name", None)
                    or getattr(teacher, "last_name", "")
                    or ""
                )
                full_name = (
                    f"{first_name} {last_name}".strip() or f"Teacher {teacher.id}"
                )
                payload.append({"id": teacher.id, "name": full_name})
            return payload
        except Exception:
            return []


class SubjectCreateSchema(Schema):
    """Schema for POST /subjects.

    - ``code`` is optional: SubjectService generates a deterministic, unique
      code based on name + department + tenant + auto-incrementing serial if
      the caller omits it.
    - ``assigned_class_ids`` / ``assigned_teacher_ids`` are accepted on load
      for ergonomic frontend payloads but are handled atomically *after* the
      subject row is committed, not by the ORM constructor.
    """

    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    code = fields.String(
        validate=validate.Length(min=2, max=20),
        allow_none=True,
        load_default=None,
    )
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    department_id = fields.Integer(allow_none=True, load_default=None)
    department = fields.String(
        validate=validate.Length(max=100), allow_none=True, load_only=True
    )
    credit_hours = fields.Float(allow_none=True, load_default=None)
    is_active = fields.Boolean(load_default=True)
    assigned_class_ids = fields.List(fields.Int(), load_only=True, allow_none=True)
    assigned_teacher_ids = fields.List(fields.Int(), load_only=True, allow_none=True)


class SubjectUpdateSchema(Schema):
    """Schema for PUT /subjects/:id."""

    name = fields.String(validate=validate.Length(min=2, max=100))
    code = fields.String(validate=validate.Length(min=2, max=20), allow_none=True)
    description = fields.String(validate=validate.Length(max=1000), allow_none=True)
    department_id = fields.Integer(allow_none=True)
    department = fields.String(
        validate=validate.Length(max=100), allow_none=True, load_only=True
    )
    credit_hours = fields.Float(allow_none=True)
    is_active = fields.Boolean(allow_none=True)
    assigned_class_ids = fields.List(fields.Int(), load_only=True, allow_none=True)
    assigned_teacher_ids = fields.List(fields.Int(), load_only=True, allow_none=True)


class SubjectListSchema(Schema):
    """Slim schema for list responses."""

    id = fields.Int(dump_only=True)
    name = fields.String(required=True)
    code = fields.String(required=True)
    department_id = fields.Integer(allow_none=True)
    department_name = fields.Method("get_department_name", dump_only=True)
    credit_hours = fields.Float(allow_none=True)
    is_active = fields.Boolean()
    classes = fields.Method("get_classes", dump_only=True)
    teachers = fields.Method("get_teachers", dump_only=True)

    def get_department_name(self, obj):
        try:
            rel = getattr(obj, "department_relation", None)
            return rel.name if rel else None
        except Exception:
            return None

    def get_classes(self, obj):
        try:
            classes = getattr(obj, "classes", None) or []
            return [
                {
                    "id": item.id,
                    "name": getattr(item, "display_name", None)
                    or getattr(item, "name", f"Class {item.id}"),
                    "display_name": getattr(item, "display_name", None)
                    or getattr(item, "name", f"Class {item.id}"),
                    "section": getattr(item, "section", None),
                }
                for item in classes
            ]
        except Exception:
            return []

    def get_teachers(self, obj):
        try:
            teachers = getattr(obj, "teachers", None) or []
            payload = []
            for teacher in teachers:
                user = getattr(teacher, "user", None)
                first_name = (
                    getattr(user, "first_name", None)
                    or getattr(teacher, "first_name", "")
                    or ""
                )
                last_name = (
                    getattr(user, "last_name", None)
                    or getattr(teacher, "last_name", "")
                    or ""
                )
                full_name = (
                    f"{first_name} {last_name}".strip() or f"Teacher {teacher.id}"
                )
                payload.append({"id": teacher.id, "name": full_name})
            return payload
        except Exception:
            return []
