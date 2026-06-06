# Create or update message_handler.py
from flask_socketio import Namespace, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from app.models.message import Message
from app.models.user import User
from app.extensions import db, socketio
import structlog

logger = structlog.get_logger()

class MessageNamespace(Namespace):
    def on_connect(self, auth):
        try:
            # Verify JWT token
            if not auth or 'token' not in auth:
                return False
            
            token_data = decode_token(auth['token'])
            user_id = token_data['sub']
            
            # Join user's personal room
            join_room(f"user_{user_id}")
            logger.info("User connected to message namespace", user_id=user_id)
            
            return True
        except Exception as e:
            logger.error("Error in message socket connection", error=str(e))
            return False
    
    def on_disconnect(self):
        logger.info("User disconnected from message namespace")
    
    def on_send_message(self, data):
        try:
            # Validate data
            if not all(k in data for k in ('sender_id', 'recipient_id', 'subject', 'content')):
                emit('error', {'message': 'Invalid message data'}, room=f"user_{data.get('sender_id')}")
                return
            
            # If recipient_type is not present, determine it
            if 'recipient_type' not in data:
                recipient = User.query.get(data['recipient_id'])
                from app.services.message_service import MessageService
                data['recipient_type'] = MessageService._get_user_type(recipient)
            
            from app.services.message_service import MessageService
            new_message = MessageService.create_message(data)
            
            logger.info("Message sent", 
                        message_id=new_message.id if new_message else None, 
                        sender_id=data['sender_id'], 
                        recipient_id=data['recipient_id'])
            
        except Exception as e:
            logger.error("Error sending message", error=str(e))
            emit('error', {'message': 'Failed to send message'}, room=f"user_{data.get('sender_id')}")

# Namespace is registered in __init__.py