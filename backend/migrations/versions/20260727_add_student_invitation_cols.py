"""Add invitation_token_hash and invitation_expires_at to students table

Revision ID: 20260727_stu_invitation_cols
Revises: 20260727_fix_status_student_pic
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers — must be <= 32 chars
revision = '20260727_stu_invitation_cols'
down_revision = '20260727_fix_status_student_pic'
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).fetchone()
    return result is not None


def upgrade():
    conn = op.get_bind()

    if not _column_exists(conn, 'students', 'invitation_token_hash'):
        op.add_column('students', sa.Column('invitation_token_hash', sa.String(255), nullable=True))

    if not _column_exists(conn, 'students', 'invitation_expires_at'):
        op.add_column('students', sa.Column('invitation_expires_at', sa.DateTime(), nullable=True))


def downgrade():
    conn = op.get_bind()

    if _column_exists(conn, 'students', 'invitation_expires_at'):
        op.drop_column('students', 'invitation_expires_at')

    if _column_exists(conn, 'students', 'invitation_token_hash'):
        op.drop_column('students', 'invitation_token_hash')
