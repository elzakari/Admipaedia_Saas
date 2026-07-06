"""add_student_profile_picture_lock

Revision ID: 20260706_1315_add_student_profile_picture_lock
Revises: 20260703_2330_unify_student_daily_attendance
Create Date: 2026-07-06 13:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260706_1315_add_student_profile_picture_lock'
down_revision = '20260703_2330_unify_student_daily_attendance'
branch_labels = None
depends_on = None


def _column_info(connection, table_name):
    if connection.dialect.name == 'sqlite':
        result = connection.execute(sa.text(f"PRAGMA table_info('{table_name}')"))
        return {row[1]: row for row in result.fetchall()}

    result = connection.execute(
        sa.text(
            "SELECT column_name "
            "FROM information_schema.columns "
            "WHERE table_name = :table_name"
        ),
        {"table_name": table_name},
    )
    return {row[0]: row for row in result.fetchall()}


def upgrade():
    connection = op.get_bind()
    column_info = _column_info(connection, 'students')

    with op.batch_alter_table('students') as batch_op:
        if 'profile_picture_locked' not in column_info:
            batch_op.add_column(
                sa.Column('profile_picture_locked', sa.Boolean(), nullable=False, server_default=sa.false())
            )


def downgrade():
    connection = op.get_bind()
    column_info = _column_info(connection, 'students')

    with op.batch_alter_table('students') as batch_op:
        if 'profile_picture_locked' in column_info:
            batch_op.drop_column('profile_picture_locked')
