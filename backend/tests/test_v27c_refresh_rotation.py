import hashlib
import uuid
from datetime import datetime

from flask_jwt_extended import decode_token

from app.extensions import db as app_db
from app.models.auth_session import AuthSession, RefreshToken
from app.models.session_token import SessionToken
from app.models.user import User


PASSWORD = "SecurePass123!"


def _create_user(db, email):
    user = User(
        username=email.split("@")[0],
        email=email,
        role="student",
    )

    if hasattr(user, "set_password_hash"):
        user.set_password_hash(PASSWORD)
    else:
        user.set_password(PASSWORD)

    db.session.add(user)
    db.session.commit()

    return user


def _login(client, db, email):
    user = _create_user(
        db,
        email,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": PASSWORD,
        },
    )

    assert response.status_code == 200

    return user, response.get_json()


def _hash_jti(jti):
    return hashlib.sha256(
        jti.encode("utf-8")
    ).hexdigest()


def test_refresh_rotates_refresh_generation(client, db):
    user, login = _login(
        client,
        db,
        "v27c-r4-rotate@example.com",
    )

    original_jwt = login["refresh_token"]
    original_payload = decode_token(original_jwt)

    sid = original_payload["sid"]
    original_hash = _hash_jti(
        original_payload["jti"]
    )

    original_generation = (
        RefreshToken.query.filter_by(
            jti_hash=original_hash
        ).one()
    )

    original_family = original_generation.family_id

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {original_jwt}"
            )
        },
    )

    assert response.status_code == 200

    payload = response.get_json()

    assert payload["success"] is True
    assert payload["access_token"]
    assert payload["refresh_token"]
    assert payload["csrf_token"]

    assert payload["refresh_token"] != original_jwt

    new_access = decode_token(
        payload["access_token"]
    )

    new_refresh = decode_token(
        payload["refresh_token"]
    )

    assert new_access["sub"] == str(user.id)
    assert new_refresh["sub"] == str(user.id)

    assert new_access["sid"] == sid
    assert new_refresh["sid"] == sid

    db.session.expire_all()

    parent = RefreshToken.query.filter_by(
        jti_hash=original_hash
    ).one()

    child_hash = _hash_jti(
        new_refresh["jti"]
    )

    child = RefreshToken.query.filter_by(
        jti_hash=child_hash
    ).one()

    assert parent.used_at is not None
    assert parent.replaced_by_id == child.id

    assert child.session_id == uuid.UUID(sid)
    assert child.family_id == original_family
    assert child.parent_jti_hash == original_hash
    assert child.used_at is None
    assert child.revoked_at is None
    assert child.replaced_by_id is None

    legacy_old = SessionToken.find_by_jti(
        original_payload["jti"]
    )

    legacy_new_refresh = SessionToken.find_by_jti(
        new_refresh["jti"]
    )

    legacy_new_access = SessionToken.find_by_jti(
        new_access["jti"]
    )

    assert legacy_old is not None
    assert legacy_old.is_revoked is True
    assert legacy_old.revoked_at is not None
    assert (
        legacy_old.revocation_reason
        == "Refresh token rotated"
    )

    assert legacy_new_refresh is not None
    assert legacy_new_refresh.user_id == user.id
    assert legacy_new_refresh.token_type == "refresh"
    assert legacy_new_refresh.is_revoked is False

    assert legacy_new_access is not None
    assert legacy_new_access.user_id == user.id
    assert legacy_new_access.token_type == "access"
    assert legacy_new_access.is_revoked is False


