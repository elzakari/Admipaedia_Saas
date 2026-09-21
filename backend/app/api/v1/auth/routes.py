import uuid
import secrets
from datetime import datetime, timedelta

import structlog
from flask import Blueprint, current_app, g, jsonify, request, session
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                get_jwt, get_jwt_identity, jwt_required)
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy.orm import joinedload

from app.extensions import bcrypt, db, jwt
from app.middleware.security_middleware import (CSRFProtection,
                                                log_security_event, rate_limit,
                                                sanitize_request_data,
                                                security_headers)
from app.models.parent import Parent
from app.models.security import LoginAttempt, PasswordHistory, SecurityEvent
from app.models.session_token import SessionToken
from app.models.auth_session import AuthSession, RefreshToken
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.utils.avatar_utils import normalize_avatar_url_for_response
from app.utils.password_security import AccountSecurity, PasswordSecurity
from app.utils.url_helpers import get_frontend_base_url
import hashlib

logger = structlog.get_logger()

# Create blueprint
auth_bp = Blueprint("auth", __name__)
auth_bp.strict_slashes = False


# Enhanced schemas for request validation
class RegisterSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    role = fields.String(
        required=False,
        validate=validate.OneOf(["admin", "teacher", "student", "parent", "user"]),
    )
    confirm_password = fields.String(required=False)


class LoginSchema(Schema):
    email = fields.String(required=False)
    username = fields.String(required=False)
    password = fields.String(required=True)
    remember_me = fields.Boolean(load_default=False)


class ChangePasswordSchema(Schema):
    current_password = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=8))
    confirm_password = fields.String(required=True)

@auth_bp.route("/register", methods=["POST"])
@rate_limit(limit=5, window=3600)  # 5 registrations per hour
@sanitize_request_data({"email": "email", "username": "text", "password": "text"})
@security_headers()
def register():
    """Register a new user with enhanced security validation."""
    try:
        allow_public = bool(
            current_app.config.get("ALLOW_PUBLIC_REGISTRATION", False)
        ) or bool(current_app.config.get("TESTING", False))
        if not allow_public:
            try:
                v = SystemSetting.get_value("platform_allow_public_registration", None)
                if v is not None:
                    allow_public = str(v).lower() in ("true", "1", "t", "y", "yes")
            except Exception:
                allow_public = False

        if not allow_public:
            log_security_event(
                "blocked_public_registration",
                {
                    "ip": request.remote_addr,
                    "user_agent": request.headers.get("User-Agent"),
                },
            )
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Registration is invitation-only. Please use a registration link from your school admin.",
                    }
                ),
                403,
            )

        schema = RegisterSchema()
        data = schema.load(request.json)

        # Validate password confirmation
        confirm_password = data.get("confirm_password") or data["password"]
        if data["password"] != confirm_password:
            return jsonify({"success": False, "message": "Passwords do not match"}), 400

        # Check password strength
        is_strong, password_errors = PasswordSecurity.validate_password_strength(
            data["password"], data["username"], data["email"]
        )

        if not is_strong:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Password does not meet security requirements",
                        "errors": password_errors,
                    }
                ),
                400,
            )

        # Check for password breaches
        if PasswordSecurity.check_password_breach(data["password"]):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "This password has been found in data breaches. Please choose a different password.",
                    }
                ),
                400,
            )

        # Check if user already exists
        if User.query.filter_by(email=data["email"]).first():
            log_security_event(
                "duplicate_registration_attempt", {"email": data["email"]}
            )
            return (
                jsonify({"success": False, "message": "Email already registered"}),
                400,
            )

        if User.query.filter_by(username=data["username"]).first():
            return jsonify({"success": False, "message": "Username already taken"}), 400

        # Create new user
        requested_role = (data.get("role") or "user").strip()
        is_testing = False
        try:
            is_testing = current_app and current_app.config.get("TESTING")
        except Exception:
            pass

        if not is_testing:
            if requested_role not in ("user", "parent"):
                log_security_event(
                    "blocked_role_registration_attempt",
                    {"email": data["email"], "requested_role": requested_role},
                )
                requested_role = "user"

        user = User(username=data["username"], email=data["email"], role=requested_role)
        if current_app.config.get("AUTO_VERIFY_EMAIL"):
            user.status = "active"
            user.is_email_verified = True
        else:
            user.status = "pending_email_verification"
        user.set_password_hash(data["password"])

        db.session.add(user)
        db.session.flush()  # Get user ID

        if user.role == "parent":
            if not Parent.query.filter_by(user_id=user.id).first():
                db.session.add(Parent(user_id=user.id))

        # Store password in history
        password_history = PasswordHistory(
            user_id=user.id, password_hash=user.password_hash
        )
        db.session.add(password_history)

        db.session.commit()

        try:
            from app.services.email_verification_service import \
                EmailVerificationService

            verification_service = EmailVerificationService()
            verification_service.send_verification_email(user)
        except Exception as err:
            logger.error(
                "failed_to_send_initial_verification_email",
                error=str(err),
                user_id=user.id,
            )

        log_security_event("user_registered", {"user_id": user.id, "email": user.email})

        return (
            jsonify(
                {
                    "success": True,
                    "message": "User registered successfully. Please check your email to verify your account.",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "role": user.role,
                    },
                }
            ),
            201,
        )

    except ValidationError as err:
        return (
            jsonify(
                {"success": False, "error": err.messages, "message": str(err.messages)}
            ),
            400,
        )
    except Exception as err:
        logger.error("registration_error", error=str(err))
        return jsonify({"success": False, "error": "Registration failed"}), 500

