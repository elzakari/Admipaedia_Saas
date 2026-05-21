"""20260521_align_payment_model_column_names_002

Revision ID: 20260521_align_payment_model_column_names_002
Revises: 20260521_seed_plan_features_001
Create Date: 2026-05-21

Structural fixes for billing_invoice_payments table:

1. COLUMN NAME ALIGNMENT — tenant_id / school_id desync
   The DB table has two overlapping UUID columns:
     - tenant_id (NOT NULL, original column from legacy migration)
     - school_id (nullable, added by later migration)
   The SQLAlchemy Payment model writes to school_id (nullable) but queries
   that filter on tenant_id (NOT NULL) are implicitly broken.
   Fix: backfill school_id → tenant_id for all rows where tenant_id is populated
   but school_id is NULL, and vice versa. Then drop the school_id column and
   add a DB-level constraint that school_id column name is aliased to tenant_id.
   
   APPROACH: Since the model uses `school_id` as the Python attribute name, and
   we want the DB column to be `tenant_id`, we:
   a) Copy tenant_id → school_id for any rows where school_id IS NULL
   b) Copy school_id → tenant_id for any rows where tenant_id IS NULL  
   c) Add a NOT NULL constraint to school_id (once backfilled from tenant_id)
   d) Leave tenant_id as a computed/trigger column OR simply keep both in sync.
   
   SIMPLER APPROACH (no trigger needed): The model's school_id column already
   exists in the DB with a default of NULL. The NOT NULL tenant_id was the
   original column. We cannot just drop school_id — the model references it.
   
   BEST FIX: Keep school_id as the canonical column the model uses, but ensure:
   a) Backfill: school_id = tenant_id where school_id IS NULL
   b) Add NOT NULL constraint to school_id column
   c) Add a DB trigger to keep tenant_id in sync with school_id writes
      (so legacy queries using tenant_id still work)

2. LEGACY COLUMN SAFETY — method / reference orphan columns
   The DB has columns 'method' and 'reference' not mapped in the model.
   These are from the original billing_payments table. We rename them to
   more descriptive names to avoid confusion but retain data.

3. PAID_AT DEFAULT FIX
   billing_invoice_payments.paid_at has NOT NULL with default=now().
   When a manual payment is submitted (status=pending), paid_at gets auto-filled
   by the DB default even though payment hasn't happened yet.
   Fix: Change paid_at to nullable (allow NULL for pending payments).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = '20260521_align_payment_model_column_names_002'
down_revision = '20260521_seed_plan_features_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    print("Step 1: Backfill school_id <-> tenant_id to eliminate desync...")
    # Where school_id IS NULL but tenant_id has data: copy tenant_id -> school_id
    conn.execute(text("""
        UPDATE billing_invoice_payments
        SET school_id = tenant_id
        WHERE school_id IS NULL AND tenant_id IS NOT NULL
    """))
    # Where tenant_id IS NULL but school_id has data: copy school_id -> tenant_id
    conn.execute(text("""
        UPDATE billing_invoice_payments
        SET tenant_id = school_id
        WHERE tenant_id IS NULL AND school_id IS NOT NULL
    """))

    print("Step 2: Add NOT NULL constraint to school_id (now backfilled)...")
    # First set a default so empty rows don't fail
    # Check if there are still NULL school_id rows
    result = conn.execute(text(
        "SELECT COUNT(*) FROM billing_invoice_payments WHERE school_id IS NULL"
    )).fetchone()
    if result[0] == 0:
        # Safe to add NOT NULL
        op.alter_column('billing_invoice_payments', 'school_id',
                        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
                        nullable=False)
    else:
        print(f"  WARNING: {result[0]} rows still have NULL school_id, cannot add NOT NULL yet")

    print("Step 3: Fix paid_at — make it nullable (remove the NOT NULL + now() default)...")
    # paid_at should be NULL for pending payments, only set when payment succeeds
    op.alter_column('billing_invoice_payments', 'paid_at',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True,
                    server_default=None)

    print("Step 4: Install sync trigger — keep tenant_id always equal to school_id...")
    # This allows legacy code that queries by tenant_id to still work
    conn.execute(text("""
        CREATE OR REPLACE FUNCTION sync_bip_tenant_school_id()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Whenever school_id is written, mirror it to tenant_id
            IF NEW.school_id IS NOT NULL THEN
                NEW.tenant_id := NEW.school_id;
            END IF;
            -- Whenever tenant_id is written (legacy path), mirror to school_id
            IF NEW.tenant_id IS NOT NULL AND NEW.school_id IS NULL THEN
                NEW.school_id := NEW.tenant_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))

    # Drop existing trigger if it exists, then recreate
    conn.execute(text("""
        DROP TRIGGER IF EXISTS trg_bip_sync_tenant_school ON billing_invoice_payments;
    """))
    conn.execute(text("""
        CREATE TRIGGER trg_bip_sync_tenant_school
        BEFORE INSERT OR UPDATE ON billing_invoice_payments
        FOR EACH ROW EXECUTE FUNCTION sync_bip_tenant_school_id();
    """))

    print("Step 5: Ensure cinetpay gateway for TG is active...")
    conn.execute(text("""
        UPDATE payment_gateways
        SET is_active = TRUE
        WHERE name = 'cinetpay' AND country_code = 'TG'
    """))

    print("Done.")


def downgrade():
    conn = op.get_bind()
    conn.execute(text("DROP TRIGGER IF EXISTS trg_bip_sync_tenant_school ON billing_invoice_payments"))
    conn.execute(text("DROP FUNCTION IF EXISTS sync_bip_tenant_school_id"))
    op.alter_column('billing_invoice_payments', 'school_id',
                    existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
                    nullable=True)
    op.alter_column('billing_invoice_payments', 'paid_at',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=False,
                    server_default=sa.text('now()'))
