"""unify_student_daily_attendance

Revision ID: 20260703_2330_unify_student_daily_attendance
Revises: 20260703_2100_add_announcement_scope_and_tenant
Create Date: 2026-07-03 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260703_2330_unify_student_daily_attendance'
down_revision = '20260703_2100_add_announcement_scope_and_tenant'
branch_labels = None
depends_on = None


def _column_info(connection, table_name):
    if connection.dialect.name == 'sqlite':
        result = connection.execute(sa.text(f"PRAGMA table_info('{table_name}')"))
        return {row[1]: row for row in result.fetchall()}

    result = connection.execute(
        sa.text(
            "SELECT column_name, is_nullable "
            "FROM information_schema.columns "
            "WHERE table_name = :table_name"
        ),
        {"table_name": table_name},
    )
    return {row[0]: row for row in result.fetchall()}


def _unique_constraint_exists(connection, table_name, constraint_name):
    inspector = sa.inspect(connection)
    for constraint in inspector.get_unique_constraints(table_name):
        if constraint.get('name') == constraint_name:
            return True
    return False


def _dedupe_daily_attendance(connection):
    duplicate_groups = connection.execute(
        sa.text(
            "SELECT student_id, class_id, date, COUNT(*) AS duplicate_count "
            "FROM attendances "
            "GROUP BY student_id, class_id, date "
            "HAVING COUNT(*) > 1"
        )
    ).fetchall()

    for group in duplicate_groups:
        rows = connection.execute(
            sa.text(
                "SELECT id "
                "FROM attendances "
                "WHERE student_id = :student_id AND class_id = :class_id AND date = :date "
                "ORDER BY COALESCE(updated_at, created_at) DESC, id DESC"
            ),
            {
                "student_id": group[0],
                "class_id": group[1],
                "date": group[2],
            },
        ).fetchall()

        for duplicate in rows[1:]:
            connection.execute(
                sa.text("DELETE FROM attendances WHERE id = :attendance_id"),
                {"attendance_id": duplicate[0]},
            )


def upgrade():
    connection = op.get_bind()
    column_info = _column_info(connection, 'attendances')

    _dedupe_daily_attendance(connection)

    with op.batch_alter_table('attendances') as batch_op:
        if 'subject_id' in column_info:
            batch_op.alter_column('subject_id', existing_type=sa.Integer(), nullable=True)
        if not _unique_constraint_exists(connection, 'attendances', 'uq_attendance_student_class_date'):
            batch_op.create_unique_constraint(
                'uq_attendance_student_class_date',
                ['student_id', 'class_id', 'date'],
            )


def downgrade():
    connection = op.get_bind()

    with op.batch_alter_table('attendances') as batch_op:
        if _unique_constraint_exists(connection, 'attendances', 'uq_attendance_student_class_date'):
            batch_op.drop_constraint('uq_attendance_student_class_date', type_='unique')
