"""Fix subject deletion with CASCADE DELETE constraints

Revision ID: fix_subject_deletion_cascade
Revises: 
Create Date: 2025-01-30 16:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fix_subject_deletion_cascade'
down_revision = None  # This will be a standalone migration
branch_labels = None
depends_on = None

def upgrade():
    # Add missing columns to assessment_frameworks table
    try:
        op.add_column('assessment_frameworks', sa.Column('formative_weight', sa.Float(), nullable=True))
    except Exception:
        pass  # Column might already exist
    
    try:
        op.add_column('assessment_frameworks', sa.Column('summative_weight', sa.Float(), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('assessment_frameworks', sa.Column('school_based_weight', sa.Float(), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('assessment_frameworks', sa.Column('project_weight', sa.Float(), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('assessment_frameworks', sa.Column('formative_frequency', sa.String(50), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('assessment_frameworks', sa.Column('summative_frequency', sa.String(50), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('assessment_frameworks', sa.Column('curriculum_standards', sa.Text(), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('assessment_frameworks', sa.Column('competency_indicators', sa.Text(), nullable=True))
    except Exception:
        pass
    
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
    for table_name, constraint_name, column_name in constraints_to_fix:
        try:
            # Drop existing constraint if it exists
            op.drop_constraint(constraint_name, table_name, type_='foreignkey')
        except Exception:
            pass  # Constraint might not exist
        
        try:
            # Create new constraint with CASCADE DELETE
            op.create_foreign_key(
                constraint_name, table_name, 'subjects',
                [column_name], ['id'], ondelete='CASCADE'
            )
        except Exception as e:
            print(f"Warning: Could not update constraint {constraint_name}: {e}")
    
    # Set default values for weight columns
    try:
        op.execute("""
            UPDATE assessment_frameworks 
            SET formative_weight = COALESCE(formative_weight, 40.0),
                summative_weight = COALESCE(summative_weight, 60.0),
                school_based_weight = COALESCE(school_based_weight, 0.0),
                project_weight = COALESCE(project_weight, 0.0),
                formative_frequency = COALESCE(formative_frequency, 'weekly'),
                summative_frequency = COALESCE(summative_frequency, 'monthly')
        """)
    except Exception as e:
        print(f"Warning: Could not set default values: {e}")

def downgrade():
    # This is a one-way migration for safety
    pass