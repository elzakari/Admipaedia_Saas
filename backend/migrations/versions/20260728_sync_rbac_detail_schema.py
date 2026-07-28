"""Synchronize RBAC detail schema on active migration head.

Revision ID: 20260728_sync_rbac_detail_schema
Revises: 20260728_sync_auth_user_schema
Create Date: 2026-07-28

Backfills RBAC detail schema expected by current models when the active
database head did not descend from the detailed RBAC branch.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260728_sync_rbac_detail_schema"
down_revision = "20260728_sync_auth_user_schema"
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

    if not _table_exists(conn, "user_role_assignments_detailed"):
        op.create_table(
            "user_role_assignments_detailed",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("role_id", sa.Integer(), sa.ForeignKey("rbac_roles.id"), nullable=False),
            sa.Column("assigned_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("assigned_reason", sa.String(255), nullable=True),
            sa.Column("assigned_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("is_temporary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("context_data", sa.JSON(), nullable=True),
        )
    _safe_create_index(conn, "ix_user_role_assignments_detailed_user_id", "user_role_assignments_detailed", ["user_id"])
    _safe_create_index(conn, "ix_user_role_assignments_detailed_role_id", "user_role_assignments_detailed", ["role_id"])

    if _table_exists(conn, "permission_grants"):
        if not _column_exists(conn, "permission_grants", "granted_reason"):
            op.add_column("permission_grants", sa.Column("granted_reason", sa.String(255), nullable=True))
        if not _column_exists(conn, "permission_grants", "conditions"):
            op.add_column("permission_grants", sa.Column("conditions", sa.JSON(), nullable=True))


def downgrade():
    # One-way schema catch-up migration for branch drift.
    pass
