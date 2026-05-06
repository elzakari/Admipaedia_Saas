from app.extensions import db
from datetime import datetime
from enum import Enum
from sqlalchemy import CheckConstraint

class SBAComponent(Enum):
    """School-Based Assessment components as per Ghana Education Service"""
    CLASS_EXERCISES = "class_exercises"  # 10%
    HOMEWORK = "homework"  # 10% 
    PROJECT_WORK = "project_work"  # 15%
    CLASS_TESTS = "class_tests"  # 15%
    PRACTICAL_WORK = "practical_work"  # Variable based on subject
    ORAL_ASSESSMENT = "oral_assessment"  # For languages

class EnhancedSBA(db.Model):
    """Enhanced School-Based Assessment with Ghana Education Service compliance"""
    __tablename__ = 'enhanced_sba'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curricula.id'), nullable=False)
    
    # Academic period
    academic_year = db.Column(db.String(20), nullable=False)
    term = db.Column(db.String(20), nullable=False)
    
    # SBA Components (Ghana Education Service standard weights)
    class_exercises_score = db.Column(db.Float, default=0.0)  # Out of 100
    class_exercises_weight = db.Column(db.Float, default=10.0)  # 10%
    
    homework_score = db.Column(db.Float, default=0.0)
    homework_weight = db.Column(db.Float, default=10.0)  # 10%
    
    project_work_score = db.Column(db.Float, default=0.0)
    project_work_weight = db.Column(db.Float, default=15.0)  # 15%
    
    class_tests_score = db.Column(db.Float, default=0.0)
    class_tests_weight = db.Column(db.Float, default=15.0)  # 15%
    
    practical_work_score = db.Column(db.Float, default=0.0)
    practical_work_weight = db.Column(db.Float, default=0.0)  # Variable
    
    oral_assessment_score = db.Column(db.Float, default=0.0)
    oral_assessment_weight = db.Column(db.Float, default=0.0)  # Variable
    
    # Calculated totals
    total_sba_score = db.Column(db.Float, default=0.0)  # Weighted total
    sba_percentage = db.Column(db.Float, default=40.0)  # Usually 40% of final grade
    
    # Core competencies assessment (4Cs)
    critical_thinking_score = db.Column(db.Float, default=0.0)  # 1-4 scale
    creativity_score = db.Column(db.Float, default=0.0)
    communication_score = db.Column(db.Float, default=0.0)
    collaboration_score = db.Column(db.Float, default=0.0)
    
    # Character traits assessment
    character_traits_scores = db.Column(db.JSON, nullable=True)  # Dict of trait_id: score
    
    # Assessment metadata
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_finalized = db.Column(db.Boolean, default=False)
    finalized_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    student = db.relationship('Student', backref='enhanced_sba_records')
    subject = db.relationship('Subject', backref='sba_records')
    curriculum = db.relationship('Curriculum', backref='sba_assessments')
    assessor = db.relationship('User', backref='sba_assessments')
    
    # Constraints
    __table_args__ = (
        CheckConstraint('class_exercises_score >= 0 AND class_exercises_score <= 100'),
        CheckConstraint('homework_score >= 0 AND homework_score <= 100'),
        CheckConstraint('project_work_score >= 0 AND project_work_score <= 100'),
        CheckConstraint('class_tests_score >= 0 AND class_tests_score <= 100'),
        CheckConstraint('critical_thinking_score >= 1 AND critical_thinking_score <= 4'),
        CheckConstraint('creativity_score >= 1 AND creativity_score <= 4'),
        CheckConstraint('communication_score >= 1 AND communication_score <= 4'),
        CheckConstraint('collaboration_score >= 1 AND collaboration_score <= 4'),
    )
    
    def calculate_total_sba(self):
        """Calculate weighted total SBA score"""
        total_weight = (self.class_exercises_weight + self.homework_weight + 
                       self.project_work_weight + self.class_tests_weight +
                       self.practical_work_weight + self.oral_assessment_weight)
        
        if total_weight == 0:
            return 0.0
            
        weighted_score = (
            (self.class_exercises_score * self.class_exercises_weight / 100) +
            (self.homework_score * self.homework_weight / 100) +
            (self.project_work_score * self.project_work_weight / 100) +
            (self.class_tests_score * self.class_tests_weight / 100) +
            (self.practical_work_score * self.practical_work_weight / 100) +
            (self.oral_assessment_score * self.oral_assessment_weight / 100)
        )
        
        self.total_sba_score = (weighted_score / total_weight) * 100
        return self.total_sba_score
    
    def __repr__(self):
        return f'<EnhancedSBA {self.student.full_name} - {self.subject.name} ({self.term} {self.academic_year})>'