from flask import Blueprint, jsonify, request, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.dashboard_service import DashboardService
from app.services.auth_service import AuthService
from app.utils.decorators import role_required
from datetime import datetime, timedelta
from app.services.analytics_service import AnalyticsService
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.parent import Parent
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.tenant import Tenant
from app.models.department import Department
from app.models.class_ import Class
from app.models.session_token import SessionToken
from app.models.user import User
from app.utils.tenant_context import tenant_required
from app.services.notification_service import NotificationService
from app import db
from sqlalchemy import func
import logging
import uuid

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_statistics():
    """Get dashboard statistics."""
    try:
        user_id = get_jwt_identity()
        user = AuthService.get_user_by_id(user_id)
        role = request.args.get('role', None)
        
        if not role and user:
            # Get the user's primary role if not specified
            role = user.roles[0].name if user.roles else None
            
        filters = {
            'startDate': request.args.get('startDate'),
            'endDate': request.args.get('endDate'),
            'category': request.args.get('category')
        }
        
        statistics = DashboardService.get_statistics(role, filters) or []
        
        # Format the response to match frontend expectations
        result = []
        for stat in statistics:
            try:
                result.append({
                    'id': getattr(stat, 'id', None) or str(uuid.uuid4()),
                    'title': getattr(stat, 'title', 'Statistic'),
                    'value': getattr(stat, 'value', '0'),
                    'change': {
                        'value': getattr(stat, 'change_value', 0.0),
                        'isPositive': getattr(stat, 'change_is_positive', True)
                    } if getattr(stat, 'change_value', None) is not None else None,
                    'color': getattr(stat, 'color', 'primary'),
                    'icon': getattr(stat, 'icon', None)
                })
            except Exception as item_err:
                logger.error(f"Error parsing statistics item: {str(item_err)}")
                continue
        
        return jsonify({'statistics': result})
    except Exception as e:
        logger.error(f"Error getting dashboard statistics: {str(e)}")
        return jsonify({'statistics': []})

