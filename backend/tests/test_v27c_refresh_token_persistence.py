from datetime import datetime
import hashlib
import uuid

from flask_jwt_extended import decode_token

from app.models.auth_session import AuthSession, RefreshToken
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

    if hasattr(user, "status"):
        user.status = "active"

    if hasattr(user, "email_verified"):
        user.email_verified = True

    db.session.add(user)
    db.session.commit()

    return user


def test_login_persists_initial_hashed_refresh_generation(client, db):
    user = _create_login_user(
        db,
        "v27c-r3a-refresh@example.com",
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

    refresh_jwt = payload["refresh_token"]

    decoded_refresh = decode_token(refresh_jwt)

    refresh_jti = decoded_refresh["jti"]
    sid = decoded_refresh["sid"]

    expected_hash = hashlib.sha256(
        refresh_jti.encode("utf-8")
    ).hexdigest()

    assert len(expected_hash) == 64

    auth_session = db.session.get(
        AuthSession,
        uuid.UUID(sid),
    )

    assert auth_session is not None
    assert auth_session.user_id == user.id

    generations = RefreshToken.query.filter_by(
        session_id=auth_session.id
    ).all()

    assert len(generations) == 1

    generation = generations[0]

    assert generation.session_id == auth_session.id
    assert generation.family_id is not None

    assert generation.jti_hash == expected_hash
    assert len(generation.jti_hash) == 64

    # The new table must not contain the raw JTI.
    assert generation.jti_hash != refresh_jti

    assert generation.parent_jti_hash is None
    assert generation.used_at is None
    assert generation.revoked_at is None
    assert generation.replaced_by_id is None

    assert generation.is_active is True

    expected_expiry = datetime.utcfromtimestamp(
        int(decoded_refresh["exp"])
    )

    assert abs(
        (
            generation.expires_at
            - expected_expiry
        ).total_seconds()
    ) < 1

    # The compatibility layer remains present during migration.
    legacy_refresh = SessionToken.find_by_jti(
        refresh_jti
    )

    assert legacy_refresh is not None
    assert legacy_refresh.user_id == user.id
    assert legacy_refresh.token_type == "refresh"


def test_refresh_generation_family_is_unique_per_login(client, db):
    user = _create_login_user(
        db,
        "v27c-r3a-family@example.com",
    )

    responses = []

    for _ in range(2):
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": user.email,
                "password": PASSWORD,
            },
        )

        assert response.status_code == 200
        responses.append(response.get_json())

    session_ids = [
        uuid.UUID(payload["auth_session_id"])
        for payload in responses
    ]

    assert session_ids[0] != session_ids[1]

    generation_a = RefreshToken.query.filter_by(
        session_id=session_ids[0]
    ).one()

    generation_b = RefreshToken.query.filter_by(
        session_id=session_ids[1]
    ).one()

    # Every independent login begins a new refresh family.
    assert generation_a.family_id != generation_b.family_id

    assert generation_a.jti_hash != generation_b.jti_hash


def test_failed_login_does_not_persist_refresh_generation(client, db):
    user = _create_login_user(
        db,
        "v27c-r3a-failed@example.com",
    )

    before_sessions = AuthSession.query.filter_by(
        user_id=user.id
    ).count()

    before_refresh = RefreshToken.query.join(
        AuthSession,
        RefreshToken.session_id == AuthSession.id,
    ).filter(
        AuthSession.user_id == user.id
    ).count()

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401

    after_sessions = AuthSession.query.filter_by(
        user_id=user.id
    ).count()

    after_refresh = RefreshToken.query.join(
        AuthSession,
        RefreshToken.session_id == AuthSession.id,
    ).filter(
        AuthSession.user_id == user.id
    ).count()

    assert after_sessions == before_sessions
    assert after_refresh == before_refresh
