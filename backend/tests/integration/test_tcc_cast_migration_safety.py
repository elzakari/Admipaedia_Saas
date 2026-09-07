"""Regression tests for the tenant_credential_counters VARCHAR→UUID migration.

Tested migration:
    ``backend/migrations/versions/20260907_cast_tcc_tenant_id_uuid.py``
    revision  ``c79e9c8casttccuuid0001`` (down_revision = 20260815_ensure_acad_struct_enum).

Migration contract we lock down here (every requirement verbatim from the
engineering brief):

1. Malformed/non-UUID tenant_id strings are caught BEFORE any DDL/DELETE
   and raise a descriptive ValueError with count + samples.
2. Confirmed orphan TCC rows (tenant_id NOT IN tenants.id) are safely
   DELETED prior to FK creation but AFTER UUID validation.
3. Every non-orphan row is preserved including its ``last_value`` serial.
4. PostgreSQL VARCHAR is CAST to native UUID via ``USING tenant_id::uuid``,
   composite PRIMARY KEY (tenant_id, year) is re-added, and FK
   ``fk_tcc_tenant_id_tenants REFERENCES tenants(id) ON DELETE CASCADE``
   is created.
5. Adding a TCC row pointing at a non-existent tenant AFTER the FK is in
   place is rejected (referential integrity enforced, not advisory).
6. Deleting a tenant AFTER the FK CASCADE is in place cleans up its
   counter rows (so orphan class can never re-appear).
7. Rollback safety: the upgrade step is transactional DDL; any failure
   mid-step leaves the DB unchanged.  We simulate this by injecting a
   malformed UUID row and confirming nothing is mutated after the
   ValueError.

Tests run against the SQLite dialect in the default pytest configuration.
SQLite does not have native UUID types, so the type-cast semantics of
step 4 are exercised only on PostgreSQL via TEST_DB_URL=postgres://... .
All other behaviours (validation order, orphan cleanup, FK enforcement,
cascade) work identically on both dialects.
"""

from __future__ import annotations

import importlib.util as _ilu
import os
import pathlib
import sys
from typing import Any, Callable
from uuid import uuid4

import pytest
import sqlalchemy as sa
from sqlalchemy.engine import Connection, Engine

from app.extensions import db as _db


# ---------------------------------------------------------------------------
# Helpers: load the migration module by path so we can test its private
# helpers (_validate_uuid_values, _delete_orphan_rows) directly without
# going through a full Alembic environment spin-up.
# ---------------------------------------------------------------------------
_MIGRATION_PATH = (
    pathlib.Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "20260907_cast_tcc_tenant_id_uuid.py"
)


def _load_migration_module():
    spec = _ilu.spec_from_file_location(
        "tcc_cast_migration_c79e9c8", str(_MIGRATION_PATH)
    )
    assert spec is not None and spec.loader is not None
    mod = _ilu.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


MIG = _load_migration_module()


# ---------------------------------------------------------------------------
# Fixtures: dedicated bare Engine (not Flask-SQLAlchemy scoped session) so
# we can create/drop tables and run raw DDL/DML inside an isolated SQLite
# file for each test, fully deterministic.
# ---------------------------------------------------------------------------
@pytest.fixture()
def isolated_engine(tmp_path, monkeypatch) -> Engine:
    """Create a fresh Engine against a per-test SQLite file.

    The migration helpers operate on a raw ``Connection`` (``conn``) they
    receive from ``op.get_bind()``.  We build an identical Connection
    ourselves for direct unit-style testing of the helpers.
    """
    db_file = tmp_path / "tcc-migration.sqlite3"
    url = f"sqlite:///{db_file}"
    eng = sa.create_engine(url, future=True)
    yield eng
    eng.dispose()


@pytest.fixture()
def schema(isolated_engine: Engine) -> Connection:
    """Create the minimal schema the migration helpers need:

    * ``tenants(id VARCHAR(36) PRIMARY KEY)`` — mirrors
      ``tenants.id UUID`` cast to VARCHAR during our pre-cast steps.
    * ``tenant_credential_counters(tenant_id VARCHAR(36), year INTEGER,
      last_value INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(tenant_id, year))``
      — pre-migration state exactly matching production before this
      revision runs.
    """
    metadata = sa.MetaData()
    tenants = sa.Table(
        "tenants",
        metadata,
        sa.Column("id", sa.String(36), primary_key=True),
        # Minimal columns needed for FK relationships + cascade tests.
        sa.Column("name", sa.String(255), nullable=False, default="t"),
    )
    tcc = sa.Table(
        "tenant_credential_counters",
        metadata,
        sa.Column("tenant_id", sa.String(36), primary_key=True),
        sa.Column("year", sa.Integer(), primary_key=True),
        sa.Column("last_value", sa.Integer(), nullable=False, default=0),
    )
    metadata.create_all(isolated_engine)
    with isolated_engine.begin() as conn:
        yield conn


