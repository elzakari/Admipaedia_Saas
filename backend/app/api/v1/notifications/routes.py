from flask import Blueprint, request, jsonify
from app.services.notification.service import NotificationService
from flask_jwt_extended import jwt_required, get_jwt_identity

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        from app.models.user import User
        from app.models.dashboard import Notification
        from app.extensions import db
        import structlog
        from sqlalchemy import or_
        
        logger = structlog.get_logger()
        
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 20, type=int)
        
        # 1. Fetch user to obtain their active role
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        user_role = getattr(user, 'role', '')
        if not user_role and user.roles:
            user_role = user.roles[0].name
            
        # 2. Build secure database queries wrapped inside try/except block
        try:
            # Check model column metadata dynamically to prevent any SQL property errors
            has_scope = hasattr(Notification, 'scope')
            has_target_role = hasattr(Notification, 'target_role')
            has_recipient_id = hasattr(Notification, 'recipient_id')
            
            or_conditions = []
            if has_recipient_id:
                or_conditions.append(Notification.recipient_id == user.id)
                or_conditions.append(Notification.user_id == user.id)
                
            if has_target_role:
                or_conditions.append(Notification.target_role == user_role)
                or_conditions.append(Notification.target_role == 'all')
                
            if has_scope:
                or_conditions.append(Notification.scope == user_role)
                or_conditions.append(Notification.scope == f"{user_role}s")
                or_conditions.append(Notification.scope == 'all')
                
            if not or_conditions:
                or_conditions.append(Notification.user_id == user.id)
                
            query = Notification.query.filter(or_(*or_conditions))
            
            if hasattr(Notification, 'time'):
                query = query.order_by(Notification.time.desc())
            elif hasattr(Notification, 'created_at'):
                query = query.order_by(Notification.created_at.desc())
                
            notifications = query.limit(limit).all()
            
        except Exception as db_err:
            # Log any database execution constraint anomaly and return an empty dataset wrapper array
            logger.error("database_execution_constraint_anomaly_hit", error=str(db_err))
            return jsonify({
                'success': True,
                'data': []
            }), 200
            
        # 3. Apply memory-level structural evaluations filter matching the requirement:
        # recipient_id == user.id OR target_role == user.role OR target_role == 'all'
        serialized = []
        for n in notifications:
            n_recipient_id = getattr(n, 'recipient_id', None) or getattr(n, 'user_id', None)
            n_target_role = getattr(n, 'scope', None) or getattr(n, 'target_role', None) or 'all'
            
            matches_recipient = (n_recipient_id == user.id)
            matches_role = (n_target_role == user_role or n_target_role == f"{user_role}s" or n_target_role == 'all')
            
            if not (matches_recipient or matches_role):
                continue
                
            serialized.append({
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'type': n.type,
                'read': n.read,
                'is_read': n.read,
                'time': n.time.isoformat() if getattr(n, 'time', None) else None,
                'created_at': n.created_at.isoformat() if getattr(n, 'created_at', None) else None,
                'scope': n_target_role
            })
            
        return jsonify({
            'success': True,
            'data': serialized
        }), 200
        
    except Exception as e:
        # Gracefully log general router exceptions and return empty array
        try:
            from flask import current_app
            current_app.logger.exception('Error processing get_notifications')
        except Exception:
            pass
        return jsonify({
            'success': True,
            'data': []
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