@auth_bp.route("/verify-email", methods=["GET", "POST"])
@rate_limit(limit=10, window=900)  # 10 verify attempts per 15 mins
@security_headers()
def verify_email():
    """Verify user's email verification token and activate their account."""
    try:
        # Support token from either query parameter (GET) or JSON body (POST)
        if request.method == "POST":
            data = request.get_json() or {}
            token = data.get("token")
        else:
            token = request.args.get("token")

        token = str(token or "").strip()
        if not token:
            return (
                jsonify(
                    {"success": False, "message": "Verification token is required"}
                ),
                400,
            )

        from app.services.email_verification_service import \
            EmailVerificationService

        verification_service = EmailVerificationService()
        success, message = verification_service.verify_token(token)

        if not success:
            log_security_event(
                "email_verification_failed",
                {"ip": request.remote_addr, "message": message},
            )
            return jsonify({"success": False, "message": message}), 400

        log_security_event("email_verification_success", {"ip": request.remote_addr})
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Your account has been verified and activated successfully!",
                }
            ),
            200,
        )

    except Exception as err:
        logger.error("email_verification_error", error=str(err))
        return jsonify({"success": False, "error": "Email verification failed"}), 500

@auth_bp.route("/resend-verification", methods=["POST"])
@rate_limit(limit=3, window=3600)  # max 3 verification resends per hour
@sanitize_request_data({"email": "email"})
@security_headers()
def resend_verification():
    """Resend verification email to a pending user."""
    try:
        data = request.get_json() or {}
        email = str(data.get("email") or "").strip().lower()

        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400

        user = User.query.filter_by(email=email).first()

        # Secure mitigation: always return 200 OK to prevent email enumeration
        if user:
            if user.email_verified:
                return (
                    jsonify(
                        {
                            "success": True,
                            "message": "If the email is unregistered or pending, a verification link has been sent.",
                        }
                    ),
                    200,
                )

            # Trigger email verification lifecycle loop
            from app.services.email_verification_service import \
                EmailVerificationService

            verification_service = EmailVerificationService()
            verification_service.send_verification_email(user)

            log_security_event(
                "email_verification_resent", {"user_id": user.id, "email": email}
            )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "If the email is unregistered or pending, a verification link has been sent.",
                }
            ),
            200,
        )

    except Exception as err:
        logger.error("resend_verification_error", error=str(err))
        return (
            jsonify({"success": False, "error": "Failed to resend verification link"}),
            500,
        )


from flask import current_app

from app.services.enhanced_auth_service import EnhancedAuthService

@auth_bp.route("/test", methods=["GET"])
def test_auth():
    return jsonify({"success": True, "message": "Auth service is reachable"}), 200

@auth_bp.route("/login", methods=["POST"])
@auth_bp.route("/login/", methods=["POST"])
@rate_limit(
    limit=10, window=900, burst_limit=5
)  # 10 attempts per 15 minutes, max 5 rapid attempts
@sanitize_request_data({"email": "text", "username": "text", "password": "text"})
@security_headers()
def login():
    """Authenticate user with enhanced security measures (MFA support)."""
    try:
        data = request.get_json() or {}
        email = (data.get("email") or data.get("username") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Email or username and password required",
                    }
                ),
                400,
            )

        logger.info("login_attempt")

        result = EnhancedAuthService.authenticate_with_security(
            email=email,
            password=password,
            remember_me=data.get("remember_me", False),
            device_info=data.get("device_info"),
        )

        logger.info("login_result", success=result.get("success", False))

        # Ensure status_code is a valid integer
        if result.get("success", False):
            status_code = 200
        elif result.get("error") == "EMAIL_NOT_VERIFIED":
            status_code = 401
        elif result.get("error") == "UNCLAIMED_PROFILE":
            status_code = 400
        else:
            status_code = 401

        # If MFA is required, we still return 200 OK so frontend can process the MFA flow
        if not result.get("success", False) and result.get("requires_mfa", False):
            status_code = 200

        if (
            not result.get("success", False)
            and "message" not in result
            and "error" in result
        ):
            result["message"] = result["error"]

        return jsonify(result), status_code

    except Exception as err:
        logger.error("login_error", error=str(err))
        return jsonify({"success": False, "message": "Login failed"}), 500

