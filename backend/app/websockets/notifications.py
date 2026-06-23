from flask_socketio import Namespace, emit, join_room, leave_room
from flask import current_app, request
from flask_jwt_extended import decode_token
import logging

from app.models.session_token import SessionToken

logger = logging.getLogger(__name__)


def _extract_socket_token(auth):
    token = None
    if isinstance(auth, dict):
        token = auth.get('token')
    if not token:
        token = request.args.get('token')
    if not token:
        header = request.headers.get('Authorization')
        if header and header.lower().startswith('bearer '):
            token = header.split(' ', 1)[1].strip()

    if isinstance(token, str) and token.lower().startswith('bearer '):
        token = token.split(' ', 1)[1].strip()

    return token


def _resolve_socket_user_id(token):
    if not token:
        raise ValueError('Missing token')

    payload = decode_token(token)
    user_id = payload.get('sub')
    if user_id is None:
        raise ValueError('Missing token subject')

    if not current_app.config.get('TESTING'):
        jti = payload.get('jti')
        if not jti:
            raise ValueError('Missing token identifier')

        session_token = SessionToken.find_by_jti(jti)
        if session_token is None or not session_token.is_valid:
            raise ValueError('Revoked or unknown session token')

    return int(user_id)

class NotificationsNamespace(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self._connected = {}

    def on_connect(self, auth=None):
        """Handle client connection to notifications namespace"""
        try:
            token = _extract_socket_token(auth)
            if not token:
                emit('error', {'message': 'Authentication failed'})
                return False

            user_id = _resolve_socket_user_id(token)

            try:
                sid = request.sid
            except Exception:
                sid = None

            if sid:
                self._connected[sid] = user_id
            
            # Join user-specific room for targeted notifications
            join_room(f"user_{user_id}")
            
            logger.info(f"User {user_id} connected to notifications")
            emit('connected', {
                'message': 'Connected to notifications',
                'user_id': user_id
            })
            
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            emit('error', {'message': 'Authentication failed'})
            return False
    
    def on_disconnect(self):
        """Handle client disconnection"""
        try:
            sid = getattr(request, 'sid', None)
            user_id = self._connected.get(sid)
            if user_id is not None:
                leave_room(f"user_{user_id}")
                del self._connected[sid]
                logger.info(f"User {user_id} disconnected from notifications")
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")
    
    def on_subscribe_to_updates(self, data):
        """Subscribe to specific notification types"""
        try:
            sid = getattr(request, 'sid', None)
            user_id = self._connected.get(sid)
            if user_id is None:
                emit('error', {'message': 'Authentication failed'})
                return
            notification_types = data.get('types', [])
            
            # Join rooms for specific notification types
            for notif_type in notification_types:
                join_room(f"{notif_type}_{user_id}")
            
            emit('subscribed', {
                'message': 'Subscribed to notification types',
                'types': notification_types
            })
            
        except Exception as e:
            logger.error(f"Subscription error: {str(e)}")
            emit('error', {'message': 'Subscription failed'})
    
    def broadcast_notification(self, user_id, notification_data):
        """Broadcast notification to specific user"""
        self.emit('new_notification', notification_data, room=f"user_{user_id}")

    def on_create_notification(self, data):
        """Create a new notification from WebSocket"""
        try:
            from app.services.notification_service import NotificationService
            
            sid = getattr(request, 'sid', None)
            user_id = self._connected.get(sid)
            if user_id is None:
                emit('error', {'message': 'Authentication failed'})
                return
            
            # Validate required fields
            required_fields = ['title', 'message', 'type']
            for field in required_fields:
                if field not in data:
                    emit('error', {'message': f'Missing required field: {field}'})
                    return
            
            # Get optional fields with defaults
            target_user_id = data.get('user_id')  # If None, it's a global notification
            send_email = data.get('send_email', False)
            
            # Create the notification
            notification = NotificationService.create_notification(
                title=data['title'],
                message=data['message'],
                notification_type=data['type'],
                user_id=target_user_id,
                send_email=send_email,
                send_websocket=True
            )
            
            # Format notification for response
            notification_data = {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'time': 'Just now',
                'read': notification.read,
                'type': notification.type,
                'user_id': notification.user_id
            }
            
            emit('notification_created', notification_data)
            
        except Exception as e:
            logger.error(f"Notification creation error: {str(e)}")
            emit('error', {'message': 'Failed to create notification'})

# Create namespace instance
notifications_namespace = NotificationsNamespace('/notifications')
