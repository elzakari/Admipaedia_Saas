"""add_tenant_academic_settings

Revision ID: 20260506_tenant_academic_settings_001
Revises: 20260506_academic_terms_001
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260506_tenant_academic_settings_001'
down_revision = '20260506_academic_terms_001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tenant_academic_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_tenant_academic_settings_tenant_id'),
        sa.UniqueConstraint('tenant_id', name='uq_tenant_academic_settings_tenant_id'),
    )
    op.create_index('ix_tenant_academic_settings_tenant_id', 'tenant_academic_settings', ['tenant_id'], unique=False)


def downgrade():
    op.drop_index('ix_tenant_academic_settings_tenant_id', table_name='tenant_academic_settings')
    op.drop_table('tenant_academic_settings')