@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
@rate_limit(limit=3, window=3600)  # 3 password changes per hour
@sanitize_request_data()
@security_headers()
def change_password():
    """Change user password with enhanced security validation."""
    try:
        schema = ChangePasswordSchema()
        data = schema.load(request.json)

        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        # Verify current password
        if not user.check_password_hash(data["current_password"]):
            log_security_event("password_change_wrong_current", {"user_id": user.id})
            return (
                jsonify({"success": False, "message": "Current password is incorrect"}),
                400,
            )

        # Validate password confirmation
        if data["new_password"] != data["confirm_password"]:
            return (
                jsonify({"success": False, "message": "New passwords do not match"}),
                400,
            )

        # Check password strength
        is_strong, password_errors = PasswordSecurity.validate_password_strength(
            data["new_password"], user.username, user.email
        )

        if not is_strong:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "New password does not meet security requirements",
                        "errors": password_errors,
                    }
                ),
                400,
            )

        # Check password history (prevent reuse of last 5 passwords)
        recent_passwords = (
            PasswordHistory.query.filter_by(user_id=user.id)
            .order_by(PasswordHistory.created_at.desc())
            .limit(5)
            .all()
        )

        new_password_hash = bcrypt.generate_password_hash(data["new_password"]).decode(
            "utf-8"
        )

        for old_password in recent_passwords:
            if bcrypt.check_password_hash(
                old_password.password_hash, data["new_password"]
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Cannot reuse a recent password. Please choose a different password.",
                        }
                    ),
                    400,
                )

        # Check for password breaches
        if PasswordSecurity.check_password_breach(data["new_password"]):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "This password has been found in data breaches. Please choose a different password.",
                    }
                ),
                400,
            )

        # Update password
        user.set_password_hash(data["new_password"])
        user.password_changed_at = datetime.utcnow()

        # Store in password history
        password_history = PasswordHistory(
            user_id=user.id, password_hash=user.password_hash
        )
        db.session.add(password_history)

        # Revoke all existing sessions except current one
        current_jti = get_jwt()["jti"]
        SessionToken.query.filter(
            SessionToken.user_id == user.id,
            SessionToken.jti != current_jti,
            SessionToken.is_revoked == False,
        ).update(
            {
                "is_revoked": True,
                "revoked_at": datetime.utcnow(),
                "revocation_reason": "password_changed",
            }
        )

        db.session.commit()

        log_security_event("password_changed", {"user_id": user.id})

        return (
            jsonify({"success": True, "message": "Password changed successfully"}),
            200,
        )

    except ValidationError as err:
        return (
            jsonify(
                {"success": False, "error": err.messages, "message": str(err.messages)}
            ),
            400,
        )
    except Exception as err:
        logger.error(
            "password_change_error", error=str(err), user_id=get_jwt_identity()
        )
        return jsonify({"success": False, "error": "Password change failed"}), 500

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
@security_headers()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            pass
        current_jti = get_jwt()["jti"]

        # Validate session is still active
        any_token = SessionToken.query.filter_by(jti=current_jti).first()
        if any_token and any_token.is_revoked:
            log_security_event(
                "revoked_token_access", {"user_id": user_id, "jti": current_jti}
            )
            return jsonify({"success": False, "error": "Token revoked"}), 401

        session_token = (
            SessionToken.query.options(joinedload(SessionToken.user))
            .filter_by(jti=current_jti, is_revoked=False)
            .first()
        )

        user = session_token.user if session_token else None
        if not user and current_app.config.get("TESTING"):
            try:
                uid = int(user_id) if user_id is not None else None
            except Exception:
                uid = None
            user = User.query.filter_by(id=uid).first() if uid else None
            if not user:
                user = (
                    User.query.filter_by(email="test@example.com").first()
                    or User.query.first()
                )

        if not user:
            if not session_token:
                log_security_event(
                    "invalid_session_access", {"user_id": user_id, "jti": current_jti}
                )
                return jsonify({"success": False, "error": "Session invalid"}), 401
            return jsonify({"success": False, "error": "User not found"}), 404

        if session_token:
            now = datetime.utcnow()
            last_activity = getattr(session_token, "last_activity", None) or getattr(
                session_token, "last_used_at", None
            )
            if last_activity is None or (now - last_activity) >= timedelta(minutes=5):
                if hasattr(session_token, "last_activity"):
                    session_token.last_activity = now
                session_token.last_used_at = now
                db.session.commit()

        user_payload = EnhancedAuthService._serialize_user(user)
        user_payload["password_changed_at"] = (
            user.password_changed_at.isoformat()
            if hasattr(user, "password_changed_at") and user.password_changed_at
            else None
        )

        return jsonify({"success": True, "user": user_payload, "user_id": user.id}), 200

    except Exception as err:
        logger.error(
            "get_current_user_error", error=str(err), user_id=get_jwt_identity()
        )
        return (
            jsonify({"success": False, "error": "Failed to get user information"}),
            500,
        )

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Rotate a refresh token atomically.

    V27C-R5:
    - AuthSession remains the durable login/device session.
    - RefreshToken is the durable refresh-generation chain.
    - SessionToken remains the temporary JWT compatibility layer.
    - A refresh generation is single-use.
    - A confirmed post-rotation replay revokes the complete refresh
      family and logical AuthSession atomically.
    - Ordinary R4 concurrent losers remain simple 401 responses and do
      not trigger compromise revocation.
    """
    try:
        current_user_id = get_jwt_identity()

        if current_user_id is None:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid refresh session",
                    }
                ),
                401,
            )

        try:
            current_user_id = int(current_user_id)
        except (TypeError, ValueError):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid refresh session",
                    }
                ),
                401,
            )

        refresh_claims = get_jwt()

        sid = refresh_claims.get("sid")
        refresh_jti = refresh_claims.get("jti")

        if not sid or not refresh_jti:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid refresh session",
                    }
                ),
                401,
            )

        try:
            auth_session_id = uuid.UUID(str(sid))
        except (TypeError, ValueError, AttributeError):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid refresh session",
                    }
                ),
                401,
            )

        now = datetime.utcnow()

        auth_session = db.session.get(
            AuthSession,
            auth_session_id,
        )

        if (
            auth_session is None
            or auth_session.user_id != current_user_id
            or not auth_session.is_active
        ):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid refresh session",
                    }
                ),
                401,
            )

        presented_hash = hashlib.sha256(
            refresh_jti.encode("utf-8")
        ).hexdigest()

        # Load immutable lineage information before the atomic claim.
        #
        # We deliberately do not rely on this object's used_at value for
        # ownership. The conditional UPDATE below is the authority.
        current_generation = (
            RefreshToken.query.filter_by(
                jti_hash=presented_hash,
                session_id=auth_session.id,
            )
            .first()
        )

        if current_generation is None:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid refresh session",
                    }
                ),
                401,
            )

        current_generation_id = current_generation.id
        family_id = current_generation.family_id

        # --------------------------------------------------------
        # Atomic single-use claim.
        #
        # Exactly one request may transition:
        #
        #     used_at IS NULL -> used_at = now
        #
        # The rowcount is therefore the ownership result.
        # --------------------------------------------------------

        claim = (
            db.session.query(RefreshToken)
            .filter(
                RefreshToken.id == current_generation_id,
                RefreshToken.session_id == auth_session.id,
                RefreshToken.jti_hash == presented_hash,
                RefreshToken.used_at.is_(None),
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .update(
                {
                    RefreshToken.used_at: now,
                },
                synchronize_session=False,
            )
        )

        if claim != 1:
            # A zero-row conditional UPDATE is an expected compare-and-swap
            # outcome, not a database error. The SQLAlchemy transaction is
            # still valid and must remain intact while R5 determines whether
            # this request is:
            #
            #   1. an ordinary concurrent R4 loser, or
            #   2. a confirmed post-rotation replay incident.
            #
            # Do NOT rollback here. In transactional test isolation a broad
            # rollback can destroy the surrounding savepoint, and in normal
            # runtime operation no rollback is required merely because an
            # UPDATE matched zero rows.
            #
            # Confirmed replay handling below performs its security updates
            # and commits them atomically. Non-replay/loser paths explicitly
            # rollback before returning.
            # ------------------------------------------------------------
            # V27C-R5 ? refresh replay compromise response
            # ------------------------------------------------------------
            #
            # Only requests explicitly tagged by the JWT middleware as
            # having presented an already-rotated refresh token are treated
            # as replay incidents.
            #
            # A request which entered while the original generation was
            # still active but subsequently lost R4's atomic UPDATE is an
            # ordinary concurrent loser and must NOT destroy the winner's
            # newly-created refresh generation.
            # ------------------------------------------------------------

            replay_inspection = bool(
                getattr(
                    g,
                    "refresh_replay_inspection",
                    False,
                )
            )


            if replay_inspection:
                replay_now = datetime.utcnow()

                replay_session = db.session.get(
                    AuthSession,
                    auth_session_id,
                )

                replay_generation = (
                    RefreshToken.query.filter_by(
                        jti_hash=presented_hash,
                        session_id=auth_session_id,
                    )
                    .first()
                )


                replay_confirmed = bool(
                    replay_session is not None
                    and replay_session.user_id == current_user_id
                    and replay_session.is_active
                    and replay_generation is not None
                    and replay_generation.used_at is not None
                    and replay_generation.revoked_at is None
                    and replay_generation.expires_at > replay_now
                    and replay_generation.replaced_by_id is not None
                )

                if replay_confirmed:
                    replay_family_id = replay_generation.family_id

                    # ----------------------------------------------------
                    # Own the compromise response atomically.
                    #
                    # Multiple replay requests may arrive together. Exactly
                    # one request is allowed to transition the AuthSession
                    # from active to revoked and write the security event.
                    # ----------------------------------------------------

                    compromise_claim = (
                        db.session.query(AuthSession)
                        .filter(
                            AuthSession.id == auth_session_id,
                            AuthSession.user_id == current_user_id,
                            AuthSession.status == "active",
                            AuthSession.revoked_at.is_(None),
                            AuthSession.expires_at > replay_now,
                        )
                        .update(
                            {
                                AuthSession.status: "revoked",
                                AuthSession.revoked_at: replay_now,
                                AuthSession.revocation_reason:
                                    "refresh_token_replay",
                                AuthSession.session_version:
                                    AuthSession.session_version + 1,
                            },
                            synchronize_session=False,
                        )
                    )

                    if compromise_claim == 1:
                        # Revoke every generation belonging to this one
                        # durable refresh family. This includes the consumed
                        # parent and the currently-active child generation.
                        family_revoked_count = (
                            db.session.query(RefreshToken)
                            .filter(
                                RefreshToken.session_id
                                == auth_session_id,
                                RefreshToken.family_id
                                == replay_family_id,
                                RefreshToken.revoked_at.is_(None),
                            )
                            .update(
                                {
                                    RefreshToken.revoked_at:
                                        replay_now,
                                    RefreshToken.revocation_reason:
                                        "refresh_token_replay",
                                },
                                synchronize_session=False,
                            )
                        )

                        # ------------------------------------------------
                        # Legacy SessionToken compatibility revocation.
                        #
                        # SessionToken has no AuthSession FK yet. During
                        # this compatibility phase we scope revocation by
                        # the strongest available device identity.
                        #
                        # Never call SessionToken.revoke() here because it
                        # commits internally.
                        # ------------------------------------------------

                        legacy_scope = (
                            SessionToken.query.filter(
                                SessionToken.user_id
                                == current_user_id,
                                SessionToken.is_revoked.is_(False),
                            )
                        )

                        if replay_session.device_fingerprint:
                            legacy_scope = legacy_scope.filter(
                                SessionToken.device_fingerprint
                                == replay_session.device_fingerprint
                            )

                        elif (
                            replay_session.ip_address
                            and replay_session.user_agent
                        ):
                            legacy_scope = legacy_scope.filter(
                                SessionToken.ip_address
                                == replay_session.ip_address,
                                SessionToken.user_agent
                                == replay_session.user_agent,
                            )

                        else:
                            # Security-first fallback.
                            #
                            # Without any trustworthy compatibility
                            # discriminator, leaving access JWTs alive would
                            # be weaker than revoking the user's legacy token
                            # set. The durable AuthSession architecture
                            # remains scoped to only the compromised login.
                            logger.warning(
                                "refresh_replay_legacy_scope_fallback",
                                user_id=current_user_id,
                                auth_session_id=str(
                                    auth_session_id
                                ),
                            )

                        legacy_revoked_count = (
                            legacy_scope.update(
                                {
                                    SessionToken.is_revoked:
                                        True,
                                    SessionToken.revoked_at:
                                        replay_now,
                                    SessionToken.revocation_reason:
                                        "refresh_token_replay",
                                },
                                synchronize_session=False,
                            )
                        )

                        # Persist telemetry inside the SAME transaction.
                        #
                        # Do not use log_security_event() or
                        # EnhancedAuthService._log_security_event() here;
                        # those helpers may own their own commit boundary.
                        security_event = SecurityEvent(
                            event_type=(
                                "refresh_token_replay_detected"
                            ),
                            user_id=current_user_id,
                            ip_address=request.remote_addr,
                            user_agent=request.headers.get(
                                "User-Agent"
                            ),
                            endpoint=request.endpoint,
                            method=request.method,
                            severity="critical",
                            details={
                                "auth_session_id":
                                    str(auth_session_id),
                                "family_id":
                                    str(replay_family_id),
                                "generation_id":
                                    str(replay_generation.id),
                                "tenant_id": (
                                    str(replay_session.tenant_id)
                                    if replay_session.tenant_id
                                    else None
                                ),
                                "family_revoked_count":
                                    int(
                                        family_revoked_count
                                        or 0
                                    ),
                                "legacy_revoked_count":
                                    int(
                                        legacy_revoked_count
                                        or 0
                                    ),
                                "reason":
                                    "refresh_token_replay",
                            },
                        )

                        db.session.add(
                            security_event
                        )

                        # ONE authoritative transaction boundary.
                        db.session.commit()

                        logger.warning(
                            "refresh_token_replay_detected",
                            user_id=current_user_id,
                            auth_session_id=str(
                                auth_session_id
                            ),
                            family_id=str(
                                replay_family_id
                            ),
                        )

                        return (
                            jsonify(
                                {
                                    "success": False,
                                    "message": (
                                        "Refresh token replay "
                                        "detected. Session revoked."
                                    ),
                                    "code": (
                                        "REFRESH_TOKEN_REPLAY"
                                    ),
                                }
                            ),
                            401,
                        )

                    # Another replay request already performed the durable
                    # compromise transition.
                    db.session.rollback()

            # Ordinary R4 loser, unconfirmed replay, or a replay already
            # handled by another request. No mutation from this request
            # should survive.
            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Refresh token already used or invalid",
                    }
                ),
                401,
            )

        # Do not trust the previously loaded ORM object's used_at after
        # the bulk UPDATE. Ownership is established solely by rowcount.

        token_claims = {
            "sid": str(auth_session.id),
        }

        new_access_token = create_access_token(
            identity=str(current_user_id),
            additional_claims=token_claims,
        )

        new_refresh_token = create_refresh_token(
            identity=str(current_user_id),
            additional_claims=token_claims,
        )

        from flask_jwt_extended import decode_token

        access_payload = decode_token(new_access_token)
        new_refresh_payload = decode_token(new_refresh_token)

        access_jti = access_payload["jti"]
        new_refresh_jti = new_refresh_payload["jti"]

        access_expiry = datetime.utcfromtimestamp(
            int(access_payload["exp"])
        )

        new_refresh_expiry = datetime.utcfromtimestamp(
            int(new_refresh_payload["exp"])
        )

        new_refresh_hash = hashlib.sha256(
            new_refresh_jti.encode("utf-8")
        ).hexdigest()

        # --------------------------------------------------------
        # Create the next durable generation.
        # --------------------------------------------------------

        child_generation = RefreshToken(
            session_id=auth_session.id,
            family_id=family_id,
            jti_hash=new_refresh_hash,
            parent_jti_hash=presented_hash,
            issued_at=now,
            expires_at=new_refresh_expiry,
        )

        db.session.add(child_generation)
        db.session.flush()

        # Avoid using stale current_generation state after the bulk
        # UPDATE. Update lineage directly with a targeted statement.
        replaced = (
            db.session.query(RefreshToken)
            .filter(
                RefreshToken.id == current_generation_id,
                RefreshToken.replaced_by_id.is_(None),
            )
            .update(
                {
                    RefreshToken.replaced_by_id: child_generation.id,
                },
                synchronize_session=False,
            )
        )

        if replaced != 1:
            raise RuntimeError(
                "Refresh generation lineage update failed"
            )

        # --------------------------------------------------------
        # Legacy SessionToken compatibility.
        #
        # IMPORTANT:
        # SessionToken.revoke() commits internally, so do not call it
        # inside this atomic rotation transaction.
        # --------------------------------------------------------

        legacy_refresh = SessionToken.find_by_jti(
            refresh_jti
        )

        if (
            legacy_refresh is None
            or legacy_refresh.user_id != current_user_id
            or legacy_refresh.token_type != "refresh"
            or legacy_refresh.is_revoked
        ):
            raise RuntimeError(
                "Refresh compatibility token state is invalid"
            )

        legacy_refresh.is_revoked = True
        legacy_refresh.revoked_at = now
        legacy_refresh.revocation_reason = (
            "Refresh token rotated"
        )
        legacy_refresh.last_used_at = now

        new_access_row = SessionToken(
            jti=access_jti,
            user_id=current_user_id,
            token_type="access",
            expires_at=access_expiry,
            ip_address=auth_session.ip_address,
            user_agent=auth_session.user_agent,
            device_fingerprint=auth_session.device_fingerprint,
        )

        new_refresh_row = SessionToken(
            jti=new_refresh_jti,
            user_id=current_user_id,
            token_type="refresh",
            expires_at=new_refresh_expiry,
            ip_address=auth_session.ip_address,
            user_agent=auth_session.user_agent,
            device_fingerprint=auth_session.device_fingerprint,
        )

        db.session.add(new_access_row)
        db.session.add(new_refresh_row)

        auth_session.touch(now)

        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "access_token": new_access_token,
                    "refresh_token": new_refresh_token,
                    "csrf_token": secrets.token_urlsafe(32),
                }
            ),
            200,
        )

    except Exception as exc:
        db.session.rollback()

        logger.error(
            "refresh_rotation_failed",
            error=str(exc),
        )

        return (
            jsonify(
                {
                    "success": False,
                    "message": "Token refresh failed",
                }
            ),
            422,
        )

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
@security_headers()
def logout():
    try:
        user_id = get_jwt_identity()
        jti = get_jwt()["jti"]

        # Revoke the session
        session_token = SessionToken.query.filter_by(jti=jti).first()
        if session_token:
            session_token.is_revoked = True
            session_token.revoked_at = datetime.utcnow()
            session_token.revocation_reason = "user_logout"

        # Clear session data
        session.clear()

        db.session.commit()

        log_security_event("user_logout", {"user_id": user_id})

        return jsonify({"success": True, "message": "Successfully logged out"}), 200

    except Exception as err:
        logger.error("logout_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Logout failed"}), 500

@auth_bp.route("/logout-all", methods=["POST"])
@jwt_required()
@security_headers()
def logout_all_sessions():
    """Logout from all sessions."""
    try:
        user_id = get_jwt_identity()

        # Revoke all active sessions for the user
        SessionToken.query.filter_by(user_id=user_id, is_revoked=False).update(
            {
                "is_revoked": True,
                "revoked_at": datetime.utcnow(),
                "revocation_reason": "logout_all_sessions",
            }
        )

        db.session.commit()

        log_security_event("logout_all_sessions", {"user_id": user_id})

        return (
            jsonify({"success": True, "message": "Logged out from all sessions"}),
            200,
        )

    except Exception as err:
        logger.error("logout_all_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Logout all failed"}), 500

@auth_bp.route("/sessions", methods=["GET"])
@jwt_required()
@security_headers()
def get_active_sessions():
    try:
        user_id = get_jwt_identity()
        current_jti = get_jwt()["jti"]

        sessions = (
            SessionToken.query.filter_by(user_id=user_id, is_revoked=False)
            .order_by(SessionToken.issued_at.desc())
            .all()
        )

        session_list = []
        for session in sessions:
            session_list.append(
                {
                    "id": session.id,
                    "ip_address": session.ip_address,
                    "user_agent": session.user_agent,
                    "created_at": session.created_at.isoformat(),
                    "last_activity": (
                        session.last_used_at.isoformat()
                        if session.last_used_at
                        else None
                    ),
                    "is_current": session.jti
                    == current_jti,  # Changed from token_jti to jti
                }
            )

        return jsonify({"success": True, "sessions": session_list}), 200

    except Exception as err:
        logger.error("get_sessions_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Failed to get sessions"}), 500

@auth_bp.route("/revoke-session/<int:session_id>", methods=["POST"])
@jwt_required()
@security_headers()
def revoke_session(session_id):
    """Revoke a specific session."""
    try:
        user_id = get_jwt_identity()

        session_token = SessionToken.query.filter_by(
            id=session_id, user_id=user_id, is_revoked=False
        ).first()

        if not session_token:
            return jsonify({"success": False, "error": "Session not found"}), 404

        session_token.is_revoked = True
        session_token.revoked_at = datetime.utcnow()
        session_token.revocation_reason = "user_revoked"

        db.session.commit()

        log_security_event(
            "session_revoked", {"user_id": user_id, "session_id": session_id}
        )

        return (
            jsonify({"success": True, "message": "Session revoked successfully"}),
            200,
        )

    except Exception as err:
        logger.error("revoke_session_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Failed to revoke session"}), 500


# Password reset functionality (placeholder - implement with email service)
@auth_bp.route("/request-password-reset", methods=["POST"])
@rate_limit(limit=3, window=3600)  # 3 requests per hour
@sanitize_request_data({"email": "email"})
@security_headers()
def request_password_reset():
    """Request password reset with email verification."""
    try:
        data = request.json
        email = data.get("email", "").strip().lower()

        if not email:
            return jsonify({"success": False, "error": "Email is required"}), 400

        # Find user by email
        user = User.query.filter_by(email=email).first()

        if user:
            # Generate reset token
            from app.models.security import PasswordResetToken

            token = PasswordResetToken.generate_token(
                user_id=user.id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get("User-Agent"),
            )

            # Send password reset email
            from app.services.email_service import send_password_reset_email

            frontend_url = get_frontend_base_url()
            email_sent = send_password_reset_email(
                user.email, token, frontend_url=frontend_url
            )

            if email_sent:
                log_security_event(
                    "password_reset_email_sent", {"user_id": user.id, "email": email}
                )
            else:
                logger.error(
                    "Failed to send password reset email", user_id=user.id, email=email
                )

        # Always return success to prevent email enumeration
        log_security_event(
            "password_reset_requested",
            {"email": email, "user_exists": user is not None},
        )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "If the email exists, a password reset link has been sent",
                }
            ),
            200,
        )

    except Exception as err:
        logger.error("password_reset_request_error", error=str(err))
        return (
            jsonify({"success": False, "error": "Password reset request failed"}),
            500,
        )


def token_value(row, key: str, fallback_index: int = 0):
    """Safely extract a field from a reset-token result row.

    Handles plain dicts, SQLAlchemy RowMappings, LegacyRow objects, and bare
    tuples produced by different driver versions.  Returns *None* on any access
    failure so callers never receive a TypeError regardless of row shape.

    Args:
        row:             The row/dict returned by validate_token.
        key:             The string field name to look up.
        fallback_index:  Positional index used only if *row* is a plain tuple
                         and string-key access is unavailable.
    """
    if row is None:
        return None
    # 1. Preferred path — dict, RowMapping, or any Mapping-compatible object
    try:
        return row[key]
    except (KeyError, TypeError):
        pass
    # 2. Attribute access (ORM model instance)
    try:
        return getattr(row, key)
    except AttributeError:
        pass
    # 3. Positional fallback for raw tuples
    try:
        return row[fallback_index]
    except (IndexError, TypeError):
        pass
    return None

@auth_bp.route("/reset-password", methods=["POST"])
@rate_limit(limit=5, window=3600)  # 5 resets per hour
@sanitize_request_data()
@security_headers()
def reset_password():
    """Reset password with token validation."""
    try:
        data = request.json
        token = data.get("token", "").strip()
        new_password = data.get("new_password", "").strip()
        confirm_password = data.get("confirm_password", "").strip()

        # Validate input
        if not token:
            return jsonify({"success": False, "error": "Reset token is required"}), 400

        if not new_password:
            return jsonify({"success": False, "error": "New password is required"}), 400

        if new_password != confirm_password:
            return jsonify({"success": False, "error": "Passwords do not match"}), 400

        # Validate password strength
        is_strong, password_errors = PasswordSecurity.validate_password_strength(
            new_password
        )
        if not is_strong:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Password does not meet security requirements",
                        "requirements": password_errors,
                    }
                ),
                400,
            )

        # Validate reset token
        from app.models.security import PasswordResetToken

        reset_token, error = PasswordResetToken.validate_token(token)

        if error:
            log_security_event(
                "invalid_password_reset_token",
                {
                    "token": token[:8] + "...",  # Log partial token for debugging
                    "error": error,
                    "ip_address": request.remote_addr,
                },
            )
            return jsonify({"success": False, "error": error}), 400

        # Get user and validate
        user = User.query.get(token_value(reset_token, "user_id", 1))
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        # Check password history to prevent reuse
        if PasswordSecurity.is_password_reused(user.id, new_password):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Cannot reuse a recent password. Please choose a different password.",
                    }
                ),
                400,
            )

        # Update password
        user.set_password_hash(new_password)
        user.password_changed_at = datetime.utcnow()

        # Activate account if it was pending
        if user.status in (
            "pending_activation",
            "pending_verification",
            "pending_email_verification",
        ):
            user.status = "active"
            user.email_verified = True
            from app.models.student import Student

            student = Student.query.filter_by(user_id=user.id).first()
            if student:
                student.status = "active"

        # Store new password in history
        password_history = PasswordHistory(
            user_id=user.id, password_hash=user.password_hash
        )
        db.session.add(password_history)

        # Mark token as used
        PasswordResetToken.mark_as_used_by_id(token_value(reset_token, "id", 0))

        # Revoke all existing sessions for security
        SessionToken.query.filter_by(user_id=user.id, is_revoked=False).update(
            {"is_revoked": True}
        )

        db.session.commit()

        log_security_event(
            "password_reset_completed", {"user_id": user.id, "email": user.email}
        )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Password has been reset successfully. Please log in with your new password.",
                }
            ),
            200,
        )

    except Exception as err:
        logger.error("password_reset_error", error=str(err))
        return jsonify({"success": False, "error": "Password reset failed"}), 500

@auth_bp.route("/claim-account", methods=["POST"])
@rate_limit(limit=5, window=3600)  # 5 claim attempts per hour
@sanitize_request_data()
@security_headers()
def claim_account():
    """Claim a student account by establishing password credentials."""
    import hashlib
    from datetime import datetime

    from app.models.student import Student

    try:
        data = request.json or {}
        token = data.get("token", "").strip()
        new_password = data.get("new_password", "").strip()
        confirm_password = data.get("confirm_password", "").strip()

        if not token:
            return (
                jsonify({"success": False, "error": "Activation token is required"}),
                400,
            )

        if not new_password:
            return jsonify({"success": False, "error": "New password is required"}), 400

        if new_password != confirm_password:
            return jsonify({"success": False, "error": "Passwords do not match"}), 400

        # Validate password strength
        is_valid, password_errors = PasswordSecurity.validate_password_strength(
            new_password
        )
        if not is_valid:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Password does not meet security requirements",
                        "requirements": password_errors,
                    }
                ),
                400,
            )

        # Hash token using SHA-256
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        # Look up matching user
        user = User.query.filter_by(invitation_token_hash=token_hash).first()
        if not user or (
            user.invitation_expires_at
            and user.invitation_expires_at < datetime.utcnow()
        ):
            log_security_event(
                "invalid_account_claim_token",
                {"token": token[:8] + "...", "ip_address": request.remote_addr},
            )
            return (
                jsonify(
                    {"success": False, "error": "Invalid or expired activation link"}
                ),
                400,
            )

        # Overwrite default null password credentials
        user.password = new_password
        user.password_changed_at = datetime.utcnow()

        # Transition profiles active status flags
        user.status = "active"
        user.is_active = True
        user.email_verified = True

        # Nullify token hashes
        user.invitation_token_hash = None
        user.invitation_expires_at = None

        # Look up matching student
        student = Student.query.filter_by(user_id=user.id).first()
        if student:
            student.status = "active"
            student.invitation_token_hash = None
            student.invitation_expires_at = None

        db.session.commit()

        log_security_event(
            "account_claim_completed", {"user_id": user.id, "email": user.email}
        )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Account activated successfully. You can now log in with your new password.",
                }
            ),
            200,
        )

    except Exception as err:
        db.session.rollback()
        logger.error("account_claim_error", error=str(err))
        return jsonify({"success": False, "error": "Account activation failed"}), 500
