"""create_billing_payments_table_001

Revision ID: 20260520_billing_payments_table_001
Revises: 20260520_merge_all_heads_001
Create Date: 2026-05-20 00:00:00.000000

Creates the 'billing_payments' table — the SaaS billing-specific payments
table. The legacy 'payments' table belongs to the student-fee system and
has a completely different schema.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260520_billing_payments_table_001'
down_revision = '20260520_merge_all_heads_001'
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

    # ── Create billing_payments table ─────────────────────────────────────────
    if not insp.has_table('billing_payments'):
        op.create_table(
            'billing_payments',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('invoice_id', sa.Integer(), nullable=False),
            sa.Column('school_id', _uuid_type(), nullable=False),
            sa.Column('payment_gateway_id', sa.Integer(), nullable=True),
            sa.Column('gateway_name', sa.String(64), nullable=False),
            sa.Column('payment_reference', sa.String(200), nullable=False),
            sa.Column('gateway_transaction_id', sa.String(200), nullable=True),
            sa.Column('amount', sa.Numeric(12, 2), nullable=False),
            sa.Column('currency', sa.String(3), nullable=False),
            sa.Column('payment_channel', sa.String(32), nullable=False),
            sa.Column('status', sa.String(16), nullable=False, server_default='pending'),
            sa.Column('payment_link', sa.Text(), nullable=True),
            sa.Column('gateway_response', _json_type(), nullable=True),
            sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('submitted_by_user_id', sa.Integer(), nullable=True),
            sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True),
            sa.Column('review_note', sa.Text(), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('proof_path', sa.String(512), nullable=True),
            sa.Column('manual_method', sa.String(32), nullable=True),
            sa.Column('manual_reference', sa.String(200), nullable=True),
            sa.Column('manual_paid_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('idempotency_key', sa.String(64), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['invoice_id'], ['billing_invoices.id'], name='fk_billing_payments_invoice_id'),
            sa.ForeignKeyConstraint(['school_id'], ['tenants.id'], name='fk_billing_payments_school_id'),
            sa.UniqueConstraint('gateway_name', 'payment_reference', name='uq_billing_payments_gateway_reference'),
        )
        op.create_index('idx_billing_payments_invoice', 'billing_payments', ['invoice_id'], unique=False)
        op.create_index('idx_billing_payments_school', 'billing_payments', ['school_id'], unique=False)
        op.create_index('idx_billing_payments_reference', 'billing_payments', ['payment_reference'], unique=False)

    # ── billing_invoices: ensure all expected columns exist ───────────────────
    if insp.has_table('billing_invoices'):
        existing = {c['name'] for c in insp.get_columns('billing_invoices')}
        if 'billing_months' not in existing:
            op.add_column('billing_invoices', sa.Column('billing_months', sa.Integer(), nullable=False, server_default='3'))
        if 'payment_status' not in existing:
            op.add_column('billing_invoices', sa.Column('payment_status', sa.String(20), nullable=False, server_default='unpaid'))
        if 'payment_link' not in existing:
            op.add_column('billing_invoices', sa.Column('payment_link', sa.Text(), nullable=True))
        if 'payment_reference' not in existing:
            op.add_column('billing_invoices', sa.Column('payment_reference', sa.String(200), nullable=True))
        if 'gateway_name' not in existing:
            op.add_column('billing_invoices', sa.Column('gateway_name', sa.String(64), nullable=True))
        if 'amount_paid' not in existing:
            op.add_column('billing_invoices', sa.Column('amount_paid', sa.Numeric(12, 2), nullable=False, server_default='0'))
        if 'balance_due' not in existing:
            op.add_column('billing_invoices', sa.Column('balance_due', sa.Numeric(12, 2), nullable=False, server_default='0'))
        if 'paid_at' not in existing:
            op.add_column('billing_invoices', sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if insp.has_table('billing_payments'):
        try:
            op.drop_index('idx_billing_payments_reference', table_name='billing_payments')
        except Exception:
            pass
        try:
            op.drop_index('idx_billing_payments_school', table_name='billing_payments')
        except Exception:
            pass
        try:
            op.drop_index('idx_billing_payments_invoice', table_name='billing_payments')
        except Exception:
            pass
        op.drop_table('billing_payments')
