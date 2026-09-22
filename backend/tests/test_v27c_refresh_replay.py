from uuid import UUID
"""
V27C-R5 refresh-token replay security tests.

Security invariants
-------------------
1. R0 may rotate exactly once to R1.
2. Presenting the already-rotated R0 again is a replay incident.
3. Replay revokes the complete durable refresh family.
4. Replay revokes the corresponding logical AuthSession.
5. Replay increments the AuthSession security version.
6. R1 cannot continue after its family is compromised.
7. A critical structured SecurityEvent is persisted.
8. An independent device/login remains usable.

These tests deliberately use explicit device fingerprints so the temporary
SessionToken compatibility layer can distinguish the two logical devices
without broad user-wide revocation.
"""

import hashlib

from flask_jwt_extended import decode_token

from app.extensions import db as app_db
from app.models.auth_session import AuthSession, RefreshToken
from app.models.security import SecurityEvent
from app.models.session_token import SessionToken
from app.models.user import User
from app.services.enhanced_auth_service import EnhancedAuthService


PASSWORD = "V27c-R5-Replay-Password!42"


def _create_user(db, suffix):
    user = User(
        email=f"v27c-r5-{suffix}@example.com",
        username=f"v27c-r5-{suffix}",
        first_name="V27C",
        last_name="Replay",
        role="admin",
        is_active=True,
    )

    user.set_password(PASSWORD)

    db.session.add(user)
    db.session.commit()

    return user


def _login_with_device(
    app,
    db,
    user,
    *,
    fingerprint,
    device_id,
    user_agent,
):
    """
    Authenticate through the real EnhancedAuthService login flow while
    providing stable, distinct device metadata.
    """

    with app.test_request_context(
        "/api/v1/auth/login",
        method="POST",
        headers={
            "User-Agent": user_agent,
        },
        environ_base={
            "REMOTE_ADDR": "127.0.0.1",
        },
    ):
        result = EnhancedAuthService.authenticate_with_security(
            user.email,
            PASSWORD,
            remember_me=False,
            device_info={
                "fingerprint": fingerprint,
                "device_id": device_id,
            },
        )

    assert result["success"] is True

    # Make the committed login state visible through the pytest-managed
    # session regardless of backend/session expiration behavior.
    db.session.expire_all()

    return result


def _refresh(client, token, *, user_agent):
    return client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": user_agent,
        },
    )


def _jti_hash(token):
    decoded = decode_token(token)

    return hashlib.sha256(
        decoded["jti"].encode("utf-8")
    ).hexdigest()


def _auth_session_for_login(db, login):
    sid = login["auth_session_id"]

    return db.session.get(
        AuthSession,
        UUID(str(sid)),
    )


def test_rotated_refresh_replay_revokes_family_and_auth_session(
    app,
    db,
):
    user = _create_user(
        db,
        "family",
    )

    fingerprint = "r5-device-family-001"
    user_agent = "ADMIPAEDIA-R5-Device-A/1.0"

    login = _login_with_device(
        app,
        db,
        user,
        fingerprint=fingerprint,
        device_id="r5-family-device",
        user_agent=user_agent,
    )

    r0 = login["refresh_token"]

    auth_session = _auth_session_for_login(
        db,
        login,
    )

    assert auth_session is not None
    assert auth_session.is_active
    assert auth_session.session_version == 1
    assert (
        auth_session.device_fingerprint
        == fingerprint
    )

    # ------------------------------------------------------------
    # R0 -> R1
    # ------------------------------------------------------------

    client = app.test_client()

    first = _refresh(
        client,
        r0,
        user_agent=user_agent,
    )

    assert first.status_code == 200

    first_body = first.get_json()

    assert first_body["success"] is True
    assert first_body.get("refresh_token")

    r1 = first_body["refresh_token"]

    assert r1 != r0

    db.session.expire_all()

    family_before_replay = (
        RefreshToken.query.filter_by(
            session_id=auth_session.id,
        )
        .order_by(RefreshToken.issued_at.asc())
        .all()
    )

    assert len(family_before_replay) == 2

    family_ids = {
        row.family_id
        for row in family_before_replay
    }

    assert len(family_ids) == 1

    parent = next(
        row
        for row in family_before_replay
        if row.jti_hash == _jti_hash(r0)
    )

    child = next(
        row
        for row in family_before_replay
        if row.jti_hash == _jti_hash(r1)
    )

    assert parent.used_at is not None
    assert parent.replaced_by_id == child.id
    assert child.parent_jti_hash == parent.jti_hash
    assert child.used_at is None

    # ------------------------------------------------------------
    # Replay R0.
    # ------------------------------------------------------------

    replay = _refresh(
        client,
        r0,
        user_agent=user_agent,
    )

    assert replay.status_code == 401

    replay_body = replay.get_json()

    assert replay_body["success"] is False
    assert (
        replay_body.get("code")
        == "REFRESH_TOKEN_REPLAY"
    )

    db.session.expire_all()

    compromised_session = db.session.get(
        AuthSession,
        auth_session.id,
    )

    assert compromised_session is not None
    assert compromised_session.status == "revoked"
    assert compromised_session.revoked_at is not None
    assert (
        compromised_session.revocation_reason
        == "refresh_token_replay"
    )
    assert compromised_session.session_version == 2

    family_after_replay = (
        RefreshToken.query.filter_by(
            session_id=auth_session.id,
            family_id=parent.family_id,
        )
        .all()
    )

    assert len(family_after_replay) == 2

    assert all(
        row.revoked_at is not None
        for row in family_after_replay
    )

    assert all(
        row.revocation_reason
        == "refresh_token_replay"
        for row in family_after_replay
    )

    # The currently-active child generation must no longer continue.
    child_attempt = _refresh(
        client,
        r1,
        user_agent=user_agent,
    )

    assert child_attempt.status_code == 401

    # Compatibility tokens belonging to this device are revoked.
    active_legacy = (
        SessionToken.query.filter_by(
            user_id=user.id,
            device_fingerprint=fingerprint,
            is_revoked=False,
        )
        .count()
    )

    assert active_legacy == 0


