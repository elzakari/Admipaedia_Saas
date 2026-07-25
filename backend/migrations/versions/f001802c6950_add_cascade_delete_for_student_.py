"""Add cascade delete for student relationships

Revision ID: f001802c6950
Revises: c0ad95607842
Create Date: 2025-06-14 00:57:36.710489

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f001802c6950'
down_revision = 'c0ad95607842'
branch_labels = None
depends_on = None


def _table_exists(connection, table_name):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = current_schema() AND table_name = :table_name"
        ),
        {"table_name": table_name},
    )
    return result.fetchone() is not None


def _column_exists(connection, table_name, column_name):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = current_schema() "
            "AND table_name = :table_name "
            "AND column_name = :column_name"
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    return result.fetchone() is not None


def _ensure_student_cascade(connection, table_name, constraint_name):
    if not _table_exists(connection, table_name) or not _column_exists(connection, table_name, 'student_id'):
        return

    op.execute(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {constraint_name}")
    op.execute(
        f"ALTER TABLE {table_name} "
        f"ADD CONSTRAINT {constraint_name} "
        f"FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE"
    )


def _restore_student_fk(connection, table_name, constraint_name):
    if not _table_exists(connection, table_name) or not _column_exists(connection, table_name, 'student_id'):
        return

    op.execute(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {constraint_name}")
    op.execute(
        f"ALTER TABLE {table_name} "
        f"ADD CONSTRAINT {constraint_name} "
        f"FOREIGN KEY (student_id) REFERENCES students (id)"
    )


def upgrade():
    connection = op.get_bind()
    _ensure_student_cascade(connection, 'attendances', 'attendances_student_id_fkey')
    _ensure_student_cascade(connection, 'grades', 'grades_student_id_fkey')


def downgrade():
    connection = op.get_bind()
    _restore_student_fk(connection, 'grades', 'grades_student_id_fkey')
    _restore_student_fk(connection, 'attendances', 'attendances_student_id_fkey')
