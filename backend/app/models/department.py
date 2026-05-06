from datetime import datetime
from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID

class Department(db.Model):
    __tablename__ = 'departments'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'name', name='uq_departments_tenant_name'),
        db.UniqueConstraint('tenant_id', 'code', name='uq_departments_tenant_code'),
    )

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False)
    description = db.Column(db.Text, nullable=True)
    head_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    head = db.relationship('User', backref='headed_department', foreign_keys=[head_id])
    subjects = db.relationship('Subject', backref='department_relation', lazy='dynamic')

    def __repr__(self):
        return f"<Department {self.name}>"

# Department-Staff Association Table
department_staff = db.Table('department_staff',
    db.Column('department_id', db.Integer, db.ForeignKey('departments.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role', db.String(50), nullable=True),  # e.g., 'Head', 'Teacher', 'Staff'
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)
