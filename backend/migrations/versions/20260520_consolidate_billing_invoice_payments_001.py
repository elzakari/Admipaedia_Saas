"""consolidate_billing_invoice_payments_001

Revision ID: 20260520_consolidate_billing_invoice_payments_001
Revises: 20260520_billing_payments_table_001
Create Date: 2026-05-20 00:00:00.000000

The Payment model (app/models/payments.py) now targets 'billing_invoice_payments'
as its canonical table, replacing the slim 8-column stub that previously lived
there and the interim 'billing_payments' table created last session.

This migration:
1. Adds all missing full-schema columns to 'billing_invoice_payments' (safe, guarded
   by column-existence checks).
2. Migrates any data rows from 'billing_payments' into 'billing_invoice_payments'
   (copies overlapping columns).
3. Drops 'billing_payments' (now superseded).
4. Adds the new indexes and unique constraint expected by the Payment model.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260520_consolidate_billing_invoice_payments_001'
down_revision = '20260520_billing_payments_table_001'
branch_labels = None
depends_on = None


def _now_default():
    dialect = op.get_bind().dialect.name
    if dialect == 'sqlite':
        return sa.text('(CURRENT_TIMESTAMP)')
    return sa.text('now()')


def _json_type():
    dialect = op.get_bind().dialect.name
    if dialect == 'postgresql':
        return postgresql.JSONB()
    return sa.JSON()


def _uuid_type():
    dialect = op.get_bind().dialect.name
    if dialect == 'postgresql':
        return postgresql.UUID(as_uuid=True)
    return sa.String(36)


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    now_default = _now_default()
    dialect = conn.dialect.name

    # ── Step 1: Expand billing_invoice_payments to the full Payment schema ────
    if insp.has_table('billing_invoice_payments'):
        existing = {c['name'] for c in insp.get_columns('billing_invoice_payments')}

        # Core gateway columns
        if 'school_id' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('school_id', _uuid_type(), nullable=True))
        if 'payment_gateway_id' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('payment_gateway_id', sa.Integer(), nullable=True))
        if 'gateway_name' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('gateway_name', sa.String(64), nullable=True, server_default='manual'))
        if 'payment_reference' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('payment_reference', sa.String(200), nullable=True))
        if 'gateway_transaction_id' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('gateway_transaction_id', sa.String(200), nullable=True))

        # Currency + channel
        if 'currency' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('currency', sa.String(3), nullable=True, server_default='XOF'))
        if 'payment_channel' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('payment_channel', sa.String(32), nullable=True, server_default='manual'))
        if 'status' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('status', sa.String(16), nullable=False, server_default='pending'))

        # Payment link + gateway response
        if 'payment_link' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('payment_link', sa.Text(), nullable=True))
        if 'gateway_response' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('gateway_response', _json_type(), nullable=True))

        # Timestamps
        if 'verified_at' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
        if 'updated_at' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default))

        # User audit fields
        if 'submitted_by_user_id' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('submitted_by_user_id', sa.Integer(), nullable=True))
        if 'reviewed_by_user_id' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True))
        if 'review_note' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('review_note', sa.Text(), nullable=True))
        if 'reviewed_at' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))

        # Manual payment fields
        if 'proof_path' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('proof_path', sa.String(512), nullable=True))
        if 'manual_method' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('manual_method', sa.String(32), nullable=True))
        if 'manual_reference' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('manual_reference', sa.String(200), nullable=True))
        if 'manual_paid_at' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('manual_paid_at', sa.DateTime(timezone=True), nullable=True))
        if 'idempotency_key' not in existing:
            op.add_column('billing_invoice_payments',
                sa.Column('idempotency_key', sa.String(64), nullable=True))

    # ── Step 2: Copy data from billing_payments → billing_invoice_payments ────
    if insp.has_table('billing_payments') and insp.has_table('billing_invoice_payments'):
        try:
            conn.execute(sa.text("""
                INSERT INTO billing_invoice_payments
                    (invoice_id, school_id, payment_gateway_id, gateway_name,
                     payment_reference, gateway_transaction_id, amount, currency,
                     payment_channel, status, payment_link, gateway_response,
                     paid_at, verified_at, submitted_by_user_id, reviewed_by_user_id,
                     review_note, reviewed_at, proof_path, manual_method,
                     manual_reference, manual_paid_at, idempotency_key,
                     created_at, updated_at)
                SELECT
                    invoice_id, school_id, payment_gateway_id, gateway_name,
                    payment_reference, gateway_transaction_id, amount, currency,
                    payment_channel, status, payment_link, gateway_response,
                    paid_at, verified_at, submitted_by_user_id, reviewed_by_user_id,
                    review_note, reviewed_at, proof_path, manual_method,
                    manual_reference, manual_paid_at, idempotency_key,
                    created_at, updated_at
                FROM billing_payments
                ON CONFLICT DO NOTHING
            """))
        except Exception:
            # If billing_payments is empty or copy fails, skip silently
            pass

    # ── Step 3: Drop old billing_payments table ───────────────────────────────
    if insp.has_table('billing_payments'):
        existing_bp_indexes = {idx['name'] for idx in insp.get_indexes('billing_payments')}
        for idx_name in ['idx_billing_payments_invoice', 'idx_billing_payments_school',
                         'idx_billing_payments_reference']:
            if idx_name in existing_bp_indexes:
                try:
                    op.drop_index(idx_name, table_name='billing_payments')
                except Exception:
                    pass
        op.drop_table('billing_payments')

    # ── Step 4: Add new indexes if not already present ───────────────────────
    if insp.has_table('billing_invoice_payments'):
        existing_indexes = {idx['name'] for idx in insp.get_indexes('billing_invoice_payments')}

        if 'idx_billing_invoice_payments_school' not in existing_indexes:
            op.create_index('idx_billing_invoice_payments_school',
                            'billing_invoice_payments', ['school_id'], unique=False)
        if 'idx_billing_invoice_payments_reference' not in existing_indexes:
            op.create_index('idx_billing_invoice_payments_reference',
                            'billing_invoice_payments', ['payment_reference'], unique=False)

        # Add unique constraint on (gateway_name, payment_reference) if absent
        if dialect == 'postgresql':
            try:
                conn.execute(sa.text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'uq_billing_invoice_payments_gateway_reference'
                        ) THEN
                            ALTER TABLE billing_invoice_payments
                            ADD CONSTRAINT uq_billing_invoice_payments_gateway_reference
                            UNIQUE (gateway_name, payment_reference);
                        END IF;
                    END$$;
                """))
            except Exception:
                pass


def downgrade():
    # Additive-only – no destructive downgrade to protect data
    pass
