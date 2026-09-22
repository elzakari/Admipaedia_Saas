from datetime import datetime, timedelta
import uuid

from flask_jwt_extended import (
    create_refresh_token,
    decode_token,
)

from app.extensions import db as app_db
from app.models.auth_session import AuthSession
from app.models.session_token import SessionToken
from app.models.user import User


PASSWORD = "SecurePass123!"


def _create_user(db, email):
    user = User(
        username=email.split("@")[0],
        email=email,
        role="student",
    )

    user.set_password_hash(PASSWORD)

    if hasattr(user, "status"):
        user.status = "active"

    if hasattr(user, "email_verified"):
        user.email_verified = True

    db.session.add(user)
    db.session.commit()

    return user


def _login(client, db, email):
    user = _create_user(db, email)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": PASSWORD,
        },
    )

    assert response.status_code == 200

    return user, response.get_json()


def _persist_refresh_compatibility_token(
    db,
    user_id,
    refresh_jwt,
):
    """
    Persist a manually minted refresh JWT through the same pytest-managed
    database session that owns the corresponding User fixture.

    PostgreSQL ordinary tests run inside transaction/savepoint isolation.
    Keeping this compatibility row on the same pytest-managed session avoids
    creating an artificial cross-transaction FK visibility problem.

    TokenSecurityService deliberately rejects unknown JTIs before route
    execution, so negative sid tests still need a legitimate compatibility row.
    """
    decoded = decode_token(refresh_jwt)

    row = SessionToken(
        jti=decoded["jti"],
        user_id=user_id,
        token_type="refresh",
        expires_at=datetime.utcfromtimestamp(
            int(decoded["exp"])
        ),
    )

    db.session.add(row)
    db.session.commit()

    return row


def test_refresh_preserves_auth_session_sid(client, db):
    user, login = _login(
        client,
        db,
        "v27c-r3b-continuity@example.com",
    )

    original_refresh = decode_token(
        login["refresh_token"]
    )

    original_sid = original_refresh["sid"]

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {login['refresh_token']}"
            ),
        },
    )

    assert response.status_code == 200

    payload = response.get_json()

    refreshed_access = decode_token(
        payload["access_token"]
    )

    assert refreshed_access["sid"] == original_sid
    assert refreshed_access["sub"] == str(user.id)

    auth_session = db.session.get(
        AuthSession,
        uuid.UUID(original_sid),
    )

    assert auth_session is not None
    assert auth_session.user_id == user.id

    legacy_access = SessionToken.find_by_jti(
        refreshed_access["jti"]
    )

    assert legacy_access is not None
    assert legacy_access.user_id == user.id
    assert legacy_access.token_type == "access"


def test_refresh_updates_auth_session_last_seen(client, db):
    _, login = _login(
        client,
        db,
        "v27c-r3b-touch@example.com",
    )

    sid = uuid.UUID(
        decode_token(login["refresh_token"])["sid"]
    )

    auth_session = db.session.get(
        AuthSession,
        sid,
    )

    assert auth_session is not None

    old_seen = datetime.utcnow() - timedelta(hours=1)
    auth_session.last_seen_at = old_seen
    db.session.commit()

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {login['refresh_token']}"
            ),
        },
    )

    assert response.status_code == 200

    db.session.expire_all()

    refreshed_session = db.session.get(
        AuthSession,
        sid,
    )

    assert refreshed_session.last_seen_at > old_seen


def test_refresh_rejects_missing_sid(
    client,
    db,
    app,
):
    user = _create_user(
        db,
        "v27c-r3b-nosid@example.com",
    )

    with app.app_context():
        token = create_refresh_token(
            identity=str(user.id),
        )

    _persist_refresh_compatibility_token(
        db,
        user.id,
        token,
    )

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401


def test_refresh_rejects_unknown_auth_session(
    client,
    db,
    app,
):
    user = _create_user(
        db,
        "v27c-r3b-unknown@example.com",
    )

    unknown_sid = str(uuid.uuid4())

    with app.app_context():
        token = create_refresh_token(
            identity=str(user.id),
            additional_claims={
                "sid": unknown_sid,
            },
        )

    _persist_refresh_compatibility_token(
        db,
        user.id,
        token,
    )

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401


def test_refresh_rejects_foreign_auth_session(
    client,
    db,
    app,
):
    owner, owner_login = _login(
        client,
        db,
        "v27c-r3b-owner@example.com",
    )

    attacker = _create_user(
        db,
        "v27c-r3b-attacker@example.com",
    )

    owner_sid = decode_token(
        owner_login["refresh_token"]
    )["sid"]

    with app.app_context():
        token = create_refresh_token(
            identity=str(attacker.id),
            additional_claims={
                "sid": owner_sid,
            },
        )

    _persist_refresh_compatibility_token(
        db,
        attacker.id,
        token,
    )

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401


def test_refresh_rejects_revoked_auth_session(
    client,
    db,
):
    _, login = _login(
        client,
        db,
        "v27c-r3b-revoked@example.com",
    )

    sid = uuid.UUID(
        decode_token(login["refresh_token"])["sid"]
    )

    auth_session = db.session.get(
        AuthSession,
        sid,
    )

    assert auth_session is not None

    auth_session.revoke(
        reason="r3b_test_revocation",
    )

    db.session.commit()

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {login['refresh_token']}"
            ),
        },
    )

    assert response.status_code == 401


def test_refresh_rejects_expired_auth_session(
    client,
    db,
):
    _, login = _login(
        client,
        db,
        "v27c-r3b-expired@example.com",
    )

    sid = uuid.UUID(
        decode_token(login["refresh_token"])["sid"]
    )

    auth_session = db.session.get(
        AuthSession,
        sid,
    )

    assert auth_session is not None

    auth_session.expires_at = (
        datetime.utcnow() - timedelta(seconds=1)
    )

    db.session.commit()

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {login['refresh_token']}"
            ),
        },
    )

    assert response.status_code == 401
