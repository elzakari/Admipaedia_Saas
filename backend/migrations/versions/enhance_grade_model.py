from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers
revision = 'enhance_grade_model'
down_revision = 'add_enhanced_student_fields'  # This creates a chain
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


def _fk_exists(connection, table_name, constraint_name):
    if not _table_exists(connection, table_name):
        return False
    inspector = sa.inspect(connection)
    return any(fk["name"] == constraint_name for fk in inspector.get_foreign_keys(table_name))


def upgrade():
    connection = op.get_bind()
    if not _table_exists(connection, 'grades'):
        return

    # Add new columns to grades table
    if not _column_exists(connection, 'grades', 'subject_id'):
        op.add_column('grades', sa.Column('subject_id', sa.Integer(), nullable=True))
    if not _column_exists(connection, 'grades', 'class_id'):
        op.add_column('grades', sa.Column('class_id', sa.Integer(), nullable=True))
    if not _column_exists(connection, 'grades', 'term'):
        op.add_column('grades', sa.Column('term', sa.String(20), nullable=True))
    if not _column_exists(connection, 'grades', 'academic_year'):
        op.add_column('grades', sa.Column('academic_year', sa.String(20), nullable=True))
    if not _column_exists(connection, 'grades', 'assessment_type'):
        op.add_column('grades', sa.Column('assessment_type', sa.String(20), nullable=True))
    if not _column_exists(connection, 'grades', 'is_final'):
        op.add_column('grades', sa.Column('is_final', sa.Boolean(), nullable=True, default=False))
    if not _column_exists(connection, 'grades', 'weight'):
        op.add_column('grades', sa.Column('weight', sa.Float(), nullable=True, default=1.0))
    
    # Add foreign key constraints
    if _column_exists(connection, 'grades', 'subject_id') and not _fk_exists(connection, 'grades', 'fk_grades_subject_id'):
        op.create_foreign_key('fk_grades_subject_id', 'grades', 'subjects', ['subject_id'], ['id'])
    if _column_exists(connection, 'grades', 'class_id') and not _fk_exists(connection, 'grades', 'fk_grades_class_id'):
        op.create_foreign_key('fk_grades_class_id', 'grades', 'classes', ['class_id'], ['id'])

def downgrade():
    connection = op.get_bind()
    if not _table_exists(connection, 'grades'):
        return

    # Remove foreign key constraints
    if _fk_exists(connection, 'grades', 'fk_grades_subject_id'):
        op.drop_constraint('fk_grades_subject_id', 'grades', type_='foreignkey')
    if _fk_exists(connection, 'grades', 'fk_grades_class_id'):
        op.drop_constraint('fk_grades_class_id', 'grades', type_='foreignkey')
    
    # Remove columns
    for column_name in ('subject_id', 'class_id', 'term', 'academic_year', 'assessment_type', 'is_final', 'weight'):
        if _column_exists(connection, 'grades', column_name):
            op.drop_column('grades', column_name)
