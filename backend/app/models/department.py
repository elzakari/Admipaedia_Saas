"""
Unified Academic Structure Model
---------------------------------
Replaces the flat `Department` and the separate `AcademicCycle` model with a single
polymorphic table that can represent all three school organisation types without
database hot-fixes when a tenant's pedagogy changes.

AcademicStructureType.DISCIPLINE  — subject-area groupings  (Math, Sciences, Humanities …)
AcademicStructureType.CYCLE       — school-level divisions   (Maternelle, Primary, Junior, Lycée …)
AcademicStructureType.OPERATIONAL — administrative groupings (Finance, IT, Admissions …)

Backward-compat alias
---------------------
`Department` is kept as a direct alias of `AcademicStructure` so that all existing
imports (`from app.models.department import Department`) continue to work without
any change. The underlying __tablename__ stays `departments` to avoid a
destructive table rename migration.
"""

import enum
from datetime import datetime
from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID


# ── Polymorphic type enum ────────────────────────────────────────────────────

class AcademicStructureType(enum.Enum):
    DISCIPLINE   = "discipline"    # e.g. Mathematics, Natural Sciences, Humanities
    CYCLE        = "cycle"         # e.g. Maternelle, Primary, Junior High, Lycée
    OPERATIONAL  = "operational"   # e.g. Finance, Admissions, Maintenance, IT


# ── Unified model ─────────────────────────────────────────────────────────────

class AcademicStructure(db.Model):
    """
    Single polymorphic table that unifies academic departments, school-level
    cycles, and operational divisions.

    The `structure_type` discriminator column controls which workflow the record
    participates in:
      - DISCIPLINE  → linked via Subject.department_id; appears in subject forms
                      and teacher gradebook department dropdowns.
      - CYCLE       → linked via Class.cycle_id (nullable FK added via migration);
                      drives school-level progression UI.
      - OPERATIONAL → internal admin grouping; displayed on the staff/HR view only.
    """

    __tablename__ = "departments"
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", "structure_type",
                            name="uq_departments_tenant_name_type"),
        db.UniqueConstraint("tenant_id", "code",
                            name="uq_departments_tenant_code"),
    )

    # ── Primary key & tenancy ─────────────────────────────────────────────────
    id          = db.Column(db.Integer, primary_key=True)
    tenant_id   = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("tenants.id"),
        nullable=False,
        index=True,
    )

    # ── Polymorphic discriminator ─────────────────────────────────────────────
    structure_type = db.Column(
        db.Enum(AcademicStructureType, name="academic_structure_type"),
        nullable=False,
        default=AcademicStructureType.DISCIPLINE,
        server_default=AcademicStructureType.DISCIPLINE.value,
        index=True,
    )

    # ── Core identity fields ──────────────────────────────────────────────────
    name        = db.Column(db.String(100), nullable=False)
    code        = db.Column(db.String(20),  nullable=False)
    description = db.Column(db.Text,        nullable=True)

    # ── Leadership / management ───────────────────────────────────────────────
    head_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # ── Hierarchy: a CYCLE can have a parent CYCLE (e.g. "Primary → Lower Primary")
    #    A DISCIPLINE can have a parent DISCIPLINE (e.g. "Sciences → Physics")
    parent_id = db.Column(
        db.Integer,
        db.ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    display_order = db.Column(db.Integer, nullable=False, default=0)

    # ── Financial / operational metadata ──────────────────────────────────────
    allocated_budget = db.Column(db.Float, default=0.0, server_default="0.0")

    # ── Status ────────────────────────────────────────────────────────────────
    is_active   = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow,
                            onupdate=datetime.utcnow)

    # ── Relationships ─────────────────────────────────────────────────────────
    head = db.relationship(
        "User",
        backref="headed_department",
        foreign_keys=[head_id],
    )
    subjects = db.relationship(
        "Subject",
        backref="department_relation",
        lazy="dynamic",
    )
    children = db.relationship(
        "AcademicStructure",
        backref=db.backref("parent", remote_side="AcademicStructure.id"),
        lazy="dynamic",
        foreign_keys=[parent_id],
    )

    # ── Repr ──────────────────────────────────────────────────────────────────
    def __repr__(self):
        return (
            f"<AcademicStructure [{self.structure_type.value}] "
            f"{self.code}: {self.name}>"
        )

    # ── Convenience predicates ────────────────────────────────────────────────
    @property
    def is_discipline(self) -> bool:
        return self.structure_type == AcademicStructureType.DISCIPLINE

    @property
    def is_cycle(self) -> bool:
        return self.structure_type == AcademicStructureType.CYCLE

    @property
    def is_operational(self) -> bool:
        return self.structure_type == AcademicStructureType.OPERATIONAL

    # ── Subject code auto-generation helper (used by SubjectService) ──────────
    @staticmethod
    def binary_prefix_for_name(name: str) -> str:
        """
        Encode the first letter of *name* as a zero-padded 5-bit binary string.
        A→1, B→2 … Z→26.  Non-alpha chars default to 0 → '00000'.
        e.g. 'Mathematics' → 'M'(13) → '01101'
        """
        if not name:
            return "00000"
        letter = name.strip().upper()[0]
        val = ord(letter) - ord("A") + 1 if "A" <= letter <= "Z" else 0
        return format(val, "05b")


# ── Backward-compat alias ──────────────────────────────────────────────────────
# All existing code that does `from app.models.department import Department`
# continues to work unchanged.
Department = AcademicStructure


# ── Staff association table ────────────────────────────────────────────────────
# Kept as-is; references the same `departments` table via FK.
department_staff = db.Table(
    "department_staff",
    db.Column(
        "department_id",
        db.Integer,
        db.ForeignKey("departments.id"),
        primary_key=True,
    ),
    db.Column(
        "user_id",
        db.Integer,
        db.ForeignKey("users.id"),
        primary_key=True,
    ),
    db.Column("role",       db.String(50),  nullable=True),
    db.Column("created_at", db.DateTime,    default=datetime.utcnow),
)
