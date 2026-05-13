"""add_academic_terms

Revision ID: 20260506_academic_terms_001
Revises: 20260506_edu_tpl_001
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260506_academic_terms_001'
down_revision = '20260506_edu_tpl_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if insp.has_table('academic_terms'):
        return

    op.create_table(
        'academic_terms',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_academic_terms_tenant_id'),
    )
    op.create_index('ix_academic_terms_tenant_id', 'academic_terms', ['tenant_id'], unique=False)


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if not insp.has_table('academic_terms'):
        return
    op.drop_index('ix_academic_terms_tenant_id', table_name='academic_terms')
    op.drop_table('academic_terms')

