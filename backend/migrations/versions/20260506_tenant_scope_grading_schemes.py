"""tenant_scope_grading_schemes

Revision ID: 20260506_tenant_grading_schemes_001
Revises: 20260506_tenant_academic_settings_001
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260506_tenant_grading_schemes_001'
down_revision = '20260506_tenant_academic_settings_001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('grading_schemes', sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('grading_schemes', sa.Column('grade_level_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('ix_grading_schemes_tenant_id', 'grading_schemes', ['tenant_id'], unique=False)
    op.create_index('ix_grading_schemes_grade_level_id', 'grading_schemes', ['grade_level_id'], unique=False)
    op.create_foreign_key('fk_grading_schemes_tenant_id', 'grading_schemes', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key('fk_grading_schemes_grade_level_id', 'grading_schemes', 'grade_levels', ['grade_level_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_grading_schemes_grade_level_id', 'grading_schemes', type_='foreignkey')
    op.drop_constraint('fk_grading_schemes_tenant_id', 'grading_schemes', type_='foreignkey')
    op.drop_index('ix_grading_schemes_grade_level_id', table_name='grading_schemes')
    op.drop_index('ix_grading_schemes_tenant_id', table_name='grading_schemes')
    op.drop_column('grading_schemes', 'grade_level_id')
    op.drop_column('grading_schemes', 'tenant_id')

