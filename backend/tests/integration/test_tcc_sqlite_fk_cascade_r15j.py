from __future__ import annotations

import importlib.util
import uuid
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


MIGRATION_PATH = (
    Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "20260921_normalize_tcc_sqlite_uuid_storage.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location(
        "r15j1c_tcc_uuid_normalize",
        MIGRATION_PATH,
    )
    module = importlib.util.module_from_spec(spec)

    assert spec.loader is not None
    spec.loader.exec_module(module)

    return module


def _install_operations(module, conn):
    context = MigrationContext.configure(conn)
    module.op = Operations(context)


def _create_schema(conn, fk_mode):
    conn.exec_driver_sql("PRAGMA foreign_keys = ON")

    conn.exec_driver_sql(
        """
        CREATE TABLE tenants (
            id VARCHAR(32) NOT NULL PRIMARY KEY
        )
        """
    )

    if fk_mode == "cascade":
        fk_sql = """
            , FOREIGN KEY (tenant_id)
              REFERENCES tenants(id)
              ON DELETE CASCADE
        """
    elif fk_mode == "restrict":
        fk_sql = """
            , FOREIGN KEY (tenant_id)
              REFERENCES tenants(id)
              ON DELETE RESTRICT
        """
    elif fk_mode == "missing":
        fk_sql = ""
    else:
        raise AssertionError(f"unknown fk_mode={fk_mode!r}")

    conn.exec_driver_sql(
        f"""
        CREATE TABLE tenant_credential_counters (
            tenant_id VARCHAR(36) NOT NULL,
            year INTEGER NOT NULL,
            last_value INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (tenant_id, year)
            {fk_sql}
        )
        """
    )

    conn.commit()


def _seed_historical_row(conn, tenant_id, last_value):
    compact = tenant_id.hex
    dashed = str(tenant_id)

    conn.exec_driver_sql(
        "INSERT INTO tenants (id) VALUES (?)",
        (compact,),
    )
    conn.commit()

    conn.exec_driver_sql("PRAGMA foreign_keys = OFF")

    assert (
        conn.exec_driver_sql("PRAGMA foreign_keys").scalar_one()
        == 0
    )

    conn.exec_driver_sql(
        """
        INSERT INTO tenant_credential_counters
            (tenant_id, year, last_value)
        VALUES (?, ?, ?)
        """,
        (dashed, 2026, last_value),
    )
    conn.commit()

    conn.exec_driver_sql("PRAGMA foreign_keys = ON")

    assert (
        conn.exec_driver_sql("PRAGMA foreign_keys").scalar_one()
        == 1
    )

    return compact


def _matching_fks(conn):
    rows = conn.exec_driver_sql(
        "PRAGMA foreign_key_list(tenant_credential_counters)"
    ).fetchall()

    return [
        row
        for row in rows
        if (
            str(row[2]).lower() == "tenants"
            and str(row[3]).lower() == "tenant_id"
            and str(row[4]).lower() == "id"
        )
    ]


def _assert_exact_fk_contract(conn):
    matches = _matching_fks(conn)

    assert len(matches) == 1
    assert str(matches[0][6]).upper() == "CASCADE"


def _assert_data_preserved(conn, compact, expected_last_value):
    row = conn.exec_driver_sql(
        """
        SELECT tenant_id, year, last_value
        FROM tenant_credential_counters
        WHERE year = 2026
        """
    ).one()

    assert row[0] == compact
    assert row[1] == 2026
    assert row[2] == expected_last_value


def _assert_fk_enforced(conn):
    with pytest.raises(sa.exc.IntegrityError):
        conn.exec_driver_sql(
            """
            INSERT INTO tenant_credential_counters
                (tenant_id, year, last_value)
            VALUES (?, ?, ?)
            """,
            (uuid.uuid4().hex, 2027, 1),
        )

    conn.rollback()


def _assert_parent_delete_cascades(conn, compact):
    conn.exec_driver_sql(
        "DELETE FROM tenants WHERE id = ?",
        (compact,),
    )
    conn.commit()

    remaining = conn.exec_driver_sql(
        """
        SELECT COUNT(*)
        FROM tenant_credential_counters
        WHERE tenant_id = ?
        """,
        (compact,),
    ).scalar_one()

    assert remaining == 0


@pytest.mark.parametrize(
    "fk_mode",
    [
        "missing",
        "restrict",
        "cascade",
    ],
)
def test_sqlite_fk_contract_is_exactly_one_cascade(
    tmp_path,
    fk_mode,
):
    module = _load_migration()

    db_path = tmp_path / f"{fk_mode}.sqlite"

    engine = sa.create_engine(
        f"sqlite:///{db_path}",
        future=True,
    )

    tenant_id = uuid.uuid4()

    with engine.connect() as conn:
        _create_schema(conn, fk_mode)

        compact = _seed_historical_row(
            conn,
            tenant_id,
            last_value=41,
        )

        _install_operations(module, conn)

        module._normalize_sqlite_rows(conn)
        module._verify_sqlite_contract(conn)
        module._reconcile_sqlite_fk(conn)

        _assert_data_preserved(
            conn,
            compact,
            expected_last_value=41,
        )

        _assert_exact_fk_contract(conn)
        _assert_fk_enforced(conn)
        _assert_parent_delete_cascades(conn, compact)


def test_correct_fk_is_idempotent_and_preserves_serial(
    tmp_path,
):
    module = _load_migration()

    db_path = tmp_path / "idempotent.sqlite"

    engine = sa.create_engine(
        f"sqlite:///{db_path}",
        future=True,
    )

    tenant_id = uuid.uuid4()

    with engine.connect() as conn:
        _create_schema(conn, "cascade")

        compact = _seed_historical_row(
            conn,
            tenant_id,
            last_value=73,
        )

        _install_operations(module, conn)

        module._normalize_sqlite_rows(conn)
        module._verify_sqlite_contract(conn)

        before = list(_matching_fks(conn))

        module._reconcile_sqlite_fk(conn)

        after = list(_matching_fks(conn))

        assert before == after

        _assert_data_preserved(
            conn,
            compact,
            expected_last_value=73,
        )

        _assert_exact_fk_contract(conn)


def test_reconstruction_failure_propagates(
    monkeypatch,
    tmp_path,
):
    module = _load_migration()

    db_path = tmp_path / "failure.sqlite"

    engine = sa.create_engine(
        f"sqlite:///{db_path}",
        future=True,
    )

    tenant_id = uuid.uuid4()

    with engine.connect() as conn:
        _create_schema(conn, "missing")

        _seed_historical_row(
            conn,
            tenant_id,
            last_value=19,
        )

        _install_operations(module, conn)

        module._normalize_sqlite_rows(conn)
        module._verify_sqlite_contract(conn)

        class FailingBatch:
            def __enter__(self):
                raise RuntimeError(
                    "synthetic SQLite reconstruction failure"
                )

            def __exit__(self, exc_type, exc, tb):
                return False

        monkeypatch.setattr(
            module.op,
            "batch_alter_table",
            lambda *args, **kwargs: FailingBatch(),
        )

        with pytest.raises(
            RuntimeError,
            match="synthetic SQLite reconstruction failure",
        ):
            module._reconcile_sqlite_fk(conn)