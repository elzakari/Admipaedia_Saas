"""
Flask Extensions Initialization
"""

import os

from urllib.parse import urlparse

from flask import g, request
from flask_cors import CORS
from flask_talisman import Talisman
import structlog

from app.extensions import (babel, bcrypt, cors, db, jwt, mail, migrate,
                            socketio)

logger = structlog.get_logger()


def init_extensions(app):
    """Initialize Flask extensions with the app"""

    # Database
    db.init_app(app)
    migrate.init_app(app, db)

    # Authentication
    jwt.init_app(app)
    bcrypt.init_app(app)

    # Internationalization
    def get_locale():
        # 1. Check user preference if logged in
        if hasattr(g, "user") and g.user and g.user.preferred_language:
            return g.user.preferred_language

        # 2. Check tenant default language (if multi-tenancy active)
        if hasattr(g, "tenant") and g.tenant and g.tenant.default_language:
            return g.tenant.default_language

        # 3. Check request header
        supported_locales = [
            "en",
            "fr",
            "pt",
            "es",
            "ar",
            "sw",
            "wo",
            "yo",
            "ha",
            "ig",
            "bm",
            "ff",
            "ak",
        ]
        return request.accept_languages.best_match(supported_locales) or "en"

    babel.init_app(app, locale_selector=get_locale)

    frontend_origins = [
        origin.strip().rstrip("/")
        for origin in (
            app.config.get("CORS_ORIGINS") or [app.config.get("FRONTEND_URL")]
        )
        if origin and str(origin).strip()
    ]
    if not frontend_origins:
        frontend_url = (
            (app.config.get("FRONTEND_URL") or "https://admipaedia.easymsdigit.com")
            .strip()
            .rstrip("/")
        )
        frontend_origins = [frontend_url]

    connect_src = {"'self'"}
    for origin in frontend_origins:
        connect_src.add(origin)
        parsed = urlparse(origin)
        if parsed.scheme == "https" and parsed.netloc:
            connect_src.add(f"wss://{parsed.netloc}")
        elif parsed.scheme == "http" and parsed.netloc:
            connect_src.add(f"ws://{parsed.netloc}")

    # CORS Configuration
    cors.init_app(
        app,
        resources={
            r"/*": {
                "origins": frontend_origins,
                "supports_credentials": True,
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "Cache-Control",
                    "X-CSRF-Token",
                    "X-Tenant-ID",
                    "X-Branch-ID",
                    "X-Branch-Id",
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "expose_headers": [
                    "Authorization",
                    "X-RateLimit-Limit",
                    "X-RateLimit-Remaining",
                    "X-RateLimit-Reset",
                ],
                "send_wildcard": False,
                "always_send": True,
                "automatic_options": True,
            }
        },
    )

    # Security Headers with Talisman
    if not app.config.get("TESTING") and not app.config.get("DEBUG"):
        csp = {
            "default-src": "'self'",
            "script-src": "'self' 'unsafe-inline'",
            "style-src": "'self' 'unsafe-inline'",
            "img-src": "'self' data: https:",
            "font-src": "'self'",
            "connect-src": " ".join(sorted(connect_src)),
            "frame-ancestors": "'none'",
        }

        Talisman(
            app,
            force_https=app.config.get(
                "FORCE_HTTPS",
                False,
            ),
            strict_transport_security=True,
            content_security_policy=csp,
            referrer_policy="strict-origin-when-cross-origin",
        )

    # Email
    mail.init_app(app)

    # WebSocket
    from app.extensions import SOCKETIO_ASYNC_MODE as _selected_async_mode

    # Optional horizontal-scaling primitive: when SOCKETIO_USE_REDIS=1 and a
    # Redis URL is reachable, install a Redis pubsub client_manager so Engine.IO
    # sid/broadcast state is shared across multiple backend-socket workers.
    # Default OFF (SOCKETIO_USE_REDIS unset/0) — today's topology relies on a
    # single backend-socket gthread worker with in-process state and the
    # frontend nginx route guarantees stickiness.  Do NOT enable the Redis
    # manager unless you also raise GUNICORN_WORKERS above 1 and add explicit
    # session/cookie sticky-session rules at the edge (IP hash or cookie).
    use_redis_mgr = False
    redis_url_candidate = (
        app.config.get("REDIS_URL") or os.environ.get("REDIS_URL") or ""
    ).strip()
    try:
        _enable = (os.environ.get("SOCKETIO_USE_REDIS", "0") or "0").strip().lower()
        if _enable in {"1", "true", "yes", "on"} and redis_url_candidate:
            import kombu  # noqa: F401  (lazily detect optional dependency)
            from kombu.utils.url import maybe_sanitize_url  # type: ignore

            void = maybe_sanitize_url
            from redis import Redis as _RedisClient  # type: ignore

            try:
                import atexit as _atexit

                _probe = _RedisClient.from_url(redis_url_candidate, socket_connect_timeout=2)
                _probe.ping()
                try:
                    _atexit.register(_probe.close)
                except Exception:
                    pass
                use_redis_mgr = True
            except Exception as _probe_exc:
                logger.warning(
                    "socketio_redis_manager_probe_failed",
                    error_type=type(_probe_exc).__name__,
                )
    except Exception:
        use_redis_mgr = False

    socketio_kwargs = {
        "cors_allowed_origins": frontend_origins,
        "ping_timeout": 120,
        "ping_interval": 25,
    }
    if use_redis_mgr:
        try:
            import socketio as _raw_socketio_pkg  # python-socketio, dep of flask-socketio

            _manager = _raw_socketio_pkg.KombuManager(redis_url_candidate)
            socketio_kwargs["client_manager"] = _manager
        except Exception:
            # Kombu/Redis import or manager instantiation failed, fall back
            # to the default in-process manager — socket service still works
            # but state will not be shared across workers.
            use_redis_mgr = False

    socketio.init_app(app, **socketio_kwargs)

    try:
        import structlog as _sl
        _socketio_logger = _sl.get_logger()
        _socketio_logger.info(
            "socketio_initialized",
            async_mode=_selected_async_mode,
            ping_timeout=120,
            ping_interval=25,
            use_redis_manager=use_redis_mgr,
        )
    except Exception:
        pass

    # JWT Configuration
    _configure_jwt(app)


