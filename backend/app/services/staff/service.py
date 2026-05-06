from app.extensions import db
from app.models.staff_enhanced import StaffLeave, LeaveType, LeaveStatus, StaffAttendance
from app.models.staff import Staff
from app.models.user import User
from datetime import date, datetime
import structlog

logger = structlog.get_logger()

class StaffService:
    @staticmethod
    def apply_leave(data, user_id):
        """Apply for leave."""
        try:
            # Calculate days
            start = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            end = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            days = (end - start).days + 1
            
            if days <= 0:
                return None, "End date must be after start date"
            
            leave = StaffLeave(
                user_id=user_id,
                leave_type_id=data['leave_type_id'],
                start_date=start,
                end_date=end,
                days_count=days,
                reason=data['reason'],
                status=LeaveStatus.PENDING
            )
            db.session.add(leave)
            db.session.commit()
            return leave, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def process_leave(leave_id, status, approver_id, rejection_reason=None):
        """Approve or reject leave."""
        try:
            leave = StaffLeave.query.get(leave_id)
            if not leave:
                return None, "Leave request not found"
            
            if status == 'approved':
                leave.status = LeaveStatus.APPROVED
            elif status == 'rejected':
                leave.status = LeaveStatus.REJECTED
                leave.rejection_reason = rejection_reason
            else:
                return None, "Invalid status"
                
            leave.approved_by = approver_id
            leave.approval_date = datetime.utcnow()
            
            db.session.commit()
            
            # TODO: Send notification to user
            
            return leave, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def clock_in(staff_id):
        """Record staff clock-in."""
        today = date.today()
        attendance = StaffAttendance.query.filter_by(staff_id=staff_id, date=today).first()
        
        if attendance:
            return None, "Already clocked in today"
            
        attendance = StaffAttendance(
            staff_id=staff_id,
            date=today,
            check_in_time=datetime.now().time(),
            status='present'
        )
        db.session.add(attendance)
        db.session.commit()
        return attendance, None

    @staticmethod
    def clock_out(staff_id):
        """Record staff clock-out."""
        today = date.today()
        attendance = StaffAttendance.query.filter_by(staff_id=staff_id, date=today).first()
        
        if not attendance:
            return None, "No check-in record found for today"
            
        attendance.check_out_time = datetime.now().time()
        db.session.commit()
        return attendance, None

    @staticmethod
    def get_staff_directory():
        """Get list of all staff (teaching and non-teaching)."""
        # Fetch Staff
        staff = Staff.query.filter_by(status='active').all()
        # Could also fetch Teachers if needed
        
        return staff
