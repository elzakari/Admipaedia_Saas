from datetime import datetime
import uuid

from flask_jwt_extended import decode_token

from app.models.auth_session import AuthSession
from app.models.session_token import SessionToken
from app.models.user import User


PASSWORD = "SecurePass123!"


def _create_login_user(db, email):
    user = User(
        username=email.split("@")[0],
        email=email,
        role="student",
    )

    user.set_password_hash(PASSWORD)

    # Keep this compatible with User variants where status/email_verified
    # are explicit mutable fields.
    if hasattr(user, "status"):
        user.status = "active"

    if hasattr(user, "email_verified"):
        user.email_verified = True

    db.session.add(user)
    db.session.commit()

    return user


def test_login_dual_writes_auth_session_and_sid(client, db):
    user = _create_login_user(
        db,
        "v27c-r2-login@example.com",
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": PASSWORD,
        },
    )

    assert response.status_code == 200

    payload = response.get_json()

    assert payload["success"] is True
    assert payload["access_token"]
    assert payload["refresh_token"]

    # Existing API compatibility contract remains integer SessionToken ID.
    assert isinstance(payload["session_id"], int)

    access_payload = decode_token(
        payload["access_token"]
    )

    refresh_payload = decode_token(
        payload["refresh_token"]
    )

    access_sid = access_payload.get("sid")
    refresh_sid = refresh_payload.get("sid")

    assert access_sid
    assert refresh_sid
    assert access_sid == refresh_sid
    assert payload["auth_session_id"] == access_sid

    auth_session_uuid = uuid.UUID(access_sid)

    auth_session = db.session.get(
        AuthSession,
        auth_session_uuid,
    )

    assert auth_session is not None
    assert auth_session.user_id == user.id
    assert auth_session.status == "active"
    assert auth_session.revoked_at is None
    assert auth_session.tenant_id is None
    assert auth_session.session_version == 1
    assert auth_session.last_seen_at is not None

    expected_refresh_expiry = datetime.utcfromtimestamp(
        int(refresh_payload["exp"])
    )

    # Database precision is second-level for this value.
    assert abs(
        (
            auth_session.expires_at
            - expected_refresh_expiry
        ).total_seconds()
    ) < 1

    access_row = SessionToken.find_by_jti(
        access_payload["jti"]
    )

    refresh_row = SessionToken.find_by_jti(
        refresh_payload["jti"]
    )

    assert access_row is not None
    assert refresh_row is not None

    assert access_row.user_id == user.id
    assert access_row.token_type == "access"

    assert refresh_row.user_id == user.id
    assert refresh_row.token_type == "refresh"

    # Legacy response session_id must continue referencing the access
    # SessionToken row during the compatibility phase.
    assert payload["session_id"] == access_row.id


def test_failed_login_does_not_create_auth_session(client, db):
    user = _create_login_user(
        db,
        "v27c-r2-failed@example.com",
    )

    before = AuthSession.query.filter_by(
        user_id=user.id
    ).count()

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "DefinitelyWrongPassword!",
        },
    )

    assert response.status_code == 401

    after = AuthSession.query.filter_by(
        user_id=user.id
    ).count()

    assert after == before
