"""
Comprehensive migration to fix subject deletion issues
This migration addresses:
1. Foreign key constraints with CASCADE DELETE
2. Missing columns in assessment_frameworks table
3. Schema mismatches in various models
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_fix_subject_deletion'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # 1. Add missing columns to assessment_frameworks table
    op.add_column('assessment_frameworks', sa.Column('formative_weight', sa.Float(), nullable=True))
    op.add_column('assessment_frameworks', sa.Column('summative_weight', sa.Float(), nullable=True))
    op.add_column('assessment_frameworks', sa.Column('school_based_weight', sa.Float(), nullable=True))
    op.add_column('assessment_frameworks', sa.Column('project_weight', sa.Float(), nullable=True))
    op.add_column('assessment_frameworks', sa.Column('formative_frequency', sa.String(50), nullable=True))
    op.add_column('assessment_frameworks', sa.Column('summative_frequency', sa.String(50), nullable=True))
    op.add_column('assessment_frameworks', sa.Column('curriculum_standards', sa.Text(), nullable=True))
    op.add_column('assessment_frameworks', sa.Column('competency_indicators', sa.Text(), nullable=True))
    
    # 2. Drop existing foreign key constraints that don't have CASCADE DELETE
    op.drop_constraint('grades_subject_id_fkey', 'grades', type_='foreignkey')
    op.drop_constraint('exams_subject_id_fkey', 'exams', type_='foreignkey')
    op.drop_constraint('external_exam_results_subject_id_fkey', 'external_exam_results', type_='foreignkey')
    op.drop_constraint('final_grades_subject_id_fkey', 'final_grades', type_='foreignkey')
    op.drop_constraint('enhanced_grades_subject_id_fkey', 'enhanced_grades', type_='foreignkey')
    op.drop_constraint('continuous_assessment_records_subject_id_fkey', 'continuous_assessment_records', type_='foreignkey')
    op.drop_constraint('school_based_assessments_subject_id_fkey', 'school_based_assessments', type_='foreignkey')
    op.drop_constraint('assessment_frameworks_subject_id_fkey', 'assessment_frameworks', type_='foreignkey')
    op.drop_constraint('teacher_subjects_subject_id_fkey', 'teacher_subjects', type_='foreignkey')
    op.drop_constraint('class_subjects_subject_id_fkey', 'class_subjects', type_='foreignkey')
    op.drop_constraint('stem_subjects_subject_id_fkey', 'stem_subjects', type_='foreignkey')
    
    # 3. Recreate foreign key constraints with CASCADE DELETE
    op.create_foreign_key(
        'grades_subject_id_fkey', 'grades', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'exams_subject_id_fkey', 'exams', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'external_exam_results_subject_id_fkey', 'external_exam_results', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'final_grades_subject_id_fkey', 'final_grades', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'enhanced_grades_subject_id_fkey', 'enhanced_grades', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'continuous_assessment_records_subject_id_fkey', 'continuous_assessment_records', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'school_based_assessments_subject_id_fkey', 'school_based_assessments', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'assessment_frameworks_subject_id_fkey', 'assessment_frameworks', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'teacher_subjects_subject_id_fkey', 'teacher_subjects', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'class_subjects_subject_id_fkey', 'class_subjects', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'stem_subjects_subject_id_fkey', 'stem_subjects', 'subjects',
        ['subject_id'], ['id'], ondelete='CASCADE'
    )
    
    # 4. Set default values for weight columns
    op.execute("""
        UPDATE assessment_frameworks 
        SET formative_weight = 40.0,
            summative_weight = 60.0,
            school_based_weight = 0.0,
            project_weight = 0.0,
            formative_frequency = 'weekly',
            summative_frequency = 'monthly'
        WHERE formative_weight IS NULL
    """)

def downgrade():
    # Remove CASCADE DELETE constraints and restore original constraints
    op.drop_constraint('grades_subject_id_fkey', 'grades', type_='foreignkey')
    op.drop_constraint('exams_subject_id_fkey', 'exams', type_='foreignkey')
    op.drop_constraint('external_exam_results_subject_id_fkey', 'external_exam_results', type_='foreignkey')
    op.drop_constraint('final_grades_subject_id_fkey', 'final_grades', type_='foreignkey')
    op.drop_constraint('enhanced_grades_subject_id_fkey', 'enhanced_grades', type_='foreignkey')
    op.drop_constraint('continuous_assessment_records_subject_id_fkey', 'continuous_assessment_records', type_='foreignkey')
    op.drop_constraint('school_based_assessments_subject_id_fkey', 'school_based_assessments', type_='foreignkey')
    op.drop_constraint('assessment_frameworks_subject_id_fkey', 'assessment_frameworks', type_='foreignkey')
    op.drop_constraint('teacher_subjects_subject_id_fkey', 'teacher_subjects', type_='foreignkey')
    op.drop_constraint('class_subjects_subject_id_fkey', 'class_subjects', type_='foreignkey')
    op.drop_constraint('stem_subjects_subject_id_fkey', 'stem_subjects', type_='foreignkey')
    
    # Recreate original constraints without CASCADE DELETE
    op.create_foreign_key('grades_subject_id_fkey', 'grades', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('exams_subject_id_fkey', 'exams', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('external_exam_results_subject_id_fkey', 'external_exam_results', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('final_grades_subject_id_fkey', 'final_grades', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('enhanced_grades_subject_id_fkey', 'enhanced_grades', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('continuous_assessment_records_subject_id_fkey', 'continuous_assessment_records', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('school_based_assessments_subject_id_fkey', 'school_based_assessments', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('assessment_frameworks_subject_id_fkey', 'assessment_frameworks', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('teacher_subjects_subject_id_fkey', 'teacher_subjects', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('class_subjects_subject_id_fkey', 'class_subjects', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('stem_subjects_subject_id_fkey', 'stem_subjects', 'subjects', ['subject_id'], ['id'])
    
    # Remove added columns
    op.drop_column('assessment_frameworks', 'competency_indicators')
    op.drop_column('assessment_frameworks', 'curriculum_standards')
    op.drop_column('assessment_frameworks', 'summative_frequency')
    op.drop_column('assessment_frameworks', 'formative_frequency')
    op.drop_column('assessment_frameworks', 'project_weight')
    op.drop_column('assessment_frameworks', 'school_based_weight')
    op.drop_column('assessment_frameworks', 'summative_weight')
    op.drop_column('assessment_frameworks', 'formative_weight')