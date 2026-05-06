from app.extensions import db
from datetime import datetime
import secrets
from sqlalchemy import text, event
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Subject(db.Model):
    """Subject model."""
    __tablename__ = 'subjects'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'code', name='uq_subjects_tenant_code'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text, nullable=True)
    # Replace string department with foreign key
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    credit_hours = db.Column(db.Float, nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    classes = db.relationship('Class', secondary='class_subjects', backref=db.backref('subjects', lazy='dynamic'))
    
    def __repr__(self):
        return f'<Subject {self.code}: {self.name}>'


# Ensure subject code uniqueness by suffixing on collision (helps test fixtures)
@event.listens_for(Subject, 'before_insert')
def ensure_unique_subject_code(mapper, connection, target):
    if not target.code:
        return
    tid = getattr(target, 'tenant_id', None)
    if tid is None:
        existing = connection.execute(text('SELECT 1 FROM subjects WHERE code = :code'), {'code': target.code}).fetchone()
    else:
        existing = connection.execute(
            text('SELECT 1 FROM subjects WHERE tenant_id = :tenant_id AND code = :code'),
            {'tenant_id': tid, 'code': target.code}
        ).fetchone()
    if existing:
        target.code = f"{target.code}-{secrets.token_hex(2)}"
