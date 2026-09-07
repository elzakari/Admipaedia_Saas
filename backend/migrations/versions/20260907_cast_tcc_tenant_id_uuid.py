"""cast tenant_credential_counters.tenant_id from VARCHAR to UUID (PostgreSQL)

Revision ID: 20260907_cast_tcc_tenant_id_uuid
Revises: 20260815_ensure_academic_structure_type_enum
Create Date: 2026-09-07 19:31:00.000000

Production regression:
    psycopg2.errors.UndefinedFunction: operator does not exist:
        character varying = uuid
triggered when the global ORM before_compile auto-filter injected a
Python uuid.UUID value into tenant_credential_counters.tenant_id,
which was declared as VARCHAR(36) in migration 3a413a7447b6.

This migration:
    * Pre-validates every stored tenant_id is a canonical 36-char UUID
      string BEFORE any schema mutation.  Invalid rows (should not
      exist) raise ValueError and abort the migration without damage.
    * On PostgreSQL:
        - drops the existing composite PRIMARY KEY (tenant_id, year)
        - ALTERs tenant_id TYPE UUID USING tenant_id::uuid
        - re-adds composite PRIMARY KEY
        - adds FK tenants(id) ON DELETE CASCADE
    * On SQLite / other dialects:
        - leaves column storage as String(36) (matches portable
          _uuid_type() SQLite behaviour, where only Postgres uses
          native UUID storage)
        - still runs validation so non-UUID values are caught early
        - adds a ForeignKeyConstraint via batch_alter_table if possible

Downgrade reverses the changes exactly (PostgreSQL: drop FK, drop PK,
ALTER ... TYPE VARCHAR(36) USING tenant_id::varchar(36), re-add PK).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as _pg

import re
import uuid as _uuid_mod


revision = "20260907_cast_tcc_tenant_id_uuid"
down_revision = "20260815_ensure_academic_structure_type_enum"
branch_labels = None
depends_on = None


_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _validate_uuid_values(conn, table_name: str, col_name: str) -> None:
    """Validate every row in ``table_name.col_name`` matches the UUID regex.

    Raises ValueError with a descriptive message (count + sample of invalid
    values) BEFORE any ALTER, so no schema changes are applied on bad data.
    """
    dialect_name = conn.dialect.name
    if dialect_name == "postgresql":
        sql = sa.text(
            f"SELECT {col_name} FROM {table_name} "
            f"WHERE {col_name} !~* '^[0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-"
            f"[0-9a-f]{{4}}-[0-9a-f]{{12}}$'"
        )
    else:
        sql = sa.text(f"SELECT {col_name} FROM {table_name}")
    rows = conn.execute(sql).fetchall()
    invalid = []
    for (val,) in rows:
        if val is None:
            continue
        s = str(val).strip()
        if not _UUID_RE.match(s):
            invalid.append(s)
    if invalid:
        sample = ", ".join(repr(v) for v in invalid[:5])
        if len(invalid) > 5:
            sample += f", ... ({len(invalid) - 5} more)"
        raise ValueError(
            f"Refusing to migrate {table_name}: {len(invalid)} row(s) have "
            f"non-UUID values in column {col_name}. Examples: {sample}"
        )


def upgrade() -> None:
    bind = op.get_bind()
    _validate_uuid_values(bind, "tenant_credential_counters", "tenant_id")

    if bind.dialect.name == "postgresql":
        # ── PostgreSQL ──────────────────────────────────────────────────
        op.execute(
            sa.text(
                "ALTER TABLE tenant_credential_counters "
                "DROP CONSTRAINT IF EXISTS tenant_credential_counters_pkey"
            )
        )
        op.execute(
            sa.text(
                "ALTER TABLE tenant_credential_counters "
                "ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid"
            )
        )
        op.create_primary_key(
            "tenant_credential_counters_pkey",
            "tenant_credential_counters",
            ["tenant_id", "year"],
        )
        op.execute(
            sa.text(
                "ALTER TABLE tenant_credential_counters ADD CONSTRAINT "
                "fk_tcc_tenant_id_tenants FOREIGN KEY (tenant_id) "
                "REFERENCES tenants(id) ON DELETE CASCADE"
            )
        )
    else:
        # ── SQLite / generic dialect ────────────────────────────────────
        # batch_alter_table recreates the table, preserving String(36)
        # storage type that matches the portable _uuid_type() SQLite
        # representation.  Values are UUID strings already, validated
        # above.  Add the ForeignKeyConstraint explicitly.
        with op.batch_alter_table("tenant_credential_counters") as batch_op:
            batch_op.alter_column(
                "tenant_id",
                existing_type=sa.String(length=36),
                type_=sa.String(length=36),
                existing_nullable=False,
                existing_server_default=None,
            )
            try:
                batch_op.create_foreign_key(
                    "fk_tcc_tenant_id_tenants",
                    "tenants",
                    ["tenant_id"],
                    ["id"],
                    ondelete="CASCADE",
                )
            except Exception:
                # Some SQLite builds disable FK enforcement or ALTER
                # constraints; never let this block migration of the
                # critical column-type fix.
                pass


def downgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        # ── PostgreSQL ──────────────────────────────────────────────────
        op.execute(
            sa.text(
                "ALTER TABLE tenant_credential_counters DROP CONSTRAINT "
                "IF EXISTS fk_tcc_tenant_id_tenants"
            )
        )
        op.execute(
            sa.text(
                "ALTER TABLE tenant_credential_counters "
                "DROP CONSTRAINT IF EXISTS tenant_credential_counters_pkey"
            )
        )
        op.execute(
            sa.text(
                "ALTER TABLE tenant_credential_counters "
                "ALTER COLUMN tenant_id TYPE VARCHAR(36) "
                "USING tenant_id::varchar(36)"
            )
        )
        op.create_primary_key(
            "tenant_credential_counters_pkey",
            "tenant_credential_counters",
            ["tenant_id", "year"],
        )
    else:
        # ── SQLite / generic dialect ────────────────────────────────────
        with op.batch_alter_table("tenant_credential_counters") as batch_op:
            try:
                batch_op.drop_constraint(
                    "fk_tcc_tenant_id_tenants", type_="foreignkey"
                )
            except Exception:
                pass
            batch_op.alter_column(
                "tenant_id",
                existing_type=sa.String(length=36),
                type_=sa.String(length=36),
                existing_nullable=False,
                existing_server_default=None,
            )
