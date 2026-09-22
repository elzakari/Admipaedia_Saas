
import hashlib
import uuid

from flask import request
from flask_jwt_extended import decode_token

from app.models.auth_session import AuthSession, RefreshToken
from app.models.session_token import SessionToken
from app.models.user import User
from app.services.enhanced_auth_service import EnhancedAuthService
from app.services.token_security_service import TokenSecurityService


PASSWORD = "V27c-R5-Diagnostic!42"


def test_r5_replay_inspection_predicates(app, db):
    user = User(
        email="v27c-r5-diagnostic@example.com",
        username="v27c-r5-diagnostic",
        first_name="V27C",
        last_name="Diagnostic",
        role="admin",
        is_active=True,
    )

    user.set_password(PASSWORD)

    db.session.add(user)
    db.session.commit()

    fingerprint = "r5-diagnostic-device"
    user_agent = "ADMIPAEDIA-R5-Diagnostic/1.0"

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
        login = EnhancedAuthService.authenticate_with_security(
            user.email,
            PASSWORD,
            remember_me=False,
            device_info={
                "fingerprint": fingerprint,
                "device_id": "r5-diagnostic-device",
            },
        )

    assert login["success"] is True

    r0 = login["refresh_token"]

    decoded_r0 = decode_token(r0)

    print()
    print("=" * 100)
    print("R0 CLAIMS")
    print("=" * 100)
    print("sub:", decoded_r0.get("sub"))
    print("sid:", decoded_r0.get("sid"))
    print("jti:", decoded_r0.get("jti"))
    print("type:", decoded_r0.get("type"))

    client = app.test_client()

    first = client.post(
        "/api/v1/auth/refresh",
        headers={
            "Authorization": f"Bearer {r0}",
            "User-Agent": user_agent,
        },
    )

    assert first.status_code == 200

    db.session.expire_all()

    legacy = SessionToken.query.filter_by(
        jti=decoded_r0["jti"],
    ).first()

    sid = uuid.UUID(
        str(decoded_r0["sid"])
    )

    auth_session = AuthSession.query.filter_by(
        id=sid,
        user_id=int(decoded_r0["sub"]),
    ).first()

    jti_hash = hashlib.sha256(
        str(decoded_r0["jti"]).encode("utf-8")
    ).hexdigest()

    generation = RefreshToken.query.filter_by(
        session_id=sid,
        jti_hash=jti_hash,
    ).first()

    print()
    print("=" * 100)
    print("LEGACY SESSION TOKEN")
    print("=" * 100)
    print("exists:", legacy is not None)

    if legacy is not None:
        print("is_revoked:", legacy.is_revoked)
        print(
            "revocation_reason:",
            legacy.revocation_reason,
        )
        print(
            "token_type:",
            legacy.token_type,
        )

    print()
    print("=" * 100)
    print("AUTH SESSION")
    print("=" * 100)
    print(
        "exists:",
        auth_session is not None,
    )

    if auth_session is not None:
        print(
            "status:",
            auth_session.status,
        )
        print(
            "revoked_at:",
            auth_session.revoked_at,
        )
        print(
            "expires_at:",
            auth_session.expires_at,
        )
        print(
            "is_revoked:",
            auth_session.is_revoked,
        )
        print(
            "is_expired:",
            auth_session.is_expired,
        )
        print(
            "is_active:",
            auth_session.is_active,
        )

    print()
    print("=" * 100)
    print("DURABLE GENERATION")
    print("=" * 100)
    print(
        "exists:",
        generation is not None,
    )

    if generation is not None:
        print(
            "used_at:",
            generation.used_at,
        )
        print(
            "revoked_at:",
            generation.revoked_at,
        )
        print(
            "replaced_by_id:",
            generation.replaced_by_id,
        )
        print(
            "family_id:",
            generation.family_id,
        )

    decision = TokenSecurityService.evaluate(
        decoded_r0
    )

    print()
    print("=" * 100)
    print("TOKEN SECURITY DECISION")
    print("=" * 100)
    print(
        "revoked:",
        decision.revoked,
    )
    print(
        "reason:",
        decision.reason,
    )
    print(
        "token_type:",
        decision.token_type,
    )

    with app.test_request_context(
        "/api/v1/auth/refresh",
        method="POST",
        headers={
            "Authorization": f"Bearer {r0}",
            "User-Agent": user_agent,
        },
    ):
        allowed = (
            TokenSecurityService
            .allow_refresh_replay_inspection(
                decoded_r0,
                decision,
                endpoint=(
                    "api.api_v1.auth.refresh"
                ),
                method=request.method,
                path=request.path,
            )
        )

    print()
    print("=" * 100)
    print("R5 REPLAY INSPECTION RESULT")
    print("=" * 100)
    print(
        "allow_refresh_replay_inspection:",
        allowed,
    )

    print()
    print("=" * 100)
    print("INDIVIDUAL PREDICATES")
    print("=" * 100)

    print(
        "P1 decision.revoked:",
        decision.revoked,
    )

    print(
        "P2 reason exact:",
        (
            decision.reason
            == "Refresh token rotated"
        ),
    )

    print(
        "P3 token type refresh:",
        (
            TokenSecurityService
            ._payload_token_type(
                decoded_r0
            )
            == "refresh"
        ),
    )

    print(
        "P4 auth session exists:",
        auth_session is not None,
    )

    print(
        "P5 auth session active:",
        (
            auth_session is not None
            and auth_session.is_active
        ),
    )

    print(
        "P6 generation exists:",
        generation is not None,
    )

    print(
        "P7 used_at present:",
        (
            generation is not None
            and generation.used_at is not None
        ),
    )

    print(
        "P8 generation unrevoked:",
        (
            generation is not None
            and generation.revoked_at is None
        ),
    )

    print(
        "P9 replacement present:",
        (
            generation is not None
            and generation.replaced_by_id is not None
        ),
    )

    assert True
