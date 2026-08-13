"""
Marshmallow schemas for the unified AcademicStructure / Department model.
"""

from marshmallow import EXCLUDE, Schema, fields, post_load, pre_load, validate

from app.models.department import AcademicStructureType

STRUCTURE_TYPE_VALUES = [t.value for t in AcademicStructureType]


class AcademicStructureSchema(Schema):
    """Full schema – used for single-record GET / POST / PUT responses."""

    class Meta:
        unknown = EXCLUDE

    # dump-only
    id = fields.Integer(dump_only=True)
    subjects_count = fields.Integer(dump_only=True, allow_none=True)
    staff_count = fields.Integer(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # bidirectional
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    code = fields.String(required=True, validate=validate.Length(min=1, max=20))
    description = fields.String(allow_none=True)
    head_id = fields.Integer(allow_none=True, load_default=None)
    parent_id = fields.Integer(allow_none=True, load_default=None)
    display_order = fields.Integer(load_default=0)
    is_active = fields.Boolean(load_default=True)
    allocated_budget = fields.Float(load_default=0.0)

    # polymorphic discriminator
    structure_type = fields.Method(
        "serialize_structure_type",
        load_default=AcademicStructureType.DISCIPLINE.value,
    )

    # Nested head details (dump-only)
    head = fields.Nested(
        "UserSchema",
        only=("id", "name", "email"),
        dump_only=True,
    )

    @pre_load
    def normalise_structure_type(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if "structure_type" in d and d["structure_type"] == "department":
            d["structure_type"] = AcademicStructureType.DISCIPLINE.value
        if "status" in d and "is_active" not in d:
            raw = d.pop("status")
            if isinstance(raw, str):
                d["is_active"] = raw.lower() in ("active", "true", "1", "yes")
            else:
                d["is_active"] = bool(raw)
        if d.get("head_id") in ("", "none", None):
            d["head_id"] = None
        if d.get("parent_id") in ("", "none", None):
            d["parent_id"] = None
        if "description" in d and not d.get("description"):
            d["description"] = None
        return d

    @post_load
    def coerce_enum(self, data, **kwargs):
        if "structure_type" in data and isinstance(data["structure_type"], str):
            try:
                data["structure_type"] = AcademicStructureType(data["structure_type"])
            except ValueError:
                data["structure_type"] = AcademicStructureType.DISCIPLINE
        return data

    def serialize_structure_type(self, obj):
        raw = getattr(obj, "structure_type", None)
        if raw is None:
            return AcademicStructureType.DISCIPLINE.value
        if isinstance(raw, AcademicStructureType):
            return raw.value
        if hasattr(raw, "value"):
            return raw.value
        val = str(raw)
        if val in STRUCTURE_TYPE_VALUES:
            return val
        return AcademicStructureType.DISCIPLINE.value


class AcademicStructureListSchema(Schema):
    """Slim schema for list responses and dropdown population."""

    class Meta:
        unknown = EXCLUDE

    id = fields.Integer(dump_only=True)
    name = fields.String()
    code = fields.String()
    description = fields.String(allow_none=True)
    structure_type = fields.Method("serialize_structure_type")
    is_active = fields.Boolean()
    display_order = fields.Integer()
    subjects_count = fields.Integer(dump_only=True, allow_none=True)
    staff_count = fields.Integer(dump_only=True, allow_none=True)
    head_id = fields.Integer(dump_only=True, allow_none=True)

    def serialize_structure_type(self, obj):
        raw = getattr(obj, "structure_type", None)
        if raw is None:
            return AcademicStructureType.DISCIPLINE.value
        if isinstance(raw, AcademicStructureType):
            return raw.value
        if hasattr(raw, "value"):
            return raw.value
        val = str(raw)
        if val in STRUCTURE_TYPE_VALUES:
            return val
        return AcademicStructureType.DISCIPLINE.value


DepartmentSchema = AcademicStructureSchema
DepartmentListSchema = AcademicStructureListSchema
