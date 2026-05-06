from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from app.extensions import db
from datetime import datetime
import enum

class CharacterDomain(enum.Enum):
    """Core character development domains in Ghana's education system"""
    RELIGIOUS_VALUES = "religious_values"  # Faith, spirituality, reverence
    MORAL_VALUES = "moral_values"  # Honesty, integrity, justice
    CULTURAL_VALUES = "cultural_values"  # Respect for elders, traditions
    CIVIC_VALUES = "civic_values"  # Patriotism, citizenship, responsibility
    SOCIAL_VALUES = "social_values"  # Cooperation, empathy, tolerance
    PERSONAL_VALUES = "personal_values"  # Self-discipline, perseverance, humility

class AssessmentFrequency(enum.Enum):
    """Frequency of character assessment"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    TERMLY = "termly"
    ANNUALLY = "annually"

class CharacterTrait(db.Model):
    """Specific character traits and virtues to be developed"""
    __tablename__ = 'character_traits'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)  # e.g., "Honesty", "Respect", "Compassion"
    description = Column(Text)
    domain = Column(Enum(CharacterDomain), nullable=False)
    educational_level_id = Column(Integer, ForeignKey('educational_levels.id'))
    
    # Age-appropriate indicators
    behavioral_indicators = Column(JSON)  # List of observable behaviors
    assessment_criteria = Column(JSON)  # Specific criteria for each level
    
    # Relationships
    educational_level = relationship("EducationalLevel", back_populates="character_traits")
    assessments = relationship("CharacterAssessment", back_populates="trait")
    activities = relationship("CharacterActivity", secondary="activity_traits", back_populates="target_traits")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CharacterAssessment(db.Model):
    """Individual student character assessments"""
    __tablename__ = 'character_assessments'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    trait_id = Column(Integer, ForeignKey('character_traits.id'), nullable=False)
    teacher_id = Column(Integer, ForeignKey('teachers.id'), nullable=False)
    
    # Assessment details
    assessment_date = Column(DateTime, nullable=False)
    frequency = Column(Enum(AssessmentFrequency), nullable=False)
    
    # Scoring (1-4 scale: 1=Needs Improvement, 2=Developing, 3=Proficient, 4=Exemplary)
    score = Column(Integer, nullable=False)  # 1-4 scale
    evidence = Column(Text)  # Specific examples of behavior
    context = Column(String(200))  # Where/when observed (classroom, playground, etc.)
    
    # Teacher observations
    teacher_comments = Column(Text)
    improvement_suggestions = Column(Text)
    
    # Parent involvement
    parent_feedback = Column(Text)
    home_reinforcement_activities = Column(JSON)
    
    # Relationships
    student = relationship("Student", back_populates="character_assessments")
    trait = relationship("CharacterTrait", back_populates="assessments")
    teacher = relationship("Teacher")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CharacterActivity(db.Model):
    """Activities designed to develop specific character traits"""
    __tablename__ = 'character_activities'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Activity classification
    activity_type = Column(String(50))  # "story_telling", "role_play", "community_service", etc.
    duration_minutes = Column(Integer)
    group_size = Column(String(20))  # "individual", "small_group", "whole_class"
    
    # Educational alignment
    educational_level_id = Column(Integer, ForeignKey('educational_levels.id'))
    subject_integration = Column(JSON)  # Subjects this can be integrated with
    
    # Character development focus
    primary_domain = Column(Enum(CharacterDomain), nullable=False)
    target_traits = relationship("CharacterTrait", secondary="activity_traits")
    
    # Implementation details
    materials_needed = Column(JSON)
    preparation_time = Column(Integer)  # minutes
    assessment_method = Column(Text)
    
    # Cultural relevance
    cultural_context = Column(String(100))  # Akan, Ewe, Dagbani, etc.
    local_proverbs = Column(JSON)  # Related Ghanaian proverbs
    
    # Relationships
    educational_level = relationship("EducationalLevel")
    implementations = relationship("ActivityImplementation", back_populates="activity")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Association table for many-to-many relationship between activities and traits
activity_traits = db.Table('activity_traits',
    Column('activity_id', Integer, ForeignKey('character_activities.id'), primary_key=True),
    Column('trait_id', Integer, ForeignKey('character_traits.id'), primary_key=True)
)

class ActivityImplementation(db.Model):
    """Record of character activities implemented in classes"""
    __tablename__ = 'activity_implementations'
    
    id = Column(Integer, primary_key=True)
    activity_id = Column(Integer, ForeignKey('character_activities.id'), nullable=False)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)
    teacher_id = Column(Integer, ForeignKey('teachers.id'), nullable=False)
    
    # Implementation details
    implementation_date = Column(DateTime, nullable=False)
    actual_duration = Column(Integer)  # actual minutes spent
    participation_rate = Column(Float)  # percentage of students who participated
    
    # Effectiveness assessment
    effectiveness_rating = Column(Integer)  # 1-5 scale
    student_engagement = Column(Integer)  # 1-5 scale
    learning_outcomes_achieved = Column(Boolean, default=False)
    
    # Feedback and improvements
    teacher_reflection = Column(Text)
    student_feedback = Column(Text)
    modifications_made = Column(Text)
    recommendations = Column(Text)
    
    # Relationships
    activity = relationship("CharacterActivity", back_populates="implementations")
    class_ = relationship("Class")
    teacher = relationship("Teacher")
    
    created_at = Column(DateTime, default=datetime.utcnow)

class CharacterDevelopmentPlan(db.Model):
    """Individual student character development plans"""
    __tablename__ = 'character_development_plans'
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    academic_year = Column(String(10), nullable=False)  # e.g., "2024/2025"
    term = Column(Integer, nullable=False)  # 1, 2, or 3
    
    # Plan details
    strengths = Column(JSON)  # List of character strengths
    areas_for_growth = Column(JSON)  # Areas needing development
    goals = Column(JSON)  # Specific character development goals
    strategies = Column(JSON)  # Strategies to achieve goals
    
    # Progress tracking
    baseline_assessment = Column(JSON)  # Initial character assessment scores
    mid_term_review = Column(JSON)  # Mid-term progress
    final_assessment = Column(JSON)  # End-of-term assessment
    
    # Stakeholder involvement
    parent_involvement_plan = Column(JSON)
    community_service_hours = Column(Integer, default=0)
    peer_mentoring_activities = Column(JSON)
    
    # Plan status
    is_active = Column(Boolean, default=True)
    completion_status = Column(String(20), default="in_progress")  # "in_progress", "completed", "revised"
    
    # Relationships
    student = relationship("Student")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ValuesEducationResource(db.Model):
    """Resources for values and character education"""
    __tablename__ = 'values_education_resources'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Resource classification
    resource_type = Column(String(50))  # "story", "video", "game", "worksheet", etc.
    format = Column(String(20))  # "digital", "print", "audio", "video"
    language = Column(String(20))  # "English", "Twi", "Ga", "Ewe", etc.
    
    # Educational alignment
    educational_level_id = Column(Integer, ForeignKey('educational_levels.id'))
    character_domains = Column(JSON)  # List of relevant character domains
    
    # Content details
    content_url = Column(String(500))  # URL or file path
    duration_minutes = Column(Integer)
    difficulty_level = Column(String(20))  # "beginner", "intermediate", "advanced"
    
    # Cultural relevance
    cultural_background = Column(String(100))
    moral_lessons = Column(JSON)  # Key moral lessons taught
    discussion_questions = Column(JSON)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    average_rating = Column(Float)
    
    # Relationships
    educational_level = relationship("EducationalLevel")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)