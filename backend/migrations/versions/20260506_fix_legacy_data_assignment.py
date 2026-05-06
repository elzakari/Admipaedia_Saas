"""fix_legacy_data_assignment

Fixes a tenant backfill issue where pre-existing (legacy) data may have been assigned to the most recently created tenant.
Moves legacy rows into a dedicated "legacy-school" tenant.

Revision ID: 20260506_fix_legacy_001
Revises: 20260506_merge_heads_001
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import uuid
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260506_fix_legacy_001'
down_revision = '20260506_merge_heads_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    legacy_id = conn.execute(
        sa.text("SELECT id FROM public.tenants WHERE slug = :slug LIMIT 1"),
        {"slug": "legacy-school"},
    ).scalar()

    if legacy_id is None:
        new_id = uuid.uuid4()
        legacy_id = conn.execute(
            sa.text(
                """
INSERT INTO public.tenants (id, slug, name, country_code, schema_name, status)
VALUES (:id, :slug, :name, :country_code, :schema_name, 'active')
RETURNING id
                """
            ),
            {
                "id": str(new_id),
                "slug": "legacy-school",
                "name": "Legacy School",
                "country_code": "GH",
                "schema_name": "tenant_legacy_school",
            },
        ).scalar()

    latest = conn.execute(
        sa.text("SELECT id, created_at FROM public.tenants ORDER BY created_at DESC NULLS LAST LIMIT 1")
    ).first()
    if not latest:
        return

    latest_tenant_id = latest[0]
    latest_created_at = latest[1]

    if latest_tenant_id is None or latest_created_at is None:
        return

    if str(latest_tenant_id) == str(legacy_id):
        return

    def move(table: str):
        conn.execute(
            sa.text(
                f"""
UPDATE {table}
SET tenant_id = :legacy_id
WHERE tenant_id = :latest_id
  AND created_at < :latest_created_at
                """
            ),
            {"legacy_id": legacy_id, "latest_id": latest_tenant_id, "latest_created_at": latest_created_at},
        )

    for t in ("students", "teachers", "staff", "parents", "classes", "subjects", "departments"):
        move(t)


def downgrade():
    pass
