from app.extensions import db
from datetime import datetime
from enum import Enum

class KeyPhase(Enum):
    """Ghana Educational Service Key Phases"""
    KEY_PHASE_1 = "key_phase_1"  # KG1-KG2 (Pre-school)
    KEY_PHASE_2 = "key_phase_2"  # B1-B3 (Lower Primary)
    KEY_PHASE_3 = "key_phase_3"  # B4-B6 (Upper Primary)
    KEY_PHASE_4 = "key_phase_4"  # JHS1-JHS3 (Junior High School)
    KEY_PHASE_5 = "key_phase_5"  # SHS1-SHS3 (Senior High School)

class EducationalLevel(db.Model):
    """Educational Level model for Ghana Educational Service Standards-Based Curriculum"""
    __tablename__ = 'educational_levels'

    id = db.Column(db.Integer, primary_key=True)
    level_code = db.Column('code', db.String(10), unique=True, nullable=False)  # maps to migration 'code'
    level_name = db.Column('name', db.String(100), nullable=False)  # maps to migration 'name'
    key_phase = db.Column(db.String(50), nullable=False)  # store raw string, aligns with migration
    # sequence_order removed: not present in migration
    min_age = db.Column('age_range_start', db.Integer, nullable=True)  # maps to migration 'age_range_start'
    max_age = db.Column('age_range_end', db.Integer, nullable=True)    # maps to migration 'age_range_end'
    curriculum_focus = db.Column('description', db.Text, nullable=True)  # maps to migration 'description'

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    classes = db.relationship('Class', backref='educational_level', lazy=True)
    character_traits = db.relationship('CharacterTrait', back_populates='educational_level', lazy=True)

    def __repr__(self):
        return f'<EducationalLevel {self.level_code}: {self.level_name}>'

    @property
    def key_phase_description(self):
        """Get human-readable key phase description"""
        descriptions = {
            'key_phase_1': "Pre-school (KG1-KG2)",
            'key_phase_2': "Lower Primary (B1-B3)",
            'key_phase_3': "Upper Primary (B4-B6)",
            'key_phase_4': "Junior High School (JHS1-JHS3)",
            'key_phase_5': "Senior High School (SHS1-SHS3)"
        }
        val = self.key_phase.value if hasattr(self.key_phase, 'value') else self.key_phase
        return descriptions.get(val, "Unknown Phase")
    
    @classmethod
    def get_by_key_phase(cls, key_phase):
        """Get all educational levels for a specific key phase"""
        key_phase_value = key_phase.value if hasattr(key_phase, 'value') else key_phase
        return cls.query.filter_by(key_phase=key_phase_value, is_active=True).order_by(cls.id).all()
    
    @classmethod
    def get_next_level(cls, current_level_id):
        """Get the next educational level in progression"""
        current = cls.query.get(current_level_id)
        if not current:
            return None
        return cls.query.filter(
            cls.id > current.id,
            cls.is_active == True
        ).order_by(cls.id).first()
    
    @classmethod
    def get_previous_level(cls, current_level_id):
        """Get the previous educational level in progression"""
        current = cls.query.get(current_level_id)
        if not current:
            return None
        return cls.query.filter(
            cls.id < current.id,
            cls.is_active == True
        ).order_by(cls.id.desc()).first()

class CoreCompetency(db.Model):
    """Core Competencies for 21st Century Skills as per Ghana Educational Service"""
    __tablename__ = 'core_competencies'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<CoreCompetency {self.name}>'

class StudentCompetencyAssessment(db.Model):
    """Track student progress in core competencies"""
    __tablename__ = 'student_competency_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    competency_id = db.Column(db.Integer, db.ForeignKey('core_competencies.id'), nullable=False)
    
    # Assessment details
    assessment_date = db.Column(db.Date, nullable=False)
    term = db.Column(db.String(20), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    
    # Competency levels (1-4 scale as per Ghana standards)
    level_achieved = db.Column(db.Integer, nullable=False)  # 1=Beginning, 2=Developing, 3=Proficient, 4=Excellent
    evidence = db.Column(db.Text, nullable=True)  # Evidence of competency demonstration
    teacher_comments = db.Column(db.Text, nullable=True)
    
    # Assessment metadata
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('Student', backref='competency_assessments')
    competency = db.relationship('CoreCompetency', backref='student_assessments')
    assessor = db.relationship('User', backref='competency_assessments')
    
    def __repr__(self):
        return f'<StudentCompetencyAssessment Student:{self.student_id} Competency:{self.competency_id}>'
    
    @property
    def level_description(self):
        """Get human-readable level description"""
        levels = {
            1: "Beginning",
            2: "Developing", 
            3: "Proficient",
            4: "Excellent"
        }
        return levels.get(self.level_achieved, "Unknown Level")