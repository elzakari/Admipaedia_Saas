# Import necessary modules
from app.extensions import socketio
from flask_socketio import emit, join_room, leave_room
from app.extensions import logger

# Import and register the namespaces
from app.websockets.teachers import teachers_namespace
from app.websockets.notifications import notifications_namespace
from app.websockets.announcements import announcements_namespace
from app.websockets.message_handler import MessageNamespace
from app.websockets.dashboard_handler import DashboardNamespace

# Export all namespaces
__all__ = ['teachers_namespace', 'notifications_namespace', 'announcements_namespace', 'messages_namespace', 'dashboard_namespace']

# Ensure the namespaces are registered
socketio.on_namespace(teachers_namespace)
socketio.on_namespace(notifications_namespace)
socketio.on_namespace(announcements_namespace)
socketio.on_namespace(MessageNamespace('/messages'))
socketio.on_namespace(DashboardNamespace('/dashboard'))
