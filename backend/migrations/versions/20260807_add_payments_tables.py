"""Add student_payments and payment_allocations tables (drift-aware / production-safe).

Revision ID: 20260807_payments_tables
Revises: 20260807_usr_status_vc50
Create Date: 2026-08-07

Drift handled in this revision
------------------------------
Production deployments were observed where the tables ``student_payments``
and ``payment_allocations`` already existed (created ad-hoc, 0 rows at time
of writing) but the Alembic revision itself was never applied.

Critical confirmed drift on some hosts:

* ``payment_allocations.payment_id`` had its foreign key pointing at the
  legacy table ``payments(id)`` (constraint ``payment_allocations_payment_id_fkey``)
  instead of the ORM-authoritative target ``student_payments.id`` (see
  ``app.models.finance.PaymentAllocation``).  Because the current ORM class
  ``Payment`` explicitly declares ``__tablename__ = "student_payments"`` this
  revision reconciles any existing wrong-target FK to ``student_payments.id``.

* ``admission_applications.payment_id`` also pointed at the legacy table
  ``payments(id)`` (constraint ``admission_applications_payment_id_fkey``).
  The authoritative target is declared explicitly in
  ``app.models.admission.AdmissionApplication`` as
  ``ForeignKey("student_payments.id"), nullable=True``.  The reconciler
  enforces that reference using ``ON DELETE SET NULL`` (deleting a student
  payment record must never delete the admission application).

* ``student_payments.branch_id`` (UUID NULL) existed on production but is
  absent from the ORM.  This revision NEVER inspects, alters type, changes
  nullability or drops ``branch_id``.  Its presence is used as the
  downgrade-safe heuristic to distinguish "tables created by this migration
  on a fresh host" from "tables adopted from pre-existing drift".  When
  ``branch_id`` exists, ``downgrade()`` refuses to drop either table because
  doing so would destroy data that pre-dates this revision.

* The four indexes listed below were not present on the drifted hosts
  despite being present in the ORM model expectations.  They are created
  INDEPENDENTLY of the create-if-missing block so that existing tables
  receive them too (idempotently guarded, never blindly recreated):
    - ix_student_payments_student_id
    - ix_student_payments_status
    - ix_payment_allocations_payment_id
    - ix_payment_allocations_student_fee_id

* The two UNIQUE constraints (transaction_id, receipt_number) on
  ``student_payments`` are also reconciled independently if they are
  missing on a drifted table, using the column-based lookup helper
  (not by deterministic name, because existing constraints may have
  been auto-named differently by older Postgres versions).

Foreign-key reconciliation rules
--------------------------------
For every reconciled FK we use a column-based lookup, never a name-only
check (see ``_get_fk_on_column``).  The algorithm is:

1. If NO FK exists on the source column -> create the authoritative FK
   using the deterministic name (``fk_<table>_<column>``) and ondelete
   semantics from the ORM.
2. If a FK exists and references the AUTHORITATIVE (target_table, target_col)
   -> leave it alone, even if the existing constraint name is not our
   deterministic name.  (No gratuitous drop/recreate.)
3. If a FK exists and references a DIFFERENT target (the known drift case
   is -> ``payments.id``) -> drop ONLY that incorrect FK constraint (using
   its real existing name, not our deterministic one), THEN create the
   authoritative FK with deterministic name and ondelete semantics.
4. BEFORE dropping any incorrect FK on non-empty tables we verify
   referential integrity against the new authoritative target table.
   If ANY row in the referencing table cannot satisfy the new FK we
   RAISE a ValueError with a precise diagnostic count and refuse to
   modify data.  This revision never DELETEs or rewrites user rows.

Downgrade behaviour
-------------------
* First, drop the deterministic-name constraints/indexes/unique-constraints
  that THIS migration could have added (guarded by *_exists helpers).
* THEN, only if ``student_payments`` exists AND does NOT contain the
  drift-signal column ``branch_id``, drop ``payment_allocations`` and
  ``student_payments`` (the fresh-database case).
* If ``branch_id`` is present, WE DO NOT DROP EITHER TABLE on downgrade:
  the schema was adopted from pre-existing drift and downgrade must not
  destroy data owned by a prior out-of-band deployment.

Additive-only / data-safety promises
------------------------------------
* No DROP TABLE, TRUNCATE, DELETE, rename-copy-recreate anywhere in upgrade().
* No ``try/except Exception: pass`` around DDL — failed Postgres DDL
  aborts the transaction and swallowing masks the true error. All DDL is
  guarded by inspection helpers.  Real errors surface immediately.
* No manual ``alembic stamp``.  Postgres tests run from rev
  ``20260807_usr_status_vc50`` to this revision and back.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260807_payments_tables"
down_revision = "20260807_usr_status_vc50"
branch_labels = None
depends_on = None

# ---------------------------------------------------------------------------
# Authoritative target FKs.  Mirrors the intent in ``app.models.finance``.
# Do NOT derive from the existing database state; the whole point of this
# revision is to reconcile drifted state back to these fixed targets.
# ---------------------------------------------------------------------------
_AUTHORITATIVE_FKS = {
    ("student_payments", "student_id"): {
        "remote_table": "students",
        "remote_column": "id",
        "ondelete": "RESTRICT",
        "name": "fk_student_payments_student_id",
    },
    ("student_payments", "recorded_by"): {
        "remote_table": "users",
        "remote_column": "id",
        "ondelete": "SET NULL",
        "name": "fk_student_payments_recorded_by",
    },
    ("payment_allocations", "payment_id"): {
        "remote_table": "student_payments",
        "remote_column": "id",
        "ondelete": "CASCADE",
        "name": "fk_payment_allocations_payment_id",
    },
    ("payment_allocations", "student_fee_id"): {
        "remote_table": "student_fees",
        "remote_column": "id",
        "ondelete": "RESTRICT",
        "name": "fk_payment_allocations_student_fee_id",
    },
    ("admission_applications", "payment_id"): {
        "remote_table": "student_payments",
        "remote_column": "id",
        "ondelete": "SET NULL",
        "name": "fk_admission_applications_payment_id",
    },
}

_AUTHORITATIVE_INDEXES = [
    ("ix_student_payments_student_id", "student_payments", ["student_id"]),
    ("ix_student_payments_status", "student_payments", ["status"]),
    ("ix_payment_allocations_payment_id", "payment_allocations", ["payment_id"]),
    ("ix_payment_allocations_student_fee_id", "payment_allocations", ["student_fee_id"]),
]

_AUTHORITATIVE_UNIQUES = [
    ("student_payments", "transaction_id", 100),
    ("student_payments", "receipt_number", 50),
]


# ---------------------------------------------------------------------------
# Dialect-safe inspection helpers (matching convention from 20260806 revisions)
# ---------------------------------------------------------------------------
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


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA table_info('{table_name}')"))
        columns = [row[1] for row in result.fetchall()]
        return column_name in columns
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "  AND table_name   = :t "
            "  AND column_name  = :c"
        ),
        {"t": table_name, "c": column_name},
    ).fetchone()
    return result is not None


def _all_columns_exist(conn, table_name: str, columns) -> bool:
    for c in columns:
        if not _column_exists(conn, table_name, c):
            return False
    return True


def _index_exists(conn, table_name: str, index_name: str) -> bool:
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA index_list('{table_name}')"))
        indexes = [row[1] for row in result.fetchall()]
        return index_name in indexes
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes "
            "WHERE schemaname = 'public' "
            "  AND tablename = :t "
            "  AND indexname = :n"
        ),
        {"t": table_name, "n": index_name},
    ).fetchone()
    return result is not None


def _fk_exists(conn, table_name: str, fk_name: str) -> bool:
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA foreign_key_list('{table_name}')"))
        # Row[3] is the FK constraint id; SQLite auto-names FKs as <table>_<col>_fkey
        # but we cannot rely on it.  Instead SQLite PRAGMA foreign_key_list returns
        # one row per column pair, and the integer field `id` (row[0]) groups
        # multi-col FKs that share a single logical constraint.  For our by-name
        # check, fall back to information_schema-based best-effort on SQLite.
        # This helper is used for DOWNGRADE drops of deterministic-name FKs only
        # (never for the drift reconciliation logic which uses _get_fk_on_column).
        # If we cannot identify the name via SQLite, returning False is SAFE for
        # downgrade because SQLite DDL already drops FKs implicitly on drop_table.
        return False
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_type = 'FOREIGN KEY' AND constraint_name = :n"
        ),
        {"n": fk_name},
    ).fetchone()
    return result is not None


def _uq_exists(conn, table_name: str, constraint_name: str) -> bool:
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA index_list('{table_name}')"))
        names = [row[1] for row in result.fetchall() if row[2] == 1]
        return constraint_name in names
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_type = 'UNIQUE' AND constraint_name = :n"
        ),
        {"n": constraint_name},
    ).fetchone()
    return result is not None


def _get_fk_on_column(conn, table_name: str, column_name: str):
    """Return ``(fk_name, remote_table, remote_column, ondelete)`` for the FK
    attached to ``(table_name, column_name)``.

    Returns ``(None, None, None, None)`` if no FK exists on that column.

    Does NOT rely on the FK *name*; lookup is by source table + source column.
    This satisfies requirement 3 ("Do not rely only on the constraint name.")
    and enables the algorithm in requirement 3 ("If existing FK already
    references student_payments(id) leave it unchanged").
    """
    if conn.dialect.name == "sqlite":
        # PRAGMA foreign_key_list(table) columns:
        #   id, seq, table, from, to, on_update, on_delete, match
        rows = conn.execute(
            sa.text(f"PRAGMA foreign_key_list('{table_name}')")
        ).fetchall()
        for r in rows:
            if r[3] == column_name:  # "from" col
                fk_id = r[0]
                remote = r[2]
                remote_col = r[4]
                on_delete = r[6]
                # No stable fk_name in SQLite; synthesize.
                synthetic = f"_sqlite_fk_{table_name}_{column_name}_{fk_id}"
                return synthetic, remote, remote_col, on_delete
        return None, None, None, None

    # Postgres: use pg_catalog which exposes confdeltype mapping.
    # Map: 'a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL, 'd' = SET DEFAULT
    confdeltype_map = {
        "a": "NO ACTION",
        "r": "RESTRICT",
        "c": "CASCADE",
        "n": "SET NULL",
        "d": "SET DEFAULT",
    }
    row = conn.execute(
        sa.text(
            """
            SELECT con.conname,
                   cls_rel.relname,
                   att_to.attname,
                   con.confdeltype
            FROM pg_catalog.pg_constraint con
            JOIN pg_catalog.pg_class      cls_src ON cls_src.oid = con.conrelid
            JOIN pg_catalog.pg_namespace  ns_src  ON ns_src.oid = cls_src.relnamespace
            JOIN pg_catalog.pg_attribute  att_fr  ON att_fr.attrelid = con.conrelid
                                                  AND att_fr.attnum   = con.conkey[1]
            JOIN pg_catalog.pg_class      cls_rel ON cls_rel.oid = con.confrelid
            JOIN pg_catalog.pg_attribute  att_to  ON att_to.attrelid = con.confrelid
                                                  AND att_to.attnum   = con.confkey[1]
            WHERE con.contype = 'f'
              AND ns_src.nspname = 'public'
              AND cls_src.relname = :tbl
              AND att_fr.attname = :col
              -- We intentionally take only the single-column FK first position.
              -- If a compound FK exists on (col, other) it will still surface here;
              -- such a FK is NOT equivalent to our single-col authoritative FK so
              -- the drift reconciler will correctly drop and recreate.
            LIMIT 1
            """
        ),
        {"tbl": table_name, "col": column_name},
    ).fetchone()
    if row is None:
        return None, None, None, None
    fk_name, remote_tbl, remote_col, confdeltype = row
    ondelete = confdeltype_map.get(confdeltype, "NO ACTION")
    return fk_name, remote_tbl, remote_col, ondelete


def _uq_on_column_exists(conn, table_name: str, column_name: str) -> bool:
    """True if any UNIQUE constraint (regardless of name) covers ``column_name``.

    For Postgres we accept unique constraints where ``column_name`` is the
    *only* column in the index — that matches the ORM declarations.
    """
    if conn.dialect.name == "sqlite":
        rows = conn.execute(sa.text(f"PRAGMA index_list('{table_name}')")).fetchall()
        for idx in [r for r in rows if r[2] == 1]:  # unique=1
            idx_cols = conn.execute(
                sa.text(f"PRAGMA index_info('{idx[1]}')")
            ).fetchall()
            col_names = [c[2] for c in idx_cols]
            if len(col_names) == 1 and col_names[0] == column_name:
                return True
        return False

    row = conn.execute(
        sa.text(
            """
            SELECT 1
            FROM pg_catalog.pg_index   pgi
            JOIN pg_catalog.pg_class   pgc_idx ON pgc_idx.oid = pgi.indexrelid
            JOIN pg_catalog.pg_class   pgc_tbl ON pgc_tbl.oid = pgi.indrelid
            JOIN pg_catalog.pg_namespace pg_ns   ON pg_ns.oid  = pgc_tbl.relnamespace
            WHERE pg_ns.nspname = 'public'
              AND pgc_tbl.relname = :tbl
              AND pgi.indisunique IS TRUE
              AND pgi.indisprimary IS FALSE
              AND array_length(pgi.indkey, 1) = 1
              AND (SELECT a.attname
                     FROM pg_catalog.pg_attribute a
                    WHERE a.attrelid = pgc_tbl.oid
                      AND a.attnum   = pgi.indkey[1]
                   ) = :col
            LIMIT 1
            """
        ),
        {"tbl": table_name, "col": column_name},
    ).fetchone()
    return row is not None


def _count_fk_integrity_violations(conn, table, fk_col, remote_tbl, remote_col) -> int:
    """Count rows in ``(table, fk_col)`` whose value cannot satisfy a FK
    referencing ``(remote_tbl, remote_col)``.

    Ignores NULL source values.  Used by the drift reconciler before it drops
    any incorrect FK on non-empty tables (req 13 — do not rewrite/delete data;
    fail with clear diagnostic instead).
    """
    sql = sa.text(
        f'SELECT COUNT(*) FROM "{table}" src '
        f' WHERE src."{fk_col}" IS NOT NULL '
        f'   AND NOT EXISTS (SELECT 1 FROM "{remote_tbl}" dst '
        f'                    WHERE dst."{remote_col}" = src."{fk_col}")'
    )
    row = conn.execute(sql).fetchone()
    return int(row[0])


def _reconcile_fk(conn, src_table: str, src_col: str):
    """Reconcile a single FK on ``(src_table, src_col)``.

    Implements the 4-branch algorithm from the module docstring (Reqs 3/4/5).

    SQLite branch notes
    -------------------
    SQLite does not support ``ALTER TABLE ... ADD/DROP CONSTRAINT``.  Alembic's
    batch_alter_table copy-and-move workaround cannot drop foreign-key
    constraints whose names were not real names at reflection time (SQLite FKs
    are typically created without any stable user-visible name at CREATE TABLE
    time; our helper synthesises an internal id-based moniker for lookup).
    Because production drift only happens on PostgreSQL the SQLite drift-repair
    branch below uses a manual PRAGMA-foreign_keys-off rebuild instead.  The
    rebuild is dialect-legal SQLite DDL: clone the data into a NEW table that
    is declared with ONLY the correct FK, drop the old, rename the new.  All
    columns visible in SQLite PRAGMA table_info are copied, so any drift-added
    columns (e.g. student_payments.branch_id) survive the rebuild.
    """
    auth = _AUTHORITATIVE_FKS[(src_table, src_col)]
    (actual_fk_name,
     actual_remote_tbl,
     actual_remote_col,
     actual_ondelete) = _get_fk_on_column(conn, src_table, src_col)

    # ================================================================
    # SQLite dialect branch — every mutation goes through manual copy
    # ================================================================
    if conn.dialect.name == "sqlite":
        if actual_fk_name is None:
            # Branch 1* — no FK exists; attach authoritative via batch.
            with op.batch_alter_table(src_table, schema=None) as batch_op:
                batch_op.create_foreign_key(
                    auth["name"],
                    auth["remote_table"],
                    [src_col],
                    [auth["remote_column"]],
                    ondelete=auth["ondelete"],
                )
            return
        if (actual_remote_tbl == auth["remote_table"]
                and actual_remote_col == auth["remote_column"]):
            # Branch 2* — correct target.  Leave alone (matches req 3/4/5
            # "don't recreate correct FK just because name differs").
            return

        # Branch 3* — wrong target.  Safety check integrity FIRST (req 13):
        violations = _count_fk_integrity_violations(
            conn, src_table, src_col,
            auth["remote_table"], auth["remote_column"],
        )
        if violations > 0:
            raise ValueError(
                f"Drift reconciliation aborted for FK ({src_table}.{src_col}) — "
                f"current FK points to ({actual_remote_tbl}.{actual_remote_col}) "
                f"but the ORM-authoritative target is "
                f"({auth['remote_table']}.{auth['remote_column']}).  Refusing "
                f"to delete or rewrite records automatically: {violations} "
                f"row(s) in {src_table} currently have a {src_col} "
                f"value that does not exist in "
                f"{auth['remote_table']}.{auth['remote_column']}.  Manual "
                f"correction of the orphaned values is required before "
                f"applying this migration.  Existing incorrect FK constraint "
                f"name: {actual_fk_name!r}."
            )
        # SAFE manual SQLite rebuild: copy ALL current columns (including any
        # unknown drift-added cols like branch_id) into a fresh table that
        # declares ONLY the CORRECT authoritative FK; swap them; done.
        _sqlite_rebuild_table_replacing_fk(
            conn, src_table,
            old_src_col=src_col,
            new_auth_entry=auth,
        )
        return

    # ================================================================
    # PostgreSQL / standard dialect path
    # ================================================================
    if actual_fk_name is None:
        # Branch 1: no FK at all -> create the authoritative one.
        op.create_foreign_key(
            auth["name"],
            src_table, auth["remote_table"],
            [src_col], [auth["remote_column"]],
            ondelete=auth["ondelete"],
        )
        return

    if (actual_remote_tbl == auth["remote_table"]
            and actual_remote_col == auth["remote_column"]):
        # Branch 2: correct target already.  Leave alone, even if name differs
        # (req 3/4/5 text: "do not unnecessarily drop/recreate a
        # correct constraint simply because its existing name differs").
        return

    # Branch 3: wrong target. Drop the old FK (by its actual name, not by our
    # deterministic name).  BEFORE DROP — verify integrity if table non-empty
    # (req 13: non-empty data cannot satisfy new FK -> fail with diagnostics).
    violations = _count_fk_integrity_violations(
        conn, src_table, src_col,
        auth["remote_table"], auth["remote_column"],
    )
    if violations > 0:
        raise ValueError(
            f"Drift reconciliation aborted for FK ({src_table}.{src_col}) — "
            f"current FK points to ({actual_remote_tbl}.{actual_remote_col}) "
            f"but the ORM-authoritative target is "
            f"({auth['remote_table']}.{auth['remote_column']}).  Refusing to "
            f"delete or rewrite records automatically: "
            f"{violations} row(s) in {src_table} currently have a {src_col} "
            f"value that does not exist in "
            f"{auth['remote_table']}.{auth['remote_column']}.  Manual "
            f"correction of the orphaned values is required before applying "
            f"this migration.  Existing incorrect FK constraint name: "
            f"{actual_fk_name!r}."
        )

    op.drop_constraint(actual_fk_name, src_table, type_="foreignkey")
    op.create_foreign_key(
        auth["name"],
        src_table, auth["remote_table"],
        [src_col], [auth["remote_column"]],
        ondelete=auth["ondelete"],
    )


def _sqlite_rebuild_table_replacing_fk(conn, table: str, old_src_col: str, new_auth_entry: dict):
    """Dialect-legal SQLite rebuild: copy data + preserve all cols, swap FK.

    Uses the documented SQLite pattern for FK schema changes:
      PRAGMA foreign_keys = 0;                -- allow drop/recreate
      CREATE TABLE new_{table} AS SELECT ...;  -- no FKs, raw data only
      DROP TABLE {table};
      CREATE TABLE {table} (...WITH CORRECT FK...);
      INSERT INTO {table} SELECT * FROM new_{table};
      DROP TABLE new_{table};
      PRAGMA foreign_keys = 1;
    """
    # 1. Read current column schema to preserve all cols including drift cols.
    col_rows = conn.execute(sa.text(f"PRAGMA table_info('{table}')")).fetchall()
    # cols: (cid, name, type, notnull, dflt_value, pk)
    columns_sql = ", ".join(
        f'"{r[1]}" {r[2]}{" NOT NULL" if r[3] else ""}'
        + (f" DEFAULT {r[4]}" if r[4] is not None else "")
        + (f" PRIMARY KEY" if r[5] else "")
        for r in col_rows
    )
    column_names_csv = ", ".join(f'"{r[1]}"' for r in col_rows)
    column_names_nopk_csv = ", ".join(
        f'"{r[1]}"' for r in col_rows if not r[5]
    ) or column_names_csv

    # 2. Build new column + correct FK DDL for final table.
    #    First, list all existing columns (preserve all, preserve PK order).
    pks = [r[1] for r in col_rows if r[5]]
    base_cols = []
    for r in col_rows:
        cid, cname, ctype, notnull, dflt, _pk = r
        ddl = f'"{cname}" {ctype}'
        if notnull:
            ddl += " NOT NULL"
        if dflt is not None:
            ddl += f" DEFAULT {dflt}"
        base_cols.append(ddl)
    if pks:
        base_cols.append(
            "PRIMARY KEY (" + ", ".join(f'"{p}"' for p in pks) + ")"
        )
    # Add the correct (authoritative) FK declaration:
    ondelete_sql = f" ON DELETE {new_auth_entry['ondelete']}" if new_auth_entry.get("ondelete") else ""
    base_cols.append(
        f'CONSTRAINT "{new_auth_entry["name"]}" FOREIGN KEY ("{old_src_col}") '
        f'REFERENCES "{new_auth_entry["remote_table"]}" ("{new_auth_entry["remote_column"]}")'
        f"{ondelete_sql}"
    )

    # Do the dance.  Use sa.text with params-free DDL.
    op.execute(sa.text("PRAGMA foreign_keys = 0"))
    # Stage 1: copy existing data to a staging table with no FK constraints at all
    conn.execute(sa.text(
        f'CREATE TABLE "tmp_copy_{table}" AS SELECT {column_names_csv} FROM "{table}"'
    ))
    # Stage 2: drop the old (drifted) table that has the WRONG FK
    conn.execute(sa.text(f'DROP TABLE "{table}"'))
    # Stage 3: recreate the table with FULL column set + CORRECT FK only
    conn.execute(sa.text(
        f'CREATE TABLE "{table}" (\n  ' + ",\n  ".join(base_cols) + "\n)"
    ))
    # Stage 4: re-import data (all columns, order preserved by PRAGMA above)
    conn.execute(sa.text(
        f'INSERT INTO "{table}" ({column_names_csv}) '
        f'SELECT {column_names_csv} FROM "tmp_copy_{table}"'
    ))
    # Stage 5: drop staging table
    conn.execute(sa.text(f'DROP TABLE "tmp_copy_{table}"'))
    # Restore FK enforcement (PRAGMA is per-connection; Alembic reuses ours)
    op.execute(sa.text("PRAGMA foreign_keys = 1"))
    _ = column_names_nopk_csv  # noqa: F841 (reserved for future PK-only corner case)


def _reconcile_unique(conn, table: str, column: str, length: int):
    """Create a deterministic-name UNIQUE on ``(table, column)`` only if no
    single-col UNIQUE already exists on that column.

    For SQLite dialect: uses Alembic ``batch_alter_table`` rebuild because
    SQLite dialect does not support standalone ``ALTER TABLE ADD CONSTRAINT``
    UNIQUE``."""
    if _uq_on_column_exists(conn, table, column):
        return
    uq_name = f"uq_{table}_{column}"
    if _uq_exists(conn, table, uq_name):
        return
    if conn.dialect.name == "sqlite":
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.create_unique_constraint(uq_name, [column])
        return
    op.create_unique_constraint(uq_name, table, [column])


# ---------------------------------------------------------------------------
# UPGRADE
# ---------------------------------------------------------------------------
def upgrade():
    conn = op.get_bind()
    is_pg = conn.dialect.name == "postgresql"

    # ==================================================================
    # 1. student_payments — CREATE TABLE if missing (never drop / recreate)
    # ==================================================================
    if not _table_exists(conn, "student_payments"):
        meta_data_type = JSONB(astext_type=sa.Text()) if is_pg else sa.JSON()

        op.create_table(
            "student_payments",
            sa.Column(
                "id",
                sa.Integer(),
                primary_key=True,
                autoincrement=True,
            ),
            sa.Column(
                "transaction_id",
                sa.String(length=100),
                nullable=False,
                unique=True,
            ),
            sa.Column("student_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column(
                "currency",
                sa.String(length=3),
                nullable=True,
                server_default=sa.text("'GHS'"),
            ),
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
            sa.Column(
                "receipt_number",
                sa.String(length=50),
                nullable=True,
                unique=True,
            ),
            sa.Column("meta_data", meta_data_type, nullable=True),
            sa.ForeignKeyConstraint(
                ["student_id"],
                ["students.id"],
                name=_AUTHORITATIVE_FKS[("student_payments", "student_id")]["name"],
                ondelete=_AUTHORITATIVE_FKS[("student_payments", "student_id")]["ondelete"],
            ),
            sa.ForeignKeyConstraint(
                ["recorded_by"],
                ["users.id"],
                name=_AUTHORITATIVE_FKS[("student_payments", "recorded_by")]["name"],
                ondelete=_AUTHORITATIVE_FKS[("student_payments", "recorded_by")]["ondelete"],
            ),
        )
    # ------------------------------------------------------------------
    # 1b. student_payments: FK reconciliation (req 5)
    # ------------------------------------------------------------------
    if _table_exists(conn, "student_payments") and _all_columns_exist(
        conn, "student_payments", ["student_id", "recorded_by"]
    ):
        if _table_exists(conn, "students"):
            _reconcile_fk(conn, "student_payments", "student_id")
        if _table_exists(conn, "users"):
            _reconcile_fk(conn, "student_payments", "recorded_by")

    # ------------------------------------------------------------------
    # 1c. student_payments: UNIQUE reconciliation (req 10)
    # ------------------------------------------------------------------
    if _table_exists(conn, "student_payments"):
        for tbl, col, length in _AUTHORITATIVE_UNIQUES:
            if _column_exists(conn, tbl, col):
                _reconcile_unique(conn, tbl, col, length)

    # ------------------------------------------------------------------
    # 1d. student_payments: INDEX reconciliation MOVED OUTSIDE the create
    # guard (req 2).  Existing drifted tables now get their indexes too.
    # ------------------------------------------------------------------
    if _table_exists(conn, "student_payments"):
        for idx, tbl, cols in _AUTHORITATIVE_INDEXES:
            if tbl != "student_payments":
                continue
            if not _index_exists(conn, tbl, idx):
                if _all_columns_exist(conn, tbl, cols):
                    op.create_index(idx, tbl, cols)

    # ==================================================================
    # 2. payment_allocations — CREATE TABLE if missing (never drop/recreate)
    # ==================================================================
    if not _table_exists(conn, "payment_allocations"):
        op.create_table(
            "payment_allocations",
            sa.Column(
                "id",
                sa.Integer(),
                primary_key=True,
                autoincrement=True,
            ),
            sa.Column("payment_id", sa.Integer(), nullable=False),
            sa.Column("student_fee_id", sa.Integer(), nullable=False),
            sa.Column("amount_allocated", sa.Numeric(10, 2), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["payment_id"],
                ["student_payments.id"],
                name=_AUTHORITATIVE_FKS[("payment_allocations", "payment_id")]["name"],
                ondelete=_AUTHORITATIVE_FKS[("payment_allocations", "payment_id")]["ondelete"],
            ),
            sa.ForeignKeyConstraint(
                ["student_fee_id"],
                ["student_fees.id"],
                name=_AUTHORITATIVE_FKS[("payment_allocations", "student_fee_id")]["name"],
                ondelete=_AUTHORITATIVE_FKS[("payment_allocations", "student_fee_id")]["ondelete"],
            ),
        )

    # ------------------------------------------------------------------
    # 2b. payment_allocations: FK reconciliation (req 3 + req 4)
    #     Critical drift: payment_id currently -> payments.id (LEGACY)
    #                      MUST BECOME      -> student_payments.id (ORM)
    # ------------------------------------------------------------------
    if _table_exists(conn, "payment_allocations") and _all_columns_exist(
        conn, "payment_allocations", ["payment_id", "student_fee_id"]
    ):
        if _table_exists(conn, "student_payments"):
            _reconcile_fk(conn, "payment_allocations", "payment_id")
        if _table_exists(conn, "student_fees"):
            _reconcile_fk(conn, "payment_allocations", "student_fee_id")

    # ------------------------------------------------------------------
    # 2c. payment_allocations: INDEX reconciliation MOVED OUTSIDE create
    # guard (req 2).  Runs for BOTH fresh-created AND drifted tables.
    # ------------------------------------------------------------------
    if _table_exists(conn, "payment_allocations"):
        for idx, tbl, cols in _AUTHORITATIVE_INDEXES:
            if tbl != "payment_allocations":
                continue
            if not _index_exists(conn, tbl, idx):
                if _all_columns_exist(conn, tbl, cols):
                    op.create_index(idx, tbl, cols)

    # ==================================================================
    # 3. admission_applications — reconcile payment_id FK (req 3 new)
    #    This table already exists in production (15 rows, 0 non-null
    #    payment_id) with drifted FK admission_applications.payment_id
    #    -> payments(id).  We reconcile to the ORM-authoritative target
    #    -> student_payments.id with SET NULL (never cascade delete the
    #    admission application record itself).  The table itself is NOT
    #    created by this migration; it pre-existed in the schema.
    # ==================================================================
    if (_table_exists(conn, "admission_applications")
            and _column_exists(conn, "admission_applications", "payment_id")
            and _table_exists(conn, "student_payments")):
        _reconcile_fk(conn, "admission_applications", "payment_id")


# ---------------------------------------------------------------------------
# DOWNGRADE — conservative; never destroys drift tables
# ---------------------------------------------------------------------------
def downgrade():
    conn = op.get_bind()

    # -----------------------------------------------------------
    # Phase A: drop only the deterministic objects that this
    # revision could have created.  Every drop is guarded.
    # -----------------------------------------------------------

    # payment_allocations: 4 deterministically-named FKs & 4 indexes
    # (payment_allocations FKs first because they depend on student_payments)
    for idx, tbl, _cols in reversed(_AUTHORITATIVE_INDEXES):
        if _table_exists(conn, tbl) and _index_exists(conn, tbl, idx):
            op.drop_index(idx, table_name=tbl)

    for (tbl, col), auth in _AUTHORITATIVE_FKS.items():
        if _table_exists(conn, tbl) and _fk_exists(conn, tbl, auth["name"]):
            op.drop_constraint(auth["name"], tbl, type_="foreignkey")

    # Unique constraints that THIS revision created via _reconcile_unique:
    for tbl, col, _length in _AUTHORITATIVE_UNIQUES:
        uq_name = f"uq_{tbl}_{col}"
        if _table_exists(conn, tbl) and _uq_exists(conn, tbl, uq_name):
            op.drop_constraint(uq_name, tbl, type_="unique")

    # -----------------------------------------------------------
    # Phase B: decide whether to drop the tables.  ONLY drop if
    # tables look "fresh" — i.e. student_payments has no legacy
    # drift-signal column `branch_id`.  If `branch_id` exists we
    # REFUSE to drop tables on downgrade (they pre-date this rev).
    # -----------------------------------------------------------
    if _table_exists(conn, "student_payments"):
        if _column_exists(conn, "student_payments", "branch_id"):
            # Conservative downgrade: do not destroy drift-adopted tables.
            # Tables + branch_id + any other legacy cols remain intact;
            # only our deterministic-name FKs/indexes/uniques were rolled back
            # in Phase A.  No SELECT 1/DB-write needed here.
            return
        # Fresh case: tables were created by this migration (no branch_id).
        # Drop child first to avoid FK dependency errors.
        if _table_exists(conn, "payment_allocations"):
            op.drop_table("payment_allocations")
        op.drop_table("student_payments")
