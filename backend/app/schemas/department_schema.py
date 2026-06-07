"""
Marshmallow schemas for the unified AcademicStructure / Department model.
"""
from marshmallow import Schema, fields, validate, pre_load, post_load
from app.models.department import AcademicStructureType


# ── Allowed type values for the API ──────────────────────────────────────────
STRUCTURE_TYPE_VALUES = [t.value for t in AcademicStructureType]


class AcademicStructureSchema(Schema):
    """Full schema – used for single-record GET / POST / PUT responses."""

    # dump-only
    id             = fields.Integer(dump_only=True)
    subjects_count = fields.Method("get_subjects_count", dump_only=True)
    staff_count    = fields.Method("get_staff_count",    dump_only=True)
    created_at     = fields.DateTime(dump_only=True)
    updated_at     = fields.DateTime(dump_only=True)

    # bidirectional
    name           = fields.String(required=True, validate=validate.Length(min=1, max=100))
    code           = fields.String(required=True, validate=validate.Length(min=1, max=20))
    description    = fields.String(allow_none=True)
    head_id        = fields.Integer(allow_none=True)
    parent_id      = fields.Integer(allow_none=True)
    display_order  = fields.Integer(load_default=0)
    is_active      = fields.Boolean(load_default=True)
    allocated_budget = fields.Float(load_default=0.0)

    # polymorphic discriminator
    structure_type = fields.String(
        load_default=AcademicStructureType.DISCIPLINE.value,
        validate=validate.OneOf(STRUCTURE_TYPE_VALUES),
    )

    # Nested head details (dump-only)
    head = fields.Nested(
        "UserSchema",
        only=("id", "name", "email"),
        dump_only=True,
    )

    # ── Helper serialisation methods ─────────────────────────────────────────
    def get_subjects_count(self, obj):
        try:
            return obj.subjects.count()
        except Exception:
            return 0

    def get_staff_count(self, obj):
        try:
            return len(obj.staff) if hasattr(obj, "staff") else 0
        except Exception:
            return 0

    @pre_load
    def normalise_structure_type(self, data, **kwargs):
        """Accept plain 'department' as an alias for 'discipline'."""
        if "structure_type" in data and data["structure_type"] == "department":
            data["structure_type"] = AcademicStructureType.DISCIPLINE.value
        return data

    @post_load
    def coerce_enum(self, data, **kwargs):
        """Convert structure_type string to enum instance for SQLAlchemy."""
        if "structure_type" in data and isinstance(data["structure_type"], str):
            data["structure_type"] = AcademicStructureType(data["structure_type"])
        return data


class AcademicStructureListSchema(Schema):
    """Slim schema for list responses and dropdown population."""

    id             = fields.Integer(dump_only=True)
    name           = fields.String()
    code           = fields.String()
    description    = fields.String(allow_none=True)
    structure_type = fields.String()
    is_active      = fields.Boolean()
    display_order  = fields.Integer()
    subjects_count = fields.Method("get_subjects_count", dump_only=True)

    def get_subjects_count(self, obj):
        try:
            return obj.subjects.count()
        except Exception:
            return 0


# ── Backward-compat aliases ───────────────────────────────────────────────────
# Old code that imports DepartmentSchema keeps working.
DepartmentSchema = AcademicStructureSchema
DepartmentListSchema = AcademicStructureListSchema