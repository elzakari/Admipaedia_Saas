from datetime import datetime
from app.extensions import db
from enum import Enum
from sqlalchemy import CheckConstraint

class CurriculumStandard(Enum):
    """Ghana Education Service Curriculum Standards"""
    STANDARDS_BASED = "standards_based"
    COMPETENCY_BASED = "competency_based"
    STEM_FOCUSED = "stem_focused"
    CHARACTER_DEVELOPMENT = "character_development"

class LearningObjectiveType(Enum):
    """Types of learning objectives"""
    KNOWLEDGE = "knowledge"  # What students should know
    SKILLS = "skills"  # What students should be able to do
    ATTITUDES = "attitudes"  # How students should think and feel

class Curriculum(db.Model):
    """Enhanced Curriculum model for Ghana Educational Service Standards-Based Curriculum"""
    __tablename__ = 'curricula'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Ghana Education Service alignment
    educational_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    curriculum_standard = db.Column(db.Enum(CurriculumStandard), nullable=False)
    
    # Academic planning
    academic_year = db.Column(db.String(20), nullable=False)
    term = db.Column(db.String(20), nullable=False)  # Term 1, 2, 3
    duration_weeks = db.Column(db.Integer, nullable=False, default=13)
    
    # Core competencies alignment (4Cs)
    critical_thinking_weight = db.Column(db.Float, default=25.0)
    creativity_weight = db.Column(db.Float, default=25.0)
    communication_weight = db.Column(db.Float, default=25.0)
    collaboration_weight = db.Column(db.Float, default=25.0)
    
    # Assessment configuration
    sba_percentage = db.Column(db.Float, default=40.0)  # School-Based Assessment
    external_exam_percentage = db.Column(db.Float, default=60.0)
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(20), default='draft')  # draft, review, approved, published
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    educational_level = db.relationship('EducationalLevel', backref='curricula')
    subject = db.relationship('Subject', backref='curricula')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_curricula')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_curricula')
    
    # Constraints
    __table_args__ = (
        CheckConstraint('critical_thinking_weight + creativity_weight + communication_weight + collaboration_weight = 100'),
        CheckConstraint('sba_percentage + external_exam_percentage = 100'),
    )
    
    def __repr__(self):
        return f'<Curriculum {self.id}: {self.title} - {self.educational_level.level_name}>'

class LearningObjective(db.Model):
    """Learning objectives aligned with Ghana Education Service standards"""
    __tablename__ = 'learning_objectives'
    
    id = db.Column(db.Integer, primary_key=True)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curricula.id', ondelete='CASCADE'), nullable=False)
    
    # Objective details
    objective_code = db.Column(db.String(20), nullable=False)  # e.g., B1-ENG-01
    objective_text = db.Column(db.Text, nullable=False)
    objective_type = db.Column(db.Enum(LearningObjectiveType), nullable=False)
    
    # Competency alignment
    core_competency_ids = db.Column(db.JSON, nullable=True)  # List of competency IDs
    subject_competency_ids = db.Column(db.JSON, nullable=True)
    
    # Assessment criteria
    assessment_criteria = db.Column(db.JSON, nullable=True)  # List of success criteria
    performance_indicators = db.Column(db.JSON, nullable=True)
    
    # Sequencing
    sequence_order = db.Column(db.Integer, nullable=False)
    prerequisite_objectives = db.Column(db.JSON, nullable=True)  # List of prerequisite objective IDs
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    curriculum = db.relationship('Curriculum', backref='learning_objectives')
    
    def __repr__(self):
        return f'<LearningObjective {self.objective_code}: {self.objective_text[:50]}...>'

# Association table for curriculum-competency mapping
curriculum_competencies = db.Table('curriculum_competencies',
    db.Column('curriculum_id', db.Integer, db.ForeignKey('curricula.id'), primary_key=True),
    db.Column('competency_id', db.Integer, db.ForeignKey('core_competencies.id'), primary_key=True),
    db.Column('weight_percentage', db.Float, default=0.0),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)