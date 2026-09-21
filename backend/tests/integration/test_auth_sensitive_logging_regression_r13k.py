"""Regression coverage for R13K authentication logging hardening.

Security property:
A failed login for an existing user must not emit the account identifier,
submitted password, stored password hash, or legacy authentication
diagnostic markers through stdout, stderr, or structured log records.
"""

import logging
import uuid

import pytest
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.user import User


LEGACY_AUTH_MARKERS = (
    "--- AUTH START:",
    "--- USER FOUND:",
    "--- AUTH: CHECK PASSWORD ---",
    "--- AUTH FAILED:",
    "--- AUTH END ---",
)


def _captured_text(capsys, caplog):
    captured = capsys.readouterr()

    log_text = "\n".join(
        record.getMessage()
        for record in caplog.records
    )

    return "\n".join(
        (
            captured.out or "",
            captured.err or "",
            log_text,
        )
    )


def test_existing_user_wrong_password_does_not_leak_sensitive_auth_data(
    app,
    client,
    capsys,
    caplog,
):
    unique = uuid.uuid4().hex

    account_identifier = (
        f"r13k-auth-log-{unique}@example.invalid"
    )

    real_password = (
        f"R13K-REAL-{unique}-Aa9!"
    )

    wrong_password = (
        f"R13K-WRONG-{unique}-Zz8!"
    )

    stored_hash = generate_password_hash(
        real_password
    )

    with app.app_context():
        user = User(
            email=account_identifier,
            password_hash=stored_hash,
            first_name="R13K",
            last_name="LoggingRegression",
            role="super_admin",
            status="active",
        )

        # Some model versions expose verification state.
        # Set it only when available so the fixture remains
        # compatible with the application's User contract.
        if hasattr(user, "is_verified"):
            user.is_verified = True

        db.session.add(user)
        db.session.commit()

    capsys.readouterr()
    caplog.clear()

    with caplog.at_level(logging.DEBUG):
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": account_identifier,
                "password": wrong_password,
            },
        )

    assert response.status_code == 401

    payload = response.get_json(silent=True)

    if isinstance(payload, dict):
        assert payload.get("success") is not True

    output = _captured_text(
        capsys,
        caplog,
    )

    lower_output = output.lower()

    # Raw account identifier must never appear.
    assert account_identifier.lower() not in lower_output

    # Neither submitted credential should appear.
    assert wrong_password not in output
    assert real_password not in output

    # Stored credential material must never appear.
    assert stored_hash not in output

    # Also catch bcrypt-family hashes even if the
    # test environment's password helper changes.
    assert "$2a$" not in output
    assert "$2b$" not in output
    assert "$2y$" not in output

    assert "password_hash" not in lower_output

    for marker in LEGACY_AUTH_MARKERS:
        assert marker not in output
