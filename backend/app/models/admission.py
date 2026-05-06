from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

class AdmissionApplication(db.Model):
    """
    Model for tracking student admission applications initiated by parents.
    """
    __tablename__ = 'admission_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('parents.id'), nullable=False)
    
    # Initial details (often required before buying form)
    student_first_name = db.Column(db.String(100), nullable=True)
    student_last_name = db.Column(db.String(100), nullable=True)
    target_class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True)
    
    # Payment Tracking
    payment_status = db.Column(db.String(20), default='pending') # pending, paid
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id'), nullable=True)
    form_purchase_date = db.Column(db.DateTime, nullable=True)
    
    # Application Status
    status = db.Column(db.String(20), default='draft') # draft, submitted, under_review, approved, rejected
    submission_date = db.Column(db.DateTime, nullable=True)
    
    # Form Data (Multi-step details stored as JSON)
    form_data = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent = db.relationship('Parent', backref=db.backref('applications', lazy=True))
    target_class = db.relationship('Class')
    payment = db.relationship('Payment')

    def __repr__(self):
        return f'<AdmissionApplication {self.id} for {self.student_first_name} {self.student_last_name}>'
