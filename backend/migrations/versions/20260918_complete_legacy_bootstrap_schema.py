"""Complete legacy bootstrap schema omitted from Alembic history.

Forward-only repair for installations where historical SQLAlchemy
bootstrap/create_all behavior supplied tables that published Alembic
migrations referenced but never created.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260918_bootstrap_complete'
down_revision = '20260917_exam_grade_repair'
branch_labels = None
depends_on = None


def _has_table(name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(name, schema='public')


def upgrade():
    # Dependency wave 1
    if not _has_table('admission_applications'):
        op.create_table(
            'admission_applications',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('parent_id', sa.Integer(), sa.ForeignKey('parents.id'), nullable=False, autoincrement='auto'),
            sa.Column('student_first_name', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('student_last_name', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('target_class_id', sa.Integer(), sa.ForeignKey('classes.id'), nullable=True, autoincrement='auto'),
            sa.Column('payment_status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('payment_id', sa.Integer(), sa.ForeignKey('student_payments.id'), nullable=True, autoincrement='auto'),
            sa.Column('form_purchase_date', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('submission_date', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('form_data', postgresql.JSONB(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('assessment_analytics'):
        op.create_table(
            'assessment_analytics',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('analysis_type', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('entity_id', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('term', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('average_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('median_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('score_distribution', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('competency_strengths', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('competency_gaps', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('performance_trend', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('trend_data', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('intervention_recommendations', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('enrichment_opportunities', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('ai_insights', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('generated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('generated_by', sa.String(length=100), nullable=True, autoincrement='auto'),
        )

    if not _has_table('assessment_tasks'):
        op.create_table(
            'assessment_tasks',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('title', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('framework_id', sa.Integer(), sa.ForeignKey('assessment_frameworks.id'), nullable=False, autoincrement='auto'),
            sa.Column('assessment_type', sa.Enum('FORMATIVE', 'SUMMATIVE', 'DIAGNOSTIC', 'SCHOOL_BASED', 'CONTINUOUS', 'PORTFOLIO', 'PROJECT', 'PERFORMANCE', 'PEER', 'SELF', name='assessmenttype'), nullable=False, autoincrement='auto'),
            sa.Column('assessment_mode', sa.Enum('WRITTEN', 'ORAL', 'PRACTICAL', 'DIGITAL', 'OBSERVATION', 'DEMONSTRATION', 'PRESENTATION', 'PORTFOLIO_REVIEW', name='assessmentmode'), nullable=False, autoincrement='auto'),
            sa.Column('scheduled_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('duration_minutes', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('is_differentiated', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('differentiation_strategies', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('total_marks', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('pass_mark', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('learning_objectives', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('competency_indicators', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('instructions', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('materials_needed', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('accessibility_features', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('audit_logs'):
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('table_name', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('record_id', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('action', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('old_values', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('new_values', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('timestamp', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('ip_address', sa.String(length=45), nullable=True, autoincrement='auto'),
            sa.Column('user_agent', sa.Text(), nullable=True, autoincrement='auto'),
        )

    if not _has_table('books'):
        op.create_table(
            'books',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('title', sa.String(length=255), nullable=False, autoincrement='auto'),
            sa.Column('author', sa.String(length=255), nullable=False, autoincrement='auto'),
            sa.Column('isbn', sa.String(length=20), nullable=True, unique=True, autoincrement='auto'),
            sa.Column('publisher', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('publication_year', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('edition', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('category', sa.Enum('FICTION', 'NON_FICTION', 'TEXTBOOK', 'REFERENCE', 'BIOGRAPHY', 'SCIENCE', 'HISTORY', 'MATHEMATICS', 'LITERATURE', 'CHILDREN', name='bookcategory'), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('language', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('pages', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('shelf_location', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('total_copies', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('available_copies', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('status', sa.Enum('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE', 'LOST', 'DAMAGED', name='bookstatus'), nullable=False, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
        )
        op.create_index(
            'ix_books_author',
            'books',
            ['author'],
            unique=False,
        )
        op.create_index(
            'ix_books_category',
            'books',
            ['category'],
            unique=False,
        )
        op.create_index(
            'ix_books_isbn',
            'books',
            ['isbn'],
            unique=True,
        )
        op.create_index(
            'ix_books_title',
            'books',
            ['title'],
            unique=False,
        )

    if not _has_table('budgets'):
        op.create_table(
            'budgets',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('category', sa.Enum('SALARIES', 'UTILITIES', 'MAINTENANCE', 'SUPPLIES', 'EQUIPMENT', 'TRANSPORTATION', 'OTHER', name='budgetcategory'), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.String(length=255), nullable=False, autoincrement='auto'),
            sa.Column('allocated_amount', sa.Numeric(precision=10, scale=2), nullable=False, autoincrement='auto'),
            sa.Column('spent_amount', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('remaining_amount', sa.Numeric(precision=10, scale=2), nullable=False, autoincrement='auto'),
            sa.Column('fiscal_year', sa.String(length=10), nullable=False, autoincrement='auto'),
            sa.Column('quarter', sa.String(length=10), nullable=True, autoincrement='auto'),
            sa.Column('department', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('character_activities'):
        op.create_table(
            'character_activities',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('title', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('activity_type', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('duration_minutes', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('group_size', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('educational_level_id', sa.Integer(), sa.ForeignKey('educational_levels.id'), nullable=True, autoincrement='auto'),
            sa.Column('subject_integration', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('primary_domain', postgresql.ENUM('RELIGIOUS_VALUES', 'MORAL_VALUES', 'CULTURAL_VALUES', 'CIVIC_VALUES', 'SOCIAL_VALUES', 'PERSONAL_VALUES', name='characterdomain', create_type=False), nullable=False, autoincrement='auto'),
            sa.Column('materials_needed', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('preparation_time', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('assessment_method', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('cultural_context', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('local_proverbs', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('is_active', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('character_assessments'):
        op.create_table(
            'character_assessments',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('trait_id', sa.Integer(), sa.ForeignKey('character_traits.id'), nullable=False, autoincrement='auto'),
            sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=False, autoincrement='auto'),
            sa.Column('assessment_date', sa.DateTime(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('frequency', sa.Enum('DAILY', 'WEEKLY', 'MONTHLY', 'TERMLY', 'ANNUALLY', name='assessmentfrequency'), nullable=False, autoincrement='auto'),
            sa.Column('score', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('evidence', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('context', sa.String(length=200), nullable=True, autoincrement='auto'),
            sa.Column('teacher_comments', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('improvement_suggestions', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('parent_feedback', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('home_reinforcement_activities', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('character_development_plans'):
        op.create_table(
            'character_development_plans',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=10), nullable=False, autoincrement='auto'),
            sa.Column('term', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('strengths', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('areas_for_growth', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('goals', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('strategies', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('baseline_assessment', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('mid_term_review', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('final_assessment', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('parent_involvement_plan', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('community_service_hours', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('peer_mentoring_activities', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('is_active', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('completion_status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('competency_evidence'):
        op.create_table(
            'competency_evidence',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('assessment_id', sa.Integer(), sa.ForeignKey('student_competency_assessments.id'), nullable=False, autoincrement='auto'),
            sa.Column('indicator_id', sa.Integer(), sa.ForeignKey('competency_indicators.id'), nullable=False, autoincrement='auto'),
            sa.Column('evidence_type', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('evidence_title', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('evidence_description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('file_path', sa.String(length=500), nullable=True, autoincrement='auto'),
            sa.Column('file_type', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('file_size', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('proficiency_demonstrated', sa.Enum('BEGINNING', 'DEVELOPING', 'PROFICIENT', 'EXCELLENT', name='proficiencylevel'), nullable=False, autoincrement='auto'),
            sa.Column('observer_notes', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('subject_context', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('activity_context', sa.String(length=200), nullable=True, autoincrement='auto'),
            sa.Column('collaboration_involved', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('collected_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('collected_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('competency_learning_activities'):
        op.create_table(
            'competency_learning_activities',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('activity_name', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('activity_description', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('activity_type', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('target_competencies', sa.JSON(), nullable=False, autoincrement='auto'),
            sa.Column('target_indicators', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('primary_domain', postgresql.ENUM('COMMUNICATION_COLLABORATION', 'CRITICAL_THINKING_PROBLEM_SOLVING', 'CREATIVITY_INNOVATION', 'CULTURAL_IDENTITY_GLOBAL_CITIZENSHIP', 'PERSONAL_DEVELOPMENT_LEADERSHIP', 'DIGITAL_LITERACY', name='competencydomain', create_type=False), nullable=False, autoincrement='auto'),
            sa.Column('suitable_educational_levels', sa.JSON(), nullable=False, autoincrement='auto'),
            sa.Column('subject_integration', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('duration_minutes', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('group_size_min', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('group_size_max', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('resources_required', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('assessment_rubric', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('success_indicators', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('is_active', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('continuous_assessment_records'):
        op.create_table(
            'continuous_assessment_records',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id'), nullable=False, autoincrement='auto'),
            sa.Column('class_id', sa.Integer(), sa.ForeignKey('classes.id'), nullable=False, autoincrement='auto'),
            sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('term', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('week_number', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('assessment_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('assessment_focus', sa.String(length=200), nullable=True, autoincrement='auto'),
            sa.Column('class_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('homework_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('participation_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('quiz_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('competencies_demonstrated', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('competency_levels', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('teacher_observations', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('learning_difficulties', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('strengths_noted', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('next_steps', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('support_needed', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('curriculum_competencies'):
        op.create_table(
            'curriculum_competencies',
            sa.Column('curriculum_id', sa.Integer(), sa.ForeignKey('curricula.id'), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('competency_id', sa.Integer(), sa.ForeignKey('core_competencies.id'), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('weight_percentage', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('enhanced_sba'):
        op.create_table(
            'enhanced_sba',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, autoincrement='auto'),
            sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id'), nullable=False, autoincrement='auto'),
            sa.Column('curriculum_id', sa.Integer(), sa.ForeignKey('curricula.id'), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('term', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('class_exercises_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('class_exercises_weight', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('homework_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('homework_weight', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('project_work_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('project_work_weight', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('class_tests_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('class_tests_weight', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('practical_work_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('practical_work_weight', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('oral_assessment_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('oral_assessment_weight', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('total_sba_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('sba_percentage', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('critical_thinking_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('creativity_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('communication_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('collaboration_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('character_traits_scores', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('assessed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('last_updated', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('is_finalized', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('finalized_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.CheckConstraint('class_tests_score >= 0 AND class_tests_score <= 100'),
            sa.CheckConstraint('critical_thinking_score >= 1 AND critical_thinking_score <= 4'),
            sa.CheckConstraint('creativity_score >= 1 AND creativity_score <= 4'),
            sa.CheckConstraint('class_exercises_score >= 0 AND class_exercises_score <= 100'),
            sa.CheckConstraint('communication_score >= 1 AND communication_score <= 4'),
            sa.CheckConstraint('collaboration_score >= 1 AND collaboration_score <= 4'),
            sa.CheckConstraint('homework_score >= 0 AND homework_score <= 100'),
            sa.CheckConstraint('project_work_score >= 0 AND project_work_score <= 100'),
        )

    if not _has_table('external_examinations'):
        op.create_table(
            'external_examinations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('exam_type', sa.Enum('BECE', 'WASSCE', 'NOVDEC', 'PRIVATE', name='externalexamtype'), nullable=False, autoincrement='auto'),
            sa.Column('exam_year', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('exam_session', sa.Enum('MAY_JUNE', 'NOVEMBER_DECEMBER', 'MARCH_APRIL', name='examsession'), nullable=False, autoincrement='auto'),
            sa.Column('exam_name', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('exam_code', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('registration_start_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('registration_end_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('exam_start_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('exam_end_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('result_release_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('result_status', sa.Enum('PENDING', 'RELEASED', 'VERIFIED', 'DISPUTED', 'CANCELLED', name='resultstatus'), nullable=True, autoincrement='auto'),
            sa.Column('auto_import_enabled', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('last_import_date', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('import_source', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
        )

    if not _has_table('facilities'):
        op.create_table(
            'facilities',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('name', sa.String(length=100), nullable=False, autoincrement='auto'),
            sa.Column('facility_type', sa.Enum('CLASSROOM', 'LABORATORY', 'LIBRARY', 'OFFICE', 'AUDITORIUM', 'GYMNASIUM', 'CAFETERIA', 'PLAYGROUND', 'PARKING', 'STORAGE', 'OTHER', name='facilitytype'), nullable=False, autoincrement='auto'),
            sa.Column('location', sa.String(length=255), nullable=False, autoincrement='auto'),
            sa.Column('capacity', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('area_sqm', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'UNDER_CONSTRUCTION', name='facilitystatus'), nullable=True, autoincrement='auto'),
            sa.Column('floor_number', sa.String(length=10), nullable=True, autoincrement='auto'),
            sa.Column('building_name', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('room_number', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('last_maintenance_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('next_maintenance_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('learning_objectives'):
        op.create_table(
            'learning_objectives',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('curriculum_id', sa.Integer(), sa.ForeignKey('curricula.id', ondelete='CASCADE'), nullable=False, autoincrement='auto'),
            sa.Column('objective_code', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('objective_text', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('objective_type', sa.Enum('KNOWLEDGE', 'SKILLS', 'ATTITUDES', name='learningobjectivetype'), nullable=False, autoincrement='auto'),
            sa.Column('core_competency_ids', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('subject_competency_ids', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('assessment_criteria', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('performance_indicators', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('sequence_order', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('prerequisite_objectives', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('is_active', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('leave_types'):
        op.create_table(
            'leave_types',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('name', sa.String(length=50), nullable=False, unique=True, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('days_allowed', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('is_paid', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('library_members'):
        op.create_table(
            'library_members',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('member_id', sa.String(length=20), nullable=False, unique=True, autoincrement='auto'),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('member_type', sa.Enum('STUDENT', 'TEACHER', 'STAFF', 'EXTERNAL', name='membertype'), nullable=False, autoincrement='auto'),
            sa.Column('max_books', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('max_days', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('is_active', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('registration_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('expiry_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('total_fines', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('fine_limit', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )
        op.create_index(
            'ix_library_members_member_id',
            'library_members',
            ['member_id'],
            unique=True,
        )

    if not _has_table('library_settings'):
        op.create_table(
            'library_settings',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('setting_key', sa.String(length=100), nullable=False, unique=True, autoincrement='auto'),
            sa.Column('setting_value', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('messages'):
        op.create_table(
            'messages',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('sender_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('sender_type', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('recipient_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('recipient_type', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('subject', sa.String(length=255), nullable=False, autoincrement='auto'),
            sa.Column('content', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('is_read', sa.Boolean(), nullable=False, autoincrement='auto'),
            sa.Column('is_deleted_by_sender', sa.Boolean(), nullable=False, autoincrement='auto'),
            sa.Column('is_deleted_by_recipient', sa.Boolean(), nullable=False, autoincrement='auto'),
            sa.Column('attachments', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('file_id', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('file_url', sa.String(length=512), nullable=True, autoincrement='auto'),
        )

    if not _has_table('pending_invoice_adjustments'):
        op.create_table(
            'pending_invoice_adjustments',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, autoincrement='auto'),
            sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('billing_invoices.id'), nullable=True, autoincrement='auto'),
            sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False, autoincrement='auto', server_default=sa.text("'0'")),
            sa.Column('currency', sa.String(length=3), nullable=False, autoincrement='auto', server_default=sa.text("'USD'")),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.String(length=20), nullable=False, autoincrement='auto', server_default=sa.text("'pending'")),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, autoincrement='auto', server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, autoincrement='auto', server_default=sa.text('now()')),
        )
        op.create_index(
            'idx_pending_invoice_adj_tenant_status',
            'pending_invoice_adjustments',
            ['tenant_id', 'status'],
            unique=False,
        )
        op.create_index(
            'ix_pending_invoice_adjustments_invoice_id',
            'pending_invoice_adjustments',
            ['invoice_id'],
            unique=False,
        )
        op.create_index(
            'ix_pending_invoice_adjustments_tenant_id',
            'pending_invoice_adjustments',
            ['tenant_id'],
            unique=False,
        )

    if not _has_table('periods'):
        op.create_table(
            'periods',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('name', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('start_time', sa.Time(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('end_time', sa.Time(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('is_break', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('order_index', sa.Integer(), nullable=False, autoincrement='auto'),
        )

    if not _has_table('school_based_assessments'):
        op.create_table(
            'school_based_assessments',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id'), nullable=False, autoincrement='auto'),
            sa.Column('class_id', sa.Integer(), sa.ForeignKey('classes.id'), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('term', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('class_exercises_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('homework_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('project_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('assignment_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('class_test_scores', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('class_test_average', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('total_sba_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('sba_percentage', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('core_competencies_score', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('subject_competencies_score', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=False, autoincrement='auto'),
            sa.Column('assessment_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('is_moderated', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('moderated_by', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=True, autoincrement='auto'),
            sa.Column('moderation_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('moderation_comments', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('staff'):
        op.create_table(
            'staff',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, autoincrement='auto'),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True, autoincrement='auto'),
            sa.Column('employee_id', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('first_name', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('last_name', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('job_title', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('date_of_birth', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('gender', sa.String(length=10), nullable=True, autoincrement='auto'),
            sa.Column('address', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('phone_number', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('joining_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.UniqueConstraint('tenant_id', 'employee_id', name='uq_staff_tenant_employee_id'),
        )
        op.create_index(
            'ix_staff_tenant_id',
            'staff',
            ['tenant_id'],
            unique=False,
        )

    if not _has_table('stem_project_submissions'):
        op.create_table(
            'stem_project_submissions',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('project_id', sa.Integer(), sa.ForeignKey('stem_projects.id'), nullable=False, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('group_members', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('is_group_leader', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('submission_date', sa.DateTime(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('project_title', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('project_description', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('documentation_file', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('presentation_file', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('prototype_images', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('video_demonstration', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('challenges_faced', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('lessons_learned', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('future_improvements', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('teacher_feedback', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('peer_feedback', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('total_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('innovation_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('technical_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('presentation_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('collaboration_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('graded_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('graded_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('student_competency_profiles'):
        op.create_table(
            'student_competency_profiles',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('communication_collaboration_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('critical_thinking_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('creativity_innovation_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('cultural_identity_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('personal_development_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('digital_literacy_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('overall_competency_level', sa.Enum('BEGINNING', 'DEVELOPING', 'PROFICIENT', 'EXCELLENT', name='proficiencylevel'), nullable=True, autoincrement='auto'),
            sa.Column('overall_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('strengths', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('areas_for_improvement', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('recommended_activities', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('teacher_comments', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('parent_feedback', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('last_updated', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.UniqueConstraint('student_id', 'academic_year', name='unique_student_year_profile'),
            sa.CheckConstraint('overall_score >= 0 AND overall_score <= 4', name='overall_score_range_check'),
        )

    if not _has_table('student_progressions'):
        op.create_table(
            'student_progressions',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('current_level_id', sa.Integer(), sa.ForeignKey('educational_levels.id'), nullable=False, autoincrement='auto'),
            sa.Column('next_level_id', sa.Integer(), sa.ForeignKey('educational_levels.id'), nullable=True, autoincrement='auto'),
            sa.Column('overall_academic_average', sa.Float(), nullable=False, autoincrement='auto'),
            sa.Column('attendance_percentage', sa.Float(), nullable=False, autoincrement='auto'),
            sa.Column('core_competencies_average', sa.Float(), nullable=False, autoincrement='auto'),
            sa.Column('character_development_score', sa.Float(), nullable=False, autoincrement='auto'),
            sa.Column('english_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('mathematics_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('science_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('meets_academic_threshold', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('meets_attendance_threshold', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('meets_competency_threshold', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('meets_age_requirement', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('promotion_status', sa.Enum('PROMOTED', 'RETAINED', 'CONDITIONAL', 'TRANSFERRED', 'GRADUATED', name='promotionstatus'), nullable=False, autoincrement='auto'),
            sa.Column('promotion_decision_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('decision_rationale', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('requires_remedial_support', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('remedial_subjects', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('intervention_plan', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('recommended_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('approved_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.CheckConstraint('overall_academic_average >= 0 AND overall_academic_average <= 100'),
            sa.CheckConstraint('core_competencies_average >= 1 AND core_competencies_average <= 4'),
            sa.CheckConstraint('attendance_percentage >= 0 AND attendance_percentage <= 100'),
            sa.CheckConstraint('character_development_score >= 1 AND character_development_score <= 4'),
        )

    if not _has_table('system_settings_config'):
        op.create_table(
            'system_settings_config',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=True, autoincrement='auto'),
            sa.Column('setting_key', sa.String(length=100), nullable=False, autoincrement='auto'),
            sa.Column('smtp_host', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('smtp_password', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('smtp_username', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('smtp_port', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('smtp_encryption', sa.String(length=50), nullable=True, autoincrement='auto'),
        )
        op.create_index(
            'ix_system_settings_config_tenant_id',
            'system_settings_config',
            ['tenant_id'],
            unique=False,
        )

    if not _has_table('values_education_resources'):
        op.create_table(
            'values_education_resources',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('title', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('resource_type', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('format', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('language', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('educational_level_id', sa.Integer(), sa.ForeignKey('educational_levels.id'), nullable=True, autoincrement='auto'),
            sa.Column('character_domains', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('content_url', sa.String(length=500), nullable=True, autoincrement='auto'),
            sa.Column('duration_minutes', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('difficulty_level', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('cultural_background', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('moral_lessons', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('discussion_questions', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('usage_count', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('average_rating', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('is_active', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    # Dependency wave 2
    if not _has_table('activity_implementations'):
        op.create_table(
            'activity_implementations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('activity_id', sa.Integer(), sa.ForeignKey('character_activities.id'), nullable=False, autoincrement='auto'),
            sa.Column('class_id', sa.Integer(), sa.ForeignKey('classes.id'), nullable=False, autoincrement='auto'),
            sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=False, autoincrement='auto'),
            sa.Column('implementation_date', sa.DateTime(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('actual_duration', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('participation_rate', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('effectiveness_rating', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('student_engagement', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('learning_outcomes_achieved', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('teacher_reflection', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('student_feedback', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('modifications_made', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('recommendations', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('activity_traits'):
        op.create_table(
            'activity_traits',
            sa.Column('activity_id', sa.Integer(), sa.ForeignKey('character_activities.id'), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('trait_id', sa.Integer(), sa.ForeignKey('character_traits.id'), nullable=False, primary_key=True, autoincrement='auto'),
        )

    if not _has_table('assessment_rubrics'):
        op.create_table(
            'assessment_rubrics',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('task_id', sa.Integer(), sa.ForeignKey('assessment_tasks.id'), nullable=False, autoincrement='auto'),
            sa.Column('criterion_name', sa.String(length=100), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('excellent_descriptor', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('proficient_descriptor', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('developing_descriptor', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('beginning_descriptor', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('excellent_points', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('proficient_points', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('developing_points', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('beginning_points', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('weight_percentage', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('assessment_submissions'):
        op.create_table(
            'assessment_submissions',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('task_id', sa.Integer(), sa.ForeignKey('assessment_tasks.id'), nullable=False, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('submitted_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('submission_content', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('file_attachments', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('differentiation_applied', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('is_submitted', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('is_late', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('assets'):
        op.create_table(
            'assets',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('facility_id', sa.Integer(), sa.ForeignKey('facilities.id'), nullable=True, autoincrement='auto'),
            sa.Column('name', sa.String(length=100), nullable=False, autoincrement='auto'),
            sa.Column('asset_tag', sa.String(length=50), nullable=False, unique=True, autoincrement='auto'),
            sa.Column('category', sa.String(length=100), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('brand', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('model', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('serial_number', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('purchase_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('purchase_cost', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('current_value', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('condition', sa.Enum('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', name='assetcondition'), nullable=True, autoincrement='auto'),
            sa.Column('is_active', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('warranty_expiry', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('last_service_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('next_service_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('supplier_name', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('supplier_contact', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('book_reservations'):
        op.create_table(
            'book_reservations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id'), nullable=False, autoincrement='auto'),
            sa.Column('member_id', sa.Integer(), sa.ForeignKey('library_members.id'), nullable=False, autoincrement='auto'),
            sa.Column('reservation_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('expiry_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('notified', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('notification_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('borrow_records'):
        op.create_table(
            'borrow_records',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id'), nullable=False, autoincrement='auto'),
            sa.Column('member_id', sa.Integer(), sa.ForeignKey('library_members.id'), nullable=False, autoincrement='auto'),
            sa.Column('borrow_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('due_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('return_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('renewed_count', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('max_renewals', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.Enum('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST', 'RENEWED', name='borrowstatus'), nullable=False, autoincrement='auto'),
            sa.Column('notes', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('issued_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('returned_to', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('differentiated_assessments'):
        op.create_table(
            'differentiated_assessments',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('task_id', sa.Integer(), sa.ForeignKey('assessment_tasks.id'), nullable=False, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('differentiation_type', sa.Enum('CONTENT', 'PROCESS', 'PRODUCT', 'LEARNING_ENVIRONMENT', 'READINESS', 'INTEREST', 'LEARNING_PROFILE', name='differentiationstrategy'), nullable=False, autoincrement='auto'),
            sa.Column('modified_content', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('complexity_level', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('learning_modalities', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('pacing_adjustments', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('alternative_formats', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('choice_options', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('seating_arrangement', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('noise_level', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('lighting_needs', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('scaffolding_provided', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('assistive_technology', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('effectiveness_rating', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('student_feedback', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('teacher_notes', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('external_exam_import_logs'):
        op.create_table(
            'external_exam_import_logs',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('examination_id', sa.Integer(), sa.ForeignKey('external_examinations.id'), nullable=False, autoincrement='auto'),
            sa.Column('import_type', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('import_source', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('batch_id', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('total_records', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('successful_imports', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('failed_imports', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('duplicate_records', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('import_status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('start_time', sa.DateTime(timezone=False), nullable=False, autoincrement='auto'),
            sa.Column('end_time', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('error_summary', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('error_details', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('external_exam_registrations'):
        op.create_table(
            'external_exam_registrations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('examination_id', sa.Integer(), sa.ForeignKey('external_examinations.id'), nullable=False, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('index_number', sa.String(length=50), nullable=False, unique=True, autoincrement='auto'),
            sa.Column('center_number', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('center_name', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('registration_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('registration_status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('is_private_candidate', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('registered_subjects', sa.JSON(), nullable=False, autoincrement='auto'),
            sa.Column('registration_fee', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('payment_status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('payment_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('maintenance_requests'):
        op.create_table(
            'maintenance_requests',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('facility_id', sa.Integer(), sa.ForeignKey('facilities.id'), nullable=False, autoincrement='auto'),
            sa.Column('title', sa.String(length=200), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='maintenancepriority'), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.Enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='maintenancestatus'), nullable=True, autoincrement='auto'),
            sa.Column('reported_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('scheduled_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('completed_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('estimated_cost', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('actual_cost', sa.Numeric(precision=10, scale=2), nullable=True, autoincrement='auto'),
            sa.Column('reported_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('assigned_to', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('contractor_name', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('contractor_contact', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('notes', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('completion_notes', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('staff_attendances'):
        op.create_table(
            'staff_attendances',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False, autoincrement='auto'),
            sa.Column('date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('check_in_time', sa.Time(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('check_out_time', sa.Time(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.UniqueConstraint('staff_id', 'date', name='uq_staff_attendance_day'),
        )

    if not _has_table('staff_leaves'):
        op.create_table(
            'staff_leaves',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('leave_type_id', sa.Integer(), sa.ForeignKey('leave_types.id'), nullable=False, autoincrement='auto'),
            sa.Column('start_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('end_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('days_count', sa.Integer(), nullable=False, autoincrement='auto'),
            sa.Column('reason', sa.Text(), nullable=False, autoincrement='auto'),
            sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', name='leavestatus'), nullable=True, autoincrement='auto'),
            sa.Column('approved_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('approval_date', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('rejection_reason', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('timetable_slots'):
        op.create_table(
            'timetable_slots',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('class_id', sa.Integer(), sa.ForeignKey('classes.id'), nullable=False, autoincrement='auto'),
            sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id'), nullable=False, autoincrement='auto'),
            sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=False, autoincrement='auto'),
            sa.Column('period_id', sa.Integer(), sa.ForeignKey('periods.id'), nullable=False, autoincrement='auto'),
            sa.Column('day_of_week', sa.String(length=10), nullable=False, autoincrement='auto'),
            sa.Column('term', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('academic_year', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('room_id', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, autoincrement='auto', server_default=sa.text('now()')),
            sa.UniqueConstraint('class_id', 'day_of_week', 'period_id', 'term', 'academic_year', name='uq_class_period'),
            sa.UniqueConstraint('teacher_id', 'day_of_week', 'period_id', 'term', 'academic_year', name='uq_teacher_period'),
        )

    if not _has_table('transactions'):
        op.create_table(
            'transactions',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('transaction_type', sa.Enum('INCOME', 'EXPENSE', name='transactiontype'), nullable=False, autoincrement='auto'),
            sa.Column('category', sa.String(length=100), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.String(length=255), nullable=False, autoincrement='auto'),
            sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False, autoincrement='auto'),
            sa.Column('transaction_date', sa.Date(), nullable=False, autoincrement='auto'),
            sa.Column('reference_number', sa.String(length=50), nullable=False, unique=True, autoincrement='auto'),
            sa.Column('payment_method', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('vendor_supplier', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('receipt_number', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('budget_id', sa.Integer(), sa.ForeignKey('budgets.id'), nullable=True, autoincrement='auto'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, autoincrement='auto'),
            sa.Column('approved_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    # Dependency wave 3
    if not _has_table('assessment_scores'):
        op.create_table(
            'assessment_scores',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('submission_id', sa.Integer(), sa.ForeignKey('assessment_submissions.id'), nullable=False, autoincrement='auto'),
            sa.Column('rubric_id', sa.Integer(), sa.ForeignKey('assessment_rubrics.id'), nullable=True, autoincrement='auto'),
            sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id'), nullable=False, autoincrement='auto'),
            sa.Column('raw_score', sa.Float(), nullable=False, autoincrement='auto'),
            sa.Column('percentage_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('grade_level', sa.Integer(), nullable=True, autoincrement='auto'),
            sa.Column('written_feedback', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('audio_feedback_url', sa.String(length=255), nullable=True, autoincrement='auto'),
            sa.Column('criterion_scores', sa.JSON(), nullable=True, autoincrement='auto'),
            sa.Column('scored_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('is_final', sa.Boolean(), nullable=True, autoincrement='auto'),
        )

    if not _has_table('external_exam_results'):
        op.create_table(
            'external_exam_results',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('examination_id', sa.Integer(), sa.ForeignKey('external_examinations.id'), nullable=False, autoincrement='auto'),
            sa.Column('registration_id', sa.Integer(), sa.ForeignKey('external_exam_registrations.id'), nullable=False, autoincrement='auto'),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False, autoincrement='auto'),
            sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id'), nullable=False, autoincrement='auto'),
            sa.Column('subject_code', sa.String(length=20), nullable=False, autoincrement='auto'),
            sa.Column('raw_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('percentage_score', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('grade_symbol', sa.String(length=5), nullable=False, autoincrement='auto'),
            sa.Column('grade_points', sa.Float(), nullable=True, autoincrement='auto'),
            sa.Column('result_status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('is_verified', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('verification_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('internal_grade_id', sa.Integer(), sa.ForeignKey('enhanced_grades.id'), nullable=True, autoincrement='auto'),
            sa.Column('is_integrated', sa.Boolean(), nullable=True, autoincrement='auto'),
            sa.Column('integration_date', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('remarks', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('special_considerations', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('import_source', sa.String(length=100), nullable=True, autoincrement='auto'),
            sa.Column('import_date', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('import_batch_id', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )

    if not _has_table('fine_records'):
        op.create_table(
            'fine_records',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement='auto'),
            sa.Column('member_id', sa.Integer(), sa.ForeignKey('library_members.id'), nullable=False, autoincrement='auto'),
            sa.Column('borrow_record_id', sa.Integer(), sa.ForeignKey('borrow_records.id'), nullable=True, autoincrement='auto'),
            sa.Column('fine_type', sa.String(length=50), nullable=False, autoincrement='auto'),
            sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False, autoincrement='auto'),
            sa.Column('description', sa.Text(), nullable=True, autoincrement='auto'),
            sa.Column('status', sa.String(length=20), nullable=True, autoincrement='auto'),
            sa.Column('payment_date', sa.Date(), nullable=True, autoincrement='auto'),
            sa.Column('payment_method', sa.String(length=50), nullable=True, autoincrement='auto'),
            sa.Column('issued_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('processed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, autoincrement='auto'),
            sa.Column('created_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
            sa.Column('updated_at', sa.DateTime(timezone=False), nullable=True, autoincrement='auto'),
        )


def downgrade():
    # Forward-only repair: destructive downgrade is unsafe
    # because legacy installations may already own these tables.
    pass
