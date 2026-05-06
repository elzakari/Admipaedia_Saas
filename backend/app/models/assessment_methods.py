from datetime import datetime, date
from enum import Enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, Float, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.extensions import db

class AssessmentType(Enum):
    """Types of assessments in Ghana's Standards-Based Curriculum"""
    FORMATIVE = "formative"  # Ongoing assessment during learning
    SUMMATIVE = "summative"  # Assessment at end of learning period
    DIAGNOSTIC = "diagnostic"  # Assessment to identify learning needs
    SCHOOL_BASED = "school_based"  # School-Based Assessment (SBA)
    CONTINUOUS = "continuous"  # Continuous Assessment
    PORTFOLIO = "portfolio"  # Portfolio-based assessment
    PROJECT = "project"  # Project-based assessment
    PERFORMANCE = "performance"  # Performance-based assessment
    PEER = "peer"  # Peer assessment
    SELF = "self"  # Self-assessment

class AssessmentMode(Enum):
    """Different modes of assessment delivery"""
    WRITTEN = "written"
    ORAL = "oral"
    PRACTICAL = "practical"
    DIGITAL = "digital"
    OBSERVATION = "observation"
    DEMONSTRATION = "demonstration"
    PRESENTATION = "presentation"
    PORTFOLIO_REVIEW = "portfolio_review"

class DifferentiationStrategy(Enum):
    """Strategies for differentiated assessment"""
    CONTENT = "content"  # Different content based on ability
    PROCESS = "process"  # Different ways to process information
    PRODUCT = "product"  # Different ways to demonstrate learning
    LEARNING_ENVIRONMENT = "learning_environment"  # Different learning environments
    READINESS = "readiness"  # Based on student readiness level
    INTEREST = "interest"  # Based on student interests
    LEARNING_PROFILE = "learning_profile"  # Based on learning preferences

