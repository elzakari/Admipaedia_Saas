from app.extensions import db
from datetime import datetime
from sqlalchemy.orm import relationship
import uuid
from sqlalchemy.dialects.postgresql import UUID

class Teacher(db.Model):
    __tablename__ = 'teachers'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'employee_id', name='uq_teachers_tenant_employee_id'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    employee_id = db.Column(db.String(20), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    middle_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    nationality = db.Column(db.String(50), nullable=True)
    blood_group = db.Column(db.String(5), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    qualification = db.Column(db.String(100), nullable=True)
    specialization = db.Column(db.String(100), nullable=True)
    joining_date = db.Column(db.Date, nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    emergency_contact_name = db.Column(db.String(100), nullable=True)
    emergency_contact_phone = db.Column(db.String(20), nullable=True)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('teacher_profile', uselist=False))
    # Update the relationship line in the Teacher model
    subjects = db.relationship('Subject', secondary='teacher_subjects', backref='teachers')
    # classes = db.relationship('Class', secondary='teacher_classes', backref='teachers')
    
    def __repr__(self):
        return f'<Teacher {self.first_name} {self.last_name}>'
    
    def __init__(self, **kwargs):
        # Map legacy fields
        if 'is_active' in kwargs and 'status' not in kwargs:
            kwargs['status'] = 'active' if bool(kwargs.pop('is_active')) else 'inactive'
        if 'phone' in kwargs and 'phone_number' not in kwargs:
            kwargs['phone_number'] = kwargs.pop('phone')
        # Ensure unique employee_id if not provided
        if not kwargs.get('employee_id'):
            kwargs['employee_id'] = Teacher.generate_employee_id(tenant_id=kwargs.get('tenant_id'))
        super().__init__(**kwargs)
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @staticmethod
    def generate_employee_id(tenant_id: uuid.UUID = None):
        """Generate unique employee ID in format EMP-YYYY-XXXXX"""
        current_year = datetime.now().year
        prefix = f"EMP-{current_year}-"
        
        teacher_q = Teacher.query.filter(Teacher.employee_id.like(f"{prefix}%"))
        if tenant_id is not None:
            teacher_q = teacher_q.filter(Teacher.tenant_id == tenant_id)
        latest_teacher = teacher_q.order_by(Teacher.employee_id.desc()).first()

        latest_staff = None
        try:
            from app.models.staff import Staff
            staff_q = Staff.query.filter(Staff.employee_id.like(f"{prefix}%"))
            if tenant_id is not None and hasattr(Staff, 'tenant_id'):
                staff_q = staff_q.filter(Staff.tenant_id == tenant_id)
            latest_staff = staff_q.order_by(Staff.employee_id.desc()).first()
        except Exception:
            latest_staff = None
        
        def extract_serial(emp_id: str) -> int:
            try:
                return int(emp_id.split('-')[-1])
            except Exception:
                return 0

        serial_candidates = []
        if latest_teacher:
            serial_candidates.append(extract_serial(latest_teacher.employee_id))
        if latest_staff:
            serial_candidates.append(extract_serial(latest_staff.employee_id))

        next_serial = (max(serial_candidates) + 1) if serial_candidates else 1
        return f"EMP-{current_year}-{next_serial:05d}"
