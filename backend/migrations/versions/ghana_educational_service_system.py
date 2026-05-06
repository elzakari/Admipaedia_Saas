"""Add Ghana Educational Service System Models

Revision ID: ghana_educational_service
Revises: f29144f4bd28
Create Date: 2024-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'ghana_educational_service'
down_revision = 'f29144f4bd28'
branch_labels = None
depends_on = None


def upgrade():
    # Educational Levels and Key Phases
    op.create_table('educational_levels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('key_phase', sa.String(length=50), nullable=False),
        sa.Column('age_range_start', sa.Integer(), nullable=True),
        sa.Column('age_range_end', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('core_competencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('student_competency_assessments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('competency_id', sa.Integer(), nullable=False),
        sa.Column('assessment_date', sa.Date(), nullable=False),
        sa.Column('proficiency_level', sa.String(length=20), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('teacher_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['competency_id'], ['core_competencies.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add educational_level_id to classes table
    op.add_column('classes', sa.Column('educational_level_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'classes', 'educational_levels', ['educational_level_id'], ['id'])
    
    # Grading Systems
    op.create_table('grading_standards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('assessment_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('weight_percentage', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('grading_schemes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('grading_standard_id', sa.Integer(), nullable=False),
        sa.Column('educational_level_id', sa.Integer(), nullable=True),
        sa.Column('subject_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['educational_level_id'], ['educational_levels.id'], ),
        sa.ForeignKeyConstraint(['grading_standard_id'], ['grading_standards.id'], ),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('grade_boundaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('grading_scheme_id', sa.Integer(), nullable=False),
        sa.Column('grade', sa.String(length=5), nullable=False),
        sa.Column('min_score', sa.Float(), nullable=False),
        sa.Column('max_score', sa.Float(), nullable=False),
        sa.Column('grade_point', sa.Float(), nullable=True),
        sa.Column('interpretation', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['grading_scheme_id'], ['grading_schemes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('enhanced_grades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('assessment_type_id', sa.Integer(), nullable=False),
        sa.Column('grading_scheme_id', sa.Integer(), nullable=False),
        sa.Column('raw_score', sa.Float(), nullable=False),
        sa.Column('weighted_score', sa.Float(), nullable=True),
        sa.Column('grade', sa.String(length=5), nullable=True),
        sa.Column('grade_point', sa.Float(), nullable=True),
        sa.Column('assessment_date', sa.Date(), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=True),
        sa.Column('term', sa.String(length=20), nullable=True),
        sa.Column('academic_year', sa.String(length=10), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assessment_type_id'], ['assessment_types.id'], ),
        sa.ForeignKeyConstraint(['grading_scheme_id'], ['grading_schemes.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('final_grades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('grading_scheme_id', sa.Integer(), nullable=False),
        sa.Column('class_score', sa.Float(), nullable=True),
        sa.Column('external_score', sa.Float(), nullable=True),
        sa.Column('final_score', sa.Float(), nullable=False),
        sa.Column('final_grade', sa.String(length=5), nullable=False),
        sa.Column('grade_point', sa.Float(), nullable=True),
        sa.Column('term', sa.String(length=20), nullable=False),
        sa.Column('academic_year', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['grading_scheme_id'], ['grading_schemes.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Competency Framework
    op.create_table('competency_domains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color_code', sa.String(length=7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('proficiency_levels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('level_number', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color_code', sa.String(length=7), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('level_number'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('competency_indicators',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('domain_id', sa.Integer(), nullable=False),
        sa.Column('educational_level_id', sa.Integer(), nullable=False),
        sa.Column('indicator_code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('proficiency_level_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['domain_id'], ['competency_domains.id'], ),
        sa.ForeignKeyConstraint(['educational_level_id'], ['educational_levels.id'], ),
        sa.ForeignKeyConstraint(['proficiency_level_id'], ['proficiency_levels.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('indicator_code')
    )
    
    # STEM Curriculum
    op.create_table('stem_domains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color_code', sa.String(length=7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('learning_approaches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('methodology', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('stem_subjects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('stem_domain_id', sa.Integer(), nullable=False),
        sa.Column('educational_level_id', sa.Integer(), nullable=False),
        sa.Column('integration_level', sa.String(length=20), nullable=False),
        sa.Column('practical_hours_per_week', sa.Integer(), nullable=True),
        sa.Column('theory_hours_per_week', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['educational_level_id'], ['educational_levels.id'], ),
        sa.ForeignKeyConstraint(['stem_domain_id'], ['stem_domains.id'], ),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Character Development
    op.create_table('character_domains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cultural_context', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('assessment_frequencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('interval_days', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('character_traits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('domain_id', sa.Integer(), nullable=False),
        sa.Column('educational_level_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('behavioral_indicators', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('assessment_criteria', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['domain_id'], ['character_domains.id'], ),
        sa.ForeignKeyConstraint(['educational_level_id'], ['educational_levels.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Assessment Methods
    op.create_table('assessment_modes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_digital', sa.Boolean(), nullable=True),
        sa.Column('requires_supervision', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('differentiation_strategies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('implementation_guide', sa.Text(), nullable=True),
        sa.Column('target_learning_styles', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('assessment_frameworks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('educational_level_id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=True),
        sa.Column('framework_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assessment_criteria', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('scoring_rubric', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['educational_level_id'], ['educational_levels.id'], ),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index('idx_student_competency_student_id', 'student_competency_assessments', ['student_id'])
    op.create_index('idx_enhanced_grades_student_subject', 'enhanced_grades', ['student_id', 'subject_id'])
    op.create_index('idx_final_grades_student_term', 'final_grades', ['student_id', 'term', 'academic_year'])
    op.create_index('idx_character_traits_level_domain', 'character_traits', ['educational_level_id', 'domain_id'])
    op.create_index('idx_assessment_frameworks_level_subject', 'assessment_frameworks', ['educational_level_id', 'subject_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_assessment_frameworks_level_subject', table_name='assessment_frameworks')
    op.drop_index('idx_character_traits_level_domain', table_name='character_traits')
    op.drop_index('idx_final_grades_student_term', table_name='final_grades')
    op.drop_index('idx_enhanced_grades_student_subject', table_name='enhanced_grades')
    op.drop_index('idx_student_competency_student_id', table_name='student_competency_assessments')
    
    # Drop assessment methods tables
    op.drop_table('assessment_frameworks')
    op.drop_table('differentiation_strategies')
    op.drop_table('assessment_modes')
    
    # Drop character development tables
    op.drop_table('character_traits')
    op.drop_table('assessment_frequencies')
    op.drop_table('character_domains')
    
    # Drop STEM curriculum tables
    op.drop_table('stem_subjects')
    op.drop_table('learning_approaches')
    op.drop_table('stem_domains')
    
    # Drop competency framework tables
    op.drop_table('competency_indicators')
    op.drop_table('proficiency_levels')
    op.drop_table('competency_domains')
    
    # Drop grading system tables
    op.drop_table('final_grades')
    op.drop_table('enhanced_grades')
    op.drop_table('grade_boundaries')
    op.drop_table('grading_schemes')
    op.drop_table('assessment_types')
    op.drop_table('grading_standards')
    
    # ### commands auto generated by Alembic - please adjust! ###
    
    # Drop foreign key constraint from classes table if it exists
    # Since the constraint was created with None name, we need to find its actual name
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get all foreign keys for the classes table
    foreign_keys = inspector.get_foreign_keys('classes')
    
    # Find the constraint that references educational_levels table
    for fk in foreign_keys:
        if fk['referred_table'] == 'educational_levels' and 'educational_level_id' in fk['constrained_columns']:
            op.drop_constraint(fk['name'], 'classes', type_='foreignkey')
            break
    
    # Drop the educational_level_id column
    op.drop_column('classes', 'educational_level_id')
    
    # Drop educational levels tables
    op.drop_table('student_competency_assessments')
    op.drop_table('core_competencies')
    op.drop_table('educational_levels')