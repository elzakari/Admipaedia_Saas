from app.extensions import socketio

from app.websockets.teachers import teachers_namespace
from app.websockets.notifications import notifications_namespace
from app.websockets.announcements import announcements_namespace
from app.websockets.message_handler import MessageNamespace
from app.websockets.dashboard_handler import DashboardNamespace
import app.services.communication_service  # noqa: F401

messages_namespace = MessageNamespace('/messages')
dashboard_namespace = DashboardNamespace('/dashboard')
_namespaces_registered = False

def register_websocket_namespaces():
    """Register websocket namespaces exactly once per process."""
    global _namespaces_registered

    if _namespaces_registered:
        return

    socketio.on_namespace(teachers_namespace)
    socketio.on_namespace(notifications_namespace)
    socketio.on_namespace(announcements_namespace)
    socketio.on_namespace(messages_namespace)
    socketio.on_namespace(dashboard_namespace)
    _namespaces_registered = True


__all__ = [
    'teachers_namespace',
    'notifications_namespace',
    'announcements_namespace',
    'messages_namespace',
    'dashboard_namespace',
    'register_websocket_namespaces',
]
