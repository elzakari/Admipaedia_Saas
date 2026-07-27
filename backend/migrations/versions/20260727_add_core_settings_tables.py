"""Create system_settings, academic_years, and terms tables

Revision ID: 20260727_core_settings_tables
Revises: 20260727_branches_classes
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers — must be <= 32 chars
revision = '20260727_core_settings_tables'
down_revision = '20260727_branches_classes'
branch_labels = None
depends_on = None


def _table_exists(conn, table: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = :t"
    ), {"t": table}).fetchone()
    return result is not None


def upgrade():
    conn = op.get_bind()

    # 1. Create system_settings table
    if not _table_exists(conn, 'system_settings'):
        op.create_table(
            'system_settings',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('key', sa.String(100), unique=True, nullable=False),
            sa.Column('value', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('setting_type', sa.String(50), server_default='string'),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_system_settings_key', 'system_settings', ['key'], unique=True)

    # 2. Create academic_years table
    if not _table_exists(conn, 'academic_years'):
        op.create_table(
            'academic_years',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(50), unique=True, nullable=False),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )

    # 3. Create terms table
    if not _table_exists(conn, 'terms'):
        op.create_table(
            'terms',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(50), nullable=False),
            sa.Column('academic_year_id', sa.Integer(), sa.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=False),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_terms_academic_year_id', 'terms', ['academic_year_id'])


def downgrade():
    conn = op.get_bind()

    if _table_exists(conn, 'terms'):
        op.drop_index('ix_terms_academic_year_id', table_name='terms')
        op.drop_table('terms')

    if _table_exists(conn, 'academic_years'):
        op.drop_table('academic_years')

    if _table_exists(conn, 'system_settings'):
        op.drop_index('ix_system_settings_key', table_name='system_settings')
        op.drop_table('system_settings')
