"""Create user_role_assignments_detailed table

Revision ID: 20260727_user_role_assign_det
Revises: 20260727_stu_invitation_cols
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers — must be <= 32 chars
revision = '20260727_user_role_assign_det'
down_revision = '20260727_stu_invitation_cols'
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

    if not _table_exists(conn, 'user_role_assignments_detailed'):
        op.create_table(
            'user_role_assignments_detailed',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('role_id', sa.Integer(), sa.ForeignKey('rbac_roles.id'), nullable=False, index=True),
            sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('assigned_reason', sa.String(255), nullable=True),
            sa.Column('assigned_at', sa.DateTime(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('is_temporary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('context_data', sa.JSON(), nullable=True),
        )


def downgrade():
    conn = op.get_bind()

    if _table_exists(conn, 'user_role_assignments_detailed'):
        op.drop_table('user_role_assignments_detailed')
