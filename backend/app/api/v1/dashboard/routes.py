from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.dashboard_service import DashboardService
from app.services.auth_service import AuthService
from app.utils.decorators import role_required
from datetime import datetime
from app.services.analytics_service import AnalyticsService
from app.models.teacher import Teacher
from app.services.notification_service import NotificationService
from app import db
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_statistics():
    """Get dashboard statistics."""
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
    
    statistics = DashboardService.get_statistics(role, filters)
    
    # Format the response to match frontend expectations
    result = [{
        'id': stat.id,
        'title': stat.title,
        'value': stat.value,
        'change': {
            'value': stat.change_value,
            'isPositive': stat.change_is_positive
        } if stat.change_value is not None else None,
        'color': stat.color,
        'icon': getattr(stat, 'icon', None)
    } for stat in statistics]
    
    return jsonify({'statistics': result})

@dashboard_bp.route('/', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Get comprehensive dashboard data in a single request."""
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
    statistics = DashboardService.get_statistics(role, filters)
    formatted_stats = [{
        'id': stat.id,
        'title': stat.title,
        'value': stat.value,
        'change': {
            'value': stat.change_value,
            'isPositive': stat.change_is_positive
        } if stat.change_value is not None else None,
        'color': stat.color,
        'icon': getattr(stat, 'icon', None)
    } for stat in statistics]
    
    # Get recent notifications
    notifications = DashboardService.get_notifications(user_id, limit=5)
    formatted_notifications = [{
        'id': n.id,
        'title': n.title,
        'message': n.message,
        'time': format_time_ago(n.time),
        'read': n.read,
        'type': n.type
    } for n in notifications]
    
    # Get upcoming events
    now = datetime.now()
    events = DashboardService.get_calendar_events(now.month, now.year)
    formatted_events = [{
        'id': e.id,
        'title': e.title,
        'date': e.date.isoformat(),
        'type': e.type,
        'description': e.description
    } for e in events[:5]] # Limit to 5 upcoming
    
    return jsonify({
        'statistics': formatted_stats,
        'notifications': formatted_notifications,
        'events': formatted_events,
        'quick_actions': getattr(DashboardService, 'get_quick_actions', lambda r: [])(role)
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
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 10, type=int)
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    notifications = DashboardService.get_notifications(user_id, limit, start_date, end_date)
    
    # Format the response to match frontend expectations
    result = [{
        'id': notification.id,
        'title': notification.title,
        'message': notification.message,
        'time': format_time_ago(notification.time),
        'read': notification.read,
        'type': notification.type
    } for notification in notifications]
    
    return jsonify({'notifications': result})

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
        return jsonify({'error': error}), 400
    
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
        return jsonify({'error': error}), 400
        
    return jsonify(stats)

@dashboard_bp.route('/notifications', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def create_notification():
    """Create a new notification."""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['title', 'message', 'type']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
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
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/notifications/bulk', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def create_bulk_notifications():
    """Create notifications for multiple users."""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['title', 'message', 'type', 'user_ids']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate user_ids is a list
    if not isinstance(data['user_ids'], list):
        return jsonify({'error': 'user_ids must be a list'}), 400
    
    # Get optional fields with defaults
    send_email = data.get('send_email', False)
    send_websocket = data.get('send_websocket', True)
    
    try:
        notifications = NotificationService.create_bulk_notifications(
            title=data['title'],
            message=data['message'],
            notification_type=data['type'],
            user_ids=data['user_ids'],
            send_email=send_email,
            send_websocket=send_websocket
        )
        
        return jsonify({
            'message': f'{len(notifications)} notifications created successfully'
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500