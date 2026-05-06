from datetime import datetime
from app.extensions import db
from sqlalchemy import CheckConstraint

class STEMDomain(db.Model):
    """STEM domains lookup table"""
    __tablename__ = 'stem_domains'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    code = db.Column(db.String(10), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    color_code = db.Column(db.String(7), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stem_subjects = db.relationship('STEMSubject', backref='stem_domain_ref', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<STEMDomain {self.name}>'

class LearningApproach(db.Model):
    """Learning approaches lookup table"""
    __tablename__ = 'learning_approaches'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    code = db.Column(db.String(20), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<LearningApproach {self.name}>'

class STEMSubject(db.Model):
    """Enhanced STEM subjects with specialized attributes"""
    __tablename__ = 'stem_subjects'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    stem_domain_id = db.Column(db.Integer, db.ForeignKey('stem_domains.id'), nullable=False)
    educational_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=False)
    
    # Integration and scheduling
    integration_level = db.Column(db.String(20), nullable=False)  # Basic, Intermediate, Advanced
    practical_hours_per_week = db.Column(db.Integer, nullable=True)
    theory_hours_per_week = db.Column(db.Integer, nullable=True)
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subject = db.relationship('Subject', backref='stem_profile')
    educational_level = db.relationship('EducationalLevel', backref='stem_subjects')
    learning_modules = db.relationship('STEMLearningModule', backref='stem_subject', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<STEMSubject {self.stem_domain_ref.name if self.stem_domain_ref else "Unknown"}: {self.subject.name if self.subject else "Unknown"}>'

class STEMLearningModule(db.Model):
    """STEM learning modules with project-based and inquiry-based approaches"""
    __tablename__ = 'stem_learning_modules'
    
    id = db.Column(db.Integer, primary_key=True)
    stem_subject_id = db.Column(db.Integer, db.ForeignKey('stem_subjects.id'), nullable=False)
    educational_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=False)
    
    # Module details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    learning_objectives = db.Column(db.JSON, nullable=True)  # List of objectives
    
    # STEM approach - Fixed: Changed from db.Enum(LearningApproach) to foreign key
    primary_approach_id = db.Column(db.Integer, db.ForeignKey('learning_approaches.id'), nullable=False)
    secondary_approaches = db.Column(db.JSON, nullable=True)  # Additional approaches
    
    # Duration and sequencing
    duration_weeks = db.Column(db.Integer, nullable=False)
    sequence_order = db.Column(db.Integer, nullable=False)
    term = db.Column(db.String(20), nullable=False)  # Term 1, Term 2, Term 3
    
    # Resources and requirements
    required_materials = db.Column(db.JSON, nullable=True)  # List of materials
    technology_requirements = db.Column(db.JSON, nullable=True)  # Tech requirements
    safety_considerations = db.Column(db.Text, nullable=True)
    
    # Assessment configuration
    formative_assessment_percentage = db.Column(db.Float, default=40.0)
    summative_assessment_percentage = db.Column(db.Float, default=60.0)
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - Added primary_approach relationship
    educational_level = db.relationship('EducationalLevel', backref='stem_modules')
    creator = db.relationship('User', backref='created_stem_modules')
    primary_approach = db.relationship('LearningApproach', backref='stem_modules')
    projects = db.relationship('STEMProject', backref='learning_module', cascade='all, delete-orphan')
    assessments = db.relationship('STEMAssessment', backref='learning_module', cascade='all, delete-orphan')
    
    # Constraints
    __table_args__ = (
        CheckConstraint('formative_assessment_percentage + summative_assessment_percentage = 100', name='assessment_percentage_check'),
    )
    
    def __repr__(self):
        return f'<STEMLearningModule {self.title}>'

class STEMProject(db.Model):
    """STEM projects for hands-on learning and real-world problem solving"""
    __tablename__ = 'stem_projects'
    
    id = db.Column(db.Integer, primary_key=True)
    learning_module_id = db.Column(db.Integer, db.ForeignKey('stem_learning_modules.id'), nullable=False)
    
    # Project details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    problem_statement = db.Column(db.Text, nullable=False)
    
    # Project configuration
    is_individual = db.Column(db.Boolean, default=False)
    is_group = db.Column(db.Boolean, default=True)
    max_group_size = db.Column(db.Integer, default=4)
    
    # Timeline
    duration_days = db.Column(db.Integer, nullable=False)
    milestones = db.Column(db.JSON, nullable=True)  # Project milestones
    
    # Resources and deliverables
    required_resources = db.Column(db.JSON, nullable=True)
    expected_deliverables = db.Column(db.JSON, nullable=True)
    evaluation_criteria = db.Column(db.JSON, nullable=True)
    
    # Real-world connections
    industry_connections = db.Column(db.JSON, nullable=True)  # Industry relevance
    community_impact = db.Column(db.Text, nullable=True)
    sustainability_focus = db.Column(db.Boolean, default=False)
    
    # Metadata
    difficulty_level = db.Column(db.String(20), default='Intermediate')  # Beginner, Intermediate, Advanced
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_stem_projects')
    submissions = db.relationship('STEMProjectSubmission', backref='project', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<STEMProject {self.title}>'

class STEMAssessment(db.Model):
    """STEM-specific assessment methods and rubrics"""
    __tablename__ = 'stem_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    learning_module_id = db.Column(db.Integer, db.ForeignKey('stem_learning_modules.id'), nullable=False)
    
    # Assessment details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    assessment_type = db.Column(db.String(50), nullable=False)  # Practical, Project, Portfolio, Presentation
    
    # STEM assessment criteria
    scientific_method_weight = db.Column(db.Float, default=25.0)
    technical_skills_weight = db.Column(db.Float, default=25.0)
    innovation_creativity_weight = db.Column(db.Float, default=25.0)
    communication_weight = db.Column(db.Float, default=25.0)
    
    # Assessment configuration
    total_marks = db.Column(db.Float, nullable=False, default=100.0)
    duration_minutes = db.Column(db.Integer, nullable=True)
    requires_presentation = db.Column(db.Boolean, default=False)
    requires_demonstration = db.Column(db.Boolean, default=False)
    
    # Rubric and criteria
    rubric_criteria = db.Column(db.JSON, nullable=True)  # Detailed rubric
    success_indicators = db.Column(db.JSON, nullable=True)  # Success indicators
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_stem_assessments')
    results = db.relationship('STEMAssessmentResult', backref='assessment', cascade='all, delete-orphan')
    
    # Constraints
    __table_args__ = (
        CheckConstraint('scientific_method_weight + technical_skills_weight + innovation_creativity_weight + communication_weight = 100', name='stem_assessment_weight_check'),
    )
    
    def __repr__(self):
        return f'<STEMAssessment {self.title}>'

class STEMProjectSubmission(db.Model):
    """Student submissions for STEM projects"""
    __tablename__ = 'stem_project_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('stem_projects.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    
    # Group project handling
    group_members = db.Column(db.JSON, nullable=True)  # List of student IDs for group projects
    is_group_leader = db.Column(db.Boolean, default=False)
    
    # Submission details
    submission_date = db.Column(db.DateTime, nullable=False)
    project_title = db.Column(db.String(200), nullable=False)
    project_description = db.Column(db.Text, nullable=False)
    
    # Deliverables
    documentation_file = db.Column(db.String(255), nullable=True)
    presentation_file = db.Column(db.String(255), nullable=True)
    prototype_images = db.Column(db.JSON, nullable=True)  # List of image paths
    video_demonstration = db.Column(db.String(255), nullable=True)
    
    # Self-assessment
    challenges_faced = db.Column(db.Text, nullable=True)
    lessons_learned = db.Column(db.Text, nullable=True)
    future_improvements = db.Column(db.Text, nullable=True)
    
    # Status and feedback
    status = db.Column(db.String(20), default='Submitted')  # Submitted, Under Review, Graded
    teacher_feedback = db.Column(db.Text, nullable=True)
    peer_feedback = db.Column(db.JSON, nullable=True)  # Peer review feedback
    
    # Grading
    total_score = db.Column(db.Float, nullable=True)
    innovation_score = db.Column(db.Float, nullable=True)
    technical_score = db.Column(db.Float, nullable=True)
    presentation_score = db.Column(db.Float, nullable=True)
    collaboration_score = db.Column(db.Float, nullable=True)
    
    # Metadata
    graded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('Student', backref='stem_project_submissions')
    grader = db.relationship('User', backref='graded_stem_submissions')
    
    def __repr__(self):
        return f'<STEMProjectSubmission {self.project_title} by {self.student.user.name if self.student else "Unknown"}>'

class STEMAssessmentResult(db.Model):
    """Results for STEM assessments with detailed scoring"""
    __tablename__ = 'stem_assessment_results'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('stem_assessments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    
    # Detailed scoring
    scientific_method_score = db.Column(db.Float, nullable=False)
    technical_skills_score = db.Column(db.Float, nullable=False)
    innovation_creativity_score = db.Column(db.Float, nullable=False)
    communication_score = db.Column(db.Float, nullable=False)
    
    # Overall results
    total_score = db.Column(db.Float, nullable=False)
    percentage = db.Column(db.Float, nullable=False)
    grade_letter = db.Column(db.String(5), nullable=False)
    
    # Qualitative feedback
    strengths = db.Column(db.Text, nullable=True)
    areas_for_improvement = db.Column(db.Text, nullable=True)
    teacher_comments = db.Column(db.Text, nullable=True)
    
    # Competency tracking
    competencies_demonstrated = db.Column(db.JSON, nullable=True)  # List of competency IDs
    competency_levels = db.Column(db.JSON, nullable=True)  # Competency level scores
    
    # Metadata
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assessment_date = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('Student', backref='stem_assessment_results')
    assessor = db.relationship('User', backref='conducted_stem_assessments')
    
    def __repr__(self):
        return f'<STEMAssessmentResult {self.student.user.name if self.student else "Unknown"}: {self.percentage}%>'

class STEMResourceCenter(db.Model):
    """STEM resources and materials management"""
    __tablename__ = 'stem_resource_center'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Resource details
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    resource_type = db.Column(db.String(50), nullable=False)  # Equipment, Software, Material, Digital
    
    # Categorization
    stem_domains = db.Column(db.JSON, nullable=False)  # List of applicable STEM domains
    educational_levels = db.Column(db.JSON, nullable=False)  # Applicable educational levels
    
    # Availability and management
    total_quantity = db.Column(db.Integer, default=1)
    available_quantity = db.Column(db.Integer, default=1)
    location = db.Column(db.String(100), nullable=True)
    
    # Usage tracking
    usage_instructions = db.Column(db.Text, nullable=True)
    safety_guidelines = db.Column(db.Text, nullable=True)
    maintenance_schedule = db.Column(db.JSON, nullable=True)
    
    # Digital resources
    file_path = db.Column(db.String(255), nullable=True)
    external_url = db.Column(db.String(500), nullable=True)
    access_requirements = db.Column(db.JSON, nullable=True)
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_stem_resources')
    bookings = db.relationship('STEMResourceBooking', backref='resource', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<STEMResourceCenter {self.name}>'

class STEMResourceBooking(db.Model):
    """Booking system for STEM resources"""
    __tablename__ = 'stem_resource_bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, db.ForeignKey('stem_resource_center.id'), nullable=False)
    booked_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Booking details
    booking_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    quantity_requested = db.Column(db.Integer, default=1)
    
    # Purpose and approval
    purpose = db.Column(db.Text, nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True)
    status = db.Column(db.String(20), default='Pending')  # Pending, Approved, Rejected, Completed
    
    # Approval workflow
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approval_date = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    
    # Usage tracking
    actual_usage_notes = db.Column(db.Text, nullable=True)
    condition_after_use = db.Column(db.String(50), nullable=True)  # Good, Fair, Damaged
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    booker = db.relationship('User', foreign_keys=[booked_by], backref='stem_resource_bookings')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_stem_bookings')
    class_ = db.relationship('Class', backref='stem_resource_bookings')
    
    def __repr__(self):
        return f'<STEMResourceBooking {self.resource.name if self.resource else "Unknown"} on {self.booking_date}>'