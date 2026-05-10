"""e_registration_billing

Revision ID: 20260509_e_registration_billing_001
Revises: 20260506_backfill_acad_settings_001
Create Date: 2026-05-09 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260509_e_registration_billing_001'
down_revision = '20260506_backfill_acad_settings_001'
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

    if not insp.has_table('academic_terms'):
        op.create_table(
            'academic_terms',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=120), nullable=False),
            sa.Column('academic_year', sa.String(length=20), nullable=True),
            sa.Column('term_name', sa.String(length=64), nullable=True),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(), server_default=now_default),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_academic_terms_tenant_id'),
        )
        op.create_index('ix_academic_terms_tenant_id', 'academic_terms', ['tenant_id'], unique=False)
    else:
        cols = {c['name'] for c in insp.get_columns('academic_terms')}
        if 'academic_year' not in cols:
            op.add_column('academic_terms', sa.Column('academic_year', sa.String(length=20), nullable=True))
        if 'term_name' not in cols:
            op.add_column('academic_terms', sa.Column('term_name', sa.String(length=64), nullable=True))
        if 'status' not in cols:
            op.add_column('academic_terms', sa.Column('status', sa.String(length=20), nullable=True))

    if not insp.has_table('billing_plans'):
        op.create_table(
            'billing_plans',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('name', sa.String(length=64), nullable=False),
            sa.Column('slug', sa.String(length=64), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('price_per_student', sa.Numeric(12, 2), nullable=False, server_default='0'),
            sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
            sa.Column('features', sa.JSON(), nullable=True),
            sa.Column('benefits', sa.JSON(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.UniqueConstraint('name', name='uq_billing_plans_name'),
            sa.UniqueConstraint('slug', name='uq_billing_plans_slug'),
        )

    if not insp.has_table('school_plan_subscriptions'):
        op.create_table(
            'school_plan_subscriptions',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('plan_id', sa.Integer(), nullable=False),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_school_plan_subs_tenant_id'),
            sa.ForeignKeyConstraint(['plan_id'], ['billing_plans.id'], name='fk_school_plan_subs_plan_id'),
        )
        op.create_index('ix_school_plan_subscriptions_tenant_id', 'school_plan_subscriptions', ['tenant_id'], unique=False)
        op.create_index('ix_school_plan_subscriptions_plan_id', 'school_plan_subscriptions', ['plan_id'], unique=False)
        op.create_index('idx_school_plan_subs_tenant_status', 'school_plan_subscriptions', ['tenant_id', 'status'], unique=False)

    if not insp.has_table('student_term_registrations'):
        op.create_table(
            'student_term_registrations',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('student_id', sa.Integer(), nullable=False),
            sa.Column('academic_term_id', sa.Integer(), nullable=False),
            sa.Column('registration_status', sa.String(length=20), nullable=False, server_default='registered'),
            sa.Column('student_status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('registered_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_str_tenant_id'),
            sa.ForeignKeyConstraint(['student_id'], ['students.id'], name='fk_str_student_id'),
            sa.ForeignKeyConstraint(['academic_term_id'], ['academic_terms.id'], name='fk_str_term_id'),
            sa.UniqueConstraint('tenant_id', 'academic_term_id', 'student_id', name='uq_student_term_registration'),
        )
        op.create_index('ix_student_term_registrations_tenant_id', 'student_term_registrations', ['tenant_id'], unique=False)
        op.create_index('ix_student_term_registrations_student_id', 'student_term_registrations', ['student_id'], unique=False)
        op.create_index('ix_student_term_registrations_academic_term_id', 'student_term_registrations', ['academic_term_id'], unique=False)
        op.create_index(
            'idx_str_tenant_term_status',
            'student_term_registrations',
            ['tenant_id', 'academic_term_id', 'registration_status', 'student_status'],
            unique=False,
        )

    if not insp.has_table('billing_invoices'):
        op.create_table(
            'billing_invoices',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('invoice_number', sa.String(length=64), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('plan_id', sa.Integer(), nullable=False),
            sa.Column('academic_term_id', sa.Integer(), nullable=False),
            sa.Column('price_per_student_snapshot', sa.Numeric(12, 2), nullable=False),
            sa.Column('active_student_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('subtotal', sa.Numeric(12, 2), nullable=False, server_default='0'),
            sa.Column('discount_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
            sa.Column('tax_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
            sa.Column('total_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
            sa.Column('currency', sa.String(length=3), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('due_date', sa.Date(), nullable=True),
            sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_billing_invoices_tenant_id'),
            sa.ForeignKeyConstraint(['plan_id'], ['billing_plans.id'], name='fk_billing_invoices_plan_id'),
            sa.ForeignKeyConstraint(['academic_term_id'], ['academic_terms.id'], name='fk_billing_invoices_term_id'),
            sa.UniqueConstraint('tenant_id', 'academic_term_id', name='uq_billing_invoice_tenant_term'),
            sa.UniqueConstraint('invoice_number', name='uq_billing_invoice_number'),
        )
        op.create_index('ix_billing_invoices_tenant_id', 'billing_invoices', ['tenant_id'], unique=False)
        op.create_index('ix_billing_invoices_plan_id', 'billing_invoices', ['plan_id'], unique=False)
        op.create_index('ix_billing_invoices_academic_term_id', 'billing_invoices', ['academic_term_id'], unique=False)
        op.create_index('idx_billing_invoices_tenant_status', 'billing_invoices', ['tenant_id', 'status'], unique=False)

    if not insp.has_table('billing_invoice_payments'):
        op.create_table(
            'billing_invoice_payments',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('invoice_id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('amount', sa.Numeric(12, 2), nullable=False),
            sa.Column('method', sa.String(length=50), nullable=True),
            sa.Column('reference', sa.String(length=200), nullable=True),
            sa.Column('paid_at', sa.DateTime(timezone=True), nullable=False, server_default=now_default),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['invoice_id'], ['billing_invoices.id'], name='fk_billing_invoice_payments_invoice_id'),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_billing_invoice_payments_tenant_id'),
        )
        op.create_index('idx_billing_invoice_payments_invoice', 'billing_invoice_payments', ['invoice_id'], unique=False)
        op.create_index('ix_billing_invoice_payments_tenant_id', 'billing_invoice_payments', ['tenant_id'], unique=False)

    rows = conn.execute(sa.text('SELECT COUNT(1) FROM billing_plans')).fetchone()
    if not rows or int(rows[0] or 0) == 0:
        conn.execute(
            sa.text(
                "INSERT INTO billing_plans (name, slug, description, price_per_student, currency, is_active) VALUES "
                "(:n1, :s1, :d1, 0, 'USD', true), "
                "(:n2, :s2, :d2, 0, 'USD', true), "
                "(:n3, :s3, :d3, 0, 'USD', true)"
            ),
            {
                'n1': 'Basic',
                's1': 'basic',
                'd1': 'Basic plan',
                'n2': 'Pro',
                's2': 'pro',
                'd2': 'Pro plan',
                'n3': 'Enterprise',
                's3': 'enterprise',
                'd3': 'Enterprise plan',
            },
        )


def downgrade():
    op.drop_index('ix_billing_invoice_payments_tenant_id', table_name='billing_invoice_payments')
    op.drop_index('idx_billing_invoice_payments_invoice', table_name='billing_invoice_payments')
    op.drop_table('billing_invoice_payments')

    op.drop_index('idx_billing_invoices_tenant_status', table_name='billing_invoices')
    op.drop_index('ix_billing_invoices_academic_term_id', table_name='billing_invoices')
    op.drop_index('ix_billing_invoices_plan_id', table_name='billing_invoices')
    op.drop_index('ix_billing_invoices_tenant_id', table_name='billing_invoices')
    op.drop_table('billing_invoices')

    op.drop_index('idx_str_tenant_term_status', table_name='student_term_registrations')
    op.drop_index('ix_student_term_registrations_academic_term_id', table_name='student_term_registrations')
    op.drop_index('ix_student_term_registrations_student_id', table_name='student_term_registrations')
    op.drop_index('ix_student_term_registrations_tenant_id', table_name='student_term_registrations')
    op.drop_table('student_term_registrations')

    op.drop_index('idx_school_plan_subs_tenant_status', table_name='school_plan_subscriptions')
    op.drop_index('ix_school_plan_subscriptions_plan_id', table_name='school_plan_subscriptions')
    op.drop_index('ix_school_plan_subscriptions_tenant_id', table_name='school_plan_subscriptions')
    op.drop_table('school_plan_subscriptions')

    op.drop_table('billing_plans')

    op.drop_column('academic_terms', 'status')
    op.drop_column('academic_terms', 'term_name')
    op.drop_column('academic_terms', 'academic_year')
