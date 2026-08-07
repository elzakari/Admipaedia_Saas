"""Widen users.status from VARCHAR(20) to VARCHAR(50).

Revision ID: 20260807_users_status_varchar50
Revises: 20260806_p2_homework_idx
Create Date: 2026-08-07

The string 'pending_email_verification' is 26 characters; the old VARCHAR(20)
truncated it on PostgreSQL, causing StringDataRightTruncation errors in CI.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260807_usr_status_vc50"
down_revision = "20260806_p2_homework_idx"
branch_labels = None
depends_on = None


def _col_exists(conn, table, column):
    """Return True if *column* exists in *table* (PG and SQLite safe)."""
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA table_info('{table}')"))
        return any(row[1] == column for row in result.fetchall())
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    ).fetchone()
    return result is not None


def upgrade():
    conn = op.get_bind()
    if not _col_exists(conn, "users", "status"):
        return  # nothing to do on a fresh schema — create_all will use the model definition
    # Widen VARCHAR(20) → VARCHAR(50); safe to run multiple times (ALTER TYPE is idempotent
    # if the new length is greater than the existing length).
    if conn.dialect.name == "postgresql":
        op.execute(
            sa.text(
                "ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(50)"
            )
        )
    else:
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column(
                "status",
                existing_type=sa.String(20),
                type_=sa.String(50),
                existing_nullable=True,
            )


def downgrade():
    conn = op.get_bind()
    if not _col_exists(conn, "users", "status"):
        return
    if conn.dialect.name == "postgresql":
        # Truncate any values that are now > 20 chars before narrowing (best-effort)
        op.execute(
            sa.text(
                "ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(20) "
                "USING SUBSTRING(status, 1, 20)"
            )
        )
    else:
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column(
                "status",
                existing_type=sa.String(50),
                type_=sa.String(20),
                existing_nullable=True,
            )
