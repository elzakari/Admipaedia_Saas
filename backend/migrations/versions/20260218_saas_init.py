"""saas_init

Revision ID: saas_init_001
Revises: 2505e0eb938c, ghana_educational_service, database_schema_optimization
Create Date: 2026-02-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'saas_init_001'
down_revision = ('2505e0eb938c', 'ghana_educational_service', 'database_schema_optimization')
branch_labels = None
depends_on = None

def upgrade():
    # Ensure UUID extension exists
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # === PLATFORM LEVEL TABLES (Public Schema) ===

    # Tenants
    op.create_table('tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('slug', sa.String(length=63), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('country_code', sa.String(length=2), nullable=False),
        sa.Column('plan', sa.String(length=50), server_default='trial', nullable=True),
        sa.Column('plan_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='trial', nullable=True),
        sa.Column('custom_domain', sa.String(length=255), nullable=True),
        sa.Column('schema_name', sa.String(length=63), nullable=False),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=True),
        sa.Column('enabled_features', sa.ARRAY(sa.Text()), server_default='{}', nullable=True),
        sa.Column('default_language', sa.String(length=10), server_default='en', nullable=True),
        sa.Column('timezone', sa.String(length=100), server_default='UTC', nullable=True),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.UniqueConstraint('custom_domain'),
        sa.UniqueConstraint('schema_name'),
        schema='public'
    )

    # Educational System Templates
    op.create_table('educational_system_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('country_code', sa.String(length=2), nullable=True),
        sa.Column('system_key', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('version', sa.Integer(), server_default='1', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('system_key'),
        schema='public'
    )

    # Supported Languages
    op.create_table('supported_languages',
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=False),
        sa.Column('name_native', sa.String(length=100), nullable=False),
        sa.Column('script', sa.String(length=50), nullable=True),
        sa.Column('is_rtl', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('tier', sa.Integer(), server_default='2', nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.PrimaryKeyConstraint('code'),
        schema='public'
    )

    # Country Configuration
    op.create_table('country_configs',
        sa.Column('code', sa.String(length=2), nullable=False),
        sa.Column('name_en', sa.String(length=100), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('currency_symbol', sa.String(length=10), nullable=True),
        sa.Column('phone_prefix', sa.String(length=10), nullable=True),
        sa.Column('default_timezone', sa.String(length=100), nullable=True),
        sa.Column('is_rtl', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('supported_payment_gateways', sa.ARRAY(sa.Text()), nullable=True),
        sa.Column('supported_sms_providers', sa.ARRAY(sa.Text()), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=True),
        sa.PrimaryKeyConstraint('code'),
        schema='public'
    )

    # Subscriptions
    op.create_table('subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan', sa.String(length=50), nullable=False),
        sa.Column('student_count', sa.Integer(), nullable=False),
        sa.Column('amount_usd', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('billing_cycle', sa.String(length=20), nullable=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=True),
        sa.Column('payment_reference', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['public.tenants.id'], ),
        schema='public'
    )

    # Platform Audit Log
    op.create_table('platform_audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(length=200), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=True),
        sa.Column('resource_id', sa.String(length=200), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', postgresql.INET(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['public.tenants.id'], ),
        schema='public'
    )

    # === TENANT SPECIFIC TEMPLATE TABLES (To be cloned per tenant) ===
    # These are created in public for now as templates, or we can assume they are created dynamically.
    # For now, we will create the tables that were requested in the Addendum as "Added to each tenant schema"
    # But since Alembic runs on a connection, we can only create them in the 'public' schema or a specific schema.
    # The strategy is usually to define them here, and the tenant creation script will use `CREATE TABLE tenant_X.table LIKE public.table`.
    
    # Educational System Config (Tenant Specific)
    op.create_table('educational_system_config',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('template_key', sa.String(length=100), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
        # No schema specified, defaults to current search_path (usually public)
    )

    # Grade Levels
    op.create_table('grade_levels',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('educational_system_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('is_terminal', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('next_level_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['educational_system_id'], ['educational_system_config.id'], ),
        sa.ForeignKeyConstraint(['next_level_id'], ['grade_levels.id'], )
    )

    # Grading Schemes
    op.create_table('grading_schemes_saas', # Renamed to avoid conflict with existing 'grading_schemes' if any
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('max_score', sa.Numeric(precision=6, scale=2), server_default='100', nullable=True),
        sa.Column('pass_mark', sa.Numeric(precision=6, scale=2), server_default='50', nullable=True),
        sa.Column('scale', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Campuses
    op.create_table('campuses',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('is_main_campus', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    # Drop in reverse order
    op.drop_table('campuses')
    op.drop_table('grading_schemes_saas')
    op.drop_table('grade_levels')
    op.drop_table('educational_system_config')
    
    op.drop_table('platform_audit_log', schema='public')
    op.drop_table('subscriptions', schema='public')
    op.drop_table('country_configs', schema='public')
    op.drop_table('supported_languages', schema='public')
    op.drop_table('educational_system_templates', schema='public')
    op.drop_table('tenants', schema='public')
