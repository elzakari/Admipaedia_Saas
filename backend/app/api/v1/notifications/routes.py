from datetime import datetime

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


def _parse_bool_arg(name):
    raw_value = request.args.get(name)
    if raw_value is None:
        return None

    normalized = str(raw_value).strip().lower()
    if normalized in {'1', 'true', 'yes', 'on'}:
        return True
    if normalized in {'0', 'false', 'no', 'off'}:
        return False
    return None


def _is_direct_notification(notification, user_id):
    recipient_id = getattr(notification, 'recipient_id', None)
    owner_id = getattr(notification, 'user_id', None)
    return recipient_id == user_id or owner_id == user_id


def _get_notification_states(user_id, notification_ids):
    from app.models.dashboard import NotificationUserState

    if not notification_ids:
        return {}

    states = NotificationUserState.query.filter(
        NotificationUserState.user_id == user_id,
        NotificationUserState.notification_id.in_(notification_ids)
    ).all()
    return {state.notification_id: state for state in states}


def _build_notification_payload(notification, user_id, state):
    from app.models.attachment import Attachment

    target_scope = getattr(notification, 'scope', None) or getattr(notification, 'target_role', None) or 'all'
    created_at = getattr(notification, 'created_at', None) or getattr(notification, 'time', None)
    is_direct = _is_direct_notification(notification, user_id)

    is_read = state.is_read if state is not None else (bool(getattr(notification, 'read', False)) if is_direct else False)
    read_at = state.read_at if state is not None else None
    if is_read and read_at is None:
        read_at = created_at

    db_attachments = Attachment.query.filter_by(entity_type='notification', entity_id=str(notification.id)).all()

    return {
        'id': notification.id,
        'title': notification.title,
        'message': notification.message,
        'type': notification.type,
        'priority': getattr(notification, 'priority', 'normal'),
        'read': is_read,
        'is_read': is_read,
        'read_at': read_at.isoformat() if read_at else None,
        'is_starred': bool(state.is_starred) if state is not None else False,
        'is_archived': bool(state.is_archived) if state is not None else False,
        'is_deleted': bool(state.is_deleted) if state is not None else False,
        'time': notification.time.isoformat() if getattr(notification, 'time', None) else None,
        'created_at': created_at.isoformat() if created_at else None,
        'scope': target_scope,
        'related_entity_type': getattr(notification, 'related_entity_type', None),
        'related_entity_id': getattr(notification, 'related_entity_id', None),
        'action_url': getattr(notification, 'action_url', None),
        'attachments': [att.to_dict() for att in db_attachments]
    }


def _get_visible_notifications_by_ids(notification_model, notification_ids, user, user_role):
    if not notification_ids:
        return []

    visibility_conditions = _build_notification_visibility_conditions(notification_model, user, user_role)
    return notification_model.query.filter(
        notification_model.id.in_(notification_ids),
        or_(*visibility_conditions)
    ).all()


def _get_or_create_notification_states(db, notification_ids, user_id):
    from app.models.dashboard import NotificationUserState

    state_map = _get_notification_states(user_id, notification_ids)
    for notification_id in notification_ids:
        if notification_id in state_map:
            continue
        state = NotificationUserState(notification_id=notification_id, user_id=user_id)
        db.session.add(state)
        state_map[notification_id] = state
    return state_map


def _update_notification_states(db, user, notification_ids, updater):
    from app.models.dashboard import Notification

    user_role = _resolve_user_role(user)
    visible_notifications = _get_visible_notifications_by_ids(Notification, notification_ids, user, user_role)
    if not visible_notifications:
        return 0

    state_map = _get_or_create_notification_states(
        db,
        [notification.id for notification in visible_notifications],
        user.id
    )
    now = datetime.utcnow()

    for notification in visible_notifications:
        updater(state_map[notification.id], notification, now)

    db.session.commit()
    return len(visible_notifications)