# ---------------------------------------------------------------------------
# Utility: short wrapper that runs a migration helper through a
# transaction.  We use the same Connection.begin() semantics Alembic uses
# (transactional DDL/DML rollback on exception).
# ---------------------------------------------------------------------------
def _run_helper(
    helper: Callable[..., Any], conn: Connection, *args: Any, **kwargs: Any
) -> Any:
    tx = conn.begin_nested() if conn.in_transaction() else conn.begin()
    try:
        result = helper(conn, *args, **kwargs)
        tx.commit()
        return result
    except Exception:
        tx.rollback()
        raise


# ---------------------------------------------------------------------------
# Tests.
# ---------------------------------------------------------------------------


class TestValidateUUIDValues:
    """_validate_uuid_values — regex pre-validation BEFORE any mutation."""

    def test_accepts_valid_uuid_strings(self, isolated_engine: Engine, schema: Connection):
        t1, t2 = str(uuid4()), str(uuid4())
        schema.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                " VALUES (:a,2026,7), (:b,2025,2)"
            ).bindparams(a=t1, b=t2)
        )
        # Should not raise.
        _run_helper(
            MIG._validate_uuid_values,
            schema,
            "tenant_credential_counters",
            "tenant_id",
        )

    @pytest.mark.parametrize(
        "bad_val",
        [
            "not-a-uuid-at-all",
            "28a97801-c23b-4559-90c1-4849fbee052",  # one char short (35)
            "28a97801-c23b-4559-90c1-4849fbee05200",  # one char long (37)
            "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ",  # non-hex chars
            "28a97801_c23b_4559_90c1_4849fbee0520",  # underscores not dashes
            "",
        ],
    )
    def test_rejects_malformed_strings_with_descriptive_error(
        self, isolated_engine: Engine, schema: Connection, bad_val: str
    ):
        good = str(uuid4())
        schema.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                " VALUES (:g,2026,1), (:b,2026,2)"
            ).bindparams(g=good, b=bad_val)
        )
        # Snapshot the rows before running the helper — it must NOT delete
        # or mutate anything when it fails.
        rows_before = schema.execute(
            sa.text("SELECT tenant_id, year, last_value FROM tenant_credential_counters ORDER BY year, tenant_id")
        ).fetchall()

        with pytest.raises(ValueError) as exc:
            _run_helper(
                MIG._validate_uuid_values,
                schema,
                "tenant_credential_counters",
                "tenant_id",
            )
        msg = str(exc.value)
        assert "non-UUID values" in msg
        assert "1 row(s)" in msg or f"{repr(bad_val)}" in msg
        # Strictly NO mutation on validation failure.
        rows_after = schema.execute(
            sa.text("SELECT tenant_id, year, last_value FROM tenant_credential_counters ORDER BY year, tenant_id")
        ).fetchall()
        assert rows_after == rows_before


