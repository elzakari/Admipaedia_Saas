import importlib


def test_websocket_module_exports_registered_namespaces():
    module = importlib.import_module("app.websockets")

    assert "messages_namespace" in module.__all__
    assert "dashboard_namespace" in module.__all__
    assert module.messages_namespace.namespace == "/messages"
    assert module.dashboard_namespace.namespace == "/dashboard"


def test_websocket_namespace_registration_is_idempotent(monkeypatch):
    module = importlib.import_module("app.websockets")
    registrations = []

    def record_registration(namespace):
        registrations.append(namespace.namespace)

    monkeypatch.setattr(module.socketio, "on_namespace", record_registration)
    monkeypatch.setattr(module, "_namespaces_registered", False)

    module.register_websocket_namespaces()
    module.register_websocket_namespaces()

    assert registrations == [
        "/ws/teachers",
        "/notifications",
        "/ws/announcements",
        "/messages",
        "/dashboard",
    ]
