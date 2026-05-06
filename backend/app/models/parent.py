from datetime import datetime
import uuid
from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID

class Parent(db.Model):
    """Parent model."""
    __tablename__ = 'parents'
    
    id = db.Column(db.Integer, primary_key=True)  # Changed to Integer to match User model
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)  # Changed to Integer
    occupation = db.Column(db.String(100))
    address = db.Column(db.String(255))
    emergency_contact = db.Column(db.String(20))
    relationship = db.Column(db.String(50))  # Father, Mother, Guardian, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('parent', uselist=False))
    
    def __repr__(self):
        return f'<Parent {self.user_id}>'

    def __init__(self, **kwargs):
        # Map legacy field 'phone_number' to emergency_contact
        if 'phone_number' in kwargs and 'emergency_contact' not in kwargs:
            kwargs['emergency_contact'] = kwargs.pop('phone_number')
        super().__init__(**kwargs)
