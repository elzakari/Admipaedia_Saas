from app.extensions import db
from datetime import datetime
from enum import Enum
from sqlalchemy import CheckConstraint

class PromotionStatus(Enum):
    """Student promotion status"""
    PROMOTED = "promoted"
    RETAINED = "retained"
    CONDITIONAL = "conditional"
    TRANSFERRED = "transferred"
    GRADUATED = "graduated"

class ProgressionCriteria(Enum):
    """Criteria for student progression"""
    ACADEMIC_PERFORMANCE = "academic_performance"
    ATTENDANCE_RATE = "attendance_rate"
    COMPETENCY_ACHIEVEMENT = "competency_achievement"
    CHARACTER_DEVELOPMENT = "character_development"
    AGE_APPROPRIATENESS = "age_appropriateness"

class StudentProgression(db.Model):
    """Track student progression across Ghana Education Service key phases"""
    __tablename__ = 'student_progressions'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    
    # Academic period
    academic_year = db.Column(db.String(20), nullable=False)
    current_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=False)
    next_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=True)
    
    # Progression criteria scores
    overall_academic_average = db.Column(db.Float, nullable=False)  # Overall percentage
    attendance_percentage = db.Column(db.Float, nullable=False)
    core_competencies_average = db.Column(db.Float, nullable=False)  # 1-4 scale
    character_development_score = db.Column(db.Float, nullable=False)  # 1-4 scale
    
    # Subject-specific performance
    english_score = db.Column(db.Float, nullable=True)
    mathematics_score = db.Column(db.Float, nullable=True)
    science_score = db.Column(db.Float, nullable=True)
    
    # Key phase transition requirements
    meets_academic_threshold = db.Column(db.Boolean, default=False)  # >= 50% average
    meets_attendance_threshold = db.Column(db.Boolean, default=False)  # >= 75% attendance
    meets_competency_threshold = db.Column(db.Boolean, default=False)  # >= Level 2 in competencies
    meets_age_requirement = db.Column(db.Boolean, default=True)
    
    # Promotion decision
    promotion_status = db.Column(db.Enum(PromotionStatus), nullable=False)
    promotion_decision_date = db.Column(db.Date, nullable=False)
    decision_rationale = db.Column(db.Text, nullable=True)
    
    # Intervention tracking
    requires_remedial_support = db.Column(db.Boolean, default=False)
    remedial_subjects = db.Column(db.JSON, nullable=True)  # List of subject IDs
    intervention_plan = db.Column(db.Text, nullable=True)
    
    # Decision makers
    recommended_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Class teacher
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Head teacher
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('Student', backref='progression_records')
    current_level = db.relationship('EducationalLevel', foreign_keys=[current_level_id])
    next_level = db.relationship('EducationalLevel', foreign_keys=[next_level_id])
    recommender = db.relationship('User', foreign_keys=[recommended_by])
    approver = db.relationship('User', foreign_keys=[approved_by])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('overall_academic_average >= 0 AND overall_academic_average <= 100'),
        CheckConstraint('attendance_percentage >= 0 AND attendance_percentage <= 100'),
        CheckConstraint('core_competencies_average >= 1 AND core_competencies_average <= 4'),
        CheckConstraint('character_development_score >= 1 AND character_development_score <= 4'),
    )
    
    def evaluate_promotion_eligibility(self):
        """Evaluate if student meets promotion criteria"""
        # Academic threshold (50% minimum)
        self.meets_academic_threshold = self.overall_academic_average >= 50.0
        
        # Attendance threshold (75% minimum)
        self.meets_attendance_threshold = self.attendance_percentage >= 75.0
        
        # Competency threshold (Level 2 minimum)
        self.meets_competency_threshold = self.core_competencies_average >= 2.0
        
        # Determine promotion status
        if all([self.meets_academic_threshold, self.meets_attendance_threshold, 
                self.meets_competency_threshold, self.meets_age_requirement]):
            self.promotion_status = PromotionStatus.PROMOTED
        elif self.overall_academic_average >= 40.0 and self.attendance_percentage >= 60.0:
            self.promotion_status = PromotionStatus.CONDITIONAL
            self.requires_remedial_support = True
        else:
            self.promotion_status = PromotionStatus.RETAINED
            self.requires_remedial_support = True
    
    def __repr__(self):
        return f'<StudentProgression {self.student.full_name} - {self.academic_year} ({self.promotion_status.value})>'