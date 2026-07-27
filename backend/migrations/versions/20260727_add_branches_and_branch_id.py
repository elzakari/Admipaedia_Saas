"""Create branches table and add branch_id to classes

Revision ID: 20260727_branches_classes
Revises: 20260727_user_role_assign_det
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers — must be <= 32 chars
revision = '20260727_branches_classes'
down_revision = '20260727_user_role_assign_det'
branch_labels = None
depends_on = None


def _table_exists(conn, table: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = :t"
    ), {"t": table}).fetchone()
    return result is not None


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).fetchone()
    return result is not None


def upgrade():
    conn = op.get_bind()

    # 1. Create branches table
    if not _table_exists(conn, 'branches'):
        op.create_table(
            'branches',
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('code', sa.String(50), nullable=True),
            sa.Column('address', sa.String(255), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_branches_tenant_id', 'branches', ['tenant_id'])

    # 2. Add branch_id to classes table
    if _table_exists(conn, 'classes') and not _column_exists(conn, 'classes', 'branch_id'):
        op.add_column(
            'classes',
            sa.Column('branch_id', UUID(as_uuid=True), sa.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True)
        )
        op.create_index('ix_classes_branch_id', 'classes', ['branch_id'])

    # 3. Add branch_id to attendances table
    if _table_exists(conn, 'attendances') and not _column_exists(conn, 'attendances', 'branch_id'):
        op.add_column(
            'attendances',
            sa.Column('branch_id', UUID(as_uuid=True), sa.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True)
        )


def downgrade():
    conn = op.get_bind()

    if _table_exists(conn, 'attendances') and _column_exists(conn, 'attendances', 'branch_id'):
        op.drop_column('attendances', 'branch_id')

    if _table_exists(conn, 'classes') and _column_exists(conn, 'classes', 'branch_id'):
        op.drop_index('ix_classes_branch_id', table_name='classes')
        op.drop_column('classes', 'branch_id')

    if _table_exists(conn, 'branches'):
        op.drop_index('ix_branches_tenant_id', table_name='branches')
        op.drop_table('branches')
