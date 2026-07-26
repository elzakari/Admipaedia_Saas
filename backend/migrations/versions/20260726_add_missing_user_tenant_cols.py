"""Add missing user invitation cols and tenant setup flags

Revision ID: 20260726_add_missing_cols
Revises: 20260706_stu_pic_lock
Create Date: 2026-07-26

Adds columns that exist in the SQLAlchemy models but were never added
to the database via a migration, causing UndefinedColumn errors in CI:

  users:
    - invitation_token_hash  VARCHAR(255) nullable
    - invitation_expires_at  TIMESTAMP nullable

  tenants:
    - is_setup_completed     BOOLEAN default false
    - is_hq                  BOOLEAN default false
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers — must be ≤ 32 chars
revision = '20260726_add_missing_cols'
down_revision = '20260706_stu_pic_lock'
branch_labels = None
depends_on = None


# ── helpers ───────────────────────────────────────────────────────────────────

def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).fetchone()
    return result is not None


# ── upgrade ───────────────────────────────────────────────────────────────────

def upgrade():
    conn = op.get_bind()

    # -- users: invitation columns -------------------------------------------
    if not _column_exists(conn, 'users', 'invitation_token_hash'):
        op.add_column('users', sa.Column(
            'invitation_token_hash', sa.String(255), nullable=True
        ))

    if not _column_exists(conn, 'users', 'invitation_expires_at'):
        op.add_column('users', sa.Column(
            'invitation_expires_at', sa.DateTime(), nullable=True
        ))

    # -- tenants: setup / hq flags -------------------------------------------
    if not _column_exists(conn, 'tenants', 'is_setup_completed'):
        op.add_column('tenants', sa.Column(
            'is_setup_completed',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false')
        ))

    if not _column_exists(conn, 'tenants', 'is_hq'):
        op.add_column('tenants', sa.Column(
            'is_hq',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false')
        ))


# ── downgrade ─────────────────────────────────────────────────────────────────

def downgrade():
    conn = op.get_bind()

    if _column_exists(conn, 'tenants', 'is_hq'):
        op.drop_column('tenants', 'is_hq')

    if _column_exists(conn, 'tenants', 'is_setup_completed'):
        op.drop_column('tenants', 'is_setup_completed')

    if _column_exists(conn, 'users', 'invitation_expires_at'):
        op.drop_column('users', 'invitation_expires_at')

    if _column_exists(conn, 'users', 'invitation_token_hash'):
        op.drop_column('users', 'invitation_token_hash')
