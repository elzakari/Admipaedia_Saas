from app.extensions import db
from datetime import datetime, date, timedelta
import re
import uuid
import calendar
from decimal import Decimal
from sqlalchemy import event, text
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
    branch_id = db.Column(UUID(as_uuid=True), db.ForeignKey('branches.id'), nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    admission_number = db.Column(db.String(20), nullable=False)
    
    @classmethod
    def query_scoped(cls):
        from flask import g, has_app_context
        query = cls.query
        if has_app_context() and getattr(g, 'branch_id', None):
            query = query.filter_by(branch_id=g.branch_id)
        return query
    
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
    branch = db.relationship('Branch', backref=db.backref('students', lazy=True))
    character_assessments = db.relationship('CharacterAssessment', back_populates='student', lazy=True)
    # Restore these for joinedload support in services
    grades = db.relationship('Grade', back_populates='student', cascade='all, delete-orphan')
    attendances = db.relationship('Attendance', back_populates='student', cascade='all, delete-orphan', passive_deletes=True)
    
    @staticmethod
    def generate_admission_number(tenant_id=None):
        """Generate unique admission number in format ADM + [3-initials] + [YY] + [6-digit padded serial]"""
        current_year = datetime.now().year
        yy = str(current_year)[-2:]

        if not tenant_id:
            tenant_initials = "GHS"
            return f"ADM{tenant_initials}{yy}000001"

        from app.models.tenant import Tenant
        tenant_rec = Tenant.query.get(tenant_id)
        tenant_name = tenant_rec.name if tenant_rec else "Sync School"

        # Decompose accents and spaces
        import unicodedata
        nfkd_form = unicodedata.normalize('NFKD', tenant_name)
        only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('ASCII')
        letters_only = "".join(c for c in only_ascii if c.isalpha() or c.isspace())
        words = [w for w in letters_only.split() if w]
        if len(words) >= 3:
            tenant_initials = "".join(w[0] for w in words[:3])
        elif len(words) == 2:
            tenant_initials = words[0][0] + words[1][:2]
        elif len(words) == 1:
            tenant_initials = words[0][:3]
        else:
            tenant_initials = "XXX"
        tenant_initials = tenant_initials.upper()
        if len(tenant_initials) < 3:
            tenant_initials = (tenant_initials + "XXX")[:3]

        from app.models.security import TenantCredentialCounter
        next_serial = TenantCredentialCounter.get_next_serial(tenant_id, current_year)
        serial_padded = f"{next_serial:06d}"

        return f"ADM{tenant_initials}{yy}{serial_padded}"
    
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


def parse_date(val):
    if not val:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d"):
            try:
                return datetime.strptime(val.split('+')[0].strip(), fmt).date()
            except ValueError:
                pass
    return None


@event.listens_for(Student, 'after_insert')
def handle_student_billing_proration(mapper, connection, target):
    try:
        tenant_id = target.tenant_id
        if not tenant_id:
            return

        # Handle string or UUID representation of tenant_id safely
        if isinstance(tenant_id, str):
            try:
                tenant_uuid = uuid.UUID(tenant_id)
            except ValueError:
                tenant_uuid = None
        else:
            tenant_uuid = tenant_id

        # SQLite stores UUIDs as 32-character hex strings without dashes,
        # whereas PostgreSQL uses standard UUID objects or 36-character strings with dashes.
        if connection.dialect.name == 'sqlite':
            tenant_param = tenant_uuid.hex if tenant_uuid else str(tenant_id)
        else:
            tenant_param = str(tenant_id)

        today = date.today()

        # 1. Fetch Tenant details
        tenant_res = connection.execute(
            text("SELECT country_code, currency, plan FROM tenants WHERE id = :tenant_id"),
            {"tenant_id": tenant_param}
        ).fetchone()

        if not tenant_res:
            return

        country_code = tenant_res[0]
        tenant_currency = tenant_res[1]
        tenant_plan_slug = tenant_res[2]

        # 2. Get active student count
        count_res = connection.execute(
            text("SELECT COUNT(*) FROM students WHERE tenant_id = :tenant_id AND status = 'active'"),
            {"tenant_id": tenant_param}
        ).scalar()
        student_count = max(1, int(count_res or 0))

        # 3. Resolve active plan dates and Plan object/slug
        starts_at = None
        ends_at = None
        plan_id = None
        plan_slug = None

        # A. Try school_plan_subscriptions
        sps_res = connection.execute(
            text("""
                SELECT starts_at, ends_at, plan_id FROM school_plan_subscriptions 
                WHERE school_id = :tenant_id AND status = 'active' AND starts_at <= :today 
                AND (ends_at IS NULL OR ends_at >= :today) 
                ORDER BY starts_at DESC LIMIT 1
            """),
            {"tenant_id": tenant_param, "today": today}
        ).fetchone()

        if sps_res:
            starts_at, ends_at, plan_id = sps_res[0], sps_res[1], sps_res[2]
        else:
            # B. Try subscriptions
            sub_res = connection.execute(
                text("""
                    SELECT starts_at, ends_at, plan FROM subscriptions 
                    WHERE tenant_id = :tenant_id AND status = 'active' AND starts_at <= :today 
                    AND (ends_at IS NULL OR ends_at >= :today) 
                    ORDER BY starts_at DESC LIMIT 1
                """),
                {"tenant_id": tenant_param, "today": today}
            ).fetchone()
            if sub_res:
                starts_at, ends_at, plan_slug = sub_res[0], sub_res[1], sub_res[2]

        # Fetch Plan info
        plan_res = None
        if plan_id:
            plan_res = connection.execute(
                text("SELECT id, name, slug, price_per_student, currency, billing_min_months FROM plans WHERE id = :plan_id"),
                {"plan_id": plan_id}
            ).fetchone()
        elif plan_slug:
            plan_res = connection.execute(
                text("SELECT id, name, slug, price_per_student, currency, billing_min_months FROM plans WHERE slug = :plan_slug LIMIT 1"),
                {"plan_slug": plan_slug}
            ).fetchone()
        else:
            plan_res = connection.execute(
                text("SELECT id, name, slug, price_per_student, currency, billing_min_months FROM plans WHERE slug = :tenant_plan LIMIT 1"),
                {"tenant_plan": tenant_plan_slug}
            ).fetchone()

        if not plan_res:
            return

        # Fetch the SQLAlchemy PlanModel object safely
        from app.models.billing import Plan as PlanModel
        plan_obj = PlanModel.query.get(plan_res[0])
        if not plan_obj:
            return

        # 4. Resolve price and currency
        from app.services.billing.pricing_service import PricingService
        resolved = PricingService.resolve_price_and_currency(
            plan=plan_obj,
            student_count=student_count,
            country_code=country_code,
            preferred_currency=tenant_currency,
        )
        rate = resolved.price
        currency = resolved.resolved_currency

        # 5. Calculate proration ratio
        starts_at = parse_date(starts_at)
        ends_at = parse_date(ends_at)

        if not starts_at or not ends_at:
            return

        total_days = (ends_at - starts_at).days
        if total_days <= 0:
            total_days = 30
        remaining_days = (ends_at - today).days
        remaining_days = max(0, min(total_days, remaining_days))

        proration_ratio = Decimal(remaining_days) / Decimal(total_days)
        fee = Decimal(rate) * proration_ratio
        fee = round(fee, 2)

        # 6. Insert ledger record immediately using connection
        # Only log if fee > 0
        if fee > 0:
            student_name = f"{target.first_name or ''} {target.last_name or ''}".strip()
            description = f"Prorated addition for Student: {student_name}"

            connection.execute(
                text("""
                    INSERT INTO pending_invoice_adjustments (tenant_id, amount, currency, description, status, created_at, updated_at)
                    VALUES (:tenant_id, :amount, :currency, :description, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                {
                    "tenant_id": tenant_param,
                    "amount": float(fee),
                    "currency": currency,
                    "description": description
                }
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error executing student proration hook: {str(e)}", exc_info=True)


