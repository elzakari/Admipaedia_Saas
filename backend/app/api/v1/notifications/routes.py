from flask import Blueprint, request, jsonify
from app.services.notification.service import NotificationService
from flask_jwt_extended import jwt_required, get_jwt_identity

notifications_bp = Blueprint('notifications', __name__)

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
