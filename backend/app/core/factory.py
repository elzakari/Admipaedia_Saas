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
