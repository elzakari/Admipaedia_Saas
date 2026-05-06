"""fix_legacy_data_assignment_all_tenants

Ensures tenants created after legacy data existed do not "inherit" that data.
Moves any rows whose created_at predates their tenant's created_at into the dedicated legacy-school tenant.

Revision ID: 20260506_fix_legacy_002
Revises: 20260506_fix_legacy_001
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import uuid
import sqlalchemy as sa


revision = '20260506_fix_legacy_002'
down_revision = '20260506_fix_legacy_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    legacy_id = conn.execute(
        sa.text("SELECT id FROM public.tenants WHERE slug = :slug LIMIT 1"),
        {"slug": "legacy-school"},
    ).scalar()

    if legacy_id is None:
        legacy_id = conn.execute(
            sa.text(
                """
INSERT INTO public.tenants (id, slug, name, country_code, schema_name, status)
VALUES (:id, :slug, :name, :country_code, :schema_name, 'active')
RETURNING id
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "slug": "legacy-school",
                "name": "Legacy School",
                "country_code": "GH",
                "schema_name": "tenant_legacy_school",
            },
        ).scalar()

    def move(table: str):
        conn.execute(
            sa.text(
                f"""
UPDATE {table} r
SET tenant_id = :legacy_id
FROM public.tenants t
WHERE r.tenant_id = t.id
  AND t.slug <> 'legacy-school'
  AND t.created_at IS NOT NULL
  AND r.created_at IS NOT NULL
  AND r.created_at < t.created_at
                """
            ),
            {"legacy_id": legacy_id},
        )

    for t in ("students", "teachers", "staff", "parents", "classes", "subjects", "departments"):
        move(t)


def downgrade():
    pass

