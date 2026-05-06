from datetime import datetime
from app.extensions import db
import uuid

class Analytics(db.Model):
    """Analytics model for storing various analytics data"""
    __tablename__ = 'analytics'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    metric_type = db.Column(db.String(100), nullable=False)  # e.g., 'student_performance', 'attendance_rate'
    metric_name = db.Column(db.String(200), nullable=False)  # e.g., 'average_grade', 'monthly_attendance'
    metric_value = db.Column(db.Float, nullable=False)
    entity_type = db.Column(db.String(50), nullable=True)    # e.g., 'student', 'class', 'school'
    entity_id = db.Column(db.String(36), nullable=True)      # ID of the related entity
    period_start = db.Column(db.DateTime, nullable=True)
    period_end = db.Column(db.DateTime, nullable=True)
    additional_data = db.Column(db.JSON, nullable=True)       # Additional data as JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Analytics {self.metric_type}: {self.metric_name} = {self.metric_value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'metric_type': self.metric_type,
            'metric_name': self.metric_name,
            'metric_value': self.metric_value,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'additional_data': self.additional_data,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }