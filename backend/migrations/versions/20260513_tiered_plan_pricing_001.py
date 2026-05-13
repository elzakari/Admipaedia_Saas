"""tiered_plan_pricing

Revision ID: 20260513_tiered_plan_pricing_001
Revises: 20260513_subscription_change_requests_001
Create Date: 2026-05-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = '20260513_tiered_plan_pricing_001'
down_revision = '20260513_subscription_change_requests_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)

    if insp.has_table('plans'):
        cols = {c['name'] for c in insp.get_columns('plans')}
        if 'billing_min_months' not in cols:
            op.add_column('plans', sa.Column('billing_min_months', sa.Integer(), nullable=False, server_default='3'))

    if insp.has_table('billing_invoices'):
        cols = {c['name'] for c in insp.get_columns('billing_invoices')}
        if 'billing_months' not in cols:
            op.add_column('billing_invoices', sa.Column('billing_months', sa.Integer(), nullable=False, server_default='3'))

    if not insp.has_table('plan_pricing_tiers'):
        op.create_table(
            'plan_pricing_tiers',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('plan_id', sa.Integer(), sa.ForeignKey('plans.id'), nullable=False),
            sa.Column('country_code', sa.String(length=2), nullable=True),
            sa.Column('currency', sa.String(length=3), nullable=False),
            sa.Column('min_students', sa.Integer(), nullable=False),
            sa.Column('max_students', sa.Integer(), nullable=True),
            sa.Column('price_per_student_month', sa.Numeric(12, 2), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('idx_plan_pricing_tiers_plan_country_currency_active', 'plan_pricing_tiers', ['plan_id', 'country_code', 'currency', 'is_active'])
        op.create_index('idx_plan_pricing_tiers_plan_range', 'plan_pricing_tiers', ['plan_id', 'min_students', 'max_students'])


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)

    if insp.has_table('plan_pricing_tiers'):
        op.drop_index('idx_plan_pricing_tiers_plan_range', table_name='plan_pricing_tiers')
        op.drop_index('idx_plan_pricing_tiers_plan_country_currency_active', table_name='plan_pricing_tiers')
        op.drop_table('plan_pricing_tiers')

    if insp.has_table('billing_invoices'):
        cols = {c['name'] for c in insp.get_columns('billing_invoices')}
        if 'billing_months' in cols:
            op.drop_column('billing_invoices', 'billing_months')

    if insp.has_table('plans'):
        cols = {c['name'] for c in insp.get_columns('plans')}
        if 'billing_min_months' in cols:
            op.drop_column('plans', 'billing_min_months')

