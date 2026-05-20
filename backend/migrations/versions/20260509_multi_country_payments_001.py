"""multi_country_payments

Revision ID: 20260509_multi_country_payments_001
Revises: 20260509_saas_entitlements_001
Create Date: 2026-05-09 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260509_multi_country_payments_001'
down_revision = '20260509_saas_entitlements_001'
branch_labels = None
depends_on = None


def _now_default():
    dialect = op.get_bind().dialect.name
    if dialect == 'sqlite':
        return sa.text('(CURRENT_TIMESTAMP)')
    return sa.text('now()')


def upgrade():
    now_default = _now_default()
    conn = op.get_bind()
    insp = sa.inspect(conn)
    dialect = conn.dialect.name

    json_type = sa.JSON()
    if dialect == 'postgresql':
        json_type = postgresql.JSONB()

    if not insp.has_table('payment_gateways'):
        op.create_table(
            'payment_gateways',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('name', sa.String(length=64), nullable=False),
            sa.Column('display_name', sa.String(length=128), nullable=True),
            sa.Column('country_code', sa.String(length=2), nullable=True),
            sa.Column('currency', sa.String(length=3), nullable=True),
            sa.Column('public_key', sa.String(length=255), nullable=True),
            sa.Column('secret_key_encrypted', sa.Text(), nullable=True),
            sa.Column('webhook_secret_encrypted', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('supported_channels', json_type, nullable=True),
            sa.Column('environment', sa.String(length=16), nullable=False, server_default='sandbox'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
        )
        op.create_index('idx_payment_gateways_country_currency_active', 'payment_gateways', ['country_code', 'currency', 'is_active'], unique=False)
        op.create_index('idx_payment_gateways_name_active', 'payment_gateways', ['name', 'is_active'], unique=False)

    if not insp.has_table('billing_payments'):
        op.create_table(
            'billing_payments',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('invoice_id', sa.Integer(), nullable=False),
            sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('payment_gateway_id', sa.Integer(), nullable=True),
            sa.Column('gateway_name', sa.String(length=64), nullable=False),
            sa.Column('payment_reference', sa.String(length=200), nullable=False),
            sa.Column('gateway_transaction_id', sa.String(length=200), nullable=True),
            sa.Column('amount', sa.Numeric(12, 2), nullable=False),
            sa.Column('currency', sa.String(length=3), nullable=False),
            sa.Column('payment_channel', sa.String(length=32), nullable=False),
            sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
            sa.Column('payment_link', sa.Text(), nullable=True),
            sa.Column('gateway_response', json_type, nullable=True),
            sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('submitted_by_user_id', sa.Integer(), nullable=True),
            sa.Column('reviewed_by_user_id', sa.Integer(), nullable=True),
            sa.Column('review_note', sa.Text(), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('proof_path', sa.String(length=512), nullable=True),
            sa.Column('manual_method', sa.String(length=32), nullable=True),
            sa.Column('manual_reference', sa.String(length=200), nullable=True),
            sa.Column('manual_paid_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('idempotency_key', sa.String(length=64), nullable=True, unique=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['invoice_id'], ['billing_invoices.id'], name='fk_billing_payments_invoice_id'),
            sa.ForeignKeyConstraint(['school_id'], ['tenants.id'], name='fk_billing_payments_school_id'),
            sa.ForeignKeyConstraint(['payment_gateway_id'], ['payment_gateways.id'], name='fk_billing_payments_gateway_id'),
            sa.ForeignKeyConstraint(['submitted_by_user_id'], ['users.id'], name='fk_billing_payments_submitted_by_user_id'),
            sa.ForeignKeyConstraint(['reviewed_by_user_id'], ['users.id'], name='fk_billing_payments_reviewed_by_user_id'),
            sa.UniqueConstraint('gateway_name', 'payment_reference', name='uq_billing_payments_gateway_reference'),
        )
        op.create_index('idx_billing_payments_invoice', 'billing_payments', ['invoice_id'], unique=False)
        op.create_index('idx_billing_payments_school', 'billing_payments', ['school_id'], unique=False)
        op.create_index('idx_billing_payments_reference', 'billing_payments', ['payment_reference'], unique=False)

    if insp.has_table('billing_invoices'):
        cols = {c['name'] for c in insp.get_columns('billing_invoices')}
        if 'payment_status' not in cols:
            op.add_column('billing_invoices', sa.Column('payment_status', sa.String(length=20), nullable=False, server_default='unpaid'))
        if 'payment_link' not in cols:
            op.add_column('billing_invoices', sa.Column('payment_link', sa.Text(), nullable=True))
        if 'payment_reference' not in cols:
            op.add_column('billing_invoices', sa.Column('payment_reference', sa.String(length=200), nullable=True))
        if 'gateway_name' not in cols:
            op.add_column('billing_invoices', sa.Column('gateway_name', sa.String(length=64), nullable=True))
        if 'amount_paid' not in cols:
            op.add_column('billing_invoices', sa.Column('amount_paid', sa.Numeric(12, 2), nullable=False, server_default='0'))
        if 'balance_due' not in cols:
            op.add_column('billing_invoices', sa.Column('balance_due', sa.Numeric(12, 2), nullable=False, server_default='0'))


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if insp.has_table('billing_invoices'):
        cols = {c['name'] for c in insp.get_columns('billing_invoices')}
        for col in ['balance_due', 'amount_paid', 'gateway_name', 'payment_reference', 'payment_link', 'payment_status']:
            if col in cols:
                op.drop_column('billing_invoices', col)
    if insp.has_table('billing_payments'):
        op.drop_index('idx_billing_payments_reference', table_name='billing_payments')
        op.drop_index('idx_billing_payments_school', table_name='billing_payments')
        op.drop_index('idx_billing_payments_invoice', table_name='billing_payments')
        op.drop_table('billing_payments')
    if insp.has_table('payment_gateways'):
        op.drop_index('idx_payment_gateways_name_active', table_name='payment_gateways')
        op.drop_index('idx_payment_gateways_country_currency_active', table_name='payment_gateways')
        op.drop_table('payment_gateways')