class AssessmentFramework(db.Model):
    """Framework for organizing assessments according to Ghana's Standards-Based Curriculum"""
    __tablename__ = 'assessment_frameworks'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    educational_level_id = Column(Integer, ForeignKey('educational_levels.id'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=False)
    
    # Assessment weightings (should total 100%)
    formative_weight = Column(Float, default=30.0)  # Continuous classroom assessment
    summative_weight = Column(Float, default=40.0)  # End-of-term/semester tests
    school_based_weight = Column(Float, default=20.0)  # SBA components
    project_weight = Column(Float, default=10.0)  # Projects and portfolios
    
    # Assessment frequency
    formative_frequency = Column(String(50), default="weekly")  # weekly, bi-weekly, etc.
    summative_frequency = Column(String(50), default="termly")  # termly, semester, etc.
    
    # Standards alignment
    curriculum_standards = Column(JSON)  # Links to specific curriculum standards
    competency_indicators = Column(JSON)  # Specific competency indicators assessed
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    educational_level = relationship("EducationalLevel", backref="assessment_frameworks")
    subject = relationship("Subject", backref="assessment_frameworks")
    assessment_tasks = relationship("AssessmentTask", backref="framework")

class AssessmentTask(db.Model):
    """Individual assessment tasks within the framework"""
    __tablename__ = 'assessment_tasks'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    framework_id = Column(Integer, ForeignKey('assessment_frameworks.id'), nullable=False)
    
    # Task details
    assessment_type = Column(SQLEnum(AssessmentType), nullable=False)
    assessment_mode = Column(SQLEnum(AssessmentMode), nullable=False)
    
    # Scheduling
    scheduled_date = Column(Date)
    duration_minutes = Column(Integer)  # Duration in minutes
    
    # Differentiation
    is_differentiated = Column(Boolean, default=False)
    differentiation_strategies = Column(JSON)  # List of strategies used
    
    # Scoring
    total_marks = Column(Integer, nullable=False)
    pass_mark = Column(Integer)
    
    # Standards alignment
    learning_objectives = Column(JSON)  # Specific learning objectives assessed
    competency_indicators = Column(JSON)  # Competency indicators covered
    
    # Instructions and materials
    instructions = Column(Text)
    materials_needed = Column(JSON)  # List of required materials
    
    # Accessibility
    accessibility_features = Column(JSON)  # Features for students with special needs
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    submissions = relationship("AssessmentSubmission", backref="task")
    rubrics = relationship("AssessmentRubric", backref="task")

class AssessmentRubric(db.Model):
    """Rubrics for consistent and fair assessment"""
    __tablename__ = 'assessment_rubrics'
    
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey('assessment_tasks.id'), nullable=False)
    
    # Rubric details
    criterion_name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Performance levels (aligned with Ghana's grading standards)
    excellent_descriptor = Column(Text)  # Level 4 (80-100%)
    proficient_descriptor = Column(Text)  # Level 3 (65-79%)
    developing_descriptor = Column(Text)  # Level 2 (45-64%)
    beginning_descriptor = Column(Text)  # Level 1 (0-44%)
    
    # Scoring
    excellent_points = Column(Integer, default=4)
    proficient_points = Column(Integer, default=3)
    developing_points = Column(Integer, default=2)
    beginning_points = Column(Integer, default=1)
    
    weight_percentage = Column(Float, default=25.0)  # Weight of this criterion
    
    created_at = Column(DateTime, default=datetime.utcnow)

class AssessmentSubmission(db.Model):
    """Student submissions for assessment tasks"""
    __tablename__ = 'assessment_submissions'
    
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey('assessment_tasks.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    
    # Submission details
    submitted_at = Column(DateTime)
    submission_content = Column(Text)  # Text content or file references
    file_attachments = Column(JSON)  # List of attached files
    
    # Differentiation applied
    differentiation_applied = Column(JSON)  # Specific differentiations for this student
    
    # Status
    is_submitted = Column(Boolean, default=False)
    is_late = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", backref="assessment_submissions")
    scores = relationship("AssessmentScore", backref="submission")

class AssessmentScore(db.Model):
    """Scores and feedback for assessment submissions"""
    __tablename__ = 'assessment_scores'
    
    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey('assessment_submissions.id'), nullable=False)
    rubric_id = Column(Integer, ForeignKey('assessment_rubrics.id'), nullable=True)
    teacher_id = Column(Integer, ForeignKey('teachers.id'), nullable=False)
    
    # Scoring
    raw_score = Column(Float, nullable=False)  # Actual points earned
    percentage_score = Column(Float)  # Percentage score
    grade_level = Column(Integer)  # 1-4 performance level
    
    # Feedback
    written_feedback = Column(Text)
    audio_feedback_url = Column(String(255))  # URL to audio feedback
    
    # Rubric-based scoring
    criterion_scores = Column(JSON)  # Scores for each rubric criterion
    
    # Assessment metadata
    scored_at = Column(DateTime, default=datetime.utcnow)
    is_final = Column(Boolean, default=True)
    
    # Relationships
    teacher = relationship("Teacher", backref="assessment_scores")

class ContinuousAssessmentRecord(db.Model):
    """Records for continuous assessment tracking"""
    __tablename__ = 'continuous_assessment_records'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=False)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)
    teacher_id = Column(Integer, ForeignKey('teachers.id'), nullable=False)
    
    # Assessment period
    academic_year = Column(String(20), nullable=False)
    term = Column(String(20), nullable=False)
    week_number = Column(Integer)
    
    # Assessment data
    assessment_date = Column(Date, nullable=False)
    assessment_focus = Column(String(200))  # What was assessed
    
    # Scores (aligned with Ghana's continuous assessment model)
    class_score = Column(Float)  # Out of 40 (40% of total)
    homework_score = Column(Float)  # Part of class score
    participation_score = Column(Float)  # Part of class score
    quiz_score = Column(Float)  # Part of class score
    
    # Competency tracking
    competencies_demonstrated = Column(JSON)  # List of competencies shown
    competency_levels = Column(JSON)  # Level achieved for each competency
    
    # Observations
    teacher_observations = Column(Text)
    learning_difficulties = Column(Text)
    strengths_noted = Column(Text)
    
    # Recommendations
    next_steps = Column(Text)
    support_needed = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", backref="continuous_assessments")
    subject = relationship("Subject", backref="continuous_assessments")
    class_ = relationship("Class", backref="continuous_assessments")
    teacher = relationship("Teacher", backref="continuous_assessments")

