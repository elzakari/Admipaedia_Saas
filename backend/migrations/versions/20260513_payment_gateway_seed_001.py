"""payment_gateway_seed

Revision ID: 20260513_payment_gateway_seed_001
Revises: 20260513_trial_plan_entitlements_001
Create Date: 2026-05-13 00:00:00.000000

"""

import json

from alembic import op
import sqlalchemy as sa


revision = '20260513_payment_gateway_seed_001'
down_revision = '20260513_trial_plan_entitlements_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)

    if insp.has_table('billing_invoices'):
        cols = {c['name'] for c in insp.get_columns('billing_invoices')}
        if 'balance_due' in cols and 'total_amount' in cols:
            conn.execute(sa.text(
                "UPDATE billing_invoices "
                "SET balance_due = total_amount "
                "WHERE (balance_due IS NULL OR balance_due = 0) AND total_amount IS NOT NULL AND total_amount > 0"
            ))

    if not insp.has_table('payment_gateways'):
        return

    def _exists(name: str, country_code: str | None, currency: str | None) -> bool:
        row = conn.execute(
            sa.text(
                "SELECT 1 FROM payment_gateways "
                "WHERE name = :name AND "
                "COALESCE(country_code, '') = COALESCE(:country_code, '') AND "
                "COALESCE(currency, '') = COALESCE(:currency, '') "
                "LIMIT 1"
            ),
            {'name': name, 'country_code': country_code, 'currency': currency},
        ).fetchone()
        return bool(row)

    seeds = [
        {
            'name': 'manual',
            'display_name': 'Manual',
            'country_code': None,
            'currency': None,
            'public_key': None,
            'secret_key_encrypted': None,
            'webhook_secret_encrypted': None,
            'is_active': True,
            'is_default': True,
            'supported_channels': json.dumps(['manual']),
            'environment': 'live',
        },
        {
            'name': 'paystack',
            'display_name': 'Paystack (Ghana)',
            'country_code': 'GH',
            'currency': 'GHS',
            'public_key': None,
            'secret_key_encrypted': None,
            'webhook_secret_encrypted': None,
            'is_active': False,
            'is_default': True,
            'supported_channels': json.dumps(['mobile_money', 'card', 'bank_transfer']),
            'environment': 'sandbox',
        },
        {
            'name': 'cinetpay',
            'display_name': 'CinetPay (Francophone)',
            'country_code': 'TG',
            'currency': 'XOF',
            'public_key': None,
            'secret_key_encrypted': None,
            'webhook_secret_encrypted': None,
            'is_active': False,
            'is_default': True,
            'supported_channels': json.dumps(['mobile_money', 'card', 'wallet', 'bank_transfer']),
            'environment': 'sandbox',
        },
        {
            'name': 'flutterwave',
            'display_name': 'Flutterwave (Fallback)',
            'country_code': None,
            'currency': None,
            'public_key': None,
            'secret_key_encrypted': None,
            'webhook_secret_encrypted': None,
            'is_active': False,
            'is_default': False,
            'supported_channels': json.dumps(['mobile_money', 'card', 'wallet', 'bank_transfer']),
            'environment': 'sandbox',
        },
    ]

    for s in seeds:
        if _exists(s['name'], s['country_code'], s['currency']):
            continue
        conn.execute(
            sa.text(
                "INSERT INTO payment_gateways "
                "(name, display_name, country_code, currency, public_key, secret_key_encrypted, webhook_secret_encrypted, "
                "is_active, is_default, supported_channels, environment) "
                "VALUES "
                "(:name, :display_name, :country_code, :currency, :public_key, :secret_key_encrypted, :webhook_secret_encrypted, "
                ":is_active, :is_default, :supported_channels, :environment)"
            ),
            s,
        )


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if not insp.has_table('payment_gateways'):
        return
    conn.execute(sa.text("DELETE FROM payment_gateways WHERE name IN ('manual', 'paystack', 'cinetpay', 'flutterwave')"))

