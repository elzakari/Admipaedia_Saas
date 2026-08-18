"""
Application Factory Pattern Implementation
"""

import logging
import os

from flask import Flask

from app.config import get_config

from .blueprints import register_blueprints
from .error_handlers import register_error_handlers
from .extensions import init_extensions
from .middleware import register_middleware

logger = logging.getLogger(__name__)


def _verify_academic_structure_enum(app, db):
    """Boot-time guard: compare Python AcademicStructureType labels vs PG.

    Runs after init_extensions and model import, inside app.app_context().
    Queries pg_enum for the `academic_structure_type` labels and:
    - INFO logs if every Python enum label matches the PG type exactly
    - WARNING logs (with remediation) if any labels are missing/mis-named
    - If the env var STRICT_STARTUP=1 is set in either case, RAISES RuntimeError
      so the deploy fails fast — an operator has to run the 20260815 migration.
    - Gracefully skips if the DB is unreachable (startup race / worker bootstrap
      that doesn't need a DB first call — lets the first API request surface the
      actual connectivity error instead of failing startup).
    """
    import sqlalchemy as sa
    from app.models.department import AcademicStructureType, ENUM_NAME

    expected = sorted(e.value for e in AcademicStructureType)
    try:
        with db.engine.connect() as conn:
            # Enum existence check — pg_type.typname
            exists = conn.execute(
                sa.text("SELECT 1 FROM pg_type WHERE typname = :n"),
                {"n": ENUM_NAME},
            ).fetchone()
            if not exists:
                msg = (
                    f"Startup guard: Postgres enum '{ENUM_NAME}' does not exist "
                    f"yet. Run `flask db upgrade` to apply the 20260815 "
                    f"ensure_academic_structure_type_enum_labels migration. "
                    f"Expected labels: {expected}."
                )
                logger.warning(msg)
                if os.environ.get("STRICT_STARTUP", "").strip().lower() in {"1", "true", "yes", "on"}:
                    raise RuntimeError(msg)
                return
            # Labels
            rows = conn.execute(
                sa.text(
                    "SELECT e.enumlabel "
                    "FROM pg_type t "
                    "JOIN pg_enum e ON t.oid = e.enumtypid "
                    "WHERE t.typname = :n "
                    "ORDER BY e.enumsortorder"
                ),
                {"n": ENUM_NAME},
            ).fetchall()
        actual = sorted(r[0] for r in rows)
    except Exception as exc:  # noqa: BLE001
        # DB is unavailable right now. Don't break startup.
        logger.warning(
            "Startup guard: skipped verify_academic_structure_enum because DB is unreachable or non-PG dialect (%s).",
            type(exc).__name__,
            exc_info=app.debug,
        )
        return

    missing = [e for e in expected if e not in actual]
    unexpected = [a for a in actual if a not in expected]
    if not missing and not unexpected:
        logger.info(
            "Startup guard: Postgres enum '%s' is in sync with Python AcademicStructureType (%s labels OK)",
            ENUM_NAME,
            ", ".join(actual),
        )
        return

    msg_parts = []
    if missing:
        msg_parts.append(
            f"Missing in Postgres enum '{ENUM_NAME}': {missing!r}. "
            f"Run `flask db upgrade` to apply migration 20260815 or run: "
            + " ".join(
                f"ALTER TYPE {ENUM_NAME} ADD VALUE IF NOT EXISTS '{lab}';"
                for lab in missing
            )
        )
    if unexpected:
        msg_parts.append(
            f"Unexpected legacy labels still present in Postgres enum '{ENUM_NAME}': {unexpected!r}. "
            f"These are harmless but consider renaming them to lowercase via "
            f"`ALTER TYPE {ENUM_NAME} RENAME VALUE '<old>' TO '<new>'`."
        )
    msg = (
        "Startup guard: Python AcademicStructureType and Postgres enum "
        f"'{ENUM_NAME}' are OUT OF SYNC. Expected={expected!r} actual={actual!r}. "
        + " ".join(msg_parts)
    )
    logger.warning(msg)
    if os.environ.get("STRICT_STARTUP", "").strip().lower() in {"1", "true", "yes", "on"}:
        raise RuntimeError(msg)


