"""Repair historically missing normalized finance prerequisite tables.

Revision ID: 20260729_finance_drift_repair
Revises: 20260728_sync_rbac_detail_schema

This is a forward-only compatibility boundary for databases whose Alembic
history includes the historical finance normalization revision but whose
finance tables are absent because older deployments could create those
tables outside Alembic.

The repair deliberately creates the POST-3e1 normalized representation.
It does not recreate the obsolete predecessor fee_structures schema and
does not create payment ledger tables; later migrations remain
authoritative for student_fees, payments, and tenant ownership.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260729_finance_drift_repair"
down_revision = "20260728_sync_rbac_detail_schema"
branch_labels = None
depends_on = None


_FEE_CATEGORY_COLUMNS = {
    "id",
    "name",
    "description",
    "is_optional",
    "created_at",
}

_FEE_STRUCTURE_COLUMNS = {
    "id",
    "academic_year",
    "term",
    "created_at",
    "fee_category_id",
    "class_id",
    "educational_level_id",
    "amount",
    "currency",
    "due_date",
}


def _table_exists(inspector, table_name):
    return table_name in inspector.get_table_names()


def _column_names(inspector, table_name):
    return {
        column["name"]
        for column in inspector.get_columns(table_name)
    }


def _assert_required_columns(inspector, table_name, required):
    actual = _column_names(inspector, table_name)
    missing = required - actual

    if missing:
        raise RuntimeError(
            f"Historical finance drift detected on existing "
            f"{table_name}: missing required normalized column(s): "
            f"{', '.join(sorted(missing))}. "
            f"Refusing to reshape an existing table automatically."
        )


def _row_count(conn, table_name):
    quoted = conn.dialect.identifier_preparer.quote(table_name)
    return conn.execute(
        sa.text(f"SELECT COUNT(*) FROM {quoted}")
    ).scalar_one()


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    fee_categories_exists = _table_exists(
        inspector,
        "fee_categories",
    )

    if fee_categories_exists:
        _assert_required_columns(
            inspector,
            "fee_categories",
            _FEE_CATEGORY_COLUMNS,
        )
    else:
        op.create_table(
            "fee_categories",
            sa.Column(
                "id",
                sa.Integer(),
                primary_key=True,
                autoincrement=True,
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
                "is_optional",
                sa.Boolean(),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=True,
            ),
            sa.UniqueConstraint(
                "name",
                name="fee_categories_name_key",
            ),
        )

        # Refresh reflection after DDL.
        inspector = sa.inspect(conn)

    fee_structures_exists = _table_exists(
        inspector,
        "fee_structures",
    )

    if fee_structures_exists:
        _assert_required_columns(
            inspector,
            "fee_structures",
            _FEE_STRUCTURE_COLUMNS,
        )
        return

    # Hard dependencies of the post-3e1 normalized representation.
    for dependency in (
        "classes",
        "educational_levels",
        "fee_categories",
    ):
        if not _table_exists(inspector, dependency):
            raise RuntimeError(
                "Cannot repair normalized fee_structures: "
                f"required table {dependency} is missing."
            )

    op.create_table(
        "fee_structures",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "academic_year",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "term",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "fee_category_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "class_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "educational_level_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "amount",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
        ),
        sa.Column(
            "currency",
            sa.String(length=3),
            nullable=True,
        ),
        sa.Column(
            "due_date",
            sa.Date(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["class_id"],
            ["classes.id"],
        ),
        sa.ForeignKeyConstraint(
            ["educational_level_id"],
            ["educational_levels.id"],
        ),
        sa.ForeignKeyConstraint(
            ["fee_category_id"],
            ["fee_categories.id"],
        ),
    )


def downgrade():
    """
    Intentionally non-destructive.

    This revision repairs historical schema drift and may
    adopt compatible fee_categories / fee_structures tables
    that existed before this revision. Because upgrade()
    stores no durable provenance describing which tables it
    created, downgrade cannot safely determine ownership of
    those tables.

    Dropping them here could therefore destroy pre-existing
    application schema. Reversal of this repair must be
    performed only through an explicit, separately reviewed
    migration with known schema provenance.
    """
    pass
