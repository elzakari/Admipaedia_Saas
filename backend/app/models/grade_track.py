from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

class GradeTrack(db.Model):
    __tablename__ = 'grade_tracks'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(255), nullable=False)       # 'Maternelle', 'Primary', 'Lower Secondary', 'High School'
    numeric_level_rank = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Relationships
    levels = db.relationship('GradeLevel', backref='grade_track', lazy=True, cascade='all, delete-orphan')
    grading_scales = db.relationship('PolymorphicGradingScale', backref='grade_track', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<GradeTrack {self.name}>'
