"""Add explicit tenant ownership to school finance definitions.

Revision ID: 20260911_fin_tenant_001
Revises: f6bdd27a5f12
Create Date: 2026-09-11

This revision intentionally does not guess ownership for legacy finance
definitions. If tenant_id is absent and existing rows are present, the
upgrade aborts.

Production finance definitions were explicitly cleared and backed up
before this migration was authored.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260911_fin_tenant_001"
down_revision = "f6bdd27a5f12"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _table_exists(table_name):
    return table_name in _inspector().get_table_names()


def _column_exists(table_name, column_name):
    return any(
        col["name"] == column_name
        for col in _inspector().get_columns(table_name)
    )


def _row_count(table_name):
    bind = op.get_bind()
    return bind.execute(
        sa.text(f'SELECT COUNT(*) FROM "{table_name}"')
    ).scalar_one()


def _null_tenant_count(table_name):
    bind = op.get_bind()
    return bind.execute(
        sa.text(
            f'SELECT COUNT(*) FROM "{table_name}" '
            'WHERE tenant_id IS NULL'
        )
    ).scalar_one()


def _fk_for_column(table_name, column_name):
    for fk in _inspector().get_foreign_keys(table_name):
        if fk.get("constrained_columns") == [column_name]:
            return fk
    return None


def _index_exists(table_name, index_name):
    return any(
        idx.get("name") == index_name
        for idx in _inspector().get_indexes(table_name)
    )


def _unique_constraints(table_name):
    return _inspector().get_unique_constraints(table_name)


def _ensure_empty_before_new_owner(table_name):
    if not _column_exists(table_name, "tenant_id"):
        count = _row_count(table_name)
        if count:
            raise RuntimeError(
                f"{table_name} contains {count} legacy rows but has no "
                "tenant_id. Refusing to guess tenant ownership."
            )


def upgrade():
    for table_name in ("fee_categories", "fee_discounts", "fee_structures"):
        if not _table_exists(table_name):
            raise RuntimeError(
                f"Required table {table_name} does not exist"
            )
        _ensure_empty_before_new_owner(table_name)

    # --------------------------------------------------------
    # fee_categories
    # --------------------------------------------------------

    if not _column_exists("fee_categories", "tenant_id"):
        op.add_column(
            "fee_categories",
            sa.Column(
                "tenant_id",
                postgresql.UUID(as_uuid=True),
                nullable=True,
            ),
        )

    if _null_tenant_count("fee_categories"):
        raise RuntimeError(
            "fee_categories contains rows without tenant ownership"
        )

    if _fk_for_column("fee_categories", "tenant_id") is None:
        op.create_foreign_key(
            "fk_fee_categories_tenant_id",
            "fee_categories",
            "tenants",
            ["tenant_id"],
            ["id"],
        )

    if not _index_exists(
        "fee_categories",
        "ix_fee_categories_tenant_id",
    ):
        op.create_index(
            "ix_fee_categories_tenant_id",
            "fee_categories",
            ["tenant_id"],
            unique=False,
        )

    # Remove historical global UNIQUE(name).
    for uq in _unique_constraints("fee_categories"):
        cols = uq.get("column_names") or []
        name = uq.get("name")
        if cols == ["name"]:
            if not name:
                raise RuntimeError(
                    "Found unnamed UNIQUE(name) on fee_categories"
                )
            op.drop_constraint(
                name,
                "fee_categories",
                type_="unique",
            )

    tenant_name_unique_exists = any(
        (uq.get("column_names") or [])
        == ["tenant_id", "name"]
        for uq in _unique_constraints("fee_categories")
    )

    if not tenant_name_unique_exists:
        op.create_unique_constraint(
            "uq_fee_categories_tenant_name",
            "fee_categories",
            ["tenant_id", "name"],
        )

    op.alter_column(
        "fee_categories",
        "tenant_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    # --------------------------------------------------------
    # fee_discounts
    # --------------------------------------------------------

    if not _column_exists("fee_discounts", "tenant_id"):
        op.add_column(
            "fee_discounts",
            sa.Column(
                "tenant_id",
                postgresql.UUID(as_uuid=True),
                nullable=True,
            ),
        )

    if _null_tenant_count("fee_discounts"):
        raise RuntimeError(
            "fee_discounts contains rows without tenant ownership"
        )

    if _fk_for_column("fee_discounts", "tenant_id") is None:
        op.create_foreign_key(
            "fk_fee_discounts_tenant_id",
            "fee_discounts",
            "tenants",
            ["tenant_id"],
            ["id"],
        )

    if not _index_exists(
        "fee_discounts",
        "ix_fee_discounts_tenant_id",
    ):
        op.create_index(
            "ix_fee_discounts_tenant_id",
            "fee_discounts",
            ["tenant_id"],
            unique=False,
        )

    discount_category_mismatch = op.get_bind().execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM fee_discounts fd
            JOIN fee_categories fc
              ON fc.id = fd.fee_category_id
            WHERE fd.fee_category_id IS NOT NULL
              AND fd.tenant_id IS DISTINCT FROM fc.tenant_id
            """
        )
    ).scalar_one()

    if discount_category_mismatch:
        raise RuntimeError(
            "FeeDiscount/FeeCategory tenant ownership mismatch detected"
        )

    op.alter_column(
        "fee_discounts",
        "tenant_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    # --------------------------------------------------------
    # fee_structures
    # --------------------------------------------------------

    if not _column_exists("fee_structures", "tenant_id"):
        op.add_column(
            "fee_structures",
            sa.Column(
                "tenant_id",
                postgresql.UUID(as_uuid=True),
                nullable=True,
            ),
        )

    if _null_tenant_count("fee_structures"):
        raise RuntimeError(
            "fee_structures contains rows without tenant ownership"
        )

    if _fk_for_column("fee_structures", "tenant_id") is None:
        op.create_foreign_key(
            "fk_fee_structures_tenant_id",
            "fee_structures",
            "tenants",
            ["tenant_id"],
            ["id"],
        )

    if not _index_exists(
        "fee_structures",
        "ix_fee_structures_tenant_id",
    ):
        op.create_index(
            "ix_fee_structures_tenant_id",
            "fee_structures",
            ["tenant_id"],
            unique=False,
        )

    # If this is a partially migrated installation, verify existing
    # structure/category ownership agrees before enforcing NOT NULL.
    mismatch_count = op.get_bind().execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM fee_structures fs
            JOIN fee_categories fc
              ON fc.id = fs.fee_category_id
            WHERE fs.tenant_id IS DISTINCT FROM fc.tenant_id
            """
        )
    ).scalar_one()

    if mismatch_count:
        raise RuntimeError(
            "FeeStructure/FeeCategory tenant ownership mismatch detected"
        )

    class_mismatch_count = op.get_bind().execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM fee_structures fs
            JOIN classes c
              ON c.id = fs.class_id
            WHERE fs.class_id IS NOT NULL
              AND fs.tenant_id IS DISTINCT FROM c.tenant_id
            """
        )
    ).scalar_one()

    if class_mismatch_count:
        raise RuntimeError(
            "FeeStructure/Class tenant ownership mismatch detected"
        )

    op.alter_column(
        "fee_structures",
        "tenant_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )


def downgrade():
    # A downgrade after new tenant-owned finance data exists would destroy
    # the security boundary. Refuse instead of silently globalizing data.
    for table_name in ("fee_structures", "fee_discounts", "fee_categories"):
        if _table_exists(table_name) and _row_count(table_name):
            raise RuntimeError(
                "Finance ownership downgrade requires empty finance "
                f"definition tables; {table_name} contains data."
            )

    if _table_exists("fee_structures"):
        if _index_exists(
            "fee_structures",
            "ix_fee_structures_tenant_id",
        ):
            op.drop_index(
                "ix_fee_structures_tenant_id",
                table_name="fee_structures",
            )

        fk = _fk_for_column(
            "fee_structures",
            "tenant_id",
        )
        if fk and fk.get("name"):
            op.drop_constraint(
                fk["name"],
                "fee_structures",
                type_="foreignkey",
            )

        if _column_exists(
            "fee_structures",
            "tenant_id",
        ):
            op.drop_column(
                "fee_structures",
                "tenant_id",
            )

    if _table_exists("fee_discounts"):
        if _index_exists(
            "fee_discounts",
            "ix_fee_discounts_tenant_id",
        ):
            op.drop_index(
                "ix_fee_discounts_tenant_id",
                table_name="fee_discounts",
            )

        fk = _fk_for_column(
            "fee_discounts",
            "tenant_id",
        )
        if fk and fk.get("name"):
            op.drop_constraint(
                fk["name"],
                "fee_discounts",
                type_="foreignkey",
            )

        if _column_exists(
            "fee_discounts",
            "tenant_id",
        ):
            op.drop_column(
                "fee_discounts",
                "tenant_id",
            )


    if _table_exists("fee_categories"):
        for uq in _unique_constraints("fee_categories"):
            if (
                (uq.get("column_names") or [])
                == ["tenant_id", "name"]
                and uq.get("name")
            ):
                op.drop_constraint(
                    uq["name"],
                    "fee_categories",
                    type_="unique",
                )

        if _index_exists(
            "fee_categories",
            "ix_fee_categories_tenant_id",
        ):
            op.drop_index(
                "ix_fee_categories_tenant_id",
                table_name="fee_categories",
            )

        fk = _fk_for_column(
            "fee_categories",
            "tenant_id",
        )
        if fk and fk.get("name"):
            op.drop_constraint(
                fk["name"],
                "fee_categories",
                type_="foreignkey",
            )

        if _column_exists(
            "fee_categories",
            "tenant_id",
        ):
            op.drop_column(
                "fee_categories",
                "tenant_id",
            )

        global_name_unique = any(
            (uq.get("column_names") or []) == ["name"]
            for uq in _unique_constraints("fee_categories")
        )

        if not global_name_unique:
            op.create_unique_constraint(
                "fee_categories_name_key",
                "fee_categories",
                ["name"],
            )
