from flask_socketio import Namespace, emit, join_room, leave_room
from flask import request
from app.extensions import socketio, logger

class TeachersNamespace(Namespace):
    def on_connect(self):
        try:
            logger.info("Client connected to teachers namespace", remote_addr=request.remote_addr)
            # Send a connection confirmation to the client
            emit('connection_success', {'status': 'connected'})
        except Exception as e:
            logger.error(f"Error in WebSocket connection: {str(e)}", exc_info=True)
            # Send error to client
            emit('connection_error', {'error': str(e)})
            # Re-raise the exception to let Flask-SocketIO handle it
            raise

    def on_disconnect(self):
        logger.info("Client disconnected from teachers namespace", remote_addr=request.remote_addr)

    def on_subscribe(self, data):
        room = data.get('room', 'teachers')
        join_room(room)
        logger.info(f"Client joined room: {room}")
        emit('subscription_success', {'room': room})

    def on_unsubscribe(self, data):
        room = data.get('room', 'teachers')
        leave_room(room)
        logger.info(f"Client left room: {room}")

# Create the namespace instance
teachers_namespace = TeachersNamespace('/ws/teachers')

# Register the namespace with socketio (keep only one registration, either here or in __init__.py)
# Comment this out since we're registering in __init__.py
# socketio.on_namespace(teachers_namespace)

# Helper function to broadcast teacher updates to all clients in the room
def broadcast_teacher_update(teacher_id, event_type):
    # Import here to avoid circular import
    from app.services.teacher_service import TeacherService
    
    teacher = TeacherService.get_teacher_by_id(teacher_id)
    if teacher:
        socketio.emit(
            event_type,
            {'teacher_id': teacher_id},
            namespace='/ws/teachers',
            room='teachers'
        )
        logger.info(f"Broadcast {event_type} for teacher {teacher_id}")