@notifications_bp.route('', methods=['GET'])
@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        from app.models.user import User
        from app.models.dashboard import Notification
        import structlog
        
        logger = structlog.get_logger()
        
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        filter_archived = _parse_bool_arg('archived')
        filter_starred = _parse_bool_arg('starred')
        filter_read = _parse_bool_arg('read')
        
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
                
            notifications = query.all()
            
        except Exception as db_err:
            # Log any database execution constraint anomaly and return an empty dataset wrapper array
            logger.error("database_execution_constraint_anomaly_hit", error=str(db_err))
            return jsonify({
                'success': True,
                'data': []
            }), 200
            
        # 3. Apply memory-level structural evaluations filter matching the requirement:
        # recipient_id == user.id OR target_role == user.role OR target_role == 'all'
        state_map = _get_notification_states(user.id, [notification.id for notification in notifications])
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
            
            payload = _build_notification_payload(n, user.id, state_map.get(n.id))
            if payload['is_deleted']:
                continue
            if filter_archived is None:
                if payload['is_archived']:
                    continue
            elif payload['is_archived'] != filter_archived:
                continue
            if filter_starred is not None and payload['is_starred'] != filter_starred:
                continue
            if filter_read is not None and payload['is_read'] != filter_read:
                continue

            serialized.append(payload)
            
        return jsonify({
            'success': True,
            'data': serialized[offset:offset + limit]
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
    from app.models.user import User
    
    user_id = int(get_jwt_identity())
    data = request.json or {}
    notification_ids = data.get('notification_ids', [])
    if not notification_ids:
        return jsonify({'success': False, 'message': 'No notification_ids provided'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    updated_count = _update_notification_states(
        db,
        user,
        notification_ids,
        lambda state, _notification, now: (
            setattr(state, 'is_read', True),
            setattr(state, 'read_at', now)
        )
    )
    return jsonify({
        'success': True,
        'message': 'Notifications marked as read',
        'updated_count': updated_count
    }), 200


@notifications_bp.route('/mark-unread', methods=['PATCH'])
@jwt_required()
def mark_unread():
    from app.extensions import db
    from app.models.user import User

    user_id = int(get_jwt_identity())
    data = request.json or {}
    notification_ids = data.get('notification_ids', [])
    if not notification_ids:
        return jsonify({'success': False, 'message': 'No notification_ids provided'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    updated_count = _update_notification_states(
        db,
        user,
        notification_ids,
        lambda state, _notification, _now: (
            setattr(state, 'is_read', False),
            setattr(state, 'read_at', None)
        )
    )
    return jsonify({
        'success': True,
        'message': 'Notifications marked as unread',
        'updated_count': updated_count
    }), 200


@notifications_bp.route('/star', methods=['PATCH'])
@jwt_required()
def star_notifications():
    from app.extensions import db
    from app.models.user import User

    user_id = int(get_jwt_identity())
    data = request.json or {}
    notification_ids = data.get('notification_ids', [])
    starred = bool(data.get('starred', True))
    if not notification_ids:
        return jsonify({'success': False, 'message': 'No notification_ids provided'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    updated_count = _update_notification_states(
        db,
        user,
        notification_ids,
        lambda state, _notification, now: (
            setattr(state, 'is_starred', starred),
            setattr(state, 'starred_at', now if starred else None)
        )
    )
    return jsonify({
        'success': True,
        'message': 'Notifications updated',
        'updated_count': updated_count
    }), 200


@notifications_bp.route('/archive', methods=['PATCH'])
@jwt_required()
def archive_notifications():
    from app.extensions import db
    from app.models.user import User

    user_id = int(get_jwt_identity())
    data = request.json or {}
    notification_ids = data.get('notification_ids', [])
    archived = bool(data.get('archived', True))
    if not notification_ids:
        return jsonify({'success': False, 'message': 'No notification_ids provided'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    updated_count = _update_notification_states(
        db,
        user,
        notification_ids,
        lambda state, _notification, now: (
            setattr(state, 'is_archived', archived),
            setattr(state, 'archived_at', now if archived else None)
        )
    )
    return jsonify({
        'success': True,
        'message': 'Notifications updated',
        'updated_count': updated_count
    }), 200


@notifications_bp.route('/delete', methods=['DELETE'])
@jwt_required()
def delete_notifications():
    from app.extensions import db
    from app.models.user import User

    user_id = int(get_jwt_identity())
    data = request.json or {}
    notification_ids = data.get('notification_ids', [])
    if not notification_ids:
        return jsonify({'success': False, 'message': 'No notification_ids provided'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    updated_count = _update_notification_states(
        db,
        user,
        notification_ids,
        lambda state, _notification, now: (
            setattr(state, 'is_deleted', True),
            setattr(state, 'deleted_at', now)
        )
    )
    return jsonify({
        'success': True,
        'message': 'Notifications deleted',
        'updated_count': updated_count
    }), 200

