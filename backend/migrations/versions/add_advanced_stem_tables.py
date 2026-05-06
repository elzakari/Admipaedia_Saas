"""Add advanced STEM curriculum tables

Revision ID: add_advanced_stem_tables
Revises: ghana_educational_service_system
Create Date: 2024-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_advanced_stem_tables'
down_revision = 'ghana_educational_service'  # Changed from 'ghana_educational_service_system'
branch_labels = None
depends_on = None

def upgrade():
    # Create stem_learning_modules table
    op.create_table('stem_learning_modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stem_subject_id', sa.Integer(), nullable=False),
        sa.Column('educational_level_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('learning_objectives', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('primary_approach', sa.String(length=50), nullable=False),
        sa.Column('secondary_approaches', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('duration_weeks', sa.Integer(), nullable=False),
        sa.Column('sequence_order', sa.Integer(), nullable=False),
        sa.Column('term', sa.String(length=20), nullable=False),
        sa.Column('required_materials', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('technology_requirements', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('safety_considerations', sa.Text(), nullable=True),
        sa.Column('formative_assessment_percentage', sa.Float(), nullable=True),
        sa.Column('summative_assessment_percentage', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['educational_level_id'], ['educational_levels.id'], ),
        sa.ForeignKeyConstraint(['stem_subject_id'], ['stem_subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create stem_projects table
    op.create_table('stem_projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('learning_module_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('problem_statement', sa.Text(), nullable=False),
        sa.Column('is_individual', sa.Boolean(), nullable=True),
        sa.Column('is_group', sa.Boolean(), nullable=True),
        sa.Column('max_group_size', sa.Integer(), nullable=True),
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('milestones', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('required_resources', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('expected_deliverables', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('evaluation_criteria', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('industry_connections', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('community_impact', sa.Text(), nullable=True),
        sa.Column('sustainability_focus', sa.Boolean(), nullable=True),
        sa.Column('difficulty_level', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['learning_module_id'], ['stem_learning_modules.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create stem_assessments table
    op.create_table('stem_assessments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('learning_module_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assessment_type', sa.String(length=50), nullable=False),
        sa.Column('scientific_method_weight', sa.Float(), nullable=True),
        sa.Column('technical_skills_weight', sa.Float(), nullable=True),
        sa.Column('innovation_creativity_weight', sa.Float(), nullable=True),
        sa.Column('communication_weight', sa.Float(), nullable=True),
        sa.Column('total_marks', sa.Float(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('requires_presentation', sa.Boolean(), nullable=True),
        sa.Column('requires_demonstration', sa.Boolean(), nullable=True),
        sa.Column('rubric_criteria', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('success_indicators', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['learning_module_id'], ['stem_learning_modules.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create stem_assessment_results table
    op.create_table('stem_assessment_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('scientific_method_score', sa.Float(), nullable=False),
        sa.Column('technical_skills_score', sa.Float(), nullable=False),
        sa.Column('innovation_creativity_score', sa.Float(), nullable=False),
        sa.Column('communication_score', sa.Float(), nullable=False),
        sa.Column('total_score', sa.Float(), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=False),
        sa.Column('grade_letter', sa.String(length=5), nullable=False),
        sa.Column('strengths', sa.Text(), nullable=True),
        sa.Column('areas_for_improvement', sa.Text(), nullable=True),
        sa.Column('teacher_comments', sa.Text(), nullable=True),
        sa.Column('competencies_demonstrated', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('competency_levels', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('assessed_by', sa.Integer(), nullable=False),
        sa.Column('assessment_date', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assessed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assessment_id'], ['stem_assessments.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create stem_resource_center table
    op.create_table('stem_resource_center',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('stem_domains', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('educational_levels', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('total_quantity', sa.Integer(), nullable=True),
        sa.Column('available_quantity', sa.Integer(), nullable=True),
        sa.Column('location', sa.String(length=100), nullable=True),
        sa.Column('usage_instructions', sa.Text(), nullable=True),
        sa.Column('safety_guidelines', sa.Text(), nullable=True),
        sa.Column('maintenance_schedule', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('file_path', sa.String(length=255), nullable=True),
        sa.Column('external_url', sa.String(length=500), nullable=True),
        sa.Column('access_requirements', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create stem_resource_bookings table
    op.create_table('stem_resource_bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('booked_by', sa.Integer(), nullable=False),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('quantity_requested', sa.Integer(), nullable=True),
        sa.Column('purpose', sa.Text(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approval_date', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('actual_usage_notes', sa.Text(), nullable=True),
        sa.Column('condition_after_use', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['booked_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['resource_id'], ['stem_resource_center.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index('idx_stem_learning_modules_subject_level', 'stem_learning_modules', ['stem_subject_id', 'educational_level_id'])
    op.create_index('idx_stem_projects_module', 'stem_projects', ['learning_module_id'])
    op.create_index('idx_stem_assessments_module', 'stem_assessments', ['learning_module_id'])
    op.create_index('idx_stem_assessment_results_student', 'stem_assessment_results', ['student_id', 'assessment_id'])
    op.create_index('idx_stem_resource_bookings_date', 'stem_resource_bookings', ['booking_date', 'resource_id'])
    op.create_index('idx_stem_resource_bookings_class', 'stem_resource_bookings', ['class_id'])

def downgrade():
    # Drop indexes
    op.drop_index('idx_stem_resource_bookings_class', table_name='stem_resource_bookings')
    op.drop_index('idx_stem_resource_bookings_date', table_name='stem_resource_bookings')
    op.drop_index('idx_stem_assessment_results_student', table_name='stem_assessment_results')
    op.drop_index('idx_stem_assessments_module', table_name='stem_assessments')
    op.drop_index('idx_stem_projects_module', table_name='stem_projects')
    op.drop_index('idx_stem_learning_modules_subject_level', table_name='stem_learning_modules')
    
    # Drop tables in reverse order of creation
    op.drop_table('stem_resource_bookings')
    op.drop_table('stem_resource_center')
    op.drop_table('stem_assessment_results')
    op.drop_table('stem_assessments')
    op.drop_table('stem_projects')
    op.drop_table('stem_learning_modules')