"""Fix subject deletion with CASCADE DELETE constraints

Revision ID: fix_subject_deletion_cascade
Revises: 
Create Date: 2025-01-30 16:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fix_subject_deletion_cascade'
down_revision = None  # Standalone migration
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


def upgrade():
    connection = op.get_bind()

    # Add missing columns to assessment_frameworks table if table exists
    if _table_exists(connection, 'assessment_frameworks'):
        columns_to_add = [
            ('formative_weight', sa.Float()),
            ('summative_weight', sa.Float()),
            ('school_based_weight', sa.Float()),
            ('project_weight', sa.Float()),
            ('formative_frequency', sa.String(50)),
            ('summative_frequency', sa.String(50)),
            ('curriculum_standards', sa.Text()),
            ('competency_indicators', sa.Text()),
        ]
        for col_name, col_type in columns_to_add:
            if not _column_exists(connection, 'assessment_frameworks', col_name):
                op.add_column('assessment_frameworks', sa.Column(col_name, col_type, nullable=True))

    # List of foreign key constraints to update with CASCADE DELETE
    constraints_to_fix = [
        ('grades', 'grades_subject_id_fkey', 'subject_id'),
        ('exams', 'exams_subject_id_fkey', 'subject_id'),
        ('external_exam_results', 'external_exam_results_subject_id_fkey', 'subject_id'),
        ('final_grades', 'final_grades_subject_id_fkey', 'subject_id'),
        ('enhanced_grades', 'enhanced_grades_subject_id_fkey', 'subject_id'),
        ('continuous_assessment_records', 'continuous_assessment_records_subject_id_fkey', 'subject_id'),
        ('school_based_assessments', 'school_based_assessments_subject_id_fkey', 'subject_id'),
        ('assessment_frameworks', 'assessment_frameworks_subject_id_fkey', 'subject_id'),
        ('teacher_subjects', 'teacher_subjects_subject_id_fkey', 'subject_id'),
        ('class_subjects', 'class_subjects_subject_id_fkey', 'subject_id'),
        ('stem_subjects', 'stem_subjects_subject_id_fkey', 'subject_id'),
    ]

    # Update foreign key constraints with CASCADE DELETE
    if _table_exists(connection, 'subjects'):
        for table_name, constraint_name, column_name in constraints_to_fix:
            actual_table = table_name
            if not _table_exists(connection, actual_table):
                continue
            if not _column_exists(connection, actual_table, column_name):
                continue

            op.execute(sa.text(f'ALTER TABLE "{actual_table}" DROP CONSTRAINT IF EXISTS "{constraint_name}"'))
            with op.batch_alter_table(actual_table, schema=None) as batch_op:
                batch_op.create_foreign_key(
                    constraint_name, 'subjects',
                    [column_name], ['id'], ondelete='CASCADE'
                )

    # Set default values for weight columns if assessment_frameworks table exists
    if _table_exists(connection, 'assessment_frameworks') and _column_exists(connection, 'assessment_frameworks', 'formative_weight'):
        op.execute(sa.text("""
            UPDATE assessment_frameworks 
            SET formative_weight = COALESCE(formative_weight, 40.0),
                summative_weight = COALESCE(summative_weight, 60.0),
                school_based_weight = COALESCE(school_based_weight, 0.0),
                project_weight = COALESCE(project_weight, 0.0),
                formative_frequency = COALESCE(formative_frequency, 'weekly'),
                summative_frequency = COALESCE(summative_frequency, 'monthly')
        """))


def downgrade():
    # This is a one-way migration for safety
    pass