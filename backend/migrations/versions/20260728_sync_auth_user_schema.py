"""Synchronize auth/user schema on active migration head.

Revision ID: 20260728_sync_auth_user_schema
Revises: 20260727_core_settings_tables
Create Date: 2026-07-28

The active Alembic head does not descend from the earlier 20260726 auth/user
schema branch, so databases can report "current" while still missing columns
and tables required by the current SQLAlchemy models and authentication flow.

This migration safely backfills the essential user/auth schema expected by:
  - app.models.user.User
  - app.models.security.*
  - app.models.session_token.SessionToken
  - app.models.user_preferences / user_profile
  - app.services.enhanced_auth_service.EnhancedAuthService
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "20260728_sync_auth_user_schema"
down_revision = "20260727_core_settings_tables"
branch_labels = None
depends_on = None


def _table_exists(conn, table_name: str) -> bool:
    return (
        conn.execute(
            sa.text(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = :table_name"
            ),
            {"table_name": table_name},
        ).fetchone()
        is not None
    )


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    return (
        conn.execute(
            sa.text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :table_name "
                "AND column_name = :column_name"
            ),
            {"table_name": table_name, "column_name": column_name},
        ).fetchone()
        is not None
    )


def _index_exists(conn, table_name: str, index_name: str) -> bool:
    return (
        conn.execute(
            sa.text(
                "SELECT 1 FROM pg_indexes "
                "WHERE schemaname = 'public' AND tablename = :table_name "
                "AND indexname = :index_name"
            ),
            {"table_name": table_name, "index_name": index_name},
        ).fetchone()
        is not None
    )


def _column_nullable(conn, table_name: str, column_name: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT is_nullable FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table_name "
            "AND column_name = :column_name"
        ),
        {"table_name": table_name, "column_name": column_name},
    ).fetchone()
    return result is None or result[0] == "YES"


def _safe_add_column(conn, table_name: str, column: sa.Column) -> None:
    if _table_exists(conn, table_name) and not _column_exists(conn, table_name, column.name):
        op.add_column(table_name, column)


def _safe_create_index(conn, index_name: str, table_name: str, columns, **kwargs) -> None:
    if not _table_exists(conn, table_name):
        return
    if not all(_column_exists(conn, table_name, column) for column in columns):
        return
    if _index_exists(conn, table_name, index_name):
        return
    op.create_index(index_name, table_name, columns, **kwargs)


def upgrade():
    conn = op.get_bind()

    if _table_exists(conn, "users"):
        user_columns = [
            sa.Column("invitation_token_hash", sa.String(255), nullable=True),
            sa.Column("invitation_expires_at", sa.DateTime(), nullable=True),
            sa.Column("email_verified", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("email_verified_at", sa.DateTime(), nullable=True),
            sa.Column("email_verification_token", sa.String(255), nullable=True),
            sa.Column("email_verification_expires", sa.DateTime(), nullable=True),
            sa.Column("mfa_enabled", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("mfa_secret", sa.String(32), nullable=True),
            sa.Column("mfa_backup_codes", sa.JSON(), nullable=True),
            sa.Column("mfa_temp_token", sa.String(255), nullable=True),
            sa.Column("mfa_temp_token_expires", sa.DateTime(), nullable=True),
            sa.Column("password_changed_at", sa.DateTime(), nullable=True),
            sa.Column("password_reset_token", sa.String(255), nullable=True),
            sa.Column("password_reset_expires", sa.DateTime(), nullable=True),
            sa.Column("force_password_change", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("failed_login_attempts", sa.Integer(), nullable=True, server_default=sa.text("0")),
            sa.Column("account_locked_until", sa.DateTime(), nullable=True),
            sa.Column("last_login_ip", sa.String(45), nullable=True),
            sa.Column("trusted_device_list", sa.JSON(), nullable=True),
            sa.Column("security_notifications", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("login_notifications", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        ]
        for column in user_columns:
            _safe_add_column(conn, "users", column)

        if not _column_nullable(conn, "users", "password_hash"):
            op.alter_column("users", "password_hash", existing_type=sa.String(length=128), nullable=True)

        _safe_create_index(conn, "idx_users_email_verification_token", "users", ["email_verification_token"])
        _safe_create_index(conn, "idx_users_mfa_temp_token", "users", ["mfa_temp_token"])
        _safe_create_index(conn, "idx_users_password_reset_token", "users", ["password_reset_token"])
        _safe_create_index(conn, "idx_users_account_locked_until", "users", ["account_locked_until"])
        _safe_create_index(conn, "idx_users_mfa_enabled", "users", ["mfa_enabled"])

    if _table_exists(conn, "tenants"):
        _safe_add_column(
            conn,
            "tenants",
            sa.Column("is_setup_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
        _safe_add_column(
            conn,
            "tenants",
            sa.Column("is_hq", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )

    if not _table_exists(conn, "user_preferences"):
        op.create_table(
            "user_preferences",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("theme_mode", sa.String(20), nullable=False, server_default="casaos"),
            sa.Column("language", sa.String(12), nullable=False, server_default="en"),
            sa.Column("date_time_format", sa.String(12), nullable=False, server_default="auto"),
            sa.Column("default_profile_tab", sa.String(20), nullable=False, server_default="profile"),
            sa.Column("notify_product_updates", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("notify_security_alerts", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
    _safe_create_index(conn, "ix_user_preferences_user_id", "user_preferences", ["user_id"], unique=True)

    if not _table_exists(conn, "user_profiles"):
        op.create_table(
            "user_profiles",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("display_name", sa.String(120), nullable=False),
            sa.Column("legal_name", sa.String(200), nullable=True),
            sa.Column("phone", sa.String(32), nullable=True),
            sa.Column("country", sa.String(80), nullable=True),
            sa.Column("timezone", sa.String(80), nullable=True),
            sa.Column("avatar_url", sa.String(512), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
    _safe_create_index(conn, "ix_user_profiles_user_id", "user_profiles", ["user_id"], unique=True)

    if not _table_exists(conn, "login_attempts"):
        op.create_table(
            "login_attempts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("identifier", sa.String(255), nullable=False),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("attempted_at", sa.DateTime(), nullable=False),
            sa.Column("country", sa.String(2), nullable=True),
            sa.Column("city", sa.String(100), nullable=True),
            sa.Column("is_suspicious", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        )
    _safe_create_index(conn, "ix_login_attempts_identifier", "login_attempts", ["identifier"])
    _safe_create_index(conn, "ix_login_attempts_attempted_at", "login_attempts", ["attempted_at"])

    if not _table_exists(conn, "security_events"):
        op.create_table(
            "security_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("event_type", sa.String(50), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("endpoint", sa.String(255), nullable=True),
            sa.Column("method", sa.String(10), nullable=True),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("severity", sa.String(20), nullable=False, server_default="info"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    _safe_create_index(conn, "ix_security_events_event_type", "security_events", ["event_type"])

    if not _table_exists(conn, "password_history"):
        op.create_table(
            "password_history",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )

    if not _table_exists(conn, "api_keys"):
        op.create_table(
            "api_keys",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("key_hash", sa.String(255), nullable=False, unique=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("permissions", sa.JSON(), nullable=True),
            sa.Column("ip_whitelist", sa.JSON(), nullable=True),
            sa.Column("last_used", sa.DateTime(), nullable=True),
            sa.Column("usage_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
            sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    if not _table_exists(conn, "school_registration_tokens"):
        op.create_table(
            "school_registration_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("is_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column("school_name", sa.String(255), nullable=False),
            sa.Column("school_slug", sa.String(63), nullable=False),
            sa.Column("country_code", sa.String(2), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
            sa.Column("admin_email", sa.String(255), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    _safe_create_index(conn, "ix_school_registration_tokens_created_by_user_id", "school_registration_tokens", ["created_by_user_id"])
    _safe_create_index(conn, "ix_school_registration_tokens_token_hash", "school_registration_tokens", ["token_hash"], unique=True)
    _safe_create_index(conn, "ix_school_registration_tokens_expires_at", "school_registration_tokens", ["expires_at"])

    if not _table_exists(conn, "tenant_credential_counters"):
        op.create_table(
            "tenant_credential_counters",
            sa.Column("tenant_id", sa.String(36), primary_key=True),
            sa.Column("year", sa.Integer(), primary_key=True),
            sa.Column("last_value", sa.Integer(), nullable=False, server_default=sa.text("0")),
        )

    if not _table_exists(conn, "session_tokens"):
        op.create_table(
            "session_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("jti", sa.String(36), unique=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("token_type", sa.String(20), nullable=False),
            sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("device_fingerprint", sa.String(64), nullable=True),
            sa.Column("issued_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("last_used_at", sa.DateTime(), nullable=True),
            sa.Column("revocation_reason", sa.String(100), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
    _safe_create_index(conn, "ix_session_tokens_jti", "session_tokens", ["jti"], unique=True)
    _safe_create_index(conn, "ix_session_tokens_user_id", "session_tokens", ["user_id"])
    _safe_create_index(conn, "ix_session_tokens_is_revoked", "session_tokens", ["is_revoked"])
    _safe_create_index(conn, "ix_session_tokens_expires_at", "session_tokens", ["expires_at"])

    if _table_exists(conn, "students") and not _column_exists(conn, "students", "branch_id"):
        if _table_exists(conn, "branches"):
            op.add_column(
                "students",
                sa.Column("branch_id", UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True),
            )
        else:
            op.add_column("students", sa.Column("branch_id", UUID(as_uuid=True), nullable=True))


def downgrade():
    # This is an intentionally one-way catch-up migration for schema drift on
    # the active head. Downgrade is a no-op to avoid removing valid schema from
    # environments that already received equivalent changes through another
    # branch.
    pass
