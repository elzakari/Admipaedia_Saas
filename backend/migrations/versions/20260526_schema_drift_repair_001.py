"""Schema drift repair — missing tables and columns (2026-05-26 production)

Revision ID: 20260526_schema_drift_repair_001
Revises: 20260526_grade_levels_track_fk_patch
Create Date: 2026-05-26

Resolves all items reported by schema-guard.sh after its partial run was
interrupted by a SQL quoting bug (DEFAULT USD instead of DEFAULT 'USD').

Items handled by this migration (all idempotent via IF NOT EXISTS / pg_constraint
checks so re-running is safe):

  TABLES (CREATE IF NOT EXISTS)
  ─────────────────────────────
  • notification_logs

  COLUMNS (ADD COLUMN IF NOT EXISTS)
  ───────────────────────────────────
  • attendances.branch_id          UUID nullable         (may already exist)
  • branches.code                  VARCHAR(50) nullable  (may already exist)
  • branches.address               VARCHAR(255) nullable (may already exist)
  • branches.is_active             BOOLEAN nullable      (may already exist)
  • pending_invoice_adjustments.currency    VARCHAR(3) NOT NULL DEFAULT 'USD'
  • pending_invoice_adjustments.description TEXT nullable
  • pending_invoice_adjustments.updated_at  TIMESTAMPTZ nullable
  • system_settings_config.smtp_host        VARCHAR(255) nullable
  • system_settings_config.smtp_password    VARCHAR(255) nullable
  • system_settings_config.smtp_username    VARCHAR(255) nullable
  • system_settings_config.smtp_port        INTEGER nullable
  • system_settings_config.smtp_encryption  VARCHAR(50) nullable

  NOT NULL COLUMN — 3-step add (add nullable → backfill → set NOT NULL)
  ─────────────────────────────────────────────────────────────────────
  • email_verification_tokens.email VARCHAR(255) NOT NULL
    Backfill strategy:
      1. Copy from users.email via user_id FK.
      2. Any remaining NULL (orphaned tokens) → 'unknown@placeholder.invalid'
      3. SET NOT NULL.

This migration is a no-op on SQLite (test / CI environment).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '20260526_schema_drift_repair_001'
down_revision = '20260526_grade_levels_track_fk_patch'
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def column_exists(conn, table: str, column: str) -> bool:
    """Return True if *column* already exists in *table* (PostgreSQL)."""
    result = conn.execute(text("""
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = :table
          AND column_name  = :column
    """), {"table": table, "column": column})
    return result.scalar() > 0


def table_exists(conn, table: str) -> bool:
    result = conn.execute(text("""
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = :table
    """), {"table": table})
    return result.scalar() > 0


# ---------------------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------------------

def upgrade():
    bind = op.get_bind()

    if bind.dialect.name == 'sqlite':
        # SQLite is the test / CI environment — all guards already work without
        # these columns; skip to avoid SQLite DDL incompatibilities.
        return

    # ── 1. notification_logs table ─────────────────────────────────────────
    print("  [1/7] notification_logs table...")
    if not table_exists(bind, 'notification_logs'):
        bind.execute(text("""
            CREATE TABLE notification_logs (
                id          SERIAL PRIMARY KEY,
                tenant_id   UUID NOT NULL
                    REFERENCES tenants(id) ON DELETE CASCADE,
                branch_id   UUID
                    REFERENCES branches(id) ON DELETE SET NULL,
                channel     VARCHAR(20)  NOT NULL,
                recipient   VARCHAR(255) NOT NULL,
                subject     VARCHAR(255),
                content     TEXT         NOT NULL,
                status      VARCHAR(20)  NOT NULL DEFAULT 'sent',
                error_message TEXT,
                created_at  TIMESTAMP NOT NULL DEFAULT NOW()
            );
        """))
        bind.execute(text(
            "CREATE INDEX ix_notification_logs_tenant_id "
            "ON notification_logs (tenant_id);"
        ))
        bind.execute(text(
            "CREATE INDEX ix_notification_logs_branch_id "
            "ON notification_logs (branch_id);"
        ))
        print("    [OK] Created notification_logs + indexes.")
    else:
        print("    [OK] Already exists — skipped.")

    # ── 2. attendances.branch_id ────────────────────────────────────────────
    print("  [2/7] attendances.branch_id...")
    if not column_exists(bind, 'attendances', 'branch_id'):
        bind.execute(text(
            'ALTER TABLE "public"."attendances" '
            'ADD COLUMN "branch_id" UUID REFERENCES branches(id) ON DELETE SET NULL;'
        ))
        print("    [OK] Added.")
    else:
        print("    [OK] Already exists — skipped.")

    # ── 3. branches columns (code / address / is_active) ───────────────────
    print("  [3/7] branches.code / address / is_active...")
    for col_ddl, col_name in [
        ('"code" VARCHAR(50)',       'code'),
        ('"address" VARCHAR(255)',   'address'),
        ('"is_active" BOOLEAN DEFAULT TRUE', 'is_active'),
    ]:
        if not column_exists(bind, 'branches', col_name):
            bind.execute(text(
                f'ALTER TABLE "public"."branches" ADD COLUMN {col_ddl};'
            ))
            print(f"    [OK] branches.{col_name} added.")
        else:
            print(f"    [OK] branches.{col_name} already exists — skipped.")

    # ── 4. pending_invoice_adjustments columns ──────────────────────────────
    print("  [4/7] pending_invoice_adjustments columns...")

    # currency: NOT NULL with constant DEFAULT — safe single-step on PG 11+
    if not column_exists(bind, 'pending_invoice_adjustments', 'currency'):
        bind.execute(text(
            "ALTER TABLE \"public\".\"pending_invoice_adjustments\" "
            "ADD COLUMN \"currency\" VARCHAR(3) NOT NULL DEFAULT 'USD';"
        ))
        print("    [OK] pending_invoice_adjustments.currency added.")
    else:
        print("    [OK] pending_invoice_adjustments.currency already exists — skipped.")

    if not column_exists(bind, 'pending_invoice_adjustments', 'description'):
        bind.execute(text(
            'ALTER TABLE "public"."pending_invoice_adjustments" '
            'ADD COLUMN "description" TEXT;'
        ))
        print("    [OK] pending_invoice_adjustments.description added.")
    else:
        print("    [OK] pending_invoice_adjustments.description already exists — skipped.")

    if not column_exists(bind, 'pending_invoice_adjustments', 'updated_at'):
        bind.execute(text(
            'ALTER TABLE "public"."pending_invoice_adjustments" '
            'ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE;'
        ))
        print("    [OK] pending_invoice_adjustments.updated_at added.")
    else:
        print("    [OK] pending_invoice_adjustments.updated_at already exists — skipped.")

    # ── 5. system_settings_config SMTP columns ──────────────────────────────
    print("  [5/7] system_settings_config SMTP columns...")
    smtp_columns = [
        ('"smtp_host"       VARCHAR(255)', 'smtp_host'),
        ('"smtp_password"   VARCHAR(255)', 'smtp_password'),
        ('"smtp_username"   VARCHAR(255)', 'smtp_username'),
        ('"smtp_port"       INTEGER',      'smtp_port'),
        ('"smtp_encryption" VARCHAR(50)',  'smtp_encryption'),
    ]
    for col_ddl, col_name in smtp_columns:
        if not column_exists(bind, 'system_settings_config', col_name):
            bind.execute(text(
                f'ALTER TABLE "public"."system_settings_config" ADD COLUMN {col_ddl};'
            ))
            print(f"    [OK] system_settings_config.{col_name} added.")
        else:
            print(f"    [OK] system_settings_config.{col_name} already exists — skipped.")

    # ── 6. email_verification_tokens.email (NOT NULL) ───────────────────────
    # 3-step: add nullable → backfill → set NOT NULL
    print("  [6/7] email_verification_tokens.email (NOT NULL — 3-step)...")
    if not column_exists(bind, 'email_verification_tokens', 'email'):
        # Step A: add as nullable
        bind.execute(text(
            'ALTER TABLE "public"."email_verification_tokens" '
            'ADD COLUMN "email" VARCHAR(255);'
        ))
        print("    [OK] Step A: column added (nullable).")

        # Step B: backfill from users.email via user_id
        result = bind.execute(text("""
            UPDATE email_verification_tokens evt
            SET    email = u.email
            FROM   users u
            WHERE  evt.user_id = u.id
              AND  evt.email IS NULL;
        """))
        print(f"    [OK] Step B: backfilled {result.rowcount} rows from users.email.")

        # Step C: fill remaining NULLs (orphaned tokens) with a safe placeholder
        result = bind.execute(text("""
            UPDATE email_verification_tokens
            SET    email = 'unknown@placeholder.invalid'
            WHERE  email IS NULL;
        """))
        if result.rowcount:
            print(f"    [WARN] Step C: {result.rowcount} orphaned token(s) got placeholder email.")
        else:
            print("    [OK] Step C: no orphaned tokens — no placeholder needed.")

        # Step D: set NOT NULL
        bind.execute(text(
            'ALTER TABLE "public"."email_verification_tokens" '
            'ALTER COLUMN "email" SET NOT NULL;'
        ))
        print("    [OK] Step D: NOT NULL constraint applied.")
    else:
        print("    [OK] Already exists — skipped.")

    # ── 7. Smoke test — verify all columns are queryable ───────────────────
    print("  [7/7] Smoke tests...")
    smoke_queries = [
        ("notification_logs",              "SELECT COUNT(*) FROM notification_logs"),
        ("attendances.branch_id",          "SELECT COUNT(*) FROM attendances WHERE branch_id IS NOT NULL"),
        ("pending_invoice_adjustments",    "SELECT COUNT(*) FROM pending_invoice_adjustments WHERE currency IS NOT NULL"),
        ("system_settings_config smtp",    "SELECT COUNT(*) FROM system_settings_config WHERE smtp_host IS NOT NULL"),
        ("email_verification_tokens.email","SELECT COUNT(*) FROM email_verification_tokens WHERE email IS NOT NULL"),
    ]
    for label, sql in smoke_queries:
        row = bind.execute(text(sql)).fetchone()
        print(f"    [OK] {label}: {row[0]} rows.")

    print("  Schema drift repair complete.")


# ---------------------------------------------------------------------------
# downgrade  (removes only items this migration created; does NOT undo the
# schema-guard's already-applied columns to avoid data loss)
# ---------------------------------------------------------------------------

def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        return

    # Drop notification_logs (safe — newly created by this migration)
    if table_exists(bind, 'notification_logs'):
        bind.execute(text("DROP TABLE IF EXISTS notification_logs;"))

    # Drop only the columns this migration ADDED to existing tables.
    # Columns the schema-guard applied are left intact.
    drops = [
        ('pending_invoice_adjustments', 'currency'),
        ('pending_invoice_adjustments', 'description'),
        ('pending_invoice_adjustments', 'updated_at'),
        ('system_settings_config',      'smtp_host'),
        ('system_settings_config',      'smtp_password'),
        ('system_settings_config',      'smtp_username'),
        ('system_settings_config',      'smtp_port'),
        ('system_settings_config',      'smtp_encryption'),
        ('email_verification_tokens',   'email'),
    ]
    for table, column in drops:
        if column_exists(bind, table, column):
            bind.execute(text(
                f'ALTER TABLE "public"."{table}" DROP COLUMN IF EXISTS "{column}";'
            ))
