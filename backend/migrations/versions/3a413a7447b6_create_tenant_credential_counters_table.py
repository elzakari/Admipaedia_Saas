"""create_tenant_credential_counters_table

Revision ID: 3a413a7447b6
Revises: 20260527_add_tenant_id_to_system_settings_config
Create Date: 2026-05-29 13:21:14.579881

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3a413a7447b6'
down_revision = '20260527_add_tenant_id_to_system_settings_config'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'tenant_credential_counters' not in tables:
        op.create_table(
            'tenant_credential_counters',
            sa.Column('tenant_id', sa.String(length=36), nullable=False),
            sa.Column('year', sa.Integer(), nullable=False),
            sa.Column('last_value', sa.Integer(), server_default=sa.text('0'), nullable=False),
            sa.PrimaryKeyConstraint('tenant_id', 'year')
        )


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'tenant_credential_counters' in tables:
        op.drop_table('tenant_credential_counters')