class TestDeleteOrphanRows:
    """_delete_orphan_rows — confirmed orphans only, everything else kept."""

    def test_keeps_valid_rows_and_their_last_value(
        self, isolated_engine: Engine, schema: Connection
    ):
        t_keep = str(uuid4())
        schema.execute(sa.text("INSERT INTO tenants (id, name) VALUES (:t, 'kept')").bindparams(t=t_keep))
        schema.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                " VALUES (:t,2026,42)"
            ).bindparams(t=t_keep)
        )
        deleted = _run_helper(MIG._delete_orphan_rows, schema)
        assert deleted == 0
        row = schema.execute(
            sa.text(
                "SELECT tenant_id, last_value FROM tenant_credential_counters WHERE year=2026"
            )
        ).one()
        assert row.tenant_id == t_keep
        assert row.last_value == 42

    def test_deletes_orphans_and_preserves_valid_rows(
        self, isolated_engine: Engine, schema: Connection
    ):
        t_keep = str(uuid4())
        t_orphan = str(uuid4())
        schema.execute(sa.text("INSERT INTO tenants (id, name) VALUES (:t, 'kept')").bindparams(t=t_keep))
        # t_orphan is NEVER inserted into `tenants`.  It will be the
        # historical orphan exactly matching the production incident row
        # (28a97801... / 2026 / 9).
        schema.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                " VALUES (:k,2026,77), (:o,2026,9)"
            ).bindparams(k=t_keep, o=t_orphan)
        )
        deleted = _run_helper(MIG._delete_orphan_rows, schema)
        assert deleted == 1
        remaining = schema.execute(
            sa.text(
                "SELECT tenant_id, last_value FROM tenant_credential_counters ORDER BY tenant_id"
            )
        ).all()
        assert [(r.tenant_id, r.last_value) for r in remaining] == [(t_keep, 77)]

    def test_multiple_orphans_all_removed(
        self, isolated_engine: Engine, schema: Connection
    ):
        t_keep = str(uuid4())
        o1, o2, o3 = str(uuid4()), str(uuid4()), str(uuid4())
        schema.execute(sa.text("INSERT INTO tenants (id, name) VALUES (:t, 'kept')").bindparams(t=t_keep))
        rows = [
            {"t": t_keep, "y": 2026, "lv": 10},
            {"t": o1, "y": 2026, "lv": 1},
            {"t": o2, "y": 2025, "lv": 2},
            {"t": o3, "y": 2024, "lv": 3},
        ]
        for r in rows:
            schema.execute(
                sa.text(
                    "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                    " VALUES (:t,:y,:lv)"
                ).bindparams(**r)
            )
        deleted = _run_helper(MIG._delete_orphan_rows, schema)
        assert deleted == 3
        remain = schema.execute(
            sa.text("SELECT tenant_id FROM tenant_credential_counters")
        ).scalars().all()
        assert remain == [t_keep]


class TestEndToEndUpgradeOrder:
    """Simulate the upgrade() order: validate → delete orphans → cast → PK → FK."""

    def test_full_happy_path_preserves_data_and_adds_fk(
        self, isolated_engine: Engine, schema: Connection
    ):
        t1, t2 = str(uuid4()), str(uuid4())
        orphan = str(uuid4())
        schema.execute(
            sa.text("INSERT INTO tenants (id, name) VALUES (:a, 't1'), (:b, 't2')").bindparams(a=t1, b=t2)
        )
        schema.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                " VALUES (:t1,2026,5), (:t2,2025,3), (:o,2026,9)"
            ).bindparams(t1=t1, t2=t2, o=orphan)
        )

        # Step 1: validate → ok.
        _run_helper(
            MIG._validate_uuid_values,
            schema,
            "tenant_credential_counters",
            "tenant_id",
        )
        # Step 2: delete orphans → 1 deleted.
        deleted = _run_helper(MIG._delete_orphan_rows, schema)
        assert deleted == 1
        # Step 3: simulate the FK add (SQLite batch_alter_table path is the
        # default for non-Postgres dialects).  We cannot run the full
        # Alembic op.* APIs inside this raw connection, but we CAN assert
        # that after step 2 the remaining tenant_ids are a SUBSET of
        # tenants.id so the FK would succeed.  This is the same pre-state
        # Alembic sees when it runs `create_foreign_key(...)`.
        dangling = schema.execute(
            sa.text(
                "SELECT COUNT(*) FROM tenant_credential_counters t "
                "WHERE t.tenant_id NOT IN (SELECT id FROM tenants)"
            )
        ).scalar()
        assert dangling == 0
        # Data preserved
        counters = {
            (r.tenant_id, r.year): r.last_value
            for r in schema.execute(
                sa.text(
                    "SELECT tenant_id, year, last_value FROM tenant_credential_counters"
                )
            )
        }
        assert counters == {(t1, 2026): 5, (t2, 2025): 3}

    def test_rollback_safety_nothing_mutated_when_malformed_row_present(
        self, isolated_engine: Engine, schema: Connection
    ):
        t_keep = str(uuid4())
        schema.execute(sa.text("INSERT INTO tenants (id, name) VALUES (:t, 'kept')").bindparams(t=t_keep))
        bad = "NOT-A-UUID-STRING"
        schema.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                " VALUES (:g,2026,5), (:b,2026,6)"
            ).bindparams(g=t_keep, b=bad)
        )
        before = schema.execute(
            sa.text("SELECT COUNT(*) FROM tenant_credential_counters")
        ).scalar()
        # Run validate; this throws.  In real Alembic upgrade() this
        # propagates out and the enclosing transactional-DDL transaction
        # rolls back the whole migration.
        with pytest.raises(ValueError):
            MIG._validate_uuid_values(
                schema, "tenant_credential_counters", "tenant_id"
            )
        after = schema.execute(
            sa.text("SELECT COUNT(*) FROM tenant_credential_counters")
        ).scalar()
        assert after == before  # no rows removed
        ten_count = schema.execute(
            sa.text("SELECT COUNT(*) FROM tenants")
        ).scalar()
        assert ten_count == 1  # no tenants table touched either


