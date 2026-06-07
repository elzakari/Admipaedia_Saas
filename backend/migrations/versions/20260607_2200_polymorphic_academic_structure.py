"""polymorphic_academic_structure

Revision ID: 20260607_2200_polymorphic_academic_structure
Revises: 20260605_2300_fix_notifications_id
Create Date: 2026-06-07 22:00:00.000000

Adds the polymorphic discriminator column and supporting fields to the
existing `departments` table so that Disciplines, School Cycles, and
Operational divisions can all live in a single table.

Idempotent: all operations check for column existence before altering.
"""
from alembic import op
import sqlalchemy as sa

revision     = "20260607_2200_polymorphic_academic_structure"
down_revision = "20260605_2300_fix_notifications_id"
branch_labels = None
depends_on    = None


def _col_exists(connection, table, column):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return result.fetchone() is not None


def _enum_exists(connection, name):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM pg_type WHERE typname = :n"
        ),
        {"n": name},
    )
    return result.fetchone() is not None


def _constraint_exists(connection, table, constraint):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE table_name = :t AND constraint_name = :c"
        ),
        {"t": table, "c": constraint},
    )
    return result.fetchone() is not None


def upgrade():
    conn = op.get_bind()

    # 1. Create the Postgres enum type if it doesn't already exist
    if not _enum_exists(conn, "academic_structure_type"):
        op.execute(
            "CREATE TYPE academic_structure_type AS ENUM "
            "('discipline', 'cycle', 'operational')"
        )

    # 2. Add `structure_type` discriminator column
    if not _col_exists(conn, "departments", "structure_type"):
        op.add_column(
            "departments",
            sa.Column(
                "structure_type",
                sa.Enum(
                    "discipline", "cycle", "operational",
                    name="academic_structure_type",
                    create_type=False,   # already created above
                ),
                nullable=False,
                server_default="discipline",
            ),
        )
        # Back-fill existing rows → DISCIPLINE
        op.execute(
            "UPDATE departments SET structure_type = 'discipline' "
            "WHERE structure_type IS NULL"
        )

    # 3. Widen `code` column from VARCHAR(10) → VARCHAR(20)
    #    The new auto-generated codes are up to 16 chars (e.g. MAT-01101-001)
    op.execute(
        "ALTER TABLE departments "
        "ALTER COLUMN code TYPE VARCHAR(20)"
    )

    # 4. Add `parent_id` for hierarchy support (nullable)
    if not _col_exists(conn, "departments", "parent_id"):
        op.add_column(
            "departments",
            sa.Column(
                "parent_id",
                sa.Integer,
                sa.ForeignKey("departments.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )

    # 5. Add `display_order` for ordered list rendering
    if not _col_exists(conn, "departments", "display_order"):
        op.add_column(
            "departments",
            sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        )

    # 6. Drop the old (tenant_id, name) uniqueness constraint and replace with
    #    (tenant_id, name, structure_type) — same name can exist across types.
    old_uc = "uq_departments_tenant_name"
    new_uc = "uq_departments_tenant_name_type"
    if _constraint_exists(conn, "departments", old_uc):
        op.drop_constraint(old_uc, "departments", type_="unique")
    if not _constraint_exists(conn, "departments", new_uc):
        op.create_unique_constraint(
            new_uc,
            "departments",
            ["tenant_id", "name", "structure_type"],
        )

    # 7. Index on structure_type for fast filtered queries
    try:
        op.create_index(
            "ix_departments_structure_type",
            "departments",
            ["structure_type"],
        )
    except Exception:
        pass  # already exists


def downgrade():
    conn = op.get_bind()

    try:
        op.drop_index("ix_departments_structure_type", table_name="departments")
    except Exception:
        pass

    new_uc = "uq_departments_tenant_name_type"
    old_uc = "uq_departments_tenant_name"
    if _constraint_exists(conn, "departments", new_uc):
        op.drop_constraint(new_uc, "departments", type_="unique")
    if not _constraint_exists(conn, "departments", old_uc):
        op.create_unique_constraint(old_uc, "departments", ["tenant_id", "name"])

    if _col_exists(conn, "departments", "display_order"):
        op.drop_column("departments", "display_order")

    if _col_exists(conn, "departments", "parent_id"):
        op.drop_column("departments", "parent_id")

    op.execute("ALTER TABLE departments ALTER COLUMN code TYPE VARCHAR(10)")

    if _col_exists(conn, "departments", "structure_type"):
        op.drop_column("departments", "structure_type")

    if _enum_exists(conn, "academic_structure_type"):
        op.execute("DROP TYPE academic_structure_type")
