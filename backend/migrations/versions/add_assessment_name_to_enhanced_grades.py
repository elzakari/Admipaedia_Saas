"""Add missing assessment_name column to enhanced_grades table

Revision ID: add_assess_name_col
Revises: 0b4b9763b6ff
Create Date: 2024-01-27 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_assess_name_col'
down_revision = '0b4b9763b6ff'
branch_labels = None
depends_on = None


def _table_exists(conn, table_name):
    inspector = sa.inspect(conn)
    return table_name in inspector.get_table_names()


def _column_exists(conn, table_name, column_name):
    if not _table_exists(conn, table_name):
        return False
    inspector = sa.inspect(conn)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    conn = op.get_bind()
    if not _table_exists(conn, 'enhanced_grades'):
        return
    if _column_exists(conn, 'enhanced_grades', 'assessment_name'):
        try:
            with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
                batch_op.alter_column('assessment_name', nullable=False)
        except Exception:
            pass
        return
    try:
        with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
            batch_op.add_column(sa.Column('assessment_name', sa.String(length=100), nullable=True))
    except Exception:
        return
    try:
        op.execute("""
            UPDATE enhanced_grades 
            SET assessment_name = CASE 
                WHEN assessment_type_id = 1 THEN 'Class Exercise'
                WHEN assessment_type_id = 2 THEN 'Homework Assignment'
                WHEN assessment_type_id = 3 THEN 'Project Work'
                WHEN assessment_type_id = 4 THEN 'Class Test'
                WHEN assessment_type_id = 5 THEN 'Midterm Examination'
                WHEN assessment_type_id = 6 THEN 'End of Term Exam'
                WHEN assessment_type_id = 7 THEN 'Mock Examination'
                WHEN assessment_type_id = 8 THEN 'External Examination'
                WHEN assessment_type_id = 9 THEN 'Practical Assessment'
                WHEN assessment_type_id = 10 THEN 'Oral Assessment'
                ELSE 'Assessment'
            END
            WHERE assessment_name IS NULL
        """)
    except Exception:
        pass
    try:
        with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
            batch_op.alter_column('assessment_name', nullable=False)
    except Exception:
        pass

def downgrade():
    # Remove the assessment_name column
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        batch_op.drop_column('assessment_name')