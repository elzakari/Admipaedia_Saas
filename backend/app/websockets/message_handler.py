# Create or update message_handler.py
from flask_socketio import Namespace, emit, join_room
from flask import request
from app.models.user import User
import structlog

from app.websockets.notifications import _extract_socket_token, _resolve_socket_user_id

logger = structlog.get_logger()

class MessageNamespace(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self._connected = {}

    def on_connect(self, auth):
        try:
            token = _extract_socket_token(auth)
            if not token:
                return False

            user_id = _resolve_socket_user_id(token)

            # Join user's personal room
            join_room(f"user_{user_id}")
            self._connected[request.sid] = user_id
            logger.info("User connected to message namespace", user_id=user_id)

            return True
        except Exception as e:
            logger.error("Error in message socket connection", error=str(e))
            return False
    
    def on_disconnect(self):
        self._connected.pop(request.sid, None)
        logger.info("User disconnected from message namespace")
    
    def on_send_message(self, data):
        try:
            sender_id = self._connected.get(request.sid)
            if sender_id is None:
                emit('error', {'message': 'Authentication failed'}, room=request.sid)
                return

            # Validate data
            if not all(k in data for k in ('recipient_id', 'subject', 'content')):
                emit('error', {'message': 'Invalid message data'}, room=request.sid)
                return

            if data.get('sender_id') and int(data['sender_id']) != sender_id:
                emit('error', {'message': 'Sender mismatch'}, room=request.sid)
                return

            # If recipient_type is not present, determine it
            if 'recipient_type' not in data:
                recipient = User.query.get(data['recipient_id'])
                from app.services.message_service import MessageService
                data['recipient_type'] = MessageService._get_user_type(recipient)

            from app.services.message_service import MessageService
            payload = {
                **data,
                'sender_id': sender_id,
            }
            new_message = MessageService.create_message(payload)
            
            logger.info("Message sent", 
                        message_id=new_message.id if new_message else None, 
                        sender_id=sender_id,
                        recipient_id=data['recipient_id'])
            
        except Exception as e:
            logger.error("Error sending message", error=str(e))
            emit('error', {'message': 'Failed to send message'}, room=request.sid)

# Namespace is registered in __init__.py
