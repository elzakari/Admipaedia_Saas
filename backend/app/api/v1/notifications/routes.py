from flask import Blueprint, request, jsonify
from sqlalchemy import and_, or_
from app.services.notification.service import NotificationService
from flask_jwt_extended import jwt_required, get_jwt_identity

notifications_bp = Blueprint('notifications', __name__)


def _resolve_user_role(user):
    user_role = getattr(user, 'role', '')
    if not user_role and getattr(user, 'roles', None):
        user_role = user.roles[0].name
    return user_role


def _build_notification_visibility_conditions(notification_model, user, user_role):
    conditions = []
    has_scope = hasattr(notification_model, 'scope')
    has_target_role = hasattr(notification_model, 'target_role')
    has_recipient_id = hasattr(notification_model, 'recipient_id')
    has_user_id = hasattr(notification_model, 'user_id')

    if has_recipient_id:
        conditions.append(notification_model.recipient_id == user.id)
    if has_user_id:
        conditions.append(notification_model.user_id == user.id)

    role_visibility_guards = []
    if has_recipient_id:
        role_visibility_guards.append(notification_model.recipient_id.is_(None))
    if has_user_id:
        role_visibility_guards.append(notification_model.user_id.is_(None))

    def _guarded(condition):
        if role_visibility_guards:
            return and_(*role_visibility_guards, condition)
        return condition

    if has_target_role:
        conditions.append(_guarded(notification_model.target_role == user_role))
        conditions.append(_guarded(notification_model.target_role == 'all'))

    if has_scope:
        conditions.append(_guarded(notification_model.scope == user_role))
        conditions.append(_guarded(notification_model.scope == f"{user_role}s"))
        conditions.append(_guarded(notification_model.scope == 'all'))

    if not conditions:
        conditions.append(notification_model.user_id == user.id)

    return conditions

@notifications_bp.route('', methods=['GET'])
@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        from app.models.user import User
        from app.models.dashboard import Notification
        from app.extensions import db
        import structlog
        
        logger = structlog.get_logger()
        
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 20, type=int)
        
        # 1. Fetch user to obtain their active role
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        user_role = _resolve_user_role(user)
            
        # 2. Build secure database queries wrapped inside try/except block
        try:
            or_conditions = _build_notification_visibility_conditions(Notification, user, user_role)
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
            matches_role = (
                n_recipient_id is None and (
                    n_target_role == user_role or
                    n_target_role == f"{user_role}s" or
                    n_target_role == 'all'
                )
            )
            
            if not (matches_recipient or matches_role):
                continue
                
            from app.models.attachment import Attachment
            db_attachments = Attachment.query.filter_by(entity_type='notification', entity_id=str(n.id)).all()
            
            serialized.append({
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'type': n.type,
                'priority': getattr(n, 'priority', 'normal'),
                'read': n.read,
                'is_read': n.read,
                'time': n.time.isoformat() if getattr(n, 'time', None) else None,
                'created_at': n.created_at.isoformat() if getattr(n, 'created_at', None) else (n.time.isoformat() if getattr(n, 'time', None) else None),
                'scope': n_target_role,
                'related_entity_type': getattr(n, 'related_entity_type', None),
                'related_entity_id': getattr(n, 'related_entity_id', None),
                'action_url': getattr(n, 'action_url', None),
                'attachments': [att.to_dict() for att in db_attachments]
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
    from app.models.user import User
    
    user_id = int(get_jwt_identity())
    data = request.json or {}
    notification_ids = data.get('notification_ids', [])
    if not notification_ids:
        return jsonify({'success': False, 'message': 'No notification_ids provided'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    user_role = _resolve_user_role(user)
    visibility_conditions = _build_notification_visibility_conditions(Notification, user, user_role)

    updated_count = Notification.query.filter(
        Notification.id.in_(notification_ids),
        or_(*visibility_conditions)
    ).update({'read': True}, synchronize_session=False)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Notifications marked as read',
        'updated_count': updated_count
    }), 200

