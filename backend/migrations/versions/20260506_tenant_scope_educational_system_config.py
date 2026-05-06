"""tenant_scope_educational_system_config

Revision ID: 20260506_edu_sys_001
Revises: 20260506_fix_legacy_002
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260506_edu_sys_001'
down_revision = '20260506_fix_legacy_002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('educational_system_config', sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('ix_educational_system_config_tenant_id', 'educational_system_config', ['tenant_id'], unique=False)
    op.create_foreign_key(
        'fk_educational_system_config_tenant_id',
        'educational_system_config',
        'tenants',
        ['tenant_id'],
        ['id'],
    )

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
UPDATE educational_system_config
SET tenant_id = COALESCE(
  (SELECT id FROM tenants WHERE slug = 'legacy-school' LIMIT 1),
  (SELECT id FROM tenants ORDER BY created_at DESC NULLS LAST LIMIT 1),
  (SELECT id FROM tenants LIMIT 1)
)
WHERE tenant_id IS NULL
            """
        )
    )

    op.alter_column('educational_system_config', 'tenant_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.create_index(
        'uq_educational_system_config_active_per_tenant',
        'educational_system_config',
        ['tenant_id'],
        unique=True,
        postgresql_where=sa.text('is_active'),
    )

    op.add_column('grade_levels', sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('ix_grade_levels_tenant_id', 'grade_levels', ['tenant_id'], unique=False)
    op.create_foreign_key('fk_grade_levels_tenant_id', 'grade_levels', 'tenants', ['tenant_id'], ['id'])

    conn.execute(
        sa.text(
            """
UPDATE grade_levels gl
SET tenant_id = esc.tenant_id
FROM educational_system_config esc
WHERE gl.educational_system_id = esc.id
  AND gl.tenant_id IS NULL
            """
        )
    )

    conn.execute(
        sa.text(
            """
UPDATE grade_levels
SET tenant_id = COALESCE(
  (SELECT id FROM tenants WHERE slug = 'legacy-school' LIMIT 1),
  (SELECT id FROM tenants ORDER BY created_at DESC NULLS LAST LIMIT 1),
  (SELECT id FROM tenants LIMIT 1)
)
WHERE tenant_id IS NULL
            """
        )
    )

    op.alter_column('grade_levels', 'tenant_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)


def downgrade():
    op.drop_constraint('fk_grade_levels_tenant_id', 'grade_levels', type_='foreignkey')
    op.drop_index('ix_grade_levels_tenant_id', table_name='grade_levels')
    op.drop_column('grade_levels', 'tenant_id')

    op.drop_index('uq_educational_system_config_active_per_tenant', table_name='educational_system_config')
    op.drop_constraint('fk_educational_system_config_tenant_id', 'educational_system_config', type_='foreignkey')
    op.drop_index('ix_educational_system_config_tenant_id', table_name='educational_system_config')
    op.drop_column('educational_system_config', 'tenant_id')

