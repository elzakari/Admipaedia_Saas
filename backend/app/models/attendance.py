from app.extensions import db
from datetime import datetime

class Attendance(db.Model):
    __tablename__ = 'attendances'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, index=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='present')
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Changed from recorder_id
    remarks = db.Column(db.Text, nullable=True)  # Changed from note to match schema
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = db.relationship('Student', back_populates='attendances', passive_deletes=True)
    class_ = db.relationship('Class', backref='attendances')
    subject = db.relationship('Subject', backref='attendances')
    recorder = db.relationship('User', backref='recorded_attendances', foreign_keys=[recorded_by])  # Updated foreign key reference
    
    def __repr__(self):
        return f'<Attendance {self.student_id} - {self.date} - {self.status}>'