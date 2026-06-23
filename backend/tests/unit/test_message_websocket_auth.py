from types import SimpleNamespace

from app.websockets.message_handler import MessageNamespace


def test_message_socket_rejects_sender_mismatch(monkeypatch, app):
    namespace = MessageNamespace('/messages')
    namespace._connected['socket-1'] = 55

    emitted = []
    monkeypatch.setattr('app.websockets.message_handler.emit', lambda event, data, room=None: emitted.append((event, data, room)))

    with app.test_request_context('/socket.io/'):
        from flask import request

        request.sid = 'socket-1'
        namespace.on_send_message({
            'sender_id': 77,
            'recipient_id': 88,
            'subject': 'Mismatch',
            'content': 'Should be rejected',
        })

    assert emitted == [('error', {'message': 'Sender mismatch'}, 'socket-1')]


def test_message_socket_uses_authenticated_sender(monkeypatch, app):
    namespace = MessageNamespace('/messages')
    namespace._connected['socket-2'] = 42

    captured_payload = {}
    monkeypatch.setattr(
        'app.websockets.message_handler.User.query.get',
        lambda user_id: SimpleNamespace(id=user_id, role='teacher'),
    )
    monkeypatch.setattr(
        'app.services.message_service.MessageService._get_user_type',
        lambda user: 'teacher',
    )
    monkeypatch.setattr(
        'app.services.message_service.MessageService.create_message',
        lambda payload: captured_payload.update(payload) or SimpleNamespace(id=101),
    )

    with app.test_request_context('/socket.io/'):
        from flask import request

        request.sid = 'socket-2'
        namespace.on_send_message({
            'recipient_id': 88,
            'subject': 'Hello',
            'content': 'Authenticated sender wins',
            'recipient_type': 'teacher',
        })

    assert captured_payload['sender_id'] == 42
    assert captured_payload['recipient_id'] == 88
