"""Alter users.status length, create email_verification_tokens table, add students.profile_picture

Revision ID: 20260727_fix_status_student_pic
Revises: 20260726_session_tokens_stu_br
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers — must be <= 32 chars
revision = '20260727_fix_status_student_pic'
down_revision = '20260726_session_tokens_stu_br'
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

    # -- 1. Expand users.status VARCHAR length from 20 to 50 -----------------
    if _column_exists(conn, 'users', 'status'):
        op.alter_column('users', 'status', type_=sa.String(50), existing_type=sa.String(20), nullable=True)

    # -- 2. email_verification_tokens table -----------------------------------
    if not _table_exists(conn, 'email_verification_tokens'):
        op.create_table(
            'email_verification_tokens',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('token_hash', sa.String(64), nullable=False, unique=True, index=True),
            sa.Column('expires_at', sa.DateTime(), nullable=False, index=True),
            sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('used_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )

    # -- 3. students.profile_picture column -----------------------------------
    if not _column_exists(conn, 'students', 'profile_picture'):
        op.add_column('students', sa.Column('profile_picture', sa.String(255), nullable=True))

    if not _column_exists(conn, 'students', 'profile_picture_locked'):
        op.add_column('students', sa.Column('profile_picture_locked', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade():
    conn = op.get_bind()

    if _column_exists(conn, 'students', 'profile_picture_locked'):
        op.drop_column('students', 'profile_picture_locked')

    if _column_exists(conn, 'students', 'profile_picture'):
        op.drop_column('students', 'profile_picture')

    if _table_exists(conn, 'email_verification_tokens'):
        op.drop_table('email_verification_tokens')

    if _column_exists(conn, 'users', 'status'):
        op.alter_column('users', 'status', type_=sa.String(20), existing_type=sa.String(50), nullable=True)
