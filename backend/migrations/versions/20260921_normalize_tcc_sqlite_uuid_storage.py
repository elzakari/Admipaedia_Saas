"""Normalize tenant credential counter UUID storage.

Forward repair for SQLite/generic installations where historical
tenant_credential_counters.tenant_id values may be stored as dashed UUID
strings while tenants.id uses SQLAlchemy's compact UUID representation.

PostgreSQL already received a native UUID cast in the historical TCC
migration and therefore requires no representation rewrite here.
"""

from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa


revision = "20260921_tcc_uuid_normalize"
down_revision = "20260918_bootstrap_complete"
branch_labels = None
depends_on = None


_TCC = "tenant_credential_counters"
_TENANTS = "tenants"


def _canonical_uuid(value) -> str:
    """Return SQLAlchemy-compatible compact UUID storage."""
    try:
        return uuid.UUID(str(value).strip()).hex
    except (ValueError, TypeError, AttributeError) as exc:
        raise ValueError(
            f"Invalid tenant UUID in {_TCC}: {value!r}"
        ) from exc


def _validated_tcc_rows(conn):
    """Read and validate every TCC tenant UUID before mutation."""
    rows = conn.execute(
        sa.text(
            "SELECT tenant_id, year, last_value "
            "FROM tenant_credential_counters "
            "ORDER BY tenant_id, year"
        )
    ).mappings().all()

    validated = []

    for row in rows:
        validated.append(
            {
                "original": str(row["tenant_id"]),
                "canonical": _canonical_uuid(row["tenant_id"]),
                "year": int(row["year"]),
                "last_value": int(row["last_value"]),
            }
        )

    return validated


def _canonical_tenant_ids(conn):
    """Return canonical UUID values for all existing tenants."""
    values = conn.execute(
        sa.text("SELECT id FROM tenants")
    ).scalars().all()

    canonical = set()

    for value in values:
        canonical.add(_canonical_uuid(value))

    return canonical


def _normalize_sqlite_rows(conn):
    """Normalize historical TCC UUIDs and remove confirmed orphans.

    Validation of all TCC and tenant UUID values occurs before the first
    UPDATE/DELETE.  Orphan determination therefore compares canonical UUID
    values instead of incompatible dashed/compact text representations.
    """
    rows = _validated_tcc_rows(conn)
    tenant_ids = _canonical_tenant_ids(conn)

    # Detect a canonical PK collision before mutation.  This can occur if
    # historical data contains both dashed and compact spellings of the same
    # UUID for the same year.
    seen = set()

    for row in rows:
        key = (row["canonical"], row["year"])
        if key in seen:
            raise ValueError(
                "Canonical UUID normalization would create a duplicate "
                f"tenant_credential_counters primary key: {key!r}"
            )
        seen.add(key)

    # Normalize first.  A legitimate dashed historical TCC row now becomes
    # byte-for-byte comparable with SQLAlchemy UUID storage on SQLite.
    for row in rows:
        if row["original"] != row["canonical"]:
            conn.execute(
                sa.text(
                    "UPDATE tenant_credential_counters "
                    "SET tenant_id = :canonical "
                    "WHERE tenant_id = :original AND year = :year"
                ),
                {
                    "canonical": row["canonical"],
                    "original": row["original"],
                    "year": row["year"],
                },
            )

    # Delete only confirmed orphans after canonical comparison.
    orphan_keys = [
        (row["canonical"], row["year"])
        for row in rows
        if row["canonical"] not in tenant_ids
    ]

    for tenant_id, year in orphan_keys:
        conn.execute(
            sa.text(
                "DELETE FROM tenant_credential_counters "
                "WHERE tenant_id = :tenant_id AND year = :year"
            ),
            {"tenant_id": tenant_id, "year": year},
        )

    return {
        "rows_seen": len(rows),
        "orphans_deleted": len(orphan_keys),
    }


