from types import SimpleNamespace

import pytest

from app.websockets import notifications as notifications_module


def test_extract_socket_token_strips_bearer_prefix(app):
    with app.test_request_context(
        "/socket.io/?token=Bearer%20query-token",
        headers={"Authorization": "Bearer header-token"},
    ):
        assert notifications_module._extract_socket_token(None) == "query-token"


def test_resolve_socket_user_id_allows_valid_testing_token(monkeypatch, app):
    monkeypatch.setattr(
        notifications_module,
        "decode_token",
        lambda token: {"sub": "17", "jti": "testing-jti"},
    )

    with app.app_context():
        monkeypatch.setitem(app.config, "TESTING", True)
        assert notifications_module._resolve_socket_user_id("valid-token") == 17


def test_resolve_socket_user_id_rejects_revoked_session(monkeypatch, app):
    monkeypatch.setattr(
        notifications_module,
        "decode_token",
        lambda token: {"sub": "21", "jti": "revoked-jti"},
    )
    monkeypatch.setattr(
        notifications_module.SessionToken,
        "find_by_jti",
        lambda jti: SimpleNamespace(is_valid=False),
    )

    with app.app_context():
        monkeypatch.setitem(app.config, "TESTING", False)
        with pytest.raises(ValueError, match="Revoked or unknown session token"):
            notifications_module._resolve_socket_user_id("revoked-token")