def test_rotated_refresh_token_can_rotate_again(client, db):
    _, login = _login(
        client,
        db,
        "v27c-r4-chain@example.com",
    )

    first = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {login['refresh_token']}"
            )
        },
    )

    assert first.status_code == 200

    first_payload = first.get_json()

    second = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {first_payload['refresh_token']}"
            )
        },
    )

    assert second.status_code == 200

    second_payload = second.get_json()

    first_refresh = decode_token(
        first_payload["refresh_token"]
    )

    second_refresh = decode_token(
        second_payload["refresh_token"]
    )

    assert (
        first_refresh["sid"]
        == second_refresh["sid"]
    )

    db.session.expire_all()

    generations = (
        RefreshToken.query.filter_by(
            session_id=uuid.UUID(
                first_refresh["sid"]
            )
        )
        .order_by(RefreshToken.issued_at.asc())
        .all()
    )

    assert len(generations) == 3

    assert generations[0].used_at is not None
    assert generations[1].used_at is not None
    assert generations[2].used_at is None

    assert (
        generations[0].replaced_by_id
        == generations[1].id
    )

    assert (
        generations[1].replaced_by_id
        == generations[2].id
    )

    assert (
        generations[1].parent_jti_hash
        == generations[0].jti_hash
    )

    assert (
        generations[2].parent_jti_hash
        == generations[1].jti_hash
    )


def test_old_refresh_token_is_single_use(client, db):
    _, login = _login(
        client,
        db,
        "v27c-r4-single-use@example.com",
    )

    original = login["refresh_token"]

    first = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {original}"
            )
        },
    )

    assert first.status_code == 200

    second = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {original}"
            )
        },
    )

    # The legacy compatibility blocklist may reject the already
    # rotated JWT before the route executes. That is acceptable and
    # desirable during the migration phase.
    assert second.status_code in (401, 422)

    original_payload = decode_token(original)

    db.session.expire_all()

    generations = RefreshToken.query.filter_by(
        session_id=uuid.UUID(
            original_payload["sid"]
        )
    ).all()

    # Losing the claim must not create another child.
    assert len(generations) == 2

    original_generation = (
        RefreshToken.query.filter_by(
            jti_hash=_hash_jti(
                original_payload["jti"]
            )
        ).one()
    )

    assert original_generation.used_at is not None
    assert original_generation.replaced_by_id is not None


def test_rotation_preserves_auth_session(client, db):
    user, login = _login(
        client,
        db,
        "v27c-r4-session@example.com",
    )

    original = decode_token(
        login["refresh_token"]
    )

    sid = uuid.UUID(
        original["sid"]
    )

    auth_session = db.session.get(
        AuthSession,
        sid,
    )

    assert auth_session is not None
    assert auth_session.user_id == user.id

    before_seen = auth_session.last_seen_at

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {login['refresh_token']}"
            )
        },
    )

    assert response.status_code == 200

    db.session.expire_all()

    refreshed_session = db.session.get(
        AuthSession,
        sid,
    )

    assert refreshed_session is not None
    assert refreshed_session.user_id == user.id
    assert refreshed_session.status == "active"
    assert refreshed_session.revoked_at is None
    assert refreshed_session.last_seen_at >= before_seen


def test_rotation_does_not_store_raw_refresh_jti(client, db):
    _, login = _login(
        client,
        db,
        "v27c-r4-hash@example.com",
    )

    response = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": (
                f"Bearer {login['refresh_token']}"
            )
        },
    )

    assert response.status_code == 200

    rotated = decode_token(
        response.get_json()["refresh_token"]
    )

    generation = RefreshToken.query.filter_by(
        jti_hash=_hash_jti(
            rotated["jti"]
        )
    ).one()

    assert generation.jti_hash != rotated["jti"]
    assert len(generation.jti_hash) == 64

# ============================================================================
# V27C-R4-PG6
# Real PostgreSQL refresh-token rotation race.
#
# This test is intentionally skipped on SQLite. In-memory SQLite uses a
# StaticPool/shared DBAPI connection in this suite and cannot prove the
# transaction-level concurrency guarantee required here.
# ============================================================================


