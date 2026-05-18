from app.extensions import db
from datetime import datetime
import re
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.models.user import User

class Student(db.Model):
    """Student model."""
    __tablename__ = 'students'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'admission_number', name='uq_students_tenant_admission_number'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    admission_number = db.Column(db.String(20), nullable=False)
    
    # Personal Details - Updated name structure
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100), nullable=True)
    # Keep legacy fields for backward compatibility during migration
    name = db.Column(db.String(200), nullable=True)  # Will be deprecated
    surname = db.Column(db.String(100), nullable=True)  # Will be deprecated
    
    date_of_birth = db.Column(db.Date, nullable=False)
    place_of_birth = db.Column(db.String(255), nullable=True)
    gender = db.Column(db.String(10), nullable=False)
    religious_denomination = db.Column(db.String(100), nullable=True)
    
    # Contact Details
    email = db.Column(db.String(100), nullable=True)  # Add email field
    phone = db.Column(db.String(20), nullable=True)   # Add phone field
    telephone = db.Column(db.String(20), nullable=True)
    whatsapp = db.Column(db.String(20), nullable=True)
    postal_address = db.Column(db.String(255), nullable=True)
    digital_address = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)
    residential_address = db.Column(db.String(255), nullable=True)
    local_landmark = db.Column(db.String(255), nullable=True)
    
    # Health Details
    special_circumstance = db.Column(db.Text, nullable=True)
    allergies = db.Column(db.Text, nullable=True)
    medication = db.Column(db.Text, nullable=True)
    physician_name = db.Column(db.String(100), nullable=True)
    physician_phone = db.Column(db.String(20), nullable=True)
    
    # Academic Details
    previous_school = db.Column(db.String(255), nullable=True)
    previous_class = db.Column(db.String(50), nullable=True)
    previous_team = db.Column(db.String(100), nullable=True)
    previous_year = db.Column(db.String(10), nullable=True)
    
    # Parent Details
    father_name = db.Column(db.String(100), nullable=True)
    father_contact = db.Column(db.String(20), nullable=True)
    father_address = db.Column(db.String(255), nullable=True)
    father_email = db.Column(db.String(100), nullable=True)
    father_profession = db.Column(db.String(100), nullable=True)
    father_workplace = db.Column(db.String(255), nullable=True)
    
    mother_name = db.Column(db.String(100), nullable=True)
    mother_contact = db.Column(db.String(20), nullable=True)
    mother_address = db.Column(db.String(255), nullable=True)
    mother_profession = db.Column(db.String(100), nullable=True)
    mother_workplace = db.Column(db.String(255), nullable=True)
    mother_email = db.Column(db.String(100), nullable=True)
    
    # Legacy fields
    address = db.Column(db.String(255))  # Keep for backward compatibility
    profile_picture = db.Column(db.String(255), nullable=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True, index=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('parents.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define relationships with proper cascade
    user = db.relationship('User', backref=db.backref('student', uselist=False))
    class_ = db.relationship('Class', backref=db.backref('students', lazy='dynamic'))
    parent = db.relationship('Parent', backref=db.backref('children', lazy=True))
    character_assessments = db.relationship('CharacterAssessment', back_populates='student', lazy=True)
    # Restore these for joinedload support in services
    grades = db.relationship('Grade', back_populates='student', cascade='all, delete-orphan')
    attendances = db.relationship('Attendance', back_populates='student', cascade='all, delete-orphan', passive_deletes=True)
    
    @staticmethod
    def generate_admission_number(tenant_id: uuid.UUID = None):
        """Generate unique admission number in format ADM-YYYY-XXXXX"""
        current_year = datetime.now().year
        
        # Find the highest serial number for current year
        prefix = f"ADM-{current_year}-"
        query = Student.query.filter(Student.admission_number.like(f"{prefix}%"))
        if tenant_id is not None:
            query = query.filter(Student.tenant_id == tenant_id)
        latest_student = query.order_by(Student.admission_number.desc()).first()
        
        if latest_student:
            # Extract serial number from latest admission number
            try:
                serial_part = latest_student.admission_number.split('-')[-1]
                next_serial = int(serial_part) + 1
            except (ValueError, IndexError):
                next_serial = 1
        else:
            next_serial = 1
        
        # Format with 5 digits
        return f"ADM-{current_year}-{next_serial:05d}"
    
    def __repr__(self):
        return f'<Student {self.admission_number}: {self.display_name}>'

    def __init__(self, **kwargs):
        # Map legacy/alternate fields
        if 'is_active' in kwargs and 'status' not in kwargs:
            kwargs['status'] = 'active' if bool(kwargs.pop('is_active')) else 'inactive'
        if 'phone_number' in kwargs and 'phone' not in kwargs:
            kwargs['phone'] = kwargs.pop('phone_number')
        if 'medical_conditions' in kwargs and 'special_circumstance' not in kwargs:
            kwargs['special_circumstance'] = kwargs.pop('medical_conditions')
        # Ensure gender is set to a default if missing
        if not kwargs.get('gender'):
            kwargs['gender'] = 'f'
        if 'admission_number' in kwargs and kwargs['admission_number']:
            kwargs['admission_number'] = re.sub(r'\s+', '-', str(kwargs['admission_number']).strip())
        # Ensure user_id exists if email provided
        if not kwargs.get('user_id'):
            email = kwargs.get('email')
            if email:
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    kwargs['user_id'] = existing_user.id
                else:
                    username = email.split('@')[0]
                    u = User(username=username, email=email, role='student')
                    from app.extensions import bcrypt
                    try:
                        u.set_password_hash('Password123!')
                    except Exception:
                        u.password_hash = bcrypt.generate_password_hash('Password123!').decode('utf-8')
                    db.session.add(u)
                    db.session.flush()
                    kwargs['user_id'] = u.id
        super().__init__(**kwargs)
    
    @property
    def full_name(self):
        """Generate full name from first, middle, and last names."""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return ' '.join(parts)
    
    @property
    def display_name(self):
        """Generate display name (First Last)."""
        return f"{self.first_name} {self.last_name}"

    @property
    def grade_level(self):
        """Get the educational level/grade level for this student"""
        if self.class_ and self.class_.educational_level:
            return self.class_.educational_level
        return None

    @property
    def grade_level_name(self):
        """Get the grade level name for this student"""
        if self.grade_level:
            return self.grade_level.name
        if self.class_:
            return self.class_.grade_level
        return None
    
    status = db.Column(db.String(20), default='active')  # active, inactive, graduated, transferred
    
    # Additional fields for Phase 1 enhancement
    nationality = db.Column(db.String(100), nullable=True)
    blood_group = db.Column(db.String(10), nullable=True)
    emergency_contact_name = db.Column(db.String(100), nullable=True)
    emergency_contact_phone = db.Column(db.String(20), nullable=True)
    emergency_contact_relationship = db.Column(db.String(50), nullable=True)
    enrollment_date = db.Column(db.Date, nullable=True)
    graduation_date = db.Column(db.Date, nullable=True)
    
    medical_conditions = db.Column(db.Text, nullable=True)
    special_needs = db.Column(db.Text, nullable=True)
    achievements = db.Column(db.Text, nullable=True)
    extracurricular_activities = db.Column(db.Text, nullable=True)
    
    student_id_number = db.Column(db.String(50), nullable=True, unique=True)  # National ID or other official ID
    
    preferred_name = db.Column(db.String(100), nullable=True)
    birth_certificate_number = db.Column(db.String(50), nullable=True)
    passport_number = db.Column(db.String(50), nullable=True)
    passport_expiry = db.Column(db.Date, nullable=True)
    primary_language = db.Column(db.String(50), nullable=True)
    secondary_language = db.Column(db.String(50), nullable=True)
    
    height = db.Column(db.Float, nullable=True)  # in cm
    weight = db.Column(db.Float, nullable=True)  # in kg
    blood_pressure = db.Column(db.String(20), nullable=True)
    vision = db.Column(db.String(20), nullable=True)  # e.g., 20/20
    hearing = db.Column(db.String(20), nullable=True)  # normal, impaired, etc.
    immunization_status = db.Column(db.Text, nullable=True)
    
    learning_style = db.Column(db.String(50), nullable=True)  # visual, auditory, kinesthetic
    academic_strengths = db.Column(db.Text, nullable=True)
    academic_weaknesses = db.Column(db.Text, nullable=True)
    career_aspirations = db.Column(db.Text, nullable=True)
    
    guardian_name = db.Column(db.String(100), nullable=True)
    guardian_relationship = db.Column(db.String(50), nullable=True)
    guardian_contact = db.Column(db.String(20), nullable=True)
    guardian_email = db.Column(db.String(100), nullable=True)
    guardian_address = db.Column(db.String(255), nullable=True)
    
    fee_category = db.Column(db.String(50), nullable=True)  # scholarship, full-paying, etc.
    scholarship_details = db.Column(db.Text, nullable=True)
    payment_method = db.Column(db.String(50), nullable=True)
    
    awards_achievements = db.Column(db.Text, nullable=True)
    standardized_test_scores = db.Column(db.Text, nullable=True)
    
    secondary_contact_name = db.Column(db.String(100), nullable=True)
    secondary_contact_phone = db.Column(db.String(20), nullable=True)
    secondary_contact_relationship = db.Column(db.String(50), nullable=True)
    
    individualized_education_plan = db.Column(db.Boolean, default=False)
    iep_details = db.Column(db.Text, nullable=True)
    
    student_email = db.Column(db.String(100), nullable=True)
    library_card_number = db.Column(db.String(50), nullable=True)
    
    # Secure activation / invitation properties
    invitation_token_hash = db.Column(db.String(255), nullable=True)
    invitation_expires_at = db.Column(db.DateTime, nullable=True)
