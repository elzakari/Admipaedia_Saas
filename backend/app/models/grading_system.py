from app.extensions import db
from datetime import datetime
from enum import Enum
from sqlalchemy import CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
import uuid

class GradingStandard(Enum):
    """Ghana Educational Service Grading Standards"""
    CONTINUOUS_ASSESSMENT = "continuous_assessment"  # School-based assessment
    BECE = "bece"  # Basic Education Certificate Examination (1-9 scale)
    WASSCE = "wassce"  # West African Senior School Certificate Examination (A1-F9)
    INTERNAL_EXAM = "internal_exam"  # School internal examinations
    
class AssessmentType(Enum):
    """Types of assessments in Ghana's education system"""
    CLASS_EXERCISE = "class_exercise"
    HOMEWORK = "homework"
    PROJECT_WORK = "project_work"
    CLASS_TEST = "class_test"
    MIDTERM_EXAM = "midterm_exam"
    END_OF_TERM_EXAM = "end_of_term_exam"
    MOCK_EXAM = "mock_exam"
    EXTERNAL_EXAM = "external_exam"
    PRACTICAL_ASSESSMENT = "practical_assessment"
    ORAL_ASSESSMENT = "oral_assessment"

class GradingScheme(db.Model):
    """Grading scheme configuration for different educational levels and standards"""
    __tablename__ = 'grading_schemes'
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    standard = db.Column(db.Enum(GradingStandard), nullable=False)
    educational_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=True)
    grade_level_id = db.Column(UUID(as_uuid=True), db.ForeignKey('grade_levels.id'), nullable=True, index=True)
    
    # Scheme configuration
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)
    
    # Continuous assessment configuration
    class_score_weight = db.Column(db.Float, default=40.0)  # 40% for continuous assessment
    external_exam_weight = db.Column(db.Float, default=60.0)  # 60% for external exam
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    educational_level = db.relationship('EducationalLevel', backref='grading_schemes')
    grade_boundaries = db.relationship('GradeBoundary', backref='grading_scheme', cascade='all, delete-orphan')
    
    # Constraints
    __table_args__ = (
        CheckConstraint('class_score_weight + external_exam_weight = 100', name='weight_sum_check'),
        CheckConstraint('class_score_weight >= 0 AND class_score_weight <= 100', name='class_weight_range_check'),
        CheckConstraint('external_exam_weight >= 0 AND external_exam_weight <= 100', name='external_weight_range_check'),
    )
    
    def __repr__(self):
        return f'<GradingScheme {self.name}: {self.standard.value}>'

class GradeBoundary(db.Model):
    """Grade boundaries for different grading schemes"""
    __tablename__ = 'grade_boundaries'
    
    id = db.Column(db.Integer, primary_key=True)
    grading_scheme_id = db.Column(db.Integer, db.ForeignKey('grading_schemes.id'), nullable=False)
    
    # Grade details
    grade_symbol = db.Column(db.String(5), nullable=False)  # A1, B2, C3, 1, 2, 3, etc.
    grade_name = db.Column(db.String(50), nullable=True)  # Excellent, Very Good, etc.
    min_score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    
    # Grade properties
    is_passing = db.Column(db.Boolean, default=True)
    grade_points = db.Column(db.Float, nullable=True)  # For GPA calculation
    sequence_order = db.Column(db.Integer, nullable=False)  # For ordering grades
    
    # Color coding for UI
    color_code = db.Column(db.String(7), nullable=True)  # Hex color code
    
    # Constraints
    __table_args__ = (
        CheckConstraint('min_score >= 0 AND min_score <= 100', name='min_score_range_check'),
        CheckConstraint('max_score >= 0 AND max_score <= 100', name='max_score_range_check'),
        CheckConstraint('min_score <= max_score', name='score_range_check'),
    )
    
    def __repr__(self):
        return f'<GradeBoundary {self.grade_symbol}: {self.min_score}-{self.max_score}>'