def test_postgresql_refresh_rotation_has_exactly_one_winner(
    app,
    db,
    postgresql_real_commit,
):
    import threading

    import pytest
    from flask_jwt_extended import decode_token

    from app.models import (
        AuthSession,
        RefreshToken,
        SessionToken,
    )

    if db.engine.dialect.name != "postgresql":
        pytest.skip(
            "Requires real PostgreSQL transaction concurrency"
        )

    # Use the same canonical login helper as the already-green
    # sequential R4 tests.
    with app.test_client() as setup_client:
        user, login = _login(
            setup_client,
            db,
            "v27c-r4-pg-race@example.com",
        )

    original_refresh = login["refresh_token"]
    original_payload = decode_token(
        original_refresh
    )

    original_hash = _hash_jti(
        original_payload["jti"]
    )

    sid = original_payload["sid"]

    parent = RefreshToken.query.filter_by(
        jti_hash=original_hash
    ).one()

    parent_id = parent.id
    family_id = parent.family_id
    session_id = parent.session_id
    user_id = user.id

    assert str(session_id) == str(sid)
    assert parent.used_at is None
    assert parent.replaced_by_id is None

    # Finish setup before independent worker transactions start.
    db.session.commit()
    db.session.remove()

    barrier = threading.Barrier(2)

    results = []
    errors = []
    result_lock = threading.Lock()

    def rotate(worker_number):
        try:
            with app.test_client() as worker_client:
                barrier.wait(timeout=10)

                response = worker_client.post(
                    "/api/v1/auth/refresh",
                    headers={
                        "Authorization": (
                            f"Bearer {original_refresh}"
                        )
                    },
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
            target=rotate,
            args=(1,),
            daemon=True,
        ),
        threading.Thread(
            target=rotate,
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
    ), "Refresh race workers did not terminate"

    assert not errors, (
        f"Concurrent refresh workers raised errors: {errors}"
    )

    assert len(results) == 2, results

    statuses = [
        item["status"]
        for item in results
    ]

    # Exactly one request owns the R0 -> R1 transition.
    assert statuses.count(200) == 1, results

    losers = [
        status
        for status in statuses
        if status != 200
    ]

    assert len(losers) == 1, results

    # During the SessionToken compatibility phase the losing JWT may
    # be rejected either before the route or by the durable claim path.
    assert losers[0] in (401, 422), results

    winner = next(
        item
        for item in results
        if item["status"] == 200
    )

    assert winner["payload"]
    assert winner["payload"].get("success") is True
    assert winner["payload"].get("access_token")
    assert winner["payload"].get("refresh_token")

    # --------------------------------------------------------------
    # Authoritative PostgreSQL state.
    # --------------------------------------------------------------

    db.session.remove()

    parent = db.session.get(
        RefreshToken,
        parent_id,
    )

    assert parent is not None
    assert parent.used_at is not None
    assert parent.replaced_by_id is not None

    child = db.session.get(
        RefreshToken,
        parent.replaced_by_id,
    )

    assert child is not None

    assert child.parent_jti_hash == original_hash
    assert child.family_id == family_id
    assert child.session_id == session_id

    assert child.used_at is None
    assert child.revoked_at is None
    assert child.replaced_by_id is None

    # Critical atomicity invariant:
    # the consumed parent has exactly one child.
    children = RefreshToken.query.filter_by(
        parent_jti_hash=original_hash
    ).all()

    assert len(children) == 1

    generations = RefreshToken.query.filter_by(
        family_id=family_id
    ).all()

    # Exactly R0 + R1. Never R0 + R1 + sibling R1'.
    assert len(generations) == 2

    assert {
        generation.id
        for generation in generations
    } == {
        parent.id,
        child.id,
    }

    auth_session = db.session.get(
        AuthSession,
        session_id,
    )

    assert auth_session is not None
    assert auth_session.is_active

    legacy_refresh_rows = SessionToken.query.filter_by(
        user_id=user_id,
        token_type="refresh",
    ).all()

    # Original compatibility refresh + winning replacement only.
    assert len(legacy_refresh_rows) == 2


