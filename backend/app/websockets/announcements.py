from flask_socketio import Namespace, emit, join_room, leave_room
from flask import request
from flask_jwt_extended import decode_token
import os
import jwt as pyjwt
import structlog

logger = structlog.get_logger()

class AnnouncementsNamespace(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self._connected = {}

    def on_connect(self):
        """Handle client connection to announcements namespace"""
        try:
            token = None
            try:
                auth = request.environ.get('socketio').get('auth') if request.environ.get('socketio') else None
            except Exception:
                auth = None

            if isinstance(auth, dict):
                token = auth.get('token')

            if not token:
                token = request.args.get('token')

            if not token:
                header = request.headers.get('Authorization')
                if header and header.lower().startswith('bearer '):
                    token = header.split(' ', 1)[1].strip()

            if not token:
                emit('error', {'message': 'Authentication failed'})
                return False

            if isinstance(token, str) and token.lower().startswith('bearer '):
                token = token.split(' ', 1)[1].strip()

            try:
                payload = decode_token(token)
            except Exception:
                secret = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-key-change-me')
                payload = pyjwt.decode(token, secret, algorithms=['HS256'], options={"verify_aud": False})

            user_id = payload.get('sub')
            if user_id is None:
                emit('error', {'message': 'Authentication failed'})
                return False

            try:
                sid = request.sid
            except Exception:
                sid = None

            if sid:
                self._connected[sid] = int(user_id)
            
            # Join user-specific room for targeted announcements
            join_room(f"user_{int(user_id)}")
            
            # Join role-based rooms (will be populated after authentication)
            
            logger.info(f"User {user_id} connected to announcements")
            emit('connected', {
                'message': 'Connected to announcements',
                'user_id': int(user_id)
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
                logger.info(f"User {user_id} disconnected from announcements")
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")
    
    def on_subscribe_to_class(self, data):
        """Handle subscription to a class room"""
        try:
            sid = getattr(request, 'sid', None)
            user_id = self._connected.get(sid)
            if user_id is None:
                emit('error', {'message': 'Authentication failed'})
                return False
            
            # Extract class_id from data
            class_id = data.get('class_id')
            if not class_id:
                emit('error', {'message': 'Missing class_id parameter'})
                return False
                
            # Join the class room
            room_name = f"class_{class_id}"
            join_room(room_name)
            
            logger.info(f"User {user_id} subscribed to class {class_id} announcements")
            emit('subscription_success', {
                'room': room_name,
                'message': f'Subscribed to announcements for class {class_id}'
            })
            
            return True
        except Exception as e:
            logger.error(f"Subscription error: {str(e)}")
            emit('error', {'message': 'Failed to subscribe to class'})
            return False
    
    def on_subscribe_to_role(self, data):
        """Handle subscription to a role-based room"""
        try:
            sid = getattr(request, 'sid', None)
            user_id = self._connected.get(sid)
            if user_id is None:
                emit('error', {'message': 'Authentication failed'})
                return False
            
            # Extract role from data
            role = data.get('role')
            if not role or role not in ['students', 'parents', 'teachers', 'admins']:
                emit('error', {'message': 'Invalid role parameter'})
                return False
                
            # Join the role room
            room_name = f"role_{role}"
            join_room(room_name)
            
            logger.info(f"User {user_id} subscribed to {role} announcements")
            emit('subscription_success', {
                'room': room_name,
                'message': f'Subscribed to announcements for {role}'
            })
            
            return True
        except Exception as e:
            logger.error(f"Subscription error: {str(e)}")
            emit('error', {'message': 'Failed to subscribe to role'})
            return False

# Create namespace instance
announcements_namespace = AnnouncementsNamespace('/ws/announcements')

# Helper function to broadcast announcement to specific rooms
def broadcast_announcement(announcement_data, target_rooms):
    """Broadcast announcement to specified rooms
    
    Args:
        announcement_data (dict): The announcement data to broadcast
        target_rooms (list): List of room names to broadcast to
    """
    try:
        for room in target_rooms:
            from app.extensions import socketio
            socketio.emit(
                'new_announcement',
                announcement_data,
                namespace='/ws/announcements',
                room=room
            )
        logger.info(f"Announcement broadcasted to {len(target_rooms)} rooms")
        return True
    except BaseException as e:
        logger.error(f"Broadcast error: {str(e)}")
        return False
