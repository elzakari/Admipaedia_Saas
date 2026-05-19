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
        try:
            if filters and ('startDate' in filters or 'endDate' in filters or 'category' in filters):
                # If filters are present, we might need to recalculate some statistics dynamically
                return DashboardService._recalculate_statistics(user_role, filters)
            
            query = DashboardStatistic.query
            
            if user_role:
                # Filter by role or get general statistics
                query = query.filter(DashboardStatistic.role.in_([user_role, None]))
                
            results = query.order_by(DashboardStatistic.title).all()
            if not results:
                try:
                    results = DashboardService.generate_default_statistics()
                except Exception as e:
                    logger.error("failed_generating_default_statistics", error=str(e))
                    results = []
            return results
        except Exception as e:
            logger.error("failed_getting_statistics", error=str(e))
            return []

    @staticmethod
    def _recalculate_statistics(user_role, filters):
        """Recalculate statistics based on filters on the fly."""
        try:
            start_date = filters.get('startDate')
            end_date = filters.get('endDate')
            category = filters.get('category')
            
            # Convert string dates to datetime if necessary
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', ''))
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date.replace('Z', ''))
        except Exception:
            start_date = None
            end_date = None
            category = None

        stats = []
        
        # 1. Total Students (optionally in range)
        try:
            student_query = Student.query
            if start_date:
                student_query = student_query.filter(Student.created_at >= start_date)
            if end_date:
                student_query = student_query.filter(Student.created_at <= end_date)
            
            student_count = student_query.count()
        except Exception as e:
            logger.error("recalculate_students_count_error", error=str(e))
            student_count = 0

        stats.append(DashboardStatistic(
            title="Total Students",
            value=str(student_count),
            change_value=0.0,
            change_is_positive=True,
            color="primary",
            icon="Users"
        ))

        # 2. Attendance Rate in range
        try:
            attendance_query = Attendance.query
            if start_date:
                attendance_query = attendance_query.filter(Attendance.date >= start_date)
            if end_date:
                attendance_query = attendance_query.filter(Attendance.date <= end_date)
            
            total_attendance = attendance_query.count()
            present_count = attendance_query.filter(Attendance.status == 'present').count()
            attendance_rate = round((present_count / total_attendance * 100) if total_attendance > 0 else 0)
        except Exception as e:
            logger.error("recalculate_attendance_rate_error", error=str(e))
            attendance_rate = 0
        
        stats.append(DashboardStatistic(
            title="Attendance Rate",
            value=f"{attendance_rate}%",
            change_value=0.0,
            change_is_positive=True,
            color="warning",
            icon="CheckCircle"
        ))

        return stats
    
    @staticmethod
    def get_calendar_events(month=None, year=None, start_date=None, end_date=None):
        """Get calendar events for a specific month and year."""
        try:
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
        except Exception as e:
            logger.error("failed_getting_calendar_events", error=str(e))
            return []
    
    @staticmethod
    def get_notifications(user_id=None, limit=10, start_date=None, end_date=None):
        """Get notifications for a user with optional limit and date range."""
        try:
            from sqlalchemy import or_
            from app.models.user import User
            
            user_role = None
            if user_id:
                try:
                    user = User.query.get(user_id)
                    if user:
                        user_role = getattr(user, 'role', None)
                        if not user_role and getattr(user, 'roles', None):
                            user_role = user.roles[0].name
                except Exception:
                    pass

            query = Notification.query
            
            has_recipient_id = hasattr(Notification, 'recipient_id')
            has_user_id = hasattr(Notification, 'user_id')
            has_scope = hasattr(Notification, 'scope')
            has_target_role = hasattr(Notification, 'target_role')
            
            if user_id:
                or_conditions = []
                if has_recipient_id:
                    or_conditions.append(Notification.recipient_id == user_id)
                if has_user_id:
                    or_conditions.append(Notification.user_id == user_id)
                
                if user_role:
                    if has_scope:
                        or_conditions.append(Notification.scope == user_role)
                        or_conditions.append(Notification.scope == f"{user_role}s")
                    if has_target_role:
                        or_conditions.append(Notification.target_role == user_role)
                
                if has_scope:
                    or_conditions.append(Notification.scope == 'all')
                if has_target_role:
                    or_conditions.append(Notification.target_role == 'all')
                    
                if or_conditions:
                    query = query.filter(or_(*or_conditions))
                elif has_user_id:
                    query = query.filter(Notification.user_id == user_id)
            
            if start_date:
                try:
                    if isinstance(start_date, str):
                        start_date = datetime.fromisoformat(start_date.replace('Z', ''))
                    if hasattr(Notification, 'time'):
                        query = query.filter(Notification.time >= start_date)
                    elif hasattr(Notification, 'created_at'):
                        query = query.filter(Notification.created_at >= start_date)
                except Exception:
                    pass
            if end_date:
                try:
                    if isinstance(end_date, str):
                        end_date = datetime.fromisoformat(end_date.replace('Z', ''))
                    if hasattr(Notification, 'time'):
                        query = query.filter(Notification.time <= end_date)
                    elif hasattr(Notification, 'created_at'):
                        query = query.filter(Notification.created_at <= end_date)
                except Exception:
                    pass
            
            if hasattr(Notification, 'time'):
                query = query.order_by(Notification.time.desc())
            elif hasattr(Notification, 'created_at'):
                query = query.order_by(Notification.created_at.desc())
                
            return query.limit(limit).all()
        except Exception as e:
            logger.error("failed_getting_notifications", error=str(e))
            return []
    
    @staticmethod
    def mark_notification_as_read(notification_id):
        """Mark a notification as read."""
        try:
            notification = Notification.query.get(notification_id)
            if notification:
                notification.read = True
                db.session.commit()
                return True
        except Exception as e:
            logger.error("failed_marking_notification_read", error=str(e))
            db.session.rollback()
        return False
    
    @staticmethod
    def mark_all_notifications_as_read(user_id=None):
        """Mark all notifications as read for a user."""
        try:
            query = Notification.query
            if user_id:
                query = query.filter(Notification.user_id == user_id)
            
            notifications = query.filter(Notification.read == False).all()
            for notification in notifications:
                notification.read = True
            db.session.commit()
            return True
        except Exception as e:
            logger.error("failed_marking_all_notifications_read", error=str(e))
            db.session.rollback()
        return False
    
    @staticmethod
    def generate_default_statistics():
        """Generate default statistics for the dashboard."""
        try:
            try:
                student_count = Student.query.count()
            except Exception:
                student_count = 0
            
            try:
                teacher_count = Teacher.query.count()
            except Exception:
                teacher_count = 0
            
            try:
                parent_count = Parent.query.count()
            except Exception:
                parent_count = 0
            
            try:
                attendance_count = Attendance.query.filter(Attendance.status == 'present').count()
                total_attendance = Attendance.query.count()
                attendance_rate = round((attendance_count / total_attendance * 100) if total_attendance > 0 else 0)
            except Exception:
                attendance_rate = 0
            
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
            
            try:
                db.session.add_all(statistics)
                db.session.commit()
            except Exception as commit_err:
                logger.error("failed_committing_default_statistics", error=str(commit_err))
                db.session.rollback()
            
            return statistics
        except Exception as e:
            logger.error("failed_generating_default_statistics_outer", error=str(e))
            return []

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