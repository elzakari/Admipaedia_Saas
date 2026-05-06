from datetime import datetime
from app.extensions import db
import enum

class LeaveStatus(enum.Enum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    CANCELLED = 'cancelled'

class LeaveType(db.Model):
    """
    Types of leave (e.g., Sick Leave, Casual Leave, Annual Leave).
    """
    __tablename__ = 'leave_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    days_allowed = db.Column(db.Integer, nullable=False, default=0) # Annual quota
    is_paid = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<LeaveType {self.name}>'

class StaffLeave(db.Model):
    """
    Leave application and tracking.
    """
    __tablename__ = 'staff_leaves'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # Staff or Teacher User ID
    leave_type_id = db.Column(db.Integer, db.ForeignKey('leave_types.id'), nullable=False)
    
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    days_count = db.Column(db.Integer, nullable=False)
    
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum(LeaveStatus), default=LeaveStatus.PENDING)
    
    # Approval chain
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approval_date = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='leave_requests')
    leave_type = db.relationship('LeaveType', backref='leaves')
    approver = db.relationship('User', foreign_keys=[approved_by])

    def __repr__(self):
        return f'<Leave {self.user_id}: {self.start_date} to {self.end_date} ({self.status.value})>'

class StaffAttendance(db.Model):
    """
    Daily attendance for non-teaching staff.
    """
    __tablename__ = 'staff_attendances'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=False)
    
    date = db.Column(db.Date, nullable=False)
    check_in_time = db.Column(db.Time, nullable=True)
    check_out_time = db.Column(db.Time, nullable=True)
    
    status = db.Column(db.String(20), default='present') # present, absent, leave, holiday
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    staff = db.relationship('Staff', backref='attendances')

    __table_args__ = (
        db.UniqueConstraint('staff_id', 'date', name='uq_staff_attendance_day'),
    )

    def __repr__(self):
        return f'<StaffAttendance {self.staff.full_name} - {self.date}>'