def create_app(config_name=None):
    """
    Application factory function

    Args:
        config_name (str): Configuration environment name

    Returns:
        Flask: Configured Flask application instance
    """

    # Create Flask application
    app = Flask(__name__)
    app.url_map.strict_slashes = False  # Accept /path and /path/ without 308 redirects

    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)

    # Initialize config (including production checks)
    config_class.init_app(app)

    # Initialize extensions
    init_extensions(app)

    # ------------------------------------------------------------------
    # Global Tenant + Branch Context Resolver (before_request)
    #
    # Runs tenant-resolution logic for every inbound request BEFORE any
    # route handler executes. This means:
    #   1. Even if a module forgets the @tenant_required decorator (and
    #      19+ modules currently do), g.tenant_id STILL gets populated
    #      → ORM auto-filter works → no cross-tenant data leak.
    #   2. Routes that DO use @tenant_required still benefit from the
    #      decorator's explicit error messages + branch resolution extras.
    #
    # WHITELIST: paths that legitimately need to run without tenant
    # context: auth endpoints, public webhooks, invitation accept-links,
    # super_admin cross-tenant platform routes, static assets.
    # ------------------------------------------------------------------
    def _register_global_tenant_context_hook(app: Flask):
        import re as _re
        from flask import request, g, jsonify
        from app.utils.tenant_context import resolve_tenant_for_request, resolve_branch_for_request

        # Whitelist regex patterns (tested against request.path). Any match
        # short-circuits the enforcement entirely.
        _PUBLIC_WHITELIST = tuple(
            _re.compile(p, _re.IGNORECASE)
            for p in (
                r"^/static(/.*)?$",
                r"^/healthz/?$",
                r"^/readyz/?$",
                r"^/api/v1/auth(/.*)?$",
                r"^/api/v1/webhooks(/.*)?$",
                r"^/api/v1/invitations/[^/]+/accept/?$",  # public accept-link
                r"^/api/v1/invitations/public(/.*)?$",
                r"^/api/v1/super_admin(/.*)?$",           # cross-tenant platform ops
                r"^/api/v1/service_tokens(/.*)?$",
                r"^/api/v1/platform_integrations(/.*)?$",
                r"^/_debug_toolbar(/.*)?$",
            )
        )

        # Exempt HTTP methods: OPTIONS preflight must be tenant-less.
        _SAFE_METHODS = {"OPTIONS", "HEAD"}

        @app.before_request
        def _global_resolve_tenant_context():
            if request.method in _SAFE_METHODS:
                return None

            path = request.path or ""
            for pat in _PUBLIC_WHITELIST:
                if pat.match(path):
                    return None  # whitelisted: no enforcement

            # Always attempt resolution — silent (no HTTP response here).
            # If the token is missing / invalid we still won't raise from the
            # before_request hook; let the route's @jwt_required handle auth
            # with the correct error body. This keeps existing auth flows unchanged.
            try:
                tenant_id, user, _err = resolve_tenant_for_request(
                    require_explicit=False, load_full_user=False
                )
            except Exception:
                tenant_id, user = None, None

            if not getattr(g, "tenant_id", None) and tenant_id:
                g.tenant_id = tenant_id
            if not getattr(g, "current_user", None) and user:
                g.current_user = user

            # Branch resolver (cheap if both already set)
            try:
                if getattr(g, "branch_id", None) is None and tenant_id:
                    g.branch_id = resolve_branch_for_request(tenant_id, user)
            except Exception:
                pass

            return None  # always proceed — never short-circuit request here

    _register_global_tenant_context_hook(app)

    # Register blueprints
    register_blueprints(app)

    # Register middleware
    register_middleware(app)

    # Register error handlers
    register_error_handlers(app)

    # Application context setup
    with app.app_context():
        # Import models to ensure they're registered
        from app import models
        from app.extensions import db

        # Boot-time regression guard for enum drift (never raises unconditionally;
        # only raises if STRICT_STARTUP=1 env is set for CI/deploy preflight).
        _verify_academic_structure_enum(app, db)

        is_production = (
            app.config.get("ENV") == "production"
            or os.environ.get("FLASK_ENV") == "production"
        )
        if not is_production:
            # We strictly use Alembic migrations, so we disable db.create_all()
            # if (app.config.get('AUTO_CREATE_DB') or app.config.get('INIT_DB_ON_START')) and not app.config.get('TESTING'):
            #     db.create_all()

            if app.config.get("INIT_DB_ON_START") and not app.config.get("TESTING"):
                try:
                    from app.db_init import init_db

                    init_db()
                except Exception:
                    pass

    return app
