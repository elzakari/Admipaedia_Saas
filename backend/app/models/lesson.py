from app.extensions import db
from datetime import datetime

class Lesson(db.Model):
    """Model for class lessons."""
    __tablename__ = 'lessons'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), default='planned')  # planned, in-progress, completed
    materials = db.Column(db.JSON, default=list)
    
    # Foreign Keys
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=True)
    
    # Relationships
    class_ = db.relationship('Class', backref=db.backref('lessons', lazy='dynamic'))
    teacher = db.relationship('Teacher', backref=db.backref('lessons', lazy='dynamic'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Lesson {self.id}: {self.title}>"

    @property
    def subject_id(self):
        return None