def _verify_sqlite_contract(conn):
    """Fail closed if normalization did not produce the required contract."""
    rows = conn.execute(
        sa.text(
            "SELECT tenant_id, year, last_value "
            "FROM tenant_credential_counters"
        )
    ).mappings().all()

    tenant_ids = _canonical_tenant_ids(conn)

    for row in rows:
        raw = str(row["tenant_id"])
        canonical = _canonical_uuid(raw)

        if raw != canonical:
            raise RuntimeError(
                "TCC UUID normalization incomplete: "
                f"{raw!r} is not canonical compact UUID storage"
            )

        if canonical not in tenant_ids:
            raise RuntimeError(
                "TCC UUID normalization left an orphan row: "
                f"{canonical!r}"
            )


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    inspector = sa.inspect(conn)

    if not inspector.has_table(_TCC):
        return

    if not inspector.has_table(_TENANTS):
        raise RuntimeError(
            "Cannot normalize tenant_credential_counters without tenants table"
        )

    if dialect == "postgresql":
        # The historical c79e9c8casttccuuid0001 revision already converts
        # this column to native PostgreSQL UUID.  Do not rewrite it.
        column = next(
            (
                col
                for col in inspector.get_columns(_TCC)
                if col["name"] == "tenant_id"
            ),
            None,
        )

        if column is None:
            raise RuntimeError(
                "tenant_credential_counters.tenant_id is missing"
            )

        if column["type"].__class__.__name__.upper() != "UUID":
            raise RuntimeError(
                "Expected native PostgreSQL UUID for "
                "tenant_credential_counters.tenant_id"
            )

        return

    _normalize_sqlite_rows(conn)
    _verify_sqlite_contract(conn)
    _reconcile_sqlite_fk(conn)


def _sqlite_tenant_fk_rows(conn):
    """Return SQLite FKs from TCC.tenant_id to tenants.id."""
    rows = conn.execute(
        sa.text("PRAGMA foreign_key_list(tenant_credential_counters)")
    ).fetchall()

    return [
        row
        for row in rows
        if (
            str(row[2]).lower() == _TENANTS
            and str(row[3]).lower() == "tenant_id"
            and str(row[4]).lower() == "id"
        )
    ]


def _sqlite_fk_has_cascade(conn) -> bool:
    """Require exactly one tenant FK and require ON DELETE CASCADE."""
    matches = _sqlite_tenant_fk_rows(conn)

    return (
        len(matches) == 1
        and str(matches[0][6]).upper() == "CASCADE"
    )


def _sqlite_target_table(metadata):
    """Describe the exact post-repair SQLite TCC table contract."""
    return sa.Table(
        _TCC,
        metadata,
        sa.Column(
            "tenant_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "year",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "last_value",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.PrimaryKeyConstraint(
            "tenant_id",
            "year",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            name="fk_tcc_tenant_id_tenants",
            ondelete="CASCADE",
        ),
    )


def _reconcile_sqlite_fk(conn) -> None:
    """Fail-closed repair of the SQLite TCC tenant FK.

    SQLite can contain an unnamed historical foreign key. Attempting to
    replace that FK by constraint name can preserve the old FK during batch
    reconstruction and create a duplicate relationship.

    Instead, when the contract is missing or wrong, recreate the table from
    an explicit target definition containing exactly one tenant FK with
    ON DELETE CASCADE.
    """
    if _sqlite_fk_has_cascade(conn):
        return

    metadata = sa.MetaData()

    sa.Table(
        _TENANTS,
        metadata,
        sa.Column(
            "id",
            sa.String(length=32),
            primary_key=True,
        ),
    )

    target = _sqlite_target_table(metadata)

    with op.batch_alter_table(
        _TCC,
        recreate="always",
        copy_from=target,
    ):
        pass

    matches = _sqlite_tenant_fk_rows(conn)

    if len(matches) != 1:
        raise RuntimeError(
            "SQLite TCC FK reconciliation did not produce exactly one "
            "tenant_id foreign key to tenants.id"
        )

    if str(matches[0][6]).upper() != "CASCADE":
        raise RuntimeError(
            "SQLite TCC tenant foreign key is not ON DELETE CASCADE "
            "after reconciliation"
        )


def downgrade():
    # Forward data-repair migration.  Re-introducing dashed historical UUID
    # storage would recreate the incompatibility this revision removes.
    pass