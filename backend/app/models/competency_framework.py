from app.extensions import db
from datetime import datetime
from enum import Enum
from sqlalchemy import CheckConstraint

class CompetencyDomain(Enum):
    """Core competency domains as per Ghana Educational Service framework"""
    COMMUNICATION_COLLABORATION = "communication_collaboration"
    CRITICAL_THINKING_PROBLEM_SOLVING = "critical_thinking_problem_solving"
    CREATIVITY_INNOVATION = "creativity_innovation"
    CULTURAL_IDENTITY_GLOBAL_CITIZENSHIP = "cultural_identity_global_citizenship"
    PERSONAL_DEVELOPMENT_LEADERSHIP = "personal_development_leadership"
    DIGITAL_LITERACY = "digital_literacy"

class ProficiencyLevel(Enum):
    """Proficiency levels for competency assessment"""
    BEGINNING = "beginning"  # Level 1
    DEVELOPING = "developing"  # Level 2
    PROFICIENT = "proficient"  # Level 3
    EXCELLENT = "excellent"  # Level 4

class CompetencyIndicator(db.Model):
    """Specific indicators for measuring core competencies"""
    __tablename__ = 'competency_indicators'
    
    id = db.Column(db.Integer, primary_key=True)
    competency_id = db.Column(db.Integer, db.ForeignKey('core_competencies.id'), nullable=False)
    
    # Indicator details
    indicator_code = db.Column(db.String(20), unique=True, nullable=False)
    indicator_text = db.Column(db.Text, nullable=False)
    domain = db.Column(db.Enum(CompetencyDomain), nullable=False)
    
    # Educational level applicability
    min_educational_level = db.Column(db.Integer, nullable=False)  # Sequence order from educational_levels
    max_educational_level = db.Column(db.Integer, nullable=False)
    
    # Assessment configuration
    is_observable = db.Column(db.Boolean, default=True)
    assessment_methods = db.Column(db.JSON, nullable=True)  # List of assessment methods
    
    # Rubric levels
    level_1_descriptor = db.Column(db.Text, nullable=True)  # Beginning
    level_2_descriptor = db.Column(db.Text, nullable=True)  # Developing
    level_3_descriptor = db.Column(db.Text, nullable=True)  # Proficient
    level_4_descriptor = db.Column(db.Text, nullable=True)  # Excellent
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    competency = db.relationship('CoreCompetency', backref='indicators')
    
    def __repr__(self):
        return f'<CompetencyIndicator {self.indicator_code}: {self.domain.value}>'

class StudentCompetencyProfile(db.Model):
    """Comprehensive competency profile for each student"""
    __tablename__ = 'student_competency_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    
    # Overall competency scores by domain
    communication_collaboration_score = db.Column(db.Float, nullable=True)
    critical_thinking_score = db.Column(db.Float, nullable=True)
    creativity_innovation_score = db.Column(db.Float, nullable=True)
    cultural_identity_score = db.Column(db.Float, nullable=True)
    personal_development_score = db.Column(db.Float, nullable=True)
    digital_literacy_score = db.Column(db.Float, nullable=True)
    
    # Overall competency level
    overall_competency_level = db.Column(db.Enum(ProficiencyLevel), nullable=True)
    overall_score = db.Column(db.Float, nullable=True)
    
    # Progress tracking
    strengths = db.Column(db.JSON, nullable=True)  # List of strength areas
    areas_for_improvement = db.Column(db.JSON, nullable=True)  # Areas needing development
    recommended_activities = db.Column(db.JSON, nullable=True)  # Suggested learning activities
    
    # Teacher observations
    teacher_comments = db.Column(db.Text, nullable=True)
    parent_feedback = db.Column(db.Text, nullable=True)
    
    # Metadata
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    student = db.relationship('Student', backref='competency_profiles')
    updater = db.relationship('User', backref='updated_competency_profiles')
    
    # Constraints
    __table_args__ = (
        CheckConstraint('overall_score >= 0 AND overall_score <= 4', name='overall_score_range_check'),
        db.UniqueConstraint('student_id', 'academic_year', name='unique_student_year_profile'),
    )
    
    def calculate_overall_score(self):
        """Calculate overall competency score from domain scores"""
        scores = [
            self.communication_collaboration_score,
            self.critical_thinking_score,
            self.creativity_innovation_score,
            self.cultural_identity_score,
            self.personal_development_score,
            self.digital_literacy_score
        ]
        
        valid_scores = [score for score in scores if score is not None]
        if valid_scores:
            self.overall_score = sum(valid_scores) / len(valid_scores)
            
            # Determine proficiency level
            if self.overall_score >= 3.5:
                self.overall_competency_level = ProficiencyLevel.EXCELLENT
            elif self.overall_score >= 2.5:
                self.overall_competency_level = ProficiencyLevel.PROFICIENT
            elif self.overall_score >= 1.5:
                self.overall_competency_level = ProficiencyLevel.DEVELOPING
            else:
                self.overall_competency_level = ProficiencyLevel.BEGINNING
    
    def __repr__(self):
        return f'<StudentCompetencyProfile {self.student_id}: {self.overall_competency_level}>'

