import uuid
from datetime import datetime
from app.extensions import db

class DashboardStatistic(db.Model):
    """Model for dashboard statistics."""
    __tablename__ = 'dashboard_statistics'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(100), nullable=False)
    value = db.Column(db.String(100), nullable=False)
    change_value = db.Column(db.Float, nullable=True)
    change_is_positive = db.Column(db.Boolean, default=True)
    color = db.Column(db.String(20), nullable=False)  # primary, success, warning, danger
    icon = db.Column(db.String(50), nullable=True)
    role = db.Column(db.String(20), nullable=True)  # admin, teacher, student, parent
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CalendarEvent(db.Model):
    """Model for calendar events."""
    __tablename__ = 'calendar_events'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    type = db.Column(db.String(20), nullable=False)  # class, exam, meeting, holiday
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    location = db.Column(db.String(100), nullable=True)
    start_time = db.Column(db.String(10), nullable=True)  # Format: "HH:MM"
    end_time = db.Column(db.String(10), nullable=True)    # Format: "HH:MM"
    
    # Define relationship with users
    creator = db.relationship('User', backref='created_events', foreign_keys=[created_by])
    
    # Define relationship with shared roles (many-to-many)
    shared_with_roles = db.relationship('Role', secondary='event_role_association',
                                      backref=db.backref('shared_events', lazy='dynamic'))

# Association table for many-to-many relationship between events and roles
event_role_association = db.Table('event_role_association',
    db.Column('event_id', db.String(36), db.ForeignKey('calendar_events.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True)
)

class Notification(db.Model):
    """Model for notifications."""
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    time = db.Column(db.DateTime, default=datetime.utcnow)
    read = db.Column(db.Boolean, default=False)
    type = db.Column(db.String(20), nullable=False)  # info, warning, success, error
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    scope = db.Column(db.String(50), nullable=True, default='all') # all, teachers, students, parents, admins
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('notifications', lazy=True), foreign_keys=[user_id])
    recipient = db.relationship('User', backref=db.backref('received_notifications', lazy=True), foreign_keys=[recipient_id])