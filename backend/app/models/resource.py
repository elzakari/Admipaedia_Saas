from app.extensions import db
from datetime import datetime
from app.models.class_ import Class
from app.models.teacher import Teacher

class Resource(db.Model):
    """Model for class resources."""
    __tablename__ = 'resources'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # document, link, video, etc.
    url = db.Column(db.String(512), nullable=True)  # For external resources
    file_path = db.Column(db.String(512), nullable=True)  # For uploaded files
    description = db.Column(db.Text, nullable=True)
    
    # Foreign Keys
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=True)
    
    # Relationships
    class_ = db.relationship('Class', backref=db.backref('resources', lazy='dynamic'))
    uploaded_by = db.relationship('Teacher', backref=db.backref('uploaded_resources', lazy='dynamic'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Resource {self.id}: {self.title}>"