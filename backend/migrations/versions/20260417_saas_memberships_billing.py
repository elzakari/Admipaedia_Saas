"""saas_memberships_billing

Revision ID: saas_init_002
Revises: saas_init_001
Create Date: 2026-04-17 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'saas_init_002'
down_revision = 'saas_init_001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tenant_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=True),
        sa.Column('invited_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['public.tenants.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'user_id', name='uq_tenant_membership_tenant_user'),
        schema='public'
    )
    op.create_index('idx_tenant_memberships_tenant_id', 'tenant_memberships', ['tenant_id'], unique=False, schema='public')
    op.create_index('idx_tenant_memberships_user_id', 'tenant_memberships', ['user_id'], unique=False, schema='public')

    op.create_table(
        'tenant_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invited_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['public.tenants.id']),
        sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
        schema='public'
    )
    op.create_index('idx_tenant_invite_token', 'tenant_invitations', ['token'], unique=False, schema='public')
    op.create_index('idx_tenant_invite_tenant_id', 'tenant_invitations', ['tenant_id'], unique=False, schema='public')

    op.create_table(
        'platform_invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invoice_number', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='draft', nullable=True),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=True),
        sa.Column('issued_on', sa.Date(), nullable=False),
        sa.Column('due_on', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['public.tenants.id']),
        sa.PrimaryKeyConstraint('id'),
        schema='public'
    )
    op.create_index('idx_platform_invoices_tenant_id', 'platform_invoices', ['tenant_id'], unique=False, schema='public')
    op.create_index('idx_platform_invoices_status', 'platform_invoices', ['status'], unique=False, schema='public')

    op.create_table(
        'platform_payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=True),
        sa.Column('method', sa.String(length=50), nullable=True),
        sa.Column('reference', sa.String(length=200), nullable=True),
        sa.Column('paid_on', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['public.tenants.id']),
        sa.ForeignKeyConstraint(['invoice_id'], ['public.platform_invoices.id']),
        sa.PrimaryKeyConstraint('id'),
        schema='public'
    )
    op.create_index('idx_platform_payments_tenant_id', 'platform_payments', ['tenant_id'], unique=False, schema='public')
    op.create_index('idx_platform_payments_invoice_id', 'platform_payments', ['invoice_id'], unique=False, schema='public')


def downgrade():
    op.drop_index('idx_platform_payments_invoice_id', table_name='platform_payments', schema='public')
    op.drop_index('idx_platform_payments_tenant_id', table_name='platform_payments', schema='public')
    op.drop_table('platform_payments', schema='public')

    op.drop_index('idx_platform_invoices_status', table_name='platform_invoices', schema='public')
    op.drop_index('idx_platform_invoices_tenant_id', table_name='platform_invoices', schema='public')
    op.drop_table('platform_invoices', schema='public')

    op.drop_index('idx_tenant_invite_tenant_id', table_name='tenant_invitations', schema='public')
    op.drop_index('idx_tenant_invite_token', table_name='tenant_invitations', schema='public')
    op.drop_table('tenant_invitations', schema='public')

    op.drop_index('idx_tenant_memberships_user_id', table_name='tenant_memberships', schema='public')
    op.drop_index('idx_tenant_memberships_tenant_id', table_name='tenant_memberships', schema='public')
    op.drop_table('tenant_memberships', schema='public')

