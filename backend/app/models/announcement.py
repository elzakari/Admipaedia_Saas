import pytz
from app.extensions import db
from datetime import datetime

class Announcement(db.Model):
    """Model for class announcements."""
    __tablename__ = 'announcements'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    recipients = db.Column(db.String(50), default='all')  # all, students, parents, teachers, admins
    send_email = db.Column(db.Boolean, default=False)
    
    target_roles = db.Column(db.String(255), nullable=True)  # Comma-separated roles
    scheduled_date = db.Column(db.DateTime, nullable=True)
    is_published = db.Column(db.Boolean, default=True)
    
    # Foreign Keys
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=True)
    
    # Relationships
    class_ = db.relationship('Class', backref=db.backref('announcements', lazy='dynamic'))
    teacher = db.relationship('Teacher', backref=db.backref('posted_announcements', lazy='dynamic'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Announcement {self.id}: {self.title}>"
    
    @property
    def is_scheduled(self):
        """Check if this is a scheduled announcement that hasn't been published yet."""
        if not self.scheduled_date:
            return False
        return self.scheduled_date > datetime.utcnow()
