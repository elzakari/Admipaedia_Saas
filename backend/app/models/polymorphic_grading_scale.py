from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
from sqlalchemy.sql import func
import uuid

class PolymorphicGradingScale(db.Model):
    __tablename__ = 'polymorphic_grading_scales'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    track_id = db.Column(UUID(as_uuid=True), db.ForeignKey('grade_tracks.id', ondelete='CASCADE'), nullable=False)
    
    evaluation_type = db.Column(db.String(50), nullable=False)  # 'NUMERICAL', 'PERCENTAGE', 'LETTER_GRADE', 'GPA'
    max_score = db.Column(db.Numeric(5, 2), nullable=False, default=100.00)
    passing_boundary = db.Column(db.Numeric(5, 2), nullable=False, default=50.00)
    exam_weight = db.Column(db.Integer, nullable=False, default=60)
    class_weight = db.Column(db.Integer, nullable=False, default=40)
    schemes = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=False, default=list) # Array of objects
    
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f'<PolymorphicGradingScale track_id={self.track_id} type={self.evaluation_type}>'
