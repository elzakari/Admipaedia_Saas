# Create a new model for assignment submissions
from datetime import datetime
from app.extensions import db

class AssignmentSubmission(db.Model):
    """Model for student assignment submissions."""
    __tablename__ = 'assignment_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    content = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(255), nullable=True)
    score = db.Column(db.Float, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='submitted')  # submitted, graded, late, missing
    graded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assignment = db.relationship('Assignment', backref=db.backref('submissions', lazy=True, cascade='all, delete-orphan'))
    student = db.relationship('Student', backref=db.backref('assignment_submissions', lazy=True))
    grader = db.relationship('User', backref=db.backref('graded_submissions', lazy=True))
    
    def __repr__(self):
        return f'<AssignmentSubmission {self.id}: Assignment {self.assignment_id} - Student {self.student_id}'