def test_refresh_replay_persists_one_critical_security_event(
    app,
    db,
):
    user = _create_user(
        db,
        "event",
    )

    fingerprint = "r5-device-event-001"
    user_agent = "ADMIPAEDIA-R5-Event-Device/1.0"

    login = _login_with_device(
        app,
        db,
        user,
        fingerprint=fingerprint,
        device_id="r5-event-device",
        user_agent=user_agent,
    )

    r0 = login["refresh_token"]

    client = app.test_client()

    rotated = _refresh(
        client,
        r0,
        user_agent=user_agent,
    )

    assert rotated.status_code == 200

    replay = _refresh(
        client,
        r0,
        user_agent=user_agent,
    )

    assert replay.status_code == 401
    assert (
        replay.get_json().get("code")
        == "REFRESH_TOKEN_REPLAY"
    )

    db.session.expire_all()

    events = (
        SecurityEvent.query.filter_by(
            user_id=user.id,
            event_type=(
                "refresh_token_replay_detected"
            ),
        )
        .all()
    )

    assert len(events) == 1

    event = events[0]

    assert event.severity == "critical"
    assert event.method == "POST"
    assert event.details is not None

    assert (
        event.details.get("reason")
        == "refresh_token_replay"
    )

    assert event.details.get(
        "auth_session_id"
    )

    assert event.details.get(
        "family_id"
    )

    assert event.details.get(
        "generation_id"
    )

    # Security telemetry must never persist the raw refresh JWT.
    serialized_details = str(
        event.details
    )

    assert r0 not in serialized_details

    raw_jti = decode_token(r0)["jti"]

    assert raw_jti not in serialized_details


def test_refresh_replay_does_not_revoke_independent_device(
    app,
    db,
):
    user = _create_user(
        db,
        "devices",
    )

    # ------------------------------------------------------------
    # Device A ? this session will be compromised.
    # ------------------------------------------------------------

    login_a = _login_with_device(
        app,
        db,
        user,
        fingerprint="r5-device-A-fingerprint",
        device_id="r5-device-A",
        user_agent="ADMIPAEDIA-R5-Device-A/1.0",
    )

    # ------------------------------------------------------------
    # Device B ? independent logical session.
    # ------------------------------------------------------------

    login_b = _login_with_device(
        app,
        db,
        user,
        fingerprint="r5-device-B-fingerprint",
        device_id="r5-device-B",
        user_agent="ADMIPAEDIA-R5-Device-B/1.0",
    )

    session_a = _auth_session_for_login(
        db,
        login_a,
    )

    session_b = _auth_session_for_login(
        db,
        login_b,
    )

    assert session_a.id != session_b.id

    assert (
        session_a.device_fingerprint
        != session_b.device_fingerprint
    )

    client = app.test_client()

    # Rotate A.
    rotate_a = _refresh(
        client,
        login_a["refresh_token"],
        user_agent="ADMIPAEDIA-R5-Device-A/1.0",
    )

    assert rotate_a.status_code == 200

    # Replay A's old R0.
    replay_a = _refresh(
        client,
        login_a["refresh_token"],
        user_agent="ADMIPAEDIA-R5-Device-A/1.0",
    )

    assert replay_a.status_code == 401
    assert (
        replay_a.get_json().get("code")
        == "REFRESH_TOKEN_REPLAY"
    )

    db.session.expire_all()

    session_a = db.session.get(
        AuthSession,
        session_a.id,
    )

    session_b = db.session.get(
        AuthSession,
        session_b.id,
    )

    assert session_a.status == "revoked"
    assert session_a.revoked_at is not None

    assert session_b.status == "active"
    assert session_b.revoked_at is None
    assert session_b.is_active

    # Device B's compatibility refresh row must remain active.
    decoded_b = decode_token(
        login_b["refresh_token"]
    )

    legacy_b = SessionToken.query.filter_by(
        jti=decoded_b["jti"],
    ).first()

    assert legacy_b is not None
    assert legacy_b.is_revoked is False

    # Most importantly: B must still be able to rotate normally.
    refresh_b = _refresh(
        client,
        login_b["refresh_token"],
        user_agent="ADMIPAEDIA-R5-Device-B/1.0",
    )

    assert refresh_b.status_code == 200

    body_b = refresh_b.get_json()

    assert body_b["success"] is True
    assert body_b.get("refresh_token")