def _configure_jwt(app):
    """Configure JWT extension with custom handlers"""

    from flask import jsonify

    from app.middleware.security_middleware import log_security_event
    from app.models.session_token import SessionToken

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if JWT token is revoked"""
        # Bypass check in testing environment
        import sys

        from flask import current_app

        print(
            f"DEBUG: app.config['TESTING'] = {app.config.get('TESTING')}",
            file=sys.stderr,
        )
        if current_app:
            print(
                f"DEBUG: current_app.config['TESTING'] = {current_app.config.get('TESTING')}",
                file=sys.stderr,
            )
        is_testing = False
        try:
            is_testing = app.config.get("TESTING") or (
                current_app and current_app.config.get("TESTING")
            )
        except Exception:
            pass
        if is_testing:
            return False

        jti = jwt_payload["jti"]
        session_token = SessionToken.query.filter_by(jti=jti, is_revoked=False).first()
        return session_token is None or session_token.is_revoked

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Handle expired tokens"""
        log_security_event("expired_token_access", {"jti": jwt_payload.get("jti")})
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Token has expired",
                    "message": "Your session has expired. Please log in again.",
                }
            ),
            401,
        )

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid tokens"""
        log_security_event("invalid_token_access", {"error": str(error)})
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Invalid token",
                    "message": "Your session token is invalid. Please log in again.",
                }
            ),
            401,
        )

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Handle missing tokens"""
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Authorization token is required",
                    "message": "Authorization token is required. Please log in.",
                }
            ),
            401,
        )

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Handle revoked tokens"""
        log_security_event("revoked_token_access", {"jti": jwt_payload.get("jti")})
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Token has been revoked",
                    "message": "Your session has been revoked. Please log in again.",
                }
            ),
            401,
        )
