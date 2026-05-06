import structlog
from datetime import datetime, timedelta
from sqlalchemy import and_, extract
from app.extensions import db
from app.models.dashboard import DashboardStatistic, CalendarEvent, Notification
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent
from app.models.exam import Exam
from app.models.attendance import Attendance
from app.services.notification_service import NotificationService

logger = structlog.get_logger()

class DashboardService:
    """Service for dashboard-related operations."""
    
    @staticmethod
    def get_statistics(user_role=None, filters=None):
        """Get dashboard statistics based on user role and filters."""
        if filters and ('startDate' in filters or 'endDate' in filters or 'category' in filters):
            # If filters are present, we might need to recalculate some statistics dynamically
            return DashboardService._recalculate_statistics(user_role, filters)
        
        query = DashboardStatistic.query
        
        if user_role:
            # Filter by role or get general statistics
            query = query.filter(DashboardStatistic.role.in_([user_role, None]))
            
        return query.order_by(DashboardStatistic.title).all()

    @staticmethod
    def _recalculate_statistics(user_role, filters):
        """Recalculate statistics based on filters on the fly."""
        start_date = filters.get('startDate')
        end_date = filters.get('endDate')
        category = filters.get('category')
        
        # Convert string dates to datetime if necessary
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', ''))
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', ''))

        stats = []
        
        # 1. Total Students (optionally in range)
        student_query = Student.query
        if start_date:
            student_query = student_query.filter(Student.created_at >= start_date)
        if end_date:
            student_query = student_query.filter(Student.created_at <= end_date)
        
        student_count = student_query.count()
        stats.append(DashboardStatistic(
            title="Total Students",
            value=str(student_count),
            change_value=0.0,
            change_is_positive=True,
            color="primary",
            icon="Users"
        ))

        # 2. Attendance Rate in range
        attendance_query = Attendance.query
        if start_date:
            attendance_query = attendance_query.filter(Attendance.date >= start_date)
        if end_date:
            attendance_query = attendance_query.filter(Attendance.date <= end_date)
        
        total_attendance = attendance_query.count()
        present_count = attendance_query.filter(Attendance.status == 'present').count()
        attendance_rate = round((present_count / total_attendance * 100) if total_attendance > 0 else 0)
        
        stats.append(DashboardStatistic(
            title="Attendance Rate",
            value=f"{attendance_rate}%",
            change_value=0.0,
            change_is_positive=True,
            color="warning",
            icon="CheckCircle"
        ))

        # Add more recalculated stats as needed...
        
        return stats
    
    @staticmethod
    def get_calendar_events(month=None, year=None, start_date=None, end_date=None):
        """Get calendar events for a specific month and year."""
        query = CalendarEvent.query
        
        if month is not None and year is not None:
            # Filter events by month and year
            query = query.filter(
                and_(
                    extract('month', CalendarEvent.date) == month + 1,  # Month is 0-indexed in JS
                    extract('year', CalendarEvent.date) == year
                )
            )
            
        if start_date:
            if isinstance(start_date, str):
                try:
                    start_date = datetime.fromisoformat(start_date.replace('Z', ''))
                except ValueError:
                    pass # Ignore invalid date format
            if isinstance(start_date, datetime):
                query = query.filter(CalendarEvent.date >= start_date)
            
        if end_date:
            if isinstance(end_date, str):
                try:
                    end_date = datetime.fromisoformat(end_date.replace('Z', ''))
                except ValueError:
                    pass # Ignore invalid date format
            if isinstance(end_date, datetime):
                query = query.filter(CalendarEvent.date <= end_date)
        
        return query.order_by(CalendarEvent.date).all()
    
    # Replace the existing get_notifications method with this one
    @staticmethod
    def get_notifications(user_id=None, limit=10, start_date=None, end_date=None):
        """Get notifications for a user with optional limit and date range."""
        query = Notification.query
        
        if user_id:
            query = query.filter(Notification.user_id == user_id)
            
        if start_date:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', ''))
            query = query.filter(Notification.time >= start_date)
        if end_date:
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date.replace('Z', ''))
            query = query.filter(Notification.time <= end_date)
            
        return query.order_by(Notification.time.desc()).limit(limit).all()
    
    @staticmethod
    def mark_notification_as_read(notification_id):
        """Mark a notification as read."""
        notification = Notification.query.get(notification_id)
        
        if notification:
            notification.read = True
            db.session.commit()
            return True
        
        return False
    
    @staticmethod
    def mark_all_notifications_as_read(user_id=None):
        """Mark all notifications as read for a user."""
        query = Notification.query
        
        if user_id:
            query = query.filter(Notification.user_id == user_id)
        
        notifications = query.filter(Notification.read == False).all()
        
        for notification in notifications:
            notification.read = True
        
        db.session.commit()
        return True
    
    @staticmethod
    def generate_default_statistics():
        """Generate default statistics for the dashboard."""
        # Count total students
        student_count = Student.query.count()
        
        # Count total teachers
        teacher_count = Teacher.query.count()
        
        # Count total parents
        parent_count = Parent.query.count()
        
        # Calculate attendance rate (example)
        attendance_count = Attendance.query.filter(Attendance.status == 'present').count()
        total_attendance = Attendance.query.count()
        attendance_rate = round((attendance_count / total_attendance * 100) if total_attendance > 0 else 0)
        
        # Create statistics
        statistics = [
            DashboardStatistic(
                title="Total Students",
                value=str(student_count),
                change_value=5.2,
                change_is_positive=True,
                color="primary",
                icon="Users"
            ),
            DashboardStatistic(
                title="Total Teachers",
                value=str(teacher_count),
                change_value=2.1,
                change_is_positive=True,
                color="success",
                icon="UserCheck"
            ),
            DashboardStatistic(
                title="Total Parents",
                value=str(parent_count),
                change_value=3.5,
                change_is_positive=True,
                color="info",
                icon="Heart"
            ),
            DashboardStatistic(
                title="Attendance Rate",
                value=f"{attendance_rate}%",
                change_value=1.2,
                change_is_positive=True,
                color="warning",
                icon="CheckCircle"
            )
        ]
        
        db.session.add_all(statistics)
        db.session.commit()
        
        return statistics

    @staticmethod
    def get_quick_actions(role=None):
        """Get quick actions based on user role."""
        actions = []
        
        # Common actions
        actions.append({
            'id': 'view_profile',
            'title': 'View Profile',
            'description': 'View and edit your profile',
            'icon': 'User',
            'url': '/profile',
            'permissions': []
        })
        
        if role == 'admin':
            actions.extend([
                {
                    'id': 'add_student',
                    'title': 'Add Student',
                    'description': 'Register a new student',
                    'icon': 'UserPlus',
                    'url': '/students/add',
                    'permissions': ['student_create']
                },
                {
                    'id': 'add_teacher',
                    'title': 'Add Teacher',
                    'description': 'Register a new teacher',
                    'icon': 'Users',
                    'url': '/teachers/add',
                    'permissions': ['teacher_create']
                },
                {
                    'id': 'system_config',
                    'title': 'System Config',
                    'description': 'Manage system settings',
                    'icon': 'Settings',
                    'url': '/settings/system',
                    'permissions': ['system_manage']
                }
            ])
        elif role == 'teacher':
            actions.extend([
                {
                    'id': 'mark_attendance',
                    'title': 'Mark Attendance',
                    'description': 'Mark attendance for your classes',
                    'icon': 'CheckSquare',
                    'url': '/attendance/mark',
                    'permissions': ['attendance_manage']
                },
                {
                    'id': 'input_grades',
                    'title': 'Input Grades',
                    'description': 'Input grades for assignments',
                    'icon': 'Edit3',
                    'url': '/grades/input',
                    'permissions': ['grade_manage']
                }
            ])
            
        return actions