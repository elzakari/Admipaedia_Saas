from app.extensions import db
from datetime import datetime


class Grade(db.Model):
    """Grade model for tracking student grades in exams."""
    __tablename__ = 'grades'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    marks_obtained = db.Column(db.Float, nullable=False)
    percentage = db.Column(db.Float, nullable=False)
    grade_letter = db.Column(db.String(5), nullable=True)  # A+, A, B+, B, etc.
    remarks = db.Column(db.Text, nullable=True)
    graded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # New fields for enhanced grade management
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True, index=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True, index=True)
    term = db.Column(db.String(20), nullable=True)  # e.g., 'Term 1', 'Semester 1'
    academic_year = db.Column(db.String(20), nullable=True)  # e.g., '2023-2024'
    assessment_type = db.Column(db.String(20), nullable=True)  # 'exam', 'quiz', 'assignment', 'project'
    is_final = db.Column(db.Boolean, default=False)  # Whether this is a final grade
    weight = db.Column(db.Float, default=1.0)  # Weight of this grade in final calculation
    
    # Relationships
    student = db.relationship('Student', back_populates='grades')
    grader = db.relationship('User', backref=db.backref('graded_exams', lazy=True))
    subject = db.relationship('Subject', backref=db.backref('grades', lazy=True))
    class_ = db.relationship('Class', backref=db.backref('grades', lazy=True))
    
    def __repr__(self):
        return f'<Grade {self.id}: Student {self.student_id} in Exam {self.exam_id}>'
