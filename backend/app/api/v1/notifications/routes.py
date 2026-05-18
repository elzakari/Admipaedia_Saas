from flask import Blueprint, request, jsonify
from app.services.notification.service import NotificationService
from flask_jwt_extended import jwt_required, get_jwt_identity

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    from app.services.notification_service import NotificationService
    notifications = NotificationService.get_user_notifications(user_id, limit=limit)
    return jsonify({
        'success': True,
        'data': [{
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'read': n.read,
            'is_read': n.read,
            'time': n.time.isoformat() if n.time else None,
            'created_at': n.created_at.isoformat() if n.created_at else None,
            'scope': n.scope
        } for n in notifications]
    }), 200

@notifications_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    user_id = get_jwt_identity()
    prefs = NotificationService.get_preferences(user_id)
    return jsonify({'success': True, 'data': prefs}), 200

@notifications_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    user_id = get_jwt_identity()
    data = request.json
    NotificationService.update_preferences(user_id, data)
    return jsonify({'success': True, 'message': 'Preferences updated'}), 200

@notifications_bp.route('/test-send', methods=['POST'])
@jwt_required()
def test_send():
    """Test endpoint to trigger a notification to self."""
    user_id = get_jwt_identity()
    data = request.json
    message = data.get('message', 'Test notification from ADMIPAEDIA')
    channels = data.get('channels', ['email'])
    
    success, results = NotificationService.send_notification(user_id, message, channels)
    
    return jsonify({'success': success, 'results': results}), 200

@notifications_bp.route('/mark-read', methods=['PATCH'])
@jwt_required()
def mark_read():
    from app.extensions import db
    from app.models.dashboard import Notification
    
    data = request.json or {}
    notification_ids = data.get('notification_ids', [])
    if not notification_ids:
        return jsonify({'success': False, 'message': 'No notification_ids provided'}), 400
        
    Notification.query.filter(Notification.id.in_(notification_ids)).update({'read': True}, synchronize_session=False)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Notifications marked as read'}), 200