class EnhancedGrade(db.Model):
    """Enhanced grade model supporting Ghana's continuous assessment and external exam standards"""
    __tablename__ = 'enhanced_grades'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    grading_scheme_id = db.Column(db.Integer, db.ForeignKey('grading_schemes.id'), nullable=False)
    
    # Assessment details - FIXED: Changed from assessment_type to assessment_type_id
    assessment_type_id = db.Column(db.Integer, nullable=False)  # Reference to assessment types
    assessment_name = db.Column(db.String(100), nullable=False)
    assessment_date = db.Column(db.Date, nullable=False)
    
    # Academic period
    term = db.Column(db.String(20), nullable=False)  # Term 1, Term 2, Term 3
    academic_year = db.Column(db.String(20), nullable=False)  # 2023-2024
    
    # Scores
    raw_score = db.Column(db.Float, nullable=False)  # Actual marks obtained
    total_marks = db.Column(db.Float, nullable=False)  # Total possible marks
    percentage = db.Column(db.Float, nullable=False)  # Calculated percentage
    
    # Grading results
    grade_symbol = db.Column(db.String(5), nullable=True)  # A1, B2, 1, 2, etc.
    grade_points = db.Column(db.Float, nullable=True)  # For GPA calculation
    is_passing = db.Column(db.Boolean, nullable=True)
    
    # Assessment weight and contribution
    weight = db.Column(db.Float, default=1.0)  # Weight in final grade calculation
    contributes_to_final = db.Column(db.Boolean, default=True)
    
    # Continuous assessment tracking
    is_class_score = db.Column(db.Boolean, default=True)  # True for continuous assessment
    is_external_exam = db.Column(db.Boolean, default=False)  # True for BECE/WASSCE
    
    # Additional details
    teacher_comments = db.Column(db.Text, nullable=True)
    remedial_action = db.Column(db.Text, nullable=True)
    
    # Relationships
    student = db.relationship('Student', backref='enhanced_grades')
    subject = db.relationship('Subject', backref='enhanced_grades')
    class_ = db.relationship('Class', backref='enhanced_grades')
    grading_scheme = db.relationship('GradingScheme', backref='grades')
    
    # Constraints
    __table_args__ = (
        CheckConstraint('raw_score >= 0', name='raw_score_positive_check'),
        CheckConstraint('total_marks > 0', name='total_marks_positive_check'),
        CheckConstraint('raw_score <= total_marks', name='score_within_total_check'),
        CheckConstraint('percentage >= 0 AND percentage <= 100', name='percentage_range_check'),
        CheckConstraint('weight >= 0', name='weight_positive_check'),
    )
    
    def calculate_grade(self):
        """Calculate grade symbol and points based on percentage and grading scheme"""
        if not self.grading_scheme:
            return
            
        for boundary in sorted(self.grading_scheme.grade_boundaries, 
                             key=lambda x: x.sequence_order):
            if boundary.min_score <= self.percentage <= boundary.max_score:
                self.grade_symbol = boundary.grade_symbol
                self.grade_points = boundary.grade_points
                self.is_passing = boundary.is_passing
                break
    
    def __repr__(self):
        return f'<EnhancedGrade {self.student_id}-{self.subject_id}: {self.grade_symbol} ({self.percentage}%)>'

class FinalGrade(db.Model):
    """Final computed grades combining continuous assessment and external exams"""
    __tablename__ = 'final_grades'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    grading_scheme_id = db.Column(db.Integer, db.ForeignKey('grading_schemes.id'), nullable=False)
    
    # Academic period
    term = db.Column(db.String(20), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    
    # Component scores
    class_score_average = db.Column(db.Float, nullable=True)  # Average of continuous assessments
    external_exam_score = db.Column(db.Float, nullable=True)  # BECE/WASSCE score
    
    # Final computation
    final_percentage = db.Column(db.Float, nullable=False)  # Weighted final score
    final_grade_symbol = db.Column(db.String(5), nullable=False)
    final_grade_points = db.Column(db.Float, nullable=True)
    is_passing = db.Column(db.Boolean, nullable=False)
    
    # Performance indicators
    class_rank = db.Column(db.Integer, nullable=True)  # Rank in class
    subject_rank = db.Column(db.Integer, nullable=True)  # Rank in subject across classes
    
    # Teacher evaluation
    conduct_grade = db.Column(db.String(5), nullable=True)  # A, B, C, D, E
    interest_grade = db.Column(db.String(5), nullable=True)  # A, B, C, D, E
    teacher_remarks = db.Column(db.Text, nullable=True)
    
    # Metadata
    computed_at = db.Column(db.DateTime, default=datetime.utcnow)
    computed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    student = db.relationship('Student', backref='final_grades')
    subject = db.relationship('Subject', backref='final_grades')
    class_ = db.relationship('Class', backref='final_grades')
    grading_scheme = db.relationship('GradingScheme', backref='final_grades')
    computer = db.relationship('User', backref='computed_grades')
    
    def compute_final_grade(self):
        """Compute final grade using weighted average of class score and external exam"""
        if not self.grading_scheme:
            return
            
        class_weight = self.grading_scheme.class_score_weight / 100
        external_weight = self.grading_scheme.external_exam_weight / 100
        
        # Calculate weighted final percentage
        final_score = 0
        if self.class_score_average is not None:
            final_score += self.class_score_average * class_weight
        if self.external_exam_score is not None:
            final_score += self.external_exam_score * external_weight
            
        self.final_percentage = final_score
        
        # Determine final grade symbol
        for boundary in sorted(self.grading_scheme.grade_boundaries, 
                             key=lambda x: x.sequence_order):
            if boundary.min_score <= self.final_percentage <= boundary.max_score:
                self.final_grade_symbol = boundary.grade_symbol
                self.final_grade_points = boundary.grade_points
                self.is_passing = boundary.is_passing
                break
    
    def __repr__(self):
        return f'<FinalGrade {self.student_id}-{self.subject_id}: {self.final_grade_symbol} ({self.final_percentage}%)>'
