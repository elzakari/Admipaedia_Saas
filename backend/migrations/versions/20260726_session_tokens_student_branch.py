"""Create session_tokens table and add branch_id to students table

Revision ID: 20260726_session_tokens_stu_br
Revises: 20260726_security_tables
Create Date: 2026-07-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers — must be <= 32 chars
revision = '20260726_session_tokens_stu_br'
down_revision = '20260726_security_tables'
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

    # -- 1. session_tokens table ---------------------------------------------
    if not _table_exists(conn, 'session_tokens'):
        op.create_table(
            'session_tokens',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('jti', sa.String(36), unique=True, nullable=False, index=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('token_type', sa.String(20), nullable=False),
            sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default=sa.text('false'), index=True),
            sa.Column('ip_address', sa.String(45), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('device_fingerprint', sa.String(64), nullable=True),
            sa.Column('issued_at', sa.DateTime(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False, index=True),
            sa.Column('revoked_at', sa.DateTime(), nullable=True),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),
            sa.Column('revocation_reason', sa.String(100), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )

    # -- 2. students.branch_id ------------------------------------------------
    if not _column_exists(conn, 'students', 'branch_id'):
        fk_clause = "REFERENCES branches(id) ON DELETE SET NULL" if _table_exists(conn, 'branches') else ""
        fk_kwargs = {'foreign_key': sa.ForeignKey('branches.id', ondelete='SET NULL')} if _table_exists(conn, 'branches') else {}
        
        op.add_column('students', sa.Column(
            'branch_id',
            UUID(as_uuid=True),
            nullable=True,
            index=True,
            **fk_kwargs
        ))


def downgrade():
    conn = op.get_bind()

    if _column_exists(conn, 'students', 'branch_id'):
        op.drop_column('students', 'branch_id')

    if _table_exists(conn, 'session_tokens'):
        op.drop_table('session_tokens')
