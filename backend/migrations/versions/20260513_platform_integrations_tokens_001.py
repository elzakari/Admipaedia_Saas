"""platform_integrations_tokens

Revision ID: 20260513_platform_integrations_tokens_001
Revises: 20260509_invitation_links_001
Create Date: 2026-05-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260513_platform_integrations_tokens_001'
down_revision = '20260509_invitation_links_001'
branch_labels = None
depends_on = None


def _now_default():
    dialect = op.get_bind().dialect.name
    if dialect == 'sqlite':
        return sa.text('(CURRENT_TIMESTAMP)')
    return sa.text('now()')


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    dialect = conn.dialect.name
    now_default = _now_default()

    uuid_type = sa.String(36)
    if dialect != 'sqlite':
        uuid_type = postgresql.UUID(as_uuid=True)

    json_type = sa.JSON()
    if dialect != 'sqlite':
        json_type = postgresql.JSONB(astext_type=sa.Text())

    if not insp.has_table('platform_service_provider_configs'):
        op.create_table(
            'platform_service_provider_configs',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('service_type', sa.String(length=32), nullable=False),
            sa.Column('provider_key', sa.String(length=64), nullable=False),
            sa.Column('display_name', sa.String(length=128), nullable=True),
            sa.Column('priority', sa.Integer(), nullable=False, server_default='100'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('config_encrypted', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
        )
        op.create_index('ix_platform_provider_service', 'platform_service_provider_configs', ['service_type'], unique=False)
        op.create_index('ix_platform_provider_active', 'platform_service_provider_configs', ['service_type', 'is_active'], unique=False)

    if not insp.has_table('tenant_service_provider_overrides'):
        op.create_table(
            'tenant_service_provider_overrides',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('tenant_id', uuid_type, sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('service_type', sa.String(length=32), nullable=False),
            sa.Column('provider_key', sa.String(length=64), nullable=False),
            sa.Column('display_name', sa.String(length=128), nullable=True),
            sa.Column('priority', sa.Integer(), nullable=False, server_default='100'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('source', sa.String(length=32), nullable=False, server_default='manual'),
            sa.Column('config_encrypted', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.UniqueConstraint('tenant_id', 'service_type', 'provider_key', name='uq_tenant_provider_override'),
        )
        op.create_index('ix_tenant_provider_override_tenant', 'tenant_service_provider_overrides', ['tenant_id'], unique=False)
        op.create_index('ix_tenant_provider_override_service', 'tenant_service_provider_overrides', ['tenant_id', 'service_type'], unique=False)

    if not insp.has_table('tenant_service_tokens'):
        op.create_table(
            'tenant_service_tokens',
            sa.Column('id', uuid_type, primary_key=True, nullable=False),
            sa.Column('tenant_id', uuid_type, sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('service_type', sa.String(length=32), nullable=False),
            sa.Column('token_hash', sa.String(length=128), nullable=False),
            sa.Column('token_last4', sa.String(length=8), nullable=False),
            sa.Column('status', sa.String(length=16), nullable=False, server_default='active'),
            sa.Column('provisioned_plan_id', sa.Integer(), nullable=True),
            sa.Column('monthly_allowance', sa.String(length=32), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('rotated_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('tenant_id', 'service_type', name='uq_tenant_service_token'),
        )
        op.create_index('ix_tenant_service_tokens_tenant', 'tenant_service_tokens', ['tenant_id'], unique=False)
        op.create_index('ix_tenant_service_tokens_active', 'tenant_service_tokens', ['tenant_id', 'service_type', 'status'], unique=False)
        op.create_index('ix_tenant_service_tokens_hash', 'tenant_service_tokens', ['token_hash'], unique=False)

    if not insp.has_table('tenant_service_token_usage'):
        op.create_table(
            'tenant_service_token_usage',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('tenant_id', uuid_type, sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('service_type', sa.String(length=32), nullable=False),
            sa.Column('year', sa.Integer(), nullable=False),
            sa.Column('month', sa.Integer(), nullable=False),
            sa.Column('used_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.UniqueConstraint('tenant_id', 'service_type', 'year', 'month', name='uq_tenant_service_token_usage_period'),
        )
        op.create_index('ix_tenant_token_usage_tenant', 'tenant_service_token_usage', ['tenant_id'], unique=False)
        op.create_index('ix_tenant_token_usage_period', 'tenant_service_token_usage', ['year', 'month'], unique=False)

    if not insp.has_table('tenant_service_token_events'):
        op.create_table(
            'tenant_service_token_events',
            sa.Column('id', uuid_type, primary_key=True, nullable=False),
            sa.Column('tenant_id', uuid_type, sa.ForeignKey('tenants.id'), nullable=True),
            sa.Column('token_id', uuid_type, sa.ForeignKey('tenant_service_tokens.id'), nullable=True),
            sa.Column('service_type', sa.String(length=32), nullable=False),
            sa.Column('event_type', sa.String(length=32), nullable=False),
            sa.Column('actor_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('ip_address', sa.String(length=64), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('details', json_type, nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
        )
        op.create_index('ix_tenant_token_events_tenant', 'tenant_service_token_events', ['tenant_id'], unique=False)
        op.create_index('ix_tenant_token_events_service', 'tenant_service_token_events', ['tenant_id', 'service_type'], unique=False)
        op.create_index('ix_tenant_token_events_created', 'tenant_service_token_events', ['created_at'], unique=False)

    if insp.has_table('plan_limits') and insp.has_table('plans'):
        plan_rows = conn.execute(sa.text('SELECT id, slug FROM plans')).fetchall() or []
        plan_id_by_slug = {str(r[1]): int(r[0]) for r in plan_rows}
        token_limits_by_slug = {
            'basic': {
                'tokens.email.monthly': ('1000', 'number'),
                'tokens.sms.monthly': ('250', 'number'),
                'tokens.whatsapp.monthly': ('0', 'number'),
                'tokens.ai.monthly': ('0', 'number'),
            },
            'pro': {
                'tokens.email.monthly': ('5000', 'number'),
                'tokens.sms.monthly': ('2000', 'number'),
                'tokens.whatsapp.monthly': ('500', 'number'),
                'tokens.ai.monthly': ('2000', 'number'),
            },
            'enterprise': {
                'tokens.email.monthly': ('unlimited', 'string'),
                'tokens.sms.monthly': ('unlimited', 'string'),
                'tokens.whatsapp.monthly': ('unlimited', 'string'),
                'tokens.ai.monthly': ('unlimited', 'string'),
            },
        }

        for slug, limits in token_limits_by_slug.items():
            pid = plan_id_by_slug.get(slug)
            if not pid:
                continue
            for key, (val, vt) in limits.items():
                exists = conn.execute(
                    sa.text('SELECT 1 FROM plan_limits WHERE plan_id = :pid AND limit_key = :k LIMIT 1'),
                    {'pid': pid, 'k': key}
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    sa.text('INSERT INTO plan_limits (plan_id, limit_key, limit_value, value_type) VALUES (:plan_id, :limit_key, :limit_value, :value_type)'),
                    {'plan_id': pid, 'limit_key': key, 'limit_value': val, 'value_type': vt},
                )

    if insp.has_table('plan_features') and insp.has_table('plans'):
        plan_rows = conn.execute(sa.text('SELECT id, slug FROM plans')).fetchall() or []
        plan_id_by_slug = {str(r[1]): int(r[0]) for r in plan_rows}
        desired = {
            'pro': ['integrations.email', 'integrations.sms', 'integrations.whatsapp', 'ai.external'],
            'enterprise': ['integrations.email', 'integrations.sms', 'integrations.whatsapp', 'ai.external'],
        }
        for slug, keys in desired.items():
            pid = plan_id_by_slug.get(slug)
            if not pid:
                continue
            for k in keys:
                exists = conn.execute(
                    sa.text('SELECT 1 FROM plan_features WHERE plan_id = :pid AND feature_key = :k LIMIT 1'),
                    {'pid': pid, 'k': k}
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    sa.text('INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES (:pid, :k, true)'),
                    {'pid': pid, 'k': k}
                )


def downgrade():
    op.drop_index('ix_tenant_token_events_created', table_name='tenant_service_token_events')
    op.drop_index('ix_tenant_token_events_service', table_name='tenant_service_token_events')
    op.drop_index('ix_tenant_token_events_tenant', table_name='tenant_service_token_events')
    op.drop_table('tenant_service_token_events')

    op.drop_index('ix_tenant_token_usage_period', table_name='tenant_service_token_usage')
    op.drop_index('ix_tenant_token_usage_tenant', table_name='tenant_service_token_usage')
    op.drop_table('tenant_service_token_usage')

    op.drop_index('ix_tenant_service_tokens_hash', table_name='tenant_service_tokens')
    op.drop_index('ix_tenant_service_tokens_active', table_name='tenant_service_tokens')
    op.drop_index('ix_tenant_service_tokens_tenant', table_name='tenant_service_tokens')
    op.drop_table('tenant_service_tokens')

    op.drop_index('ix_tenant_provider_override_service', table_name='tenant_service_provider_overrides')
    op.drop_index('ix_tenant_provider_override_tenant', table_name='tenant_service_provider_overrides')
    op.drop_table('tenant_service_provider_overrides')

    op.drop_index('ix_platform_provider_active', table_name='platform_service_provider_configs')
    op.drop_index('ix_platform_provider_service', table_name='platform_service_provider_configs')
    op.drop_table('platform_service_provider_configs')

