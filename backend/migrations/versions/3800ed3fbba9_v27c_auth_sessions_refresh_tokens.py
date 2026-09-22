"""V27C AuthSession and rotating RefreshToken foundation.

Revision ID: 3800ed3fbba9
Revises: 20260911_fin_tenant_001
Create Date: 2026-09-13T18:57:37

This revision is schema-only.

It does NOT:
    * replace SessionToken
    * change login behavior
    * change refresh behavior
    * modify JWT claims
    * modify logout/revocation
"""

from alembic import op
import sqlalchemy as sa


revision = "3800ed3fbba9"
down_revision = "20260911_fin_tenant_001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "auth_sessions",

        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "tenant_id",
            sa.Uuid(),
            nullable=True,
        ),

        sa.Column(
            "device_id",
            sa.String(length=128),
            nullable=True,
        ),

        sa.Column(
            "device_fingerprint",
            sa.String(length=128),
            nullable=True,
        ),

        sa.Column(
            "ip_address",
            sa.String(length=45),
            nullable=True,
        ),

        sa.Column(
            "user_agent",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "session_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "last_seen_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "expires_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "revoked_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "revocation_reason",
            sa.String(length=255),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_auth_sessions_user_id_users",
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            name="fk_auth_sessions_tenant_id_tenants",
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id",
            name="pk_auth_sessions",
        ),
    )

    op.create_index(
        "ix_auth_sessions_user_status",
        "auth_sessions",
        ["user_id", "status"],
        unique=False,
    )

    op.create_index(
        "ix_auth_sessions_user_expires",
        "auth_sessions",
        ["user_id", "expires_at"],
        unique=False,
    )

    op.create_index(
        "ix_auth_sessions_tenant_status",
        "auth_sessions",
        ["tenant_id", "status"],
        unique=False,
    )

    op.create_index(
        "ix_auth_sessions_expires_at",
        "auth_sessions",
        ["expires_at"],
        unique=False,
    )


    op.create_table(
        "refresh_tokens",

        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "session_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "family_id",
            sa.Uuid(),
            nullable=False,
        ),

        sa.Column(
            "jti_hash",
            sa.String(length=64),
            nullable=False,
        ),

        sa.Column(
            "parent_jti_hash",
            sa.String(length=64),
            nullable=True,
        ),

        sa.Column(
            "issued_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "expires_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "used_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "revoked_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "revocation_reason",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "replaced_by_id",
            sa.Uuid(),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["session_id"],
            ["auth_sessions.id"],
            name="fk_refresh_tokens_session_id_auth_sessions",
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["replaced_by_id"],
            ["refresh_tokens.id"],
            name="fk_refresh_tokens_replaced_by_id_refresh_tokens",
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id",
            name="pk_refresh_tokens",
        ),

        sa.UniqueConstraint(
            "jti_hash",
            name="uq_refresh_tokens_jti_hash",
        ),
    )

    op.create_index(
        "ix_refresh_tokens_session",
        "refresh_tokens",
        ["session_id"],
        unique=False,
    )

    op.create_index(
        "ix_refresh_tokens_family",
        "refresh_tokens",
        ["family_id"],
        unique=False,
    )

    op.create_index(
        "ix_refresh_tokens_session_revoked",
        "refresh_tokens",
        ["session_id", "revoked_at"],
        unique=False,
    )

    op.create_index(
        "ix_refresh_tokens_expires_at",
        "refresh_tokens",
        ["expires_at"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_refresh_tokens_expires_at",
        table_name="refresh_tokens",
    )

    op.drop_index(
        "ix_refresh_tokens_session_revoked",
        table_name="refresh_tokens",
    )

    op.drop_index(
        "ix_refresh_tokens_family",
        table_name="refresh_tokens",
    )

    op.drop_index(
        "ix_refresh_tokens_session",
        table_name="refresh_tokens",
    )

    op.drop_table("refresh_tokens")


    op.drop_index(
        "ix_auth_sessions_expires_at",
        table_name="auth_sessions",
    )

    op.drop_index(
        "ix_auth_sessions_tenant_status",
        table_name="auth_sessions",
    )

    op.drop_index(
        "ix_auth_sessions_user_expires",
        table_name="auth_sessions",
    )

    op.drop_index(
        "ix_auth_sessions_user_status",
        table_name="auth_sessions",
    )

    op.drop_table("auth_sessions")
