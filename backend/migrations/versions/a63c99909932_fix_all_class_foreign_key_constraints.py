"""fix_all_class_foreign_key_constraints

Revision ID: a63c99909932
Revises: 0b4b9763b6ff
Create Date: 2025-08-28 13:19:25.264893

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a63c99909932'
down_revision = '0b4b9763b6ff'
branch_labels = None
depends_on = None


def _table_exists(connection, table_name):
    inspector = sa.inspect(connection)
    return table_name in inspector.get_table_names()


def _column_exists(connection, table_name, column_name):
    if not _table_exists(connection, table_name):
        return False
    inspector = sa.inspect(connection)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _safe_fix_fk(connection, table_name, constraint_name, ref_table, local_cols, ref_cols, ondelete=None):
    actual_table = table_name
    if not _table_exists(connection, actual_table):
        if table_name == 'attendance' and _table_exists(connection, 'attendances'):
            actual_table = 'attendances'
        elif table_name == 'attendances' and _table_exists(connection, 'attendance'):
            actual_table = 'attendance'
        else:
            return

    if not _table_exists(connection, ref_table):
        return

    if not all(_column_exists(connection, actual_table, col) for col in local_cols):
        return

    op.execute(sa.text(f'ALTER TABLE "{actual_table}" DROP CONSTRAINT IF EXISTS "{constraint_name}"'))
    with op.batch_alter_table(actual_table, schema=None) as batch_op:
        kwargs = {}
        if ondelete:
            kwargs['ondelete'] = ondelete
        batch_op.create_foreign_key(constraint_name, ref_table, local_cols, ref_cols, **kwargs)


def upgrade():
    connection = op.get_bind()
    
    # Fix students.class_id - should be SET NULL (students can exist without a class)
    _safe_fix_fk(connection, 'students', 'students_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='SET NULL')
    
    # Fix attendances.class_id - should be CASCADE (attendance records are meaningless without a class)
    _safe_fix_fk(connection, 'attendances', 'attendances_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix exams.class_id - should be CASCADE (exams are class-specific)
    _safe_fix_fk(connection, 'exams', 'exams_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix grades.class_id - should be CASCADE (grades are tied to class context)
    _safe_fix_fk(connection, 'grades', 'fk_grades_class_id', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix assignments.class_id - should be CASCADE (assignments are class-specific)
    _safe_fix_fk(connection, 'assignments', 'assignments_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix class_subjects association table - should be CASCADE
    _safe_fix_fk(connection, 'class_subjects', 'class_subjects_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')


def downgrade():
    connection = op.get_bind()
    
    _safe_fix_fk(connection, 'class_subjects', 'class_subjects_class_id_fkey', 'classes', ['class_id'], ['id'])
    _safe_fix_fk(connection, 'assignments', 'assignments_class_id_fkey', 'classes', ['class_id'], ['id'])
    _safe_fix_fk(connection, 'grades', 'fk_grades_class_id', 'classes', ['class_id'], ['id'])
    _safe_fix_fk(connection, 'exams', 'exams_class_id_fkey', 'classes', ['class_id'], ['id'])
    _safe_fix_fk(connection, 'attendances', 'attendances_class_id_fkey', 'classes', ['class_id'], ['id'])
    _safe_fix_fk(connection, 'students', 'students_class_id_fkey', 'classes', ['class_id'], ['id'])
