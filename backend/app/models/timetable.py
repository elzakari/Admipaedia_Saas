from app.extensions import db
from sqlalchemy.sql import func
from datetime import time

class Period(db.Model):
    """
    Defines the time slots for a school day (e.g., Period 1: 8:00-8:45).
    """
    __tablename__ = 'periods'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False) # Period 1, Break, Lunch
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_break = db.Column(db.Boolean, default=False)
    
    order_index = db.Column(db.Integer, nullable=False) # 1, 2, 3...
    
    # Optional: If different levels have different timings (e.g., Nursery vs JHS)
    # educational_level_id = db.Column(db.Integer, db.ForeignKey('educational_levels.id'), nullable=True)

    def __repr__(self):
        return f'<Period {self.name}: {self.start_time}-{self.end_time}>'

class TimetableSlot(db.Model):
    """
    Represents a specific lesson in the timetable.
    Connects Class + Day + Period + Subject + Teacher.
    """
    __tablename__ = 'timetable_slots'
    
    id = db.Column(db.Integer, primary_key=True)
    
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    period_id = db.Column(db.Integer, db.ForeignKey('periods.id'), nullable=False)
    
    day_of_week = db.Column(db.String(10), nullable=False) # Monday, Tuesday...
    
    term = db.Column(db.String(20), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    
    room_id = db.Column(db.Integer, nullable=True) # Optional: Room assignment
    
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    class_ = db.relationship('Class', backref='timetable_slots')
    subject = db.relationship('Subject')
    teacher = db.relationship('Teacher', backref='timetable_slots')
    period = db.relationship('Period')

    __table_args__ = (
        # Constraint: A class cannot have two lessons at the same time
        db.UniqueConstraint('class_id', 'day_of_week', 'period_id', 'term', 'academic_year', name='uq_class_period'),
        # Constraint: A teacher cannot teach two classes at the same time
        db.UniqueConstraint('teacher_id', 'day_of_week', 'period_id', 'term', 'academic_year', name='uq_teacher_period'),
    )

    def __repr__(self):
        return f'<Slot {self.day_of_week} P{self.period_id}: {self.subject.name}>'