def test_postgresql_concurrent_refresh_replay_has_exactly_one_compromise_owner(
    app,
    db,
    postgresql_real_commit,
):
    """
    R5 PostgreSQL concurrency proof.

    After a legitimate R0 -> R1 rotation, replay the consumed R0 from two
    independent PostgreSQL-backed HTTP requests simultaneously.

    Required invariants:
      * both replay requests fail securely;
      * exactly one request owns the AuthSession compromise transition;
      * the compromised AuthSession is revoked exactly once;
      * the complete refresh family is revoked;
      * exactly one critical replay SecurityEvent is persisted;
      * the active child R1 cannot continue;
      * an independent device/session for the same user remains active.
    """
    import threading

    import pytest
    from flask_jwt_extended import decode_token

    from app.models import (
        AuthSession,
        RefreshToken,
        SecurityEvent,
        SessionToken,
    )

    if db.engine.dialect.name != "postgresql":
        pytest.skip(
            "Requires real PostgreSQL transaction concurrency"
        )

    # --------------------------------------------------------------
    # Setup one user with two independent device sessions.
    # Device A will be compromised. Device B must survive.
    # --------------------------------------------------------------

    user = _create_user(
        db,
        "pg-race",
    )

    device_a_fingerprint = "r5-pg-device-A-fingerprint"
    device_a_agent = "ADMIPAEDIA-R5-PG-Device-A/1.0"

    device_b_fingerprint = "r5-pg-device-B-fingerprint"
    device_b_agent = "ADMIPAEDIA-R5-PG-Device-B/1.0"

    login_a = _login_with_device(
        app,
        db,
        user,
        fingerprint=device_a_fingerprint,
        device_id="r5-pg-device-A",
        user_agent=device_a_agent,
    )

    login_b = _login_with_device(
        app,
        db,
        user,
        fingerprint=device_b_fingerprint,
        device_id="r5-pg-device-B",
        user_agent=device_b_agent,
    )

    r0 = login_a["refresh_token"]

    r0_payload = decode_token(r0)
    session_a_id = r0_payload["sid"]
    user_id = user.id

    session_a = _auth_session_for_login(
        db,
        login_a,
    )

    session_b = _auth_session_for_login(
        db,
        login_b,
    )

    session_a_id = session_a.id
    session_b_id = session_b.id

    assert session_a_id != session_b_id
    assert session_a.is_active
    assert session_b.is_active

    # --------------------------------------------------------------
    # Legitimate R0 -> R1 rotation before the replay race.
    # --------------------------------------------------------------

    with app.test_client() as setup_client:
        rotated = _refresh(
            setup_client,
            r0,
            user_agent=device_a_agent,
        )

    assert rotated.status_code == 200

    rotated_body = rotated.get_json()

    assert rotated_body["success"] is True

    r1 = rotated_body["refresh_token"]

    r1_payload = decode_token(r1)

    assert r1_payload["sid"] == str(session_a_id)

    db.session.expire_all()

    family_before = (
        RefreshToken.query.filter_by(
            session_id=session_a_id,
        )
        .order_by(RefreshToken.issued_at.asc())
        .all()
    )

    assert len(family_before) == 2

    family_ids = {
        row.family_id
        for row in family_before
    }

    assert len(family_ids) == 1

    family_id = next(iter(family_ids))

    parent = next(
        row
        for row in family_before
        if row.jti_hash == _jti_hash(r0)
    )

    child = next(
        row
        for row in family_before
        if row.jti_hash == _jti_hash(r1)
    )

    assert parent.used_at is not None
    assert parent.replaced_by_id == child.id
    assert child.revoked_at is None

    # The PostgreSQL concurrency fixture permits real commits.
    # Make the completed R0 -> R1 state visible to both worker
    # connections before the replay race starts.
    db.session.commit()
    db.session.remove()

    # --------------------------------------------------------------
    # Two independent HTTP requests replay the same consumed R0.
    # --------------------------------------------------------------

    barrier = threading.Barrier(2)

    results = []
    errors = []
    result_lock = threading.Lock()

    def replay(worker_number):
        try:
            with app.test_client() as worker_client:
                barrier.wait(timeout=10)

                response = _refresh(
                    worker_client,
                    r0,
                    user_agent=device_a_agent,
                )

                with result_lock:
                    results.append(
                        {
                            "worker": worker_number,
                            "status": response.status_code,
                            "payload": response.get_json(
                                silent=True
                            ),
                        }
                    )

        except Exception as exc:
            with result_lock:
                errors.append(
                    {
                        "worker": worker_number,
                        "error": repr(exc),
                    }
                )

    workers = [
        threading.Thread(
            target=replay,
            args=(1,),
            daemon=True,
        ),
        threading.Thread(
            target=replay,
            args=(2,),
            daemon=True,
        ),
    ]

    for worker in workers:
        worker.start()

    for worker in workers:
        worker.join(timeout=20)

    assert all(
        not worker.is_alive()
        for worker in workers
    ), "R5 replay-race workers did not terminate"

    assert not errors, (
        f"Concurrent replay workers raised errors: {errors}"
    )

    assert len(results) == 2, results

    # Every replay must fail. There must never be a new successful
    # refresh transition from an already-consumed generation.
    assert all(
        item["status"] in (401, 422)
        for item in results
    ), results

    assert all(
        item["status"] != 200
        for item in results
    ), results

    # Exactly one worker should own the compromise transition and
    # therefore return the explicit R5 replay code. The other worker
    # may observe the session/family after it has already been revoked.
    explicit_replays = [
        item
        for item in results
        if (
            item["status"] == 401
            and isinstance(item["payload"], dict)
            and item["payload"].get("code")
            == "REFRESH_TOKEN_REPLAY"
        )
    ]

    assert len(explicit_replays) == 1, results

    # --------------------------------------------------------------
    # Authoritative PostgreSQL state after the race.
    # --------------------------------------------------------------

    db.session.remove()

    compromised_session = db.session.get(
        AuthSession,
        session_a_id,
    )

    independent_session = db.session.get(
        AuthSession,
        session_b_id,
    )

    assert compromised_session is not None
    assert independent_session is not None

    assert compromised_session.status == "revoked"
    assert compromised_session.revoked_at is not None
    assert (
        compromised_session.revocation_reason
        == "refresh_token_replay"
    )

    # Exactly one compromise owner increments version once.
    assert compromised_session.session_version == 2

    # Independent logical session survives.
    assert independent_session.status == "active"
    assert independent_session.revoked_at is None
    assert independent_session.is_active

    family_after = RefreshToken.query.filter_by(
        session_id=session_a_id,
        family_id=family_id,
    ).all()

    # R0 + R1 only. Replay must never manufacture another generation.
    assert len(family_after) == 2

    assert all(
        row.revoked_at is not None
        for row in family_after
    )

    assert all(
        row.revocation_reason
        == "refresh_token_replay"
        for row in family_after
    )

    events = SecurityEvent.query.filter_by(
        user_id=user_id,
        event_type="refresh_token_replay_detected",
    ).all()

    # Critical concurrency invariant: one incident, one durable event.
    assert len(events) == 1

    event = events[0]

    assert event.severity == "critical"
    assert event.method == "POST"

    assert event.details is not None
    assert (
        event.details.get("reason")
        == "refresh_token_replay"
    )
    assert (
        event.details.get("auth_session_id")
        == str(session_a_id)
    )
    assert (
        event.details.get("family_id")
        == str(family_id)
    )

    # Never persist the raw refresh JWT or raw JTI in telemetry.
    serialized_details = str(event.details)

    assert r0 not in serialized_details
    assert r0_payload["jti"] not in serialized_details

    # Device B's legacy compatibility refresh must remain active.
    b_payload = decode_token(
        login_b["refresh_token"]
    )

    legacy_b = SessionToken.query.filter_by(
        jti=b_payload["jti"],
    ).first()

    assert legacy_b is not None
    assert legacy_b.is_revoked is False

    # --------------------------------------------------------------
    # Functional containment checks.
    # --------------------------------------------------------------

    with app.test_client() as verification_client:
        # Compromised R1 must no longer continue.
        child_attempt = _refresh(
            verification_client,
            r1,
            user_agent=device_a_agent,
        )

        assert child_attempt.status_code in (401, 422)

        # Independent device B must still rotate normally.
        device_b_attempt = _refresh(
            verification_client,
            login_b["refresh_token"],
            user_agent=device_b_agent,
        )

        assert device_b_attempt.status_code == 200

        device_b_body = device_b_attempt.get_json()

        assert device_b_body["success"] is True
        assert device_b_body.get("refresh_token")
