from flask_socketio import SocketIOTestClient

from app.extensions import socketio


def test_chat_namespace_accepts_connection(app):
    client = SocketIOTestClient(app, socketio, namespace='/chat')

    assert client.is_connected('/chat')
    client.disconnect(namespace='/chat')