class SchoolBasedAssessment(db.Model):
    """School-Based Assessment (SBA) records as per Ghana Education Service guidelines"""
    __tablename__ = 'school_based_assessments'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=False)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)
    
    # SBA period
    academic_year = Column(String(20), nullable=False)
    term = Column(String(20), nullable=False)
    
    # SBA components (as per GES guidelines)
    # Component 1: Class Exercises and Homework (10%)
    class_exercises_score = Column(Float, default=0.0)
    homework_score = Column(Float, default=0.0)
    
    # Component 2: Projects and Assignments (15%)
    project_score = Column(Float, default=0.0)
    assignment_score = Column(Float, default=0.0)
    
    # Component 3: Class Tests (15%)
    class_test_scores = Column(JSON)  # Multiple test scores
    class_test_average = Column(Float, default=0.0)
    
    # Total SBA score (out of 40% for BECE, varies for others)
    total_sba_score = Column(Float, default=0.0)
    sba_percentage = Column(Float, default=0.0)
    
    # Competency assessment
    core_competencies_score = Column(JSON)  # Scores for 4Cs
    subject_competencies_score = Column(JSON)  # Subject-specific competencies
    
    # Teacher assessment
    teacher_id = Column(Integer, ForeignKey('teachers.id'), nullable=False)
    assessment_date = Column(Date, nullable=False)
    
    # Quality assurance
    is_moderated = Column(Boolean, default=False)
    moderated_by = Column(Integer, ForeignKey('teachers.id'))
    moderation_date = Column(Date)
    moderation_comments = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # Relationships
    student = relationship("Student", foreign_keys=[student_id], backref="sba_records")
    subject = relationship("Subject", backref="school_based_assessments")  # Changed from 'sba_records'
    class_ = relationship("Class", backref="sba_records")
    teacher = relationship("Teacher", foreign_keys=[teacher_id], backref="sba_assessments")
    moderator = relationship("Teacher", foreign_keys=[moderated_by], backref="sba_moderations")

class DifferentiatedAssessment(db.Model):
    """Differentiated assessment strategies and implementations"""
    __tablename__ = 'differentiated_assessments'
    
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey('assessment_tasks.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    
    # Differentiation applied
    differentiation_type = Column(SQLEnum(DifferentiationStrategy), nullable=False)
    
    # Content differentiation
    modified_content = Column(Text)  # Adjusted content for student level
    complexity_level = Column(String(20))  # basic, intermediate, advanced
    
    # Process differentiation
    learning_modalities = Column(JSON)  # visual, auditory, kinesthetic preferences
    pacing_adjustments = Column(String(100))  # extended time, accelerated, etc.
    
    # Product differentiation
    alternative_formats = Column(JSON)  # Different ways to show learning
    choice_options = Column(JSON)  # Student choice in demonstration method
    
    # Environment differentiation
    seating_arrangement = Column(String(100))
    noise_level = Column(String(50))
    lighting_needs = Column(String(100))
    
    # Support provided
    scaffolding_provided = Column(JSON)  # Types of support given
    assistive_technology = Column(JSON)  # Technology supports used
    
    # Outcomes
    effectiveness_rating = Column(Integer)  # 1-5 scale
    student_feedback = Column(Text)
    teacher_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", backref="differentiated_assessments")

class AssessmentAnalytics(db.Model):
    """Analytics and insights from assessment data"""
    __tablename__ = 'assessment_analytics'
    
    id = Column(Integer, primary_key=True)
    
    # Scope of analysis
    analysis_type = Column(String(50), nullable=False)  # student, class, subject, school
    entity_id = Column(Integer, nullable=False)  # ID of student, class, etc.
    
    # Time period
    academic_year = Column(String(20), nullable=False)
    term = Column(String(20))
    
    # Performance metrics
    average_score = Column(Float)
    median_score = Column(Float)
    score_distribution = Column(JSON)  # Distribution across grade levels
    
    # Competency analysis
    competency_strengths = Column(JSON)  # Strong competency areas
    competency_gaps = Column(JSON)  # Areas needing improvement
    
    # Trends
    performance_trend = Column(String(20))  # improving, declining, stable
    trend_data = Column(JSON)  # Historical performance data
    
    # Recommendations
    intervention_recommendations = Column(JSON)
    enrichment_opportunities = Column(JSON)
    
    # Generated insights
    ai_insights = Column(JSON)  # AI-generated insights and predictions
    
    generated_at = Column(DateTime, default=datetime.utcnow)
    generated_by = Column(String(100))  # system, teacher, admin