class CompetencyEvidence(db.Model):
    """Evidence collection for competency assessments"""
    __tablename__ = 'competency_evidence'
    
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('student_competency_assessments.id'), nullable=False)
    indicator_id = db.Column(db.Integer, db.ForeignKey('competency_indicators.id'), nullable=False)
    
    # Evidence details
    evidence_type = db.Column(db.String(50), nullable=False)  # observation, artifact, performance, etc.
    evidence_title = db.Column(db.String(200), nullable=False)
    evidence_description = db.Column(db.Text, nullable=True)
    
    # File attachments
    file_path = db.Column(db.String(500), nullable=True)
    file_type = db.Column(db.String(50), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    
    # Assessment details
    proficiency_demonstrated = db.Column(db.Enum(ProficiencyLevel), nullable=False)
    observer_notes = db.Column(db.Text, nullable=True)
    
    # Context information
    subject_context = db.Column(db.String(100), nullable=True)
    activity_context = db.Column(db.String(200), nullable=True)
    collaboration_involved = db.Column(db.Boolean, default=False)
    
    # Metadata
    collected_date = db.Column(db.Date, nullable=False)
    collected_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    assessment = db.relationship('StudentCompetencyAssessment', backref='evidence_items')
    indicator = db.relationship('CompetencyIndicator', backref='evidence_items')
    collector = db.relationship('User', backref='collected_evidence')
    
    def __repr__(self):
        return f'<CompetencyEvidence {self.evidence_title}: {self.proficiency_demonstrated.value}>'

class CompetencyLearningActivity(db.Model):
    """Learning activities designed to develop specific competencies"""
    __tablename__ = 'competency_learning_activities'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Activity details
    activity_name = db.Column(db.String(200), nullable=False)
    activity_description = db.Column(db.Text, nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)  # project, discussion, simulation, etc.
    
    # Competency targeting
    target_competencies = db.Column(db.JSON, nullable=False)  # List of competency IDs
    target_indicators = db.Column(db.JSON, nullable=True)  # List of indicator IDs
    primary_domain = db.Column(db.Enum(CompetencyDomain), nullable=False)
    
    # Educational context
    suitable_educational_levels = db.Column(db.JSON, nullable=False)  # List of level IDs
    subject_integration = db.Column(db.JSON, nullable=True)  # List of subject IDs
    
    # Activity configuration
    duration_minutes = db.Column(db.Integer, nullable=True)
    group_size_min = db.Column(db.Integer, nullable=True)
    group_size_max = db.Column(db.Integer, nullable=True)
    resources_required = db.Column(db.JSON, nullable=True)  # List of required resources
    
    # Assessment integration
    assessment_rubric = db.Column(db.JSON, nullable=True)  # Assessment criteria
    success_indicators = db.Column(db.JSON, nullable=True)  # Success measures
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_activities')
    
    def __repr__(self):
        return f'<CompetencyLearningActivity {self.activity_name}: {self.primary_domain.value}>'