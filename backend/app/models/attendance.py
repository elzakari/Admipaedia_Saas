from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID

class Attendance(db.Model):
    __tablename__ = 'attendances'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, index=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    branch_id = db.Column(UUID(as_uuid=True), db.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True, index=True)
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
    branch = db.relationship('Branch', backref=db.backref('attendances', lazy=True))
    
    @classmethod
    def query_scoped(cls):
        from flask import g, has_app_context
        query = cls.query
        if has_app_context() and getattr(g, 'branch_id', None):
            query = query.filter_by(branch_id=g.branch_id)
        return query

    def __repr__(self):
        return f'<Attendance {self.student_id} - {self.date} - {self.status}>'