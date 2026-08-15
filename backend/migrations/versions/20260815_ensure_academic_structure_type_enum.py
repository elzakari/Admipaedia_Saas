"""ensure_academic_structure_type_enum_labels

Revision ID: 20260815_ensure_acad_struct_enum
Revises: 20260726_add_missing_cols
Create Date: 2026-08-15 13:00:00.000000

Idempotent fix for native Postgres enum `academic_structure_type`.

Confirmed root cause: the polymorphic Academic Structure migration (2026-06-07)
created the enum IF NOT EXISTS with three labels: 'discipline', 'cycle',
'operational'. But if the enum had been previously created by an older
migration with only a subset (e.g. {'discipline','cycle'}), the `else`
branch only did a RENAME VALUE for uppercase -> lowercase and **never
issued ALTER TYPE ... ADD VALUE**. That caused Postgres SQLSTATE 22P02
"invalid input value for enum academic_structure_type: 'operational'"
while SQLAlchemy correctly bound the label.

This migration guarantees that every Python
:class:`AcademicStructureType` member exists as a lowercase label in
the native Postgres enum. Every operation is wrapped in a PL/pgSQL
``DO $$ ... EXCEPTION WHEN duplicate_object ... END $$`` block so the
migration is safe to re-run and never fails on stale/partial envs.

Also performs uppercase->lowercase RENAME VALUE (idempotently) for every
member where an uppercase label exists but the lowercase does not, so
legacy partial enums are normalized to the same set before ADD VALUE.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260815_ensure_acad_struct_enum"
down_revision = "20260726_add_missing_cols"
branch_labels = None
depends_on = None


ENUM_NAME = "academic_structure_type"
EXPECTED_LABELS = ("discipline", "cycle", "operational")


def _enum_exists(conn, name):
    return conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :n"), {"n": name}
    ).fetchone() is not None


def _enum_labels(conn, name):
    rows = conn.execute(
        sa.text(
            "SELECT e.enumlabel "
            "FROM pg_type t "
            "JOIN pg_enum e ON t.oid = e.enumtypid "
            "WHERE t.typname = :n "
            "ORDER BY e.enumsortorder"
        ),
        {"n": name},
    ).fetchall()
    return {r[0] for r in rows}


def upgrade():
    conn = op.get_bind()

    # 1. Create the enum type if it doesn't exist yet (safety net — the
    #    20260607 migration should have already done this, but on envs
    #    where a downgrade was partially applied this repairs it).
    if not _enum_exists(conn, ENUM_NAME):
        op.execute(
            "CREATE TYPE academic_structure_type AS ENUM "
            "('discipline', 'cycle', 'operational')"
        )
        return

    current_labels = _enum_labels(conn, ENUM_NAME)

    # 2. For every expected member:
    #    If uppercase label exists and lowercase does not -> RENAME VALUE.
    #    Then: ADD VALUE the lowercase label IF NOT EXISTS (wrapped DO block).
    for label in EXPECTED_LABELS:
        upper_label = label.upper()
        if upper_label in current_labels and label not in current_labels:
            op.execute(
                f"ALTER TYPE {ENUM_NAME} "
                f"RENAME VALUE '{upper_label}' TO '{label}'"
            )
            # Refresh the set of known labels after each rename so we don't
            # try to ADD VALUE something that is now present.
            current_labels = _enum_labels(conn, ENUM_NAME)

        if label in current_labels:
            continue

        # PL/pgSQL block: ALTER TYPE ADD VALUE *cannot run inside a
        # transaction block with concurrent DDL* in older Postgres
        # releases (pre-12 behavior). Wrapping with duplicate_object
        # exception handling keeps it idempotent.
        op.execute(
            f"DO $$\n"
            f"BEGIN\n"
            f"    ALTER TYPE {ENUM_NAME} ADD VALUE IF NOT EXISTS '{label}';\n"
            f"EXCEPTION WHEN duplicate_object OR unique_violation THEN\n"
            f"    -- label already present by concurrent migration / previous run\n"
            f"    NULL;\n"
            f"END $$;"
        )

    # 3. Sanity-check: re-query labels. If any expected label is still
    #    missing after the repair block -> raise an explicit exception so
    #    a human must investigate.
    final_labels = _enum_labels(conn, ENUM_NAME)
    missing = [lab for lab in EXPECTED_LABELS if lab not in final_labels]
    if missing:
        raise RuntimeError(
            f"Postgres enum '{ENUM_NAME}' is still missing label(s) "
            f"{missing!r} after migration. Actual labels: {sorted(final_labels)!r}. "
            f"Manual intervention required: connect to prod and run:\n"
            f"  ALTER TYPE {ENUM_NAME} ADD VALUE IF NOT EXISTS '<label>';\n"
            f"for each missing label, then re-run `flask db upgrade`."
        )


def downgrade():
    # Downgrade is intentionally a no-op. Removing enum labels would
    # require rewriting every row that references the value, which is a
    # data-loss risk and unnecessary — the forward migration has already
    # guaranteed every label exists; keeping extras on downgrade is safe.
    pass
