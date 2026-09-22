"""
Central token/session security policy.

This service is the single security boundary used to determine
whether a JWT is allowed to continue through the application.

V27B intentionally uses SessionToken/PostgreSQL as its backing
store to preserve existing behaviour.

Future revisions can introduce Redis as a fast-path without
changing JWT middleware, routes, or authorization decorators.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Optional

import hashlib
import uuid

import structlog

from app.models.auth_session import AuthSession, RefreshToken
from app.models.session_token import SessionToken


logger = structlog.get_logger()


@dataclass(frozen=True)
class TokenSecurityDecision:
    """
    Result of evaluating the server-side state of a JWT.

    revoked=True means Flask-JWT-Extended must reject the token.
    """

    revoked: bool
    reason: str
    jti: Optional[str] = None
    token_type: Optional[str] = None
    session_token_id: Optional[int] = None


class TokenSecurityService:
    """
    Centralized JWT/session security policy.

    Current V27B policy
    -------------------
    Every JWT must correspond to a known SessionToken record.

    A token is rejected when:

    * its JTI is missing;
    * no SessionToken exists for the JTI;
    * the SessionToken is revoked;
    * the SessionToken is expired;
    * the JWT token type conflicts with the persisted token type.

    This deliberately preserves the application's current
    fail-closed security model.

    Later architecture
    ------------------
    Access JWT validation can move to a Redis-backed session
    revocation/version check while refresh tokens remain
    strongly stateful.

    Consumers should therefore call this service rather than
    querying SessionToken directly.
    """

    @classmethod
    def evaluate(
        cls,
        jwt_payload: Mapping[str, Any],
    ) -> TokenSecurityDecision:
        jti = jwt_payload.get("jti")

        if not jti:
            return TokenSecurityDecision(
                revoked=True,
                reason="missing_jti",
            )

        token_type = cls._payload_token_type(
            jwt_payload
        )

        session_token = SessionToken.find_by_jti(
            str(jti)
        )

        if session_token is None:
            return TokenSecurityDecision(
                revoked=True,
                reason="unknown_jti",
                jti=str(jti),
                token_type=token_type,
            )

        if session_token.is_revoked:
            return TokenSecurityDecision(
                revoked=True,
                reason=(
                    session_token.revocation_reason
                    or "revoked"
                ),
                jti=str(jti),
                token_type=token_type,
                session_token_id=session_token.id,
            )

        if session_token.is_expired:
            return TokenSecurityDecision(
                revoked=True,
                reason="session_expired",
                jti=str(jti),
                token_type=token_type,
                session_token_id=session_token.id,
            )

        persisted_type = (
            str(session_token.token_type).lower()
            if session_token.token_type
            else None
        )

        if (
            token_type
            and persisted_type
            and token_type != persisted_type
        ):
            logger.warning(
                "jwt_session_token_type_mismatch",
                jti=str(jti),
                jwt_token_type=token_type,
                persisted_token_type=persisted_type,
                session_token_id=session_token.id,
            )

            return TokenSecurityDecision(
                revoked=True,
                reason="token_type_mismatch",
                jti=str(jti),
                token_type=token_type,
                session_token_id=session_token.id,
            )

        return TokenSecurityDecision(
            revoked=False,
            reason="active",
            jti=str(jti),
            token_type=token_type,
            session_token_id=session_token.id,
        )

    @classmethod
    def is_revoked(
        cls,
        jwt_payload: Mapping[str, Any],
    ) -> bool:
        """
        Flask-JWT-Extended blocklist-compatible interface.
        """
        return cls.evaluate(jwt_payload).revoked

    @classmethod
    def allow_refresh_replay_inspection(
        cls,
        jwt_payload: Mapping[str, Any],
        decision: TokenSecurityDecision,
        *,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        path: Optional[str] = None,
    ) -> bool:
        """
        Permit one extremely narrow middleware exception so the refresh
        endpoint can inspect a previously rotated refresh generation and
        perform the R5 replay-compromise response.

        This is NOT a general revoked-token bypass.

        The request is eligible only when all of the following are true:

        * the centralized policy already classified the JWT as revoked;
        * the persisted legacy reason is exactly the R4 rotation reason;
        * the JWT is a refresh token;
        * the request is POST to the auth refresh endpoint;
        * both JTI and AuthSession sid are present;
        * the durable AuthSession exists, belongs to the JWT subject,
          and is still active;
        * a durable RefreshToken generation exists for SHA256(JTI);
        * that generation was already consumed;
        * that generation has not already been family-revoked;
        * that generation has a replacement generation.

        All other revoked, unknown, expired, malformed, or mismatched JWTs
        remain fail-closed.
        """

        if not decision.revoked:
            return False

        if decision.reason != "Refresh token rotated":
            return False

        if cls._payload_token_type(jwt_payload) != "refresh":
            return False

        if str(method or "").upper() != "POST":
            return False

        endpoint_value = str(endpoint or "")
        path_value = str(path or "").rstrip("/")

        is_refresh_endpoint = (
            endpoint_value.endswith(".refresh")
            or path_value.endswith("/auth/refresh")
        )

        if not is_refresh_endpoint:
            return False

        raw_jti = jwt_payload.get("jti")
        raw_sid = jwt_payload.get("sid")
        raw_user_id = jwt_payload.get("sub")

        if not raw_jti or not raw_sid or raw_user_id is None:
            return False

        try:
            auth_session_id = uuid.UUID(str(raw_sid))
            user_id = int(raw_user_id)
        except (TypeError, ValueError, AttributeError):
            return False

        # Authentication infrastructure must resolve the logical session
        # before normal tenant request context necessarily exists.
        #
        # This is a deliberately narrow tenant-scope opt-out:
        #   * sid comes from the cryptographically verified JWT;
        #   * ownership is independently constrained by JWT subject;
        #   * tenant_id remains contextual and is NOT treated as proof of
        #     authorization.
        #
        # Do not replace this with a globally-unscoped AuthSession model.
        auth_session = (
            AuthSession.query
            .without_tenant_filter()
            .filter_by(
                id=auth_session_id,
                user_id=user_id,
            )
            .first()
        )

        if (
            auth_session is None
            or not auth_session.is_active
        ):
            return False

        presented_hash = hashlib.sha256(
            str(raw_jti).encode("utf-8")
        ).hexdigest()

        generation = RefreshToken.query.filter_by(
            session_id=auth_session.id,
            jti_hash=presented_hash,
        ).first()

        if generation is None:
            return False

        return bool(
            generation.used_at is not None
            and generation.revoked_at is None
            and generation.replaced_by_id is not None
        )

    @staticmethod
    def _payload_token_type(
        jwt_payload: Mapping[str, Any],
    ) -> Optional[str]:
        """
        Normalize Flask-JWT-Extended token type claims.

        Flask-JWT-Extended normally uses:
            type = "access"
            type = "refresh"
        """
        value = jwt_payload.get("type")

        if value is None:
            return None

        value = str(value).strip().lower()

        return value or None
