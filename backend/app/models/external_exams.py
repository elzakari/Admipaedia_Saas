from datetime import datetime, date
from enum import Enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, Float, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.extensions import db

class ExternalExamType(Enum):
    """Types of external examinations in Ghana"""
    BECE = "bece"  # Basic Education Certificate Examination
    WASSCE = "wassce"  # West African Senior School Certificate Examination
    NOVDEC = "novdec"  # November/December WASSCE
    PRIVATE = "private"  # Private candidates

class ExamSession(Enum):
    """Examination sessions"""
    MAY_JUNE = "may_june"
    NOVEMBER_DECEMBER = "november_december"
    MARCH_APRIL = "march_april"

class ResultStatus(Enum):
    """Status of external exam results"""
    PENDING = "pending"
    RELEASED = "released"
    VERIFIED = "verified"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"

class ExternalExamination(db.Model):
    """External examination records (BECE, WASSCE)"""
    __tablename__ = 'external_examinations'
    
    id = Column(Integer, primary_key=True)
    exam_type = Column(SQLEnum(ExternalExamType), nullable=False)
    exam_year = Column(Integer, nullable=False)
    exam_session = Column(SQLEnum(ExamSession), nullable=False)
    
    # Examination details
    exam_name = Column(String(200), nullable=False)
    exam_code = Column(String(50), nullable=False)  # e.g., BECE2024, WASSCE2024
    registration_start_date = Column(Date, nullable=True)
    registration_end_date = Column(Date, nullable=True)
    exam_start_date = Column(Date, nullable=False)
    exam_end_date = Column(Date, nullable=False)
    
    # Result information
    result_release_date = Column(Date, nullable=True)
    result_status = Column(SQLEnum(ResultStatus), default=ResultStatus.PENDING)
    
    # Integration settings
    auto_import_enabled = Column(Boolean, default=False)
    last_import_date = Column(DateTime, nullable=True)
    import_source = Column(String(100), nullable=True)  # API endpoint or file source
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    creator = relationship('User', backref='created_examinations')
    student_registrations = relationship('ExternalExamRegistration', backref='examination', cascade='all, delete-orphan')
    results = relationship('ExternalExamResult', backref='examination', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ExternalExamination {self.exam_code}: {self.exam_type.value}>'

class ExternalExamRegistration(db.Model):
    """Student registration for external examinations"""
    __tablename__ = 'external_exam_registrations'
    
    id = Column(Integer, primary_key=True)
    examination_id = Column(Integer, ForeignKey('external_examinations.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    
    # Registration details
    index_number = Column(String(50), nullable=False, unique=True)  # Official exam index number
    center_number = Column(String(20), nullable=False)
    center_name = Column(String(200), nullable=False)
    
    # Registration status
    registration_date = Column(Date, nullable=False)
    registration_status = Column(String(20), default='registered')
    is_private_candidate = Column(Boolean, default=False)
    
    # Subject registrations
    registered_subjects = Column(JSON, nullable=False)  # List of subject codes
    
    # Fees and payments
    registration_fee = Column(Float, nullable=True)
    payment_status = Column(String(20), default='pending')
    payment_date = Column(Date, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship('Student', backref='external_exam_registrations')
    results = relationship('ExternalExamResult', backref='registration', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ExternalExamRegistration {self.index_number}: Student {self.student_id}>'

class ExternalExamResult(db.Model):
    """External examination results"""
    __tablename__ = 'external_exam_results'
    
    id = Column(Integer, primary_key=True)
    examination_id = Column(Integer, ForeignKey('external_examinations.id'), nullable=False)
    registration_id = Column(Integer, ForeignKey('external_exam_registrations.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=False)
    
    # Result details
    subject_code = Column(String(20), nullable=False)  # Official exam subject code
    raw_score = Column(Float, nullable=True)  # Raw marks if available
    percentage_score = Column(Float, nullable=True)
    grade_symbol = Column(String(5), nullable=False)  # 1-9 for BECE, A1-F9 for WASSCE
    grade_points = Column(Float, nullable=True)
    
    # Result status
    result_status = Column(String(20), default='provisional')
    is_verified = Column(Boolean, default=False)
    verification_date = Column(Date, nullable=True)
    
    # Integration with internal system
    internal_grade_id = Column(Integer, ForeignKey('enhanced_grades.id'), nullable=True)
    is_integrated = Column(Boolean, default=False)
    integration_date = Column(DateTime, nullable=True)
    
    # Additional information
    remarks = Column(Text, nullable=True)
    special_considerations = Column(Text, nullable=True)
    
    # Import tracking
    import_source = Column(String(100), nullable=True)
    import_date = Column(DateTime, nullable=True)
    import_batch_id = Column(String(50), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship('Student', backref='external_exam_results')
    subject = relationship('Subject', backref='external_exam_results')
    internal_grade = relationship('EnhancedGrade', backref='external_exam_result')
    
    def __repr__(self):
        return f'<ExternalExamResult {self.subject_code}: {self.grade_symbol} for Student {self.student_id}>'

class ExternalExamImportLog(db.Model):
    """Log of external exam data imports"""
    __tablename__ = 'external_exam_import_logs'
    
    id = Column(Integer, primary_key=True)
    examination_id = Column(Integer, ForeignKey('external_examinations.id'), nullable=False)
    
    # Import details
    import_type = Column(String(50), nullable=False)  # 'api', 'csv', 'xml', 'manual'
    import_source = Column(String(200), nullable=False)
    batch_id = Column(String(50), nullable=False)
    
    # Import statistics
    total_records = Column(Integer, default=0)
    successful_imports = Column(Integer, default=0)
    failed_imports = Column(Integer, default=0)
    duplicate_records = Column(Integer, default=0)
    
    # Status and timing
    import_status = Column(String(20), default='in_progress')
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    
    # Error tracking
    error_summary = Column(JSON, nullable=True)
    error_details = Column(Text, nullable=True)
    
    # Metadata
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    examination = relationship('ExternalExamination', backref='import_logs')
    creator = relationship('User', backref='exam_import_logs')
    
    def __repr__(self):
        return f'<ExternalExamImportLog {self.batch_id}: {self.import_status}>'