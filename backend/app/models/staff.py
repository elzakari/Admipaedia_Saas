from datetime import datetime
from app.extensions import db
import uuid
from sqlalchemy.dialects.postgresql import UUID

class Staff(db.Model):
    __tablename__ = 'staff'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'employee_id', name='uq_staff_tenant_employee_id'),
    )

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    employee_id = db.Column(db.String(20), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    job_title = db.Column(db.String(100), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    joining_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('staff_profile', uselist=False))

    def __repr__(self):
        return f'<Staff {self.first_name} {self.last_name}>'

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @staticmethod
    def generate_employee_id(tenant_id: uuid.UUID = None) -> str:
        """Generate EMP-YYYY-XXXXX within a tenant."""
        current_year = datetime.now().year
        prefix = f"EMP-{current_year}-"

        staff_q = Staff.query.filter(Staff.employee_id.like(f"{prefix}%"))
        if tenant_id is not None:
            staff_q = staff_q.filter(Staff.tenant_id == tenant_id)
        latest_staff = staff_q.order_by(Staff.employee_id.desc()).first()

        from app.models.teacher import Teacher
        teacher_q = Teacher.query.filter(Teacher.employee_id.like(f"{prefix}%"))
        if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
            teacher_q = teacher_q.filter(Teacher.tenant_id == tenant_id)
        latest_teacher = teacher_q.order_by(Teacher.employee_id.desc()).first()

        def serial(emp_id: str) -> int:
            try:
                return int(emp_id.split('-')[-1])
            except Exception:
                return 0

        candidates = []
        if latest_staff:
            candidates.append(serial(latest_staff.employee_id))
        if latest_teacher:
            candidates.append(serial(latest_teacher.employee_id))

        next_serial = (max(candidates) + 1) if candidates else 1
        return f"{prefix}{next_serial:05d}"
