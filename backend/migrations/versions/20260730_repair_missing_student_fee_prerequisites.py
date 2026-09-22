"""Repair missing StudentFee prerequisites.

Revision ID: 20260730_student_fee_prereq
Revises: 20260729_finance_drift_repair

Historical deployments can reach the July 2026 baseline without the
legacy fee_discounts and student_fees tables even though later published
migrations consume them.

This compatibility revision restores only those missing prerequisites.
Tenant ownership remains the responsibility of the later published
finance tenant-ownership migration.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260730_student_fee_prereq"
down_revision = "20260729_finance_drift_repair"
branch_labels = None
depends_on = None


def _table_exists(conn, table_name):
    return table_name in inspect(conn).get_table_names()


def upgrade():
    conn = op.get_bind()

    if not _table_exists(conn, "fee_discounts"):
        op.create_table(
            "fee_discounts",
            sa.Column(
                "id",
                sa.Integer(),
                primary_key=True,
                nullable=False,
            ),
            sa.Column(
                "name",
                sa.String(length=100),
                nullable=False,
            ),
            sa.Column(
                "description",
                sa.Text(),
                nullable=True,
            ),
            sa.Column(
                "discount_type",
                sa.String(length=20),
                nullable=True,
                server_default=sa.text("'percentage'"),
            ),
            sa.Column(
                "value",
                sa.Numeric(10, 2),
                nullable=False,
            ),
            sa.Column(
                "fee_category_id",
                sa.Integer(),
                sa.ForeignKey("fee_categories.id"),
                nullable=True,
            ),
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=True,
                server_default=sa.true(),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=True,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )

        op.create_index(
            "ix_fee_discounts_fee_category_id",
            "fee_discounts",
            ["fee_category_id"],
            unique=False,
        )

        op.create_index(
            "ix_fee_discounts_is_active",
            "fee_discounts",
            ["is_active"],
            unique=False,
        )

    if not _table_exists(conn, "student_fees"):
        op.create_table(
            "student_fees",
            sa.Column(
                "id",
                sa.Integer(),
                primary_key=True,
                nullable=False,
            ),
            sa.Column(
                "student_id",
                sa.Integer(),
                sa.ForeignKey("students.id"),
                nullable=False,
            ),
            sa.Column(
                "fee_structure_id",
                sa.Integer(),
                sa.ForeignKey("fee_structures.id"),
                nullable=False,
            ),
            sa.Column(
                "branch_id",
                sa.UUID(),
                sa.ForeignKey("branches.id"),
                nullable=True,
            ),
            sa.Column(
                "original_amount",
                sa.Numeric(10, 2),
                nullable=False,
            ),
            sa.Column(
                "discount_amount",
                sa.Numeric(10, 2),
                nullable=True,
                server_default=sa.text("0"),
            ),
            sa.Column(
                "final_amount",
                sa.Numeric(10, 2),
                nullable=False,
            ),
            sa.Column(
                "paid_amount",
                sa.Numeric(10, 2),
                nullable=True,
                server_default=sa.text("0"),
            ),
            sa.Column(
                "balance",
                sa.Numeric(10, 2),
                nullable=False,
            ),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=True,
                server_default=sa.text("'pending'"),
            ),
            sa.Column(
                "applied_discount_id",
                sa.Integer(),
                sa.ForeignKey("fee_discounts.id"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=True,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=True,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )

        op.create_index(
            "ix_student_fees_branch_id",
            "student_fees",
            ["branch_id"],
            unique=False,
        )


def downgrade():
    # Intentionally non-destructive.
    #
    # These tables may contain finance records originating outside
    # Alembic history on legacy installations. Automatically dropping
    # them during downgrade could destroy valid production data.
    pass
