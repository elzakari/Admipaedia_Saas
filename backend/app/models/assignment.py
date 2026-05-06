# Create a new model for assignments
from datetime import datetime
from app.extensions import db

class Assignment(db.Model):
    """Assignment model for tracking student assignments."""
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    total_points = db.Column(db.Float, nullable=False)
    assignment_type = db.Column(db.String(50), nullable=False)  # homework, project, essay, etc.
    status = db.Column(db.String(20), default='active')  # active, archived
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    class_ = db.relationship('Class', backref=db.backref('assignments', lazy=True))
    subject = db.relationship('Subject', backref=db.backref('assignments', lazy=True))
    teacher = db.relationship('Teacher', backref=db.backref('assignments', lazy=True))
    
    def __repr__(self):
        return f'<Assignment {self.id}: {self.title}'