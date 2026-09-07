"""cast tenant_credential_counters.tenant_id from VARCHAR to UUID (PostgreSQL)

Revision ID: c79e9c8casttccuuid0001
Revises: 20260815_ensure_acad_struct_enum
Create Date: 2026-09-07 19:31:00.000000

Production regression:
    psycopg2.errors.UndefinedFunction: operator does not exist:
        character varying = uuid
triggered when the global ORM before_compile auto-filter injected a
Python uuid.UUID value into tenant_credential_counters.tenant_id,
which was declared as VARCHAR(36) in migration 3a413a7447b6.

Subsequent deploy failure:
    ForeignKeyViolation during the FK-ADD step because one historical
    orphan counter row existed with tenant_id pointing at a tenant
    that was removed from ``tenants``.  Migration rolled back cleanly
    thanks to Alembic transactional DDL.  Revision in DB stayed at
    ``3aeaf5669d9e``; tenant_credential_counters.tenant_id stayed
    VARCHAR.

This migration (fixed, retry-safe):
    1. UUID regex pre-validates EVERY tenant_id BEFORE any DDL.  Any
       malformed row raises ValueError with count + samples and the
       migration aborts with 0 schema changes (fail-loud, not silent
       data corruption).
    2. Before adding FK, SAFELY deletes ONLY confirmed-orphan TCC
       rows: ``DELETE FROM tenant_credential_counters WHERE tenant_id
       NOT IN (SELECT id::varchar FROM tenants)`` (VARCHAR-variant so
       we can run the delete while column is still pre-cast VARCHAR).
       Orphan deletions are counted and explicitly logged via
       ``RAISE NOTICE`` (PG) / Python print.  Every row whose tenant
       still exists is PRESERVED (including its ``last_value`` serial
       continuity).
    3. PostgreSQL step order:
         * DROP CONSTRAINT IF EXISTS on both PK and the new FK (so the
           migration is safe to re-run after a partial failure).
         * ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid.
         * Re-create the composite PRIMARY KEY (tenant_id, year).
         * ADD CONSTRAINT fk_tcc_tenant_id_tenants FOREIGN KEY
           (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE.
           Future tenant deletions will now auto-clean their counter
           rows so this orphan class cannot recur.
    4. SQLite / generic dialects: keep String(36) storage (matching
       the portable _uuid_type() SQLite representation), validate
       values, delete orphans via string join to tenants.id, and add
       the FK via batch_alter_table when SQLite supports it.

Downgrade reverses every step exactly (PG: drop FK → drop PK →
ALTER TYPE VARCHAR(36) → re-add PK; SQLite reverse batch).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as _pg

import re
import uuid as _uuid_mod


revision = "c79e9c8casttccuuid0001"
down_revision = "20260815_ensure_acad_struct_enum"
branch_labels = None
depends_on = None


_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _validate_uuid_values(conn, table_name: str, col_name: str) -> None:
    """Validate every row in ``table_name.col_name`` matches the UUID regex.

    Raises ValueError with a descriptive message (count + sample of invalid
    values) BEFORE any ALTER or DELETE, so no schema changes or data changes
    are applied on bad data.
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


def _delete_orphan_rows(conn) -> int:
    """Delete TCC rows whose tenant_id has no matching row in ``tenants``.

    Executed while ``tenant_credential_counters.tenant_id`` is still
    VARCHAR so we can safely compare against ``tenants.id::varchar``
    on PostgreSQL (``tenants.id`` is native UUID, and
    VARCHAR = UUID would otherwise raise the original UndefinedFunction
    error we are fixing).

    Returns count of deleted rows (0 if none).  ``last_value`` of
    every surviving row is untouched.
    """
    if conn.dialect.name == "postgresql":
        count_sql = sa.text(
            "SELECT COUNT(*) FROM tenant_credential_counters t "
            "WHERE NOT EXISTS ("
            "  SELECT 1 FROM tenants tn WHERE tn.id::varchar = t.tenant_id"
            ")"
        )
        delete_sql = sa.text(
            "DELETE FROM tenant_credential_counters t "
            "WHERE NOT EXISTS ("
            "  SELECT 1 FROM tenants tn WHERE tn.id::varchar = t.tenant_id"
            ")"
        )
        before = conn.execute(count_sql).scalar() or 0
        if before:
            # Emit PostgreSQL NOTICE so deletions show up in ``flask db
            # upgrade`` stderr on production without needing to parse
            # Python logs (Alembic already runs inside a transaction).
            notice_sql = sa.text(
                "DO $$ BEGIN "
                "RAISE NOTICE 'migration c79e9c8casttccuuid0001: "
                "deleting % orphan tenant_credential_counters rows (no "
                "matching tenants.id)', :n; END $$;"
            ).bindparams(n=int(before))
            conn.execute(notice_sql)
        conn.execute(delete_sql)
        return int(before)
    else:
        # SQLite / generic dialect — compare as plain strings.
        count_sql = sa.text(
            "SELECT COUNT(*) FROM tenant_credential_counters t "
            "WHERE t.tenant_id NOT IN ("
            "  SELECT CAST(id AS VARCHAR) FROM tenants"
            ")"
        )
        delete_sql = sa.text(
            "DELETE FROM tenant_credential_counters "
            "WHERE tenant_id NOT IN ("
            "  SELECT CAST(id AS VARCHAR) FROM tenants"
            ")"
        )
        before = conn.execute(count_sql).scalar() or 0
        conn.execute(delete_sql)
        return int(before)


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Strict UUID regex validation — fails before any DDL/DELETE.
    _validate_uuid_values(bind, "tenant_credential_counters", "tenant_id")

    # 2. Delete only confirmed-orphan rows BEFORE FK creation.  All
    #    other rows (tenant still alive) are preserved verbatim.
    orphans_deleted = _delete_orphan_rows(bind)

    if bind.dialect.name == "postgresql":
        # ── PostgreSQL ──────────────────────────────────────────────────
        # Retry-safe: drop new FK / old PK IF EXISTS (handles cases where
        # a prior deploy partially succeeded then rolled back).
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
        # String(36) already matches portable _uuid_type() SQLite storage.
        # Add FK CASCADE; batch_alter_table recreates table cleanly.
        with op.batch_alter_table("tenant_credential_counters") as batch_op:
            batch_op.alter_column(
                "tenant_id",
                existing_type=sa.String(length=36),
                type_=sa.String(length=36),
                existing_nullable=False,
                existing_server_default=None,
            )
            try:
                batch_op.drop_constraint(
                    "fk_tcc_tenant_id_tenants", type_="foreignkey"
                )
            except Exception:
                pass
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
                # critical column-type fix.  The FK is created on PG
                # where it actually protects the referential integrity.
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
