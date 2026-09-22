from __future__ import annotations

import importlib.util
import pathlib
import sys
import uuid

import pytest
import sqlalchemy as sa


_MIGRATION_PATH = (
    pathlib.Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "20260921_normalize_tcc_sqlite_uuid_storage.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location(
        "tcc_uuid_normalize_r15h", str(_MIGRATION_PATH)
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MIG = _load_migration()


@pytest.fixture()
def engine(tmp_path):
    db_file = tmp_path / "r15h-tcc-normalization.sqlite3"
    eng = sa.create_engine(f"sqlite:///{db_file}", future=True)
    yield eng
    eng.dispose()


def _create_schema(conn):
    conn.execute(
        sa.text(
            "CREATE TABLE tenants ("
            "id VARCHAR(32) PRIMARY KEY, "
            "name VARCHAR(255) NOT NULL"
            ")"
        )
    )
    conn.execute(
        sa.text(
            "CREATE TABLE tenant_credential_counters ("
            "tenant_id VARCHAR(36) NOT NULL, "
            "year INTEGER NOT NULL, "
            "last_value INTEGER NOT NULL DEFAULT 0, "
            "PRIMARY KEY (tenant_id, year)"
            ")"
        )
    )


def _rows(conn):
    return conn.execute(
        sa.text(
            "SELECT tenant_id, year, last_value "
            "FROM tenant_credential_counters "
            "ORDER BY tenant_id, year"
        )
    ).all()


def test_dashed_live_tenant_normalizes_and_preserves_last_value(engine):
    tenant_id = uuid.uuid4()

    with engine.begin() as conn:
        _create_schema(conn)

        conn.execute(
            sa.text(
                "INSERT INTO tenants (id, name) VALUES (:id, 'tenant')"
            ),
            {"id": tenant_id.hex},
        )
        conn.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters "
                "(tenant_id, year, last_value) VALUES (:id, 2026, 7)"
            ),
            {"id": str(tenant_id)},
        )

        result = MIG._normalize_sqlite_rows(conn)
        MIG._verify_sqlite_contract(conn)

        assert result == {"rows_seen": 1, "orphans_deleted": 0}
        assert _rows(conn) == [(tenant_id.hex, 2026, 7)]


def test_confirmed_orphan_deleted_only_after_canonical_comparison(engine):
    live = uuid.uuid4()
    orphan = uuid.uuid4()

    with engine.begin() as conn:
        _create_schema(conn)

        conn.execute(
            sa.text(
                "INSERT INTO tenants (id, name) VALUES (:id, 'tenant')"
            ),
            {"id": live.hex},
        )

        conn.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters "
                "(tenant_id, year, last_value) "
                "VALUES (:live, 2026, 11), (:orphan, 2026, 9)"
            ),
            {
                "live": str(live),
                "orphan": str(orphan),
            },
        )

        result = MIG._normalize_sqlite_rows(conn)
        MIG._verify_sqlite_contract(conn)

        assert result == {"rows_seen": 2, "orphans_deleted": 1}
        assert _rows(conn) == [(live.hex, 2026, 11)]


@pytest.mark.parametrize(
    "bad_value",
    [
        "not-a-uuid",
        "",
        "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ",
        "28a97801-c23b-4559-90c1-4849fbee052",
    ],
)
def test_malformed_tcc_uuid_fails_before_any_mutation(engine, bad_value):
    tenant_id = uuid.uuid4()

    with engine.begin() as conn:
        _create_schema(conn)

        conn.execute(
            sa.text(
                "INSERT INTO tenants (id, name) VALUES (:id, 'tenant')"
            ),
            {"id": tenant_id.hex},
        )

        conn.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters "
                "(tenant_id, year, last_value) "
                "VALUES (:good, 2026, 7), (:bad, 2025, 3)"
            ),
            {
                "good": str(tenant_id),
                "bad": bad_value,
            },
        )

        before = _rows(conn)

        with pytest.raises(ValueError):
            MIG._normalize_sqlite_rows(conn)

        assert _rows(conn) == before


def test_canonical_pk_collision_fails_before_any_mutation(engine):
    tenant_id = uuid.uuid4()

    with engine.begin() as conn:
        _create_schema(conn)

        conn.execute(
            sa.text(
                "INSERT INTO tenants (id, name) VALUES (:id, 'tenant')"
            ),
            {"id": tenant_id.hex},
        )

        conn.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters "
                "(tenant_id, year, last_value) "
                "VALUES (:dashed, 2026, 7), (:compact, 2026, 99)"
            ),
            {
                "dashed": str(tenant_id),
                "compact": tenant_id.hex,
            },
        )

        before = _rows(conn)

        with pytest.raises(ValueError, match="duplicate"):
            MIG._normalize_sqlite_rows(conn)

        assert _rows(conn) == before


def test_malformed_tenant_uuid_also_fails_before_tcc_mutation(engine):
    tcc_id = uuid.uuid4()

    with engine.begin() as conn:
        _create_schema(conn)

        conn.execute(
            sa.text(
                "INSERT INTO tenants (id, name) "
                "VALUES (:good, 'good'), (:bad, 'bad')"
            ),
            {
                "good": tcc_id.hex,
                "bad": "not-a-valid-tenant-uuid",
            },
        )

        conn.execute(
            sa.text(
                "INSERT INTO tenant_credential_counters "
                "(tenant_id, year, last_value) "
                "VALUES (:id, 2026, 7)"
            ),
            {"id": str(tcc_id)},
        )

        before = _rows(conn)

        with pytest.raises(ValueError):
            MIG._normalize_sqlite_rows(conn)

        assert _rows(conn) == before