from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

class AcademicCycle(db.Model):
    __tablename__ = 'academic_cycles'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    cycle_type = db.Column(db.String(50), nullable=False)  # 'TRIMESTRE', 'SEMESTER', 'TERM'
    name = db.Column(db.String(255), nullable=False)       # 'Premier Trimestre', 'Fall Semester'
    is_current = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f'<AcademicCycle {self.name}>'
