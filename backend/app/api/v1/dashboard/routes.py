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