from datetime import datetime
import uuid
from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID

class Class(db.Model):
    """Class model."""
    __tablename__ = 'classes'
    
    id = db.Column(db.Integer, primary_key=True)  # Changed to Integer
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    branch_id = db.Column(UUID(as_uuid=True), db.ForeignKey('branches.id'), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50), nullable=True)
    grade_level = db.Column(db.String(20), nullable=False)  # Keep for backward compatibility
    educational_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=True)  # New field
    section = db.Column(db.String(20))
    academic_year = db.Column(db.String(20), nullable=False)
    capacity = db.Column(db.Integer)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'))  # Changed to Integer
    start_time = db.Column(db.String(20))  # Store time as string in format like "08:00 AM"
    end_time = db.Column(db.String(20))  # Store time as string in format like "03:30 PM"
    days = db.Column(db.String(100))  # Store days as comma-separated string
    room = db.Column(db.String(50))  # Room number or name
    description = db.Column(db.Text)  # Class description
    status = db.Column(db.String(20), default='active')  # Status field with default 'active'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @classmethod
    def query_scoped(cls):
        from flask import g, has_app_context
        query = cls.query
        if has_app_context() and getattr(g, 'branch_id', None):
            query = query.filter_by(branch_id=g.branch_id)
        return query
    
    # Relationships
    teacher = db.relationship('Teacher', backref=db.backref('classes', lazy='dynamic'))
    branch = db.relationship('Branch', backref=db.backref('classes', lazy=True))
    # educational_level relationship is defined in EducationalLevel model
    
    def __repr__(self):
        return f'<Class {self.name}>'
    
    @property
    def key_phase(self):
        """Get the key phase for this class"""
        if self.educational_level:
            return self.educational_level.key_phase
        return None
    
    @property
    def key_phase_description(self):
        """Get human-readable key phase description"""
        if self.educational_level:
            return self.educational_level.key_phase_description
        return "Unknown Phase"

    @property
    def current_enrollment(self):
        """Get the current number of students in the class"""
        from app.models.student import Student
        return Student.query.filter_by(class_id=self.id).count()

    @property
    def class_teacher_name(self):
        """Get the full name of the class teacher"""
        if self.teacher:
            return self.teacher.full_name
        return None

    @property
    def class_teacher(self):
        """Alias for class_teacher_name to match frontend list view"""
        return self.class_teacher_name

    @property
    def academic_year_name(self):
        """Get the name of the academic year"""
        return self.academic_year

    @property
    def room_number(self):
        """Alias for room"""
        return self.room

    @property
    def grade_level_name(self):
        """Get the name of the grade level"""
        if self.educational_level:
            return self.educational_level.name
        return self.grade_level


class ClassTeacherMapping(db.Model):
    """Class to Teacher Mapping Model."""
    __tablename__ = 'class_teacher_mappings'
    __table_args__ = (
        db.UniqueConstraint('class_id', 'teacher_id', name='class_teacher_mappings_class_teacher_key'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    class_ = db.relationship('Class', backref=db.backref('teacher_mappings', lazy='dynamic', cascade='all, delete-orphan'))
    teacher_user = db.relationship('User', backref=db.backref('class_mappings', lazy='dynamic', cascade='all, delete-orphan'))