def test_postgresql_refresh_security_preflight_concurrency(
    app,
    db,
    postgresql_real_commit,
):
    """
    PG6.5 diagnostic.

    Prove whether the freshly issued refresh SessionToken remains active
    when TokenSecurityService evaluates the same JWT concurrently.

    No /refresh request is performed here, so this test cannot rotate or
    revoke the refresh generation itself.
    """
    import threading

    import pytest
    from flask_jwt_extended import decode_token

    from app.models import SessionToken
    from app.services.token_security_service import (
        TokenSecurityService,
    )

    if db.engine.dialect.name != "postgresql":
        pytest.skip(
            "Requires real PostgreSQL transaction concurrency"
        )

    with app.test_client() as setup_client:
        user, login = _login(
            setup_client,
            db,
            "v27c-r4-pg-preflight@example.com",
        )

    refresh_token = login["refresh_token"]
    payload = decode_token(refresh_token)
    jti = payload["jti"]

    # --------------------------------------------------------------
    # State immediately after successful login.
    # --------------------------------------------------------------

    legacy = SessionToken.find_by_jti(jti)

    assert legacy is not None
    assert legacy.user_id == user.id
    assert legacy.token_type == "refresh"

    print()
    print("PG6.5 AFTER LOGIN")
    print("jti:", jti)
    print("session_token_id:", legacy.id)
    print("is_revoked:", legacy.is_revoked)
    print("revoked_at:", legacy.revoked_at)
    print("revocation_reason:", legacy.revocation_reason)
    print("is_expired:", legacy.is_expired)

    assert legacy.is_revoked is False
    assert legacy.revoked_at is None
    assert legacy.is_expired is False

    db.session.commit()
    db.session.remove()

    barrier = threading.Barrier(2)
    results = []
    errors = []
    lock = threading.Lock()

    def evaluate(worker_number):
        try:
            with app.app_context():
                barrier.wait(timeout=10)

                decision = TokenSecurityService.evaluate(
                    payload
                )

                # Read independently in this worker transaction too.
                row = SessionToken.find_by_jti(jti)

                result = {
                    "worker": worker_number,
                    "decision_revoked": decision.revoked,
                    "decision_reason": decision.reason,
                    "decision_session_token_id": (
                        decision.session_token_id
                    ),
                    "row_found": row is not None,
                    "row_is_revoked": (
                        row.is_revoked
                        if row is not None
                        else None
                    ),
                    "row_revoked_at": (
                        str(row.revoked_at)
                        if row is not None
                        else None
                    ),
                    "row_reason": (
                        row.revocation_reason
                        if row is not None
                        else None
                    ),
                    "row_is_expired": (
                        row.is_expired
                        if row is not None
                        else None
                    ),
                }

                db.session.rollback()
                db.session.remove()

                with lock:
                    results.append(result)

        except Exception as exc:
            with lock:
                errors.append(
                    {
                        "worker": worker_number,
                        "error": repr(exc),
                    }
                )

    workers = [
        threading.Thread(
            target=evaluate,
            args=(1,),
            daemon=True,
        ),
        threading.Thread(
            target=evaluate,
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
    )

    print()
    print("PG6.5 CONCURRENT SECURITY RESULTS")

    for result in sorted(
        results,
        key=lambda item: item["worker"],
    ):
        print(result)

    if errors:
        print("PG6.5 ERRORS:", errors)

    assert not errors
    assert len(results) == 2

    # TokenSecurityService is read-only. Two simultaneous evaluations of
    # a newly issued refresh token must both observe ACTIVE.
    assert all(
        result["row_found"]
        for result in results
    ), results

    assert all(
        result["row_is_revoked"] is False
        for result in results
    ), results

    assert all(
        result["row_is_expired"] is False
        for result in results
    ), results

    assert all(
        result["decision_revoked"] is False
        for result in results
    ), results

    assert all(
        result["decision_reason"] == "active"
        for result in results
    ), results