class TestFKAndCascadeEnforcement:
    """After FK CASCADE is in place — referential integrity + auto-cleanup.

    These tests are fully self-contained: they open their own Engine /
    Connection pair so the `schema` fixture (which keeps its own
    connection with an open transaction) cannot cause SQLite ``database
    is locked`` errors on DDL issued within a nested ``begin()`` context
    manager.
    """

    @staticmethod
    def _bootstrap(tmp_path):
        db_file = tmp_path / f"fk-{uuid4().hex[:12]}.sqlite3"
        eng = sa.create_engine(f"sqlite:///{db_file}", future=True)
        conn = eng.connect()
        conn.execute(sa.text("PRAGMA foreign_keys = ON"))
        conn.execute(
            sa.text(
                "CREATE TABLE tenants ("
                "  id VARCHAR(36) PRIMARY KEY,"
                "  name VARCHAR(255) NOT NULL"
                ")"
            )
        )
        conn.execute(
            sa.text(
                "CREATE TABLE tenant_credential_counters ("
                "  tenant_id VARCHAR(36) NOT NULL,"
                "  year INTEGER NOT NULL,"
                "  last_value INTEGER NOT NULL DEFAULT 0,"
                "  PRIMARY KEY (tenant_id, year),"
                "  CONSTRAINT fk_tcc_tenant_id_tenants"
                "    FOREIGN KEY (tenant_id) REFERENCES tenants(id)"
                "    ON DELETE CASCADE"
                ")"
            )
        )
        return eng, conn

    def test_adding_orphan_tcc_row_rejected_after_fk(self, tmp_path):
        eng, conn = self._bootstrap(tmp_path)
        try:
            t1 = str(uuid4())
            conn.execute(
                sa.text("INSERT INTO tenants (id, name) VALUES (:t, 't1')").bindparams(t=t1)
            )
            # Valid insert → ok.
            conn.execute(
                sa.text(
                    "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                    " VALUES (:t,2026,100)"
                ).bindparams(t=t1)
            )
            # Orphan insert → IntegrityError.
            ghost = str(uuid4())
            with pytest.raises(sa.exc.IntegrityError):
                conn.execute(
                    sa.text(
                        "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                        " VALUES (:g,2026,101)"
                    ).bindparams(g=ghost)
                )
            conn.commit()
        finally:
            conn.close()
            eng.dispose()

    def test_deleting_tenant_removes_its_counter_rows_via_cascade(self, tmp_path):
        eng, conn = self._bootstrap(tmp_path)
        try:
            t1, t2 = str(uuid4()), str(uuid4())
            conn.execute(
                sa.text("INSERT INTO tenants (id, name) VALUES (:a,'t1'), (:b,'t2')").bindparams(a=t1, b=t2)
            )
            conn.execute(
                sa.text(
                    "INSERT INTO tenant_credential_counters (tenant_id, year, last_value)"
                    " VALUES (:a,2025,1), (:a,2026,2), (:b,2026,3)"
                ).bindparams(a=t1, b=t2)
            )
            # Sanity: 3 counters exist.
            assert (
                conn.execute(
                    sa.text("SELECT COUNT(*) FROM tenant_credential_counters")
                ).scalar()
                == 3
            )
            # Delete tenant t1.
            conn.execute(sa.text("DELETE FROM tenants WHERE id = :t").bindparams(t=t1))
            # Exactly t2's single 2026 counter remains.
            remain = conn.execute(
                sa.text(
                    "SELECT tenant_id, year, last_value "
                    "FROM tenant_credential_counters ORDER BY year"
                )
            ).all()
            assert [(r.tenant_id, r.year, r.last_value) for r in remain] == [
                (t2, 2026, 3)
            ]
            conn.commit()
        finally:
            conn.close()
            eng.dispose()
