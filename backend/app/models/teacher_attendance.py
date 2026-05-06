from app.extensions import db
from datetime import datetime

class TeacherAttendance(db.Model):
    """Teacher attendance model for tracking teacher attendance."""
    __tablename__ = 'teacher_attendances'
    
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # present, absent, late
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    teacher = db.relationship('Teacher', backref=db.backref('attendances', lazy=True, cascade='all, delete-orphan'))
    
    def __repr__(self):
        return f'<TeacherAttendance {self.id} - Teacher {self.teacher_id} - {self.date}:  {self.status}>'