"""Add student_payments and payment_allocations tables.

Revision ID: 20260807_payments_tables
Revises: 20260807_usr_status_vc50
Create Date: 2026-08-07

The student_payments and payment_allocations tables were defined in the ORM
(app/models/finance.py) but were never created via Alembic migrations, so the
POST /api/v1/administration/fee-payments endpoint failed with
'relation "student_payments" does not exist' on production.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "20260807_payments_tables"
down_revision = "20260807_usr_status_vc50"
branch_labels = None
depends_on = None


def _table_exists(conn, table_name: str) -> bool:
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA table_info('{table_name}')"))
        return result.fetchone() is not None
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :t"
        ),
        {"t": table_name},
    ).fetchone()
    return result is not None


def _index_exists(conn, index_name: str) -> bool:
    if conn.dialect.name != "postgresql":
        return False
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = :n"
        ),
        {"n": index_name},
    ).fetchone()
    return result is not None


def _fk_exists(conn, fk_name: str) -> bool:
    if conn.dialect.name != "postgresql":
        return False
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_type = 'FOREIGN KEY' AND constraint_name = :n"
        ),
        {"n": fk_name},
    ).fetchone()
    return result is not None


def upgrade():
    conn = op.get_bind()
    is_pg = conn.dialect.name == "postgresql"

    # ------------------------------------------------------------------
    # 1. student_payments
    # ------------------------------------------------------------------
    if not _table_exists(conn, "student_payments"):
        op.create_table(
            "student_payments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "transaction_id",
                sa.String(length=100),
                nullable=False,
                unique=True,
            ),
            sa.Column("student_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("currency", sa.String(length=3), nullable=True, server_default=sa.text("'GHS'")),
            sa.Column("payment_method", sa.String(length=50), nullable=False),
            sa.Column("payment_provider", sa.String(length=50), nullable=True),
            sa.Column("external_reference", sa.String(length=100), nullable=True),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=True,
                server_default=sa.text("'completed'"),
            ),
            sa.Column("paid_at", sa.DateTime(), nullable=True),
            sa.Column("recorded_by", sa.Integer(), nullable=True),
            sa.Column("receipt_number", sa.String(length=50), nullable=True, unique=True),
            sa.Column(
                "meta_data",
                JSONB(astext_type=sa.Text()) if is_pg else sa.JSON(),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(
                ["student_id"],
                ["students.id"],
                name="fk_student_payments_student_id",
                ondelete="RESTRICT",
            ),
            sa.ForeignKeyConstraint(
                ["recorded_by"],
                ["users.id"],
                name="fk_student_payments_recorded_by",
                ondelete="SET NULL",
            ),
        )
        if not _index_exists(conn, "ix_student_payments_student_id"):
            op.create_index(
                "ix_student_payments_student_id",
                "student_payments",
                ["student_id"],
            )
        if not _index_exists(conn, "ix_student_payments_status"):
            op.create_index(
                "ix_student_payments_status",
                "student_payments",
                ["status"],
            )

    # ------------------------------------------------------------------
    # 2. payment_allocations
    # ------------------------------------------------------------------
    if not _table_exists(conn, "payment_allocations"):
        op.create_table(
            "payment_allocations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("payment_id", sa.Integer(), nullable=False),
            sa.Column("student_fee_id", sa.Integer(), nullable=False),
            sa.Column("amount_allocated", sa.Numeric(10, 2), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["payment_id"],
                ["student_payments.id"],
                name="fk_payment_allocations_payment_id",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["student_fee_id"],
                ["student_fees.id"],
                name="fk_payment_allocations_student_fee_id",
                ondelete="RESTRICT",
            ),
        )
        if not _index_exists(conn, "ix_payment_allocations_payment_id"):
            op.create_index(
                "ix_payment_allocations_payment_id",
                "payment_allocations",
                ["payment_id"],
            )
        if not _index_exists(conn, "ix_payment_allocations_student_fee_id"):
            op.create_index(
                "ix_payment_allocations_student_fee_id",
                "payment_allocations",
                ["student_fee_id"],
            )


def downgrade():
    conn = op.get_bind()
    if _table_exists(conn, "payment_allocations"):
        op.drop_table("payment_allocations")
    if _table_exists(conn, "student_payments"):
        op.drop_table("student_payments")