@dashboard_bp.route('/', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Get comprehensive dashboard data in a single request."""
    try:
        user_id = get_jwt_identity()
        user = AuthService.get_user_by_id(user_id)
        role = request.args.get('role', None)
        
        if not role and user:
            role = user.roles[0].name if user.roles else None
            
        filters = {
            'startDate': request.args.get('startDate'),
            'endDate': request.args.get('endDate'),
            'category': request.args.get('category')
        }
        
        # Get statistics
        try:
            statistics = DashboardService.get_statistics(role, filters) or []
            formatted_stats = []
            for stat in statistics:
                try:
                    formatted_stats.append({
                        'id': getattr(stat, 'id', None) or str(uuid.uuid4()),
                        'title': getattr(stat, 'title', 'Statistic'),
                        'value': getattr(stat, 'value', '0'),
                        'change': {
                            'value': getattr(stat, 'change_value', 0.0),
                            'isPositive': getattr(stat, 'change_is_positive', True)
                        } if getattr(stat, 'change_value', None) is not None else None,
                        'color': getattr(stat, 'color', 'primary'),
                        'icon': getattr(stat, 'icon', None)
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"Error resolving statistics in dashboard flow: {str(e)}")
            formatted_stats = []
        
        # Get recent notifications
        try:
            notifications = DashboardService.get_notifications(user_id, limit=5) or []
            formatted_notifications = []
            for n in notifications:
                try:
                    formatted_notifications.append({
                        'id': getattr(n, 'id', None),
                        'title': getattr(n, 'title', 'Notification'),
                        'message': getattr(n, 'message', ''),
                        'time': format_time_ago(getattr(n, 'time', None) or datetime.utcnow()),
                        'read': getattr(n, 'read', False),
                        'type': getattr(n, 'type', 'info')
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"Error resolving notifications in dashboard flow: {str(e)}")
            formatted_notifications = []
        
        # Get upcoming events
        try:
            now = datetime.now()
            events = DashboardService.get_calendar_events(now.month, now.year) or []
            formatted_events = []
            for e in events[:5]:
                try:
                    formatted_events.append({
                        'id': getattr(e, 'id', None),
                        'title': getattr(e, 'title', 'Event'),
                        'date': getattr(e, 'date', now).isoformat() if hasattr(getattr(e, 'date', None), 'isoformat') else str(getattr(e, 'date', '')),
                        'type': getattr(e, 'type', 'class'),
                        'description': getattr(e, 'description', '')
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"Error resolving events in dashboard flow: {str(e)}")
            formatted_events = []
        
        return jsonify({
            'statistics': formatted_stats,
            'notifications': formatted_notifications,
            'events': formatted_events,
            'quick_actions': getattr(DashboardService, 'get_quick_actions', lambda r: [])(role)
        })
    except Exception as e:
        logger.error(f"Error retrieving comprehensive dashboard data: {str(e)}")
        return jsonify({
            'statistics': [],
            'notifications': [],
            'events': [],
            'quick_actions': []
        })

@dashboard_bp.route('/events', methods=['GET'])
@jwt_required()
def get_events():
    """Get calendar events."""
    month = request.args.get('month', type=int)
    year = request.args.get('year', type=int)
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    events = DashboardService.get_calendar_events(month, year, start_date, end_date)
    
    # Format the response to match frontend expectations
    result = [{
        'id': event.id,
        'title': event.title,
        'date': event.date.isoformat(),
        'type': event.type,
        'description': event.description
    } for event in events]
    
    return jsonify({'events': result})

@dashboard_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications."""
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        notifications = DashboardService.get_notifications(user_id, limit, start_date, end_date) or []
        
        # Format the response to match frontend expectations
        result = []
        for notification in notifications:
            try:
                result.append({
                    'id': getattr(notification, 'id', None),
                    'title': getattr(notification, 'title', 'Notification'),
                    'message': getattr(notification, 'message', ''),
                    'time': format_time_ago(getattr(notification, 'time', None) or datetime.utcnow()),
                    'read': getattr(notification, 'read', False),
                    'type': getattr(notification, 'type', 'info')
                })
            except Exception:
                continue
        
        return jsonify({'notifications': result})
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        return jsonify({'notifications': []})

@dashboard_bp.route('/notifications/<notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_as_read(notification_id):
    """Mark a notification as read."""
    success = DashboardService.mark_notification_as_read(notification_id)
    return jsonify({'success': success})

@dashboard_bp.route('/notifications/read-all', methods=['PUT'])
@jwt_required()
def mark_all_notifications_as_read():
    """Mark all notifications as read."""
    user_id = get_jwt_identity()
    success = DashboardService.mark_all_notifications_as_read(user_id)
    return jsonify({'success': success})

def format_time_ago(timestamp):
    """Format timestamp as time ago string."""
    if isinstance(timestamp, str):
        return timestamp
    
    now = datetime.now()
    if timestamp.tzinfo is None:
        try:
            timestamp = timestamp.replace(tzinfo=None) # Keep it naive for comparison if now is naive
        except:
            pass
    
    diff = now - timestamp
    
    if diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"

@dashboard_bp.route('/teacher-analytics/<int:teacher_id>', methods=['GET'])
@jwt_required()
def get_teacher_analytics(teacher_id):
    """Get comprehensive analytics for a teacher."""
    # Verify the requesting user has permission to access this data
    user_id = get_jwt_identity()
    user = AuthService.get_user_by_id(user_id)
    
    # Allow access if user is the teacher or an admin
    is_authorized = False
    if user:
        user_roles = [role.name for role in user.roles] if user.roles else []
        if 'admin' in user_roles or user.role == 'admin':
            is_authorized = True
        elif 'teacher' in user_roles or user.role == 'teacher':
            teacher = Teacher.query.filter_by(user_id=user_id).first()
            if teacher and teacher.id == teacher_id:
                is_authorized = True
    
    if not is_authorized:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    from app.services.teacher_service import TeacherService
    analytics, error = TeacherService.get_teacher_analytics(teacher_id)
    
    if error:
        status_code = 404 if "not found" in str(error).lower() else 400
        return jsonify({'error': error}), status_code
    
    return jsonify(analytics)

@dashboard_bp.route('/teacher-stats/<int:teacher_id>', methods=['GET'])
@jwt_required()
def get_teacher_stats(teacher_id):
    """Get basic statistics for a teacher dashboard."""
    # Verify the requesting user has permission to access this data
    user_id = get_jwt_identity()
    user = AuthService.get_user_by_id(user_id)
    
    # Allow access if user is the teacher or an admin
    is_authorized = False
    if user:
        user_roles = [role.name for role in user.roles] if user.roles else []
        if 'admin' in user_roles or user.role == 'admin':
            is_authorized = True
        elif 'teacher' in user_roles or user.role == 'teacher':
            teacher = Teacher.query.filter_by(user_id=user_id).first()
            if teacher and teacher.id == teacher_id:
                is_authorized = True
    
    if not is_authorized:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    from app.services.teacher_service import TeacherService
    stats, error = TeacherService.get_teacher_stats(teacher_id)
    
    if error:
        status_code = 404 if "not found" in str(error).lower() else 400
        return jsonify({'error': error}), status_code
        
    return jsonify(stats)

@dashboard_bp.route('/notifications', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def create_notification():
    """Create a new notification."""
    data = request.get_json() or {}
    
    # Validate required fields
    required_fields = ['title', 'message', 'type']
    for field in required_fields:
        if field not in data or data[field] is None or str(data[field]).strip() == "":
            return jsonify({'error': f'Missing or invalid required field: {field}'}), 400
    
    # Get optional fields with defaults
    user_id = data.get('user_id')  # If None, it's a global notification
    send_email = data.get('send_email', False)
    send_websocket = data.get('send_websocket', True)
    
    try:
        notification = NotificationService.create_notification(
            title=data['title'],
            message=data['message'],
            notification_type=data['type'],
            user_id=user_id,
            send_email=send_email,
            send_websocket=send_websocket
        )
        
        return jsonify({
            'message': 'Notification created successfully',
            'notification': {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'time': format_time_ago(notification.time),
                'read': notification.read,
                'type': notification.type,
                'user_id': notification.user_id
            },
            'success': True
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/notifications/bulk', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def create_bulk_notifications():
    """Create notifications for multiple users."""
    try:
        data = request.get_json() or {}
        
        # Support the batch format tested in integration tests
        if 'notifications' in data and isinstance(data['notifications'], list):
            recipients = data.get('recipients', [])
            user_ids = []
            
            try:
                from app.models.user import User
                if 'all' in recipients or not recipients:
                    user_ids = [u.id for u in User.query.all()]
                else:
                    for r in recipients:
                        try:
                            # Try filtering by role name
                            users = User.query.filter(User.role == r).all()
                            if users:
                                user_ids.extend([u.id for u in users])
                            else:
                                # Try as direct user id
                                u = User.query.get(r)
                                if u:
                                    user_ids.append(u.id)
                        except Exception:
                            pass
            except Exception as db_err:
                logger.error(f"Error resolving bulk recipients: {str(db_err)}")
                
            created_notifications = []
            for notif in data['notifications']:
                title = notif.get('title')
                message = notif.get('message')
                ntype = notif.get('type', 'info')
                
                if not title or not message or str(title).strip() == "" or str(message).strip() == "":
                    continue
                    
                try:
                    ns = NotificationService.create_bulk_notifications(
                        title=title,
                        message=message,
                        notification_type=ntype,
                        user_ids=user_ids,
                        send_email=data.get('send_email', False),
                        send_websocket=data.get('send_websocket', True)
                    )
                    if ns:
                        created_notifications.extend(ns)
                except Exception as notif_err:
                    logger.error(f"Error in batch bulk notification item: {str(notif_err)}")
                    
            return jsonify({
                'message': f'{len(created_notifications)} notifications created successfully',
                'success': True
            }), 201
            
        # Standard single message, multi-user format
        required_fields = ['title', 'message', 'type', 'user_ids']
        for field in required_fields:
            if field not in data or data[field] is None or str(data[field]).strip() == "":
                return jsonify({'error': f'Missing or invalid required field: {field}'}), 400
        
        if not isinstance(data['user_ids'], list):
            return jsonify({'error': 'user_ids must be a list'}), 400
            
        send_email = data.get('send_email', False)
        send_websocket = data.get('send_websocket', True)
        
        notifications = NotificationService.create_bulk_notifications(
            title=data['title'],
            message=data['message'],
            notification_type=data['type'],
            user_ids=data['user_ids'],
            send_email=send_email,
            send_websocket=send_websocket
        )
        
        return jsonify({
            'message': f'{len(notifications)} notifications created successfully',
            'success': True
        }), 201
    except Exception as e:
        logger.error(f"Error in create_bulk_notifications: {str(e)}")
        return jsonify({'error': str(e)}), 500


@tenant_required
def get_admin_dashboard_metrics():
    """Retrieve dynamic metrics for the Tenant Admin Dashboard with error resilience."""
    try:
        tenant_id = g.tenant_id

        # 1. Average Grade & Pass Rate
        try:
            grade_counts = db.session.query(Grade.grade_letter, func.count(Grade.id))\
                .join(Student, Grade.student_id == Student.id)\
                .filter(Student.tenant_id == tenant_id)\
                .group_by(Grade.grade_letter).all()

            total_grades = sum(count for _, count in grade_counts)

            grade_distribution = []
            if total_grades > 0:
                for grade_letter, count in grade_counts:
                    grade_distribution.append({
                        'grade': grade_letter or 'N/A',
                        'count': count,
                        'percentage': round((count / total_grades * 100), 1)
                    })

            avg_grade_val = db.session.query(func.avg(Grade.percentage))\
                .join(Student, Grade.student_id == Student.id)\
                .filter(Student.tenant_id == tenant_id).scalar()
            average_grade = round(float(avg_grade_val), 1) if avg_grade_val is not None else 0.0

            passing_grades_count = db.session.query(func.count(Grade.id))\
                .join(Student, Grade.student_id == Student.id)\
                .filter(Student.tenant_id == tenant_id)\
                .filter(Grade.percentage >= 40.0).scalar() or 0

            pass_rate = round((passing_grades_count / total_grades * 100), 1) if total_grades > 0 else 0.0
        except Exception as e:
            logger.error(f"Error calculating grades in get_admin_dashboard_metrics: {str(e)}")
            average_grade = 0.0
            pass_rate = 0.0
            grade_distribution = []

        # 2. Daily Avg Attendance
        try:
            present_count = db.session.query(func.count(Attendance.id))\
                .join(Student, Attendance.student_id == Student.id)\
                .filter(Student.tenant_id == tenant_id)\
                .filter(Attendance.status == 'present').scalar() or 0
            total_attendance = db.session.query(func.count(Attendance.id))\
                .join(Student, Attendance.student_id == Student.id)\
                .filter(Student.tenant_id == tenant_id).scalar() or 0
            attendance_rate = round((present_count / total_attendance * 100), 1) if total_attendance > 0 else 0.0
        except Exception as e:
            logger.error(f"Error calculating attendance in get_admin_dashboard_metrics: {str(e)}")
            attendance_rate = 0.0

        # 3. Homework tracking completion rate
        try:
            submitted_count = db.session.query(func.count(AssignmentSubmission.id))\
                .join(Student, AssignmentSubmission.student_id == Student.id)\
                .filter(Student.tenant_id == tenant_id)\
                .filter(AssignmentSubmission.status.in_(['submitted', 'graded'])).scalar() or 0
            total_submissions = db.session.query(func.count(AssignmentSubmission.id))\
                .join(Student, AssignmentSubmission.student_id == Student.id)\
                .filter(Student.tenant_id == tenant_id).scalar() or 0
            assignment_completion_rate = round((submitted_count / total_submissions * 100), 1) if total_submissions > 0 else 0.0
        except Exception as e:
            logger.error(f"Error calculating homework completion in get_admin_dashboard_metrics: {str(e)}")
            assignment_completion_rate = 0.0

        # 4. System Monitor Stats: Active Parents + Students, Online Teachers
        try:
            student_count = db.session.query(func.count(Student.id)).filter(Student.tenant_id == tenant_id).scalar() or 0
            parent_count = db.session.query(func.count(Parent.id)).filter(Parent.tenant_id == tenant_id).scalar() or 0
            active_parents_students = student_count + parent_count

            teacher_count = db.session.query(func.count(Teacher.id)).filter(Teacher.tenant_id == tenant_id).scalar() or 0
            online_staff_count = teacher_count
        except Exception as e:
            logger.error(f"Error calculating system stats in get_admin_dashboard_metrics: {str(e)}")
            active_parents_students = 0
            online_staff_count = 0

        # 5. Monthly Trends
        try:
            today = datetime.utcnow()
            months_list = []
            for i in range(5, -1, -1):
                m_date = today - timedelta(days=i*30)
                months_list.append((m_date.year, m_date.month, m_date.strftime('%b')))

            monthly_trends = []
            has_trends_data = False
            for year, month, name in months_list:
                m_grades = db.session.query(func.avg(Grade.percentage))\
                    .join(Student, Grade.student_id == Student.id)\
                    .filter(Student.tenant_id == tenant_id)\
                    .filter(func.extract('month', Grade.created_at) == month)\
                    .filter(func.extract('year', Grade.created_at) == year).scalar()

                m_att_present = db.session.query(func.count(Attendance.id))\
                    .join(Student, Attendance.student_id == Student.id)\
                    .filter(Student.tenant_id == tenant_id)\
                    .filter(Attendance.status == 'present')\
                    .filter(func.extract('month', Attendance.date) == month)\
                    .filter(func.extract('year', Attendance.date) == year).scalar() or 0
                m_att_total = db.session.query(func.count(Attendance.id))\
                    .join(Student, Attendance.student_id == Student.id)\
                    .filter(Student.tenant_id == tenant_id)\
                    .filter(func.extract('month', Attendance.date) == month)\
                    .filter(func.extract('year', Attendance.date) == year).scalar() or 0
                m_att_rate = (m_att_present / m_att_total * 100) if m_att_total > 0 else None

                m_sub_done = db.session.query(func.count(AssignmentSubmission.id))\
                    .join(Student, AssignmentSubmission.student_id == Student.id)\
                    .filter(Student.tenant_id == tenant_id)\
                    .filter(AssignmentSubmission.status.in_(['submitted', 'graded']))\
                    .filter(func.extract('month', AssignmentSubmission.submission_date) == month)\
                    .filter(func.extract('year', AssignmentSubmission.submission_date) == year).scalar() or 0
                m_sub_total = db.session.query(func.count(AssignmentSubmission.id))\
                    .join(Student, AssignmentSubmission.student_id == Student.id)\
                    .filter(Student.tenant_id == tenant_id)\
                    .filter(func.extract('month', AssignmentSubmission.submission_date) == month)\
                    .filter(func.extract('year', AssignmentSubmission.submission_date) == year).scalar() or 0
                m_sub_rate = (m_sub_done / m_sub_total * 100) if m_sub_total > 0 else None

                if m_grades is not None or m_att_rate is not None or m_sub_rate is not None:
                    has_trends_data = True
                    monthly_trends.append({
                        'month': name,
                        'performance': round(float(m_grades), 1) if m_grades is not None else 0.0,
                        'attendance': round(float(m_att_rate), 1) if m_att_rate is not None else 0.0,
                        'assignments': round(float(m_sub_rate), 1) if m_sub_rate is not None else 0.0
                    })

            if not has_trends_data:
                monthly_trends = []
        except Exception as e:
            logger.error(f"Error calculating monthly trends in get_admin_dashboard_metrics: {str(e)}")
            monthly_trends = []

        # Fetch configured school currency symbol
        currency_symbol = '$'
        try:
            tenant_obj = Tenant.query.get(tenant_id)
            if tenant_obj and tenant_obj.currency:
                currency_symbol = tenant_obj.currency
        except Exception:
            pass

        # Query active user access token sessions
        active_sessions_total = 0
        try:
            from app.models.tenant import TenantMembership
            active_sessions_total = db.session.query(func.count(SessionToken.id))\
                .join(TenantMembership, TenantMembership.user_id == SessionToken.user_id)\
                .filter(TenantMembership.tenant_id == tenant_id)\
                .filter(TenantMembership.status == 'active')\
                .filter(SessionToken.is_revoked == False)\
                .filter(SessionToken.token_type == 'access')\
                .filter(SessionToken.expires_at > datetime.utcnow()).scalar() or 0
        except Exception as e:
            logger.error(f"Error querying active sessions: {str(e)}")
            active_sessions_total = 0

        # Query dynamic departments lists
        departments_data = []
        try:
            depts = Department.query.filter_by(tenant_id=tenant_id, is_active=True).all()
            if depts:
                for dept in depts:
                    # Count teachers in this department
                    teachers_count = Teacher.query.filter_by(tenant_id=tenant_id, department_id=dept.id).count()
                    
                    # Count students in this department (students in classes taught by teachers in this department)
                    students_count = db.session.query(func.count(Student.id))\
                        .join(Class, Student.class_id == Class.id)\
                        .join(Teacher, Class.teacher_id == Teacher.id)\
                        .filter(Teacher.department_id == dept.id)\
                        .filter(Student.tenant_id == tenant_id).scalar() or 0
                    
                    # Retrieve allocated budget
                    budget = dept.allocated_budget or 0.0

                    dept_avg_grade = db.session.query(func.avg(Grade.percentage))\
                        .join(Student, Grade.student_id == Student.id)\
                        .join(Class, Student.class_id == Class.id)\
                        .join(Teacher, Class.teacher_id == Teacher.id)\
                        .filter(Teacher.department_id == dept.id)\
                        .filter(Student.tenant_id == tenant_id).scalar()
                    performance = round(float(dept_avg_grade), 1) if dept_avg_grade is not None else 0.0
                    
                    departments_data.append({
                        'department': dept.name,
                        'performance': performance,
                        'teachers': teachers_count,
                        'students': students_count,
                        'budget': budget
                    })
        except Exception as e:
            logger.error(f"Error compiling dynamic department metrics: {str(e)}")
            departments_data = []

        if not departments_data:
            departments_data = [{
                'department': 'School-wide',
                'performance': average_grade,
                'teachers': online_staff_count,
                'students': student_count if 'student_count' in locals() else 0,
                'budget': 0.0
            }]

        return jsonify({
            'success': True,
            'data': {
                'average_grade': average_grade,
                'pass_rate': pass_rate,
                'attendance_rate': attendance_rate,
                'assignment_completion_rate': assignment_completion_rate,
                'active_parents_students': active_parents_students,
                'online_staff_count': online_staff_count,
                'grade_distribution': grade_distribution,
                'monthly_trends': monthly_trends,
                'currency': currency_symbol,
                'active_sessions_total': active_sessions_total,
                'departments': departments_data
            }
        }), 200

    except Exception as e:
        logger.error(f"Error in dashboard-metrics controller: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve dashboard metrics'
        }), 500


@tenant_required
def get_admin_dashboard_analytics():
    """Retrieve dynamic advanced analytics metrics scoped by tenant and branch."""
    try:
        tenant_id = g.tenant_id
        branch_id = getattr(g, 'branch_id', None)

        from app.models.subject import Subject
        from app.models.class_ import Class
        from app.models.associations import teacher_subjects, class_subjects
        from app.models.teacher import Teacher
        from app.models.student import Student

        # Scoping query for subjects
        subjects = Subject.query.filter_by(tenant_id=tenant_id, is_active=True).all()
        
        subject_performance = []
        
        if subjects:
            for index, subj in enumerate(subjects):
                # Calculate average grade score for this subject
                avg_query = db.session.query(func.avg(Grade.percentage))\
                    .join(Student, Grade.student_id == Student.id)\
                    .filter(Grade.subject_id == subj.id)\
                    .filter(Student.tenant_id == tenant_id)
                if branch_id:
                    avg_query = avg_query.filter(Student.branch_id == branch_id)
                avg_score_val = avg_query.scalar()
                
                average_score = round(float(avg_score_val), 1) if avg_score_val is not None else 0.0

                # Count unique students linked via class_subjects and Student.class_id
                student_query = db.session.query(func.count(Student.id))\
                    .join(Class, Student.class_id == Class.id)\
                    .join(class_subjects, Class.id == class_subjects.c.class_id)\
                    .filter(class_subjects.c.subject_id == subj.id)\
                    .filter(Student.tenant_id == tenant_id)
                if branch_id:
                    student_query = student_query.filter(Student.branch_id == branch_id)
                student_count = student_query.scalar() or 0

                # Count unique teachers assigned to this subject
                teacher_query = db.session.query(func.count(func.distinct(teacher_subjects.c.teacher_id)))\
                    .join(Teacher, teacher_subjects.c.teacher_id == Teacher.id)\
                    .filter(teacher_subjects.c.subject_id == subj.id)\
                    .filter(Teacher.tenant_id == tenant_id)
                if branch_id:
                    teacher_query = teacher_query.filter(Teacher.branch_id == branch_id)
                teacher_count = teacher_query.scalar() or 0
                difficulty = 'Hard' if average_score < 50 else 'Medium' if average_score < 75 else 'Easy'
                improvement = 0.0

                subject_performance.append({
                    'subject': subj.name,
                    'average_score': average_score,
                    'student_count': student_count,
                    'teacher_count': teacher_count,
                    'improvement': improvement,
                    'difficulty': difficulty
                })

        skills_assessment = {}
        system_monitor = {
            "cpu_usage": 0.0,
            "memory_usage": 0.0,
            "disk_usage": 0.0,
            "network_latency": 0.0
        }

        return jsonify({
            'success': True,
            'data': {
                'subject_performance': subject_performance,
                'skills_assessment': skills_assessment,
                'system_monitor': system_monitor
            }
        }), 200
    except Exception as e:
        logger.error(f"Error in dashboard-analytics controller: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve advanced dashboard analytics'
        }), 500
