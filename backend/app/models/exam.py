from app.extensions import db
from datetime import datetime

class Exam(db.Model):
    """Exam model for tracking student exams."""
    __tablename__ = 'exams'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    exam_date = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # Duration in minutes
    total_marks = db.Column(db.Float, nullable=False)
    passing_marks = db.Column(db.Float, nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='scheduled')  # scheduled, ongoing, completed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    class_ = db.relationship('Class', backref=db.backref('exams', lazy=True))
    subject = db.relationship('Subject', backref=db.backref('exams', lazy=True))
    creator = db.relationship('User', backref=db.backref('created_exams', lazy=True))
    
    # Use string reference instead of direct class reference
    grades = db.relationship('Grade', backref='exam', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Exam {self.id}: {self.title} on {self.exam_date}>'