"""saas_entitlements

Revision ID: 20260509_saas_entitlements_001
Revises: 20260509_e_registration_billing_001
Create Date: 2026-05-09 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import date


revision = '20260509_saas_entitlements_001'
down_revision = '20260509_e_registration_billing_001'
branch_labels = None
depends_on = None


def _now_default():
    dialect = op.get_bind().dialect.name
    if dialect == 'sqlite':
        return sa.text('(CURRENT_TIMESTAMP)')
    return sa.text('now()')


def _has_fk(insp, table: str, name: str) -> bool:
    try:
        for fk in insp.get_foreign_keys(table):
            if fk.get('name') == name:
                return True
    except Exception:
        return False
    return False


def upgrade():
    now_default = _now_default()

    conn = op.get_bind()
    insp = sa.inspect(conn)
    dialect = conn.dialect.name

    if insp.has_table('billing_plans') and not insp.has_table('plans'):
        op.rename_table('billing_plans', 'plans')

    if insp.has_table('school_plan_subscriptions'):
        cols = {c['name'] for c in insp.get_columns('school_plan_subscriptions')}
        with op.batch_alter_table('school_plan_subscriptions') as batch:
            if 'tenant_id' in cols and 'school_id' not in cols:
                batch.alter_column('tenant_id', new_column_name='school_id')
            if 'start_date' in cols and 'starts_at' not in cols:
                batch.alter_column('start_date', new_column_name='starts_at')
            if 'end_date' in cols and 'ends_at' not in cols:
                batch.alter_column('end_date', new_column_name='ends_at')

            cols_after = {c['name'] for c in insp.get_columns('school_plan_subscriptions')}
            if 'price_per_student_snapshot' not in cols_after:
                batch.add_column(sa.Column('price_per_student_snapshot', sa.Numeric(12, 2), nullable=True))
            if 'currency_snapshot' not in cols_after:
                batch.add_column(sa.Column('currency_snapshot', sa.String(length=3), nullable=True))
            if 'features_snapshot' not in cols_after:
                batch.add_column(sa.Column('features_snapshot', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=True))
            if 'limits_snapshot' not in cols_after:
                batch.add_column(sa.Column('limits_snapshot', sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'), nullable=True))

            if _has_fk(insp, 'school_plan_subscriptions', 'fk_school_plan_subs_plan_id'):
                batch.drop_constraint('fk_school_plan_subs_plan_id', type_='foreignkey')
            batch.create_foreign_key('fk_school_plan_subs_plan_id', 'plans', ['plan_id'], ['id'])

    if insp.has_table('billing_invoices'):
        with op.batch_alter_table('billing_invoices') as batch:
            if _has_fk(insp, 'billing_invoices', 'fk_billing_invoices_plan_id'):
                batch.drop_constraint('fk_billing_invoices_plan_id', type_='foreignkey')
            batch.create_foreign_key('fk_billing_invoices_plan_id', 'plans', ['plan_id'], ['id'])

    if not insp.has_table('plan_features'):
        op.create_table(
            'plan_features',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('plan_id', sa.Integer(), nullable=False),
            sa.Column('feature_key', sa.String(length=128), nullable=False),
            sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], name='fk_plan_features_plan_id'),
            sa.UniqueConstraint('plan_id', 'feature_key', name='uq_plan_features_plan_key'),
        )
        op.create_index('ix_plan_features_plan_id', 'plan_features', ['plan_id'], unique=False)
        op.create_index('ix_plan_features_feature_key', 'plan_features', ['feature_key'], unique=False)

    if not insp.has_table('plan_limits'):
        op.create_table(
            'plan_limits',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('plan_id', sa.Integer(), nullable=False),
            sa.Column('limit_key', sa.String(length=128), nullable=False),
            sa.Column('limit_value', sa.Text(), nullable=True),
            sa.Column('value_type', sa.String(length=16), nullable=False, server_default='string'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], name='fk_plan_limits_plan_id'),
            sa.UniqueConstraint('plan_id', 'limit_key', name='uq_plan_limits_plan_key'),
        )
        op.create_index('ix_plan_limits_plan_id', 'plan_limits', ['plan_id'], unique=False)
        op.create_index('ix_plan_limits_limit_key', 'plan_limits', ['limit_key'], unique=False)

    if not insp.has_table('school_feature_overrides'):
        op.create_table(
            'school_feature_overrides',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('school_id', postgresql.UUID(as_uuid=True) if dialect != 'sqlite' else sa.String(length=36), nullable=False),
            sa.Column('feature_key', sa.String(length=128), nullable=False),
            sa.Column('is_enabled', sa.Boolean(), nullable=False),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['school_id'], ['tenants.id'], name='fk_school_feature_overrides_school_id'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_school_feature_overrides_created_by'),
            sa.UniqueConstraint('school_id', 'feature_key', name='uq_school_feature_overrides_school_key'),
        )
        op.create_index('ix_school_feature_overrides_school_id', 'school_feature_overrides', ['school_id'], unique=False)
        op.create_index('ix_school_feature_overrides_feature_key', 'school_feature_overrides', ['feature_key'], unique=False)

    if not insp.has_table('school_limit_overrides'):
        op.create_table(
            'school_limit_overrides',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('school_id', postgresql.UUID(as_uuid=True) if dialect != 'sqlite' else sa.String(length=36), nullable=False),
            sa.Column('limit_key', sa.String(length=128), nullable=False),
            sa.Column('limit_value', sa.Text(), nullable=True),
            sa.Column('value_type', sa.String(length=16), nullable=False, server_default='string'),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=now_default),
            sa.ForeignKeyConstraint(['school_id'], ['tenants.id'], name='fk_school_limit_overrides_school_id'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_school_limit_overrides_created_by'),
            sa.UniqueConstraint('school_id', 'limit_key', name='uq_school_limit_overrides_school_key'),
        )
        op.create_index('ix_school_limit_overrides_school_id', 'school_limit_overrides', ['school_id'], unique=False)
        op.create_index('ix_school_limit_overrides_limit_key', 'school_limit_overrides', ['limit_key'], unique=False)

    if insp.has_table('messages'):
        cols = {c['name'] for c in insp.get_columns('messages')}
        if 'tenant_id' not in cols:
            with op.batch_alter_table('messages') as batch:
                batch.add_column(sa.Column('tenant_id', postgresql.UUID(as_uuid=True) if dialect != 'sqlite' else sa.String(length=36), nullable=True))
            op.create_index('ix_messages_tenant_id', 'messages', ['tenant_id'], unique=False)

    if insp.has_table('plans') and insp.has_table('plan_features') and insp.has_table('plan_limits'):
        existing_slugs = {str(r[0]) for r in conn.execute(sa.text('SELECT slug FROM plans')).fetchall() or []}
        default_plans = [
            {'name': 'Basic', 'slug': 'basic', 'description': 'Basic plan', 'price_per_student': 0, 'currency': 'USD', 'is_active': True},
            {'name': 'Pro', 'slug': 'pro', 'description': 'Pro plan', 'price_per_student': 0, 'currency': 'USD', 'is_active': True},
            {'name': 'Enterprise', 'slug': 'enterprise', 'description': 'Enterprise plan', 'price_per_student': 0, 'currency': 'USD', 'is_active': True},
        ]
        for p in default_plans:
            if p['slug'] in existing_slugs:
                continue
            conn.execute(
                sa.text(
                    'INSERT INTO plans (name, slug, description, price_per_student, currency, is_active) '
                    'VALUES (:name, :slug, :description, :price_per_student, :currency, :is_active)'
                ),
                p,
            )

        plan_rows = conn.execute(sa.text('SELECT id, slug FROM plans')).fetchall() or []
        plan_id_by_slug = {str(r[1]): int(r[0]) for r in plan_rows}

        existing_pf = conn.execute(sa.text('SELECT COUNT(1) FROM plan_features')).fetchone()
        existing_pl = conn.execute(sa.text('SELECT COUNT(1) FROM plan_limits')).fetchone()

        basic_features = [
            'students.manage',
            'teachers.manage',
            'parents.manage',
            'academics.classes',
            'academics.subjects',
            'academics.curriculum_basic',
            'academics.timetable',
            'attendance.basic',
            'exams.basic',
            'reports.standard',
            'messaging.in_app',
            'admissions.basic',
            'fees.basic',
            'library.basic',
            'billing.view',
            'audit.basic',
        ]
        pro_extra = [
            'attendance.analytics',
            'exams.advanced',
            'reports.advanced',
            'reports.pdf',
            'reports.transcripts',
            'messaging.templates',
            'messaging.bulk',
            'admissions.advanced',
            'fees.advanced',
            'bulk.import',
            'bulk.export',
            'roles.basic',
            'billing.invoice_download',
            'billing.invoice_request',
            'support.priority',
        ]
        enterprise_extra = [
            'roles.custom',
            'audit.advanced',
            'billing.invoice_manage',
            'api.access',
            'integrations.payment',
            'integrations.sms',
            'integrations.email',
            'sso.enabled',
            'multi_campus.enabled',
            'branding.basic',
            'branding.custom',
            'backups.export',
            'support.sla',
        ]

        if not existing_pf or int(existing_pf[0] or 0) == 0:
            feature_rows = []
            for slug, features in (
                ('basic', basic_features),
                ('pro', basic_features + pro_extra),
                ('enterprise', basic_features + pro_extra + enterprise_extra),
            ):
                pid = plan_id_by_slug.get(slug)
                if not pid:
                    continue
                for f in features:
                    feature_rows.append({'plan_id': pid, 'feature_key': f, 'is_enabled': True})
            if feature_rows:
                conn.execute(
                    sa.text(
                        'INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES (:plan_id, :feature_key, :is_enabled)'
                    ),
                    feature_rows,
                )

        if not existing_pl or int(existing_pl[0] or 0) == 0:
            limits_by_slug = {
                'basic': {
                    'max_active_students_per_term': ('500', 'number'),
                    'max_admin_accounts': ('3', 'number'),
                    'max_teacher_accounts': ('50', 'number'),
                    'storage_gb': ('5', 'number'),
                    'export_formats': ('["csv"]', 'json'),
                    'monthly_messages': ('1000', 'number'),
                    'api_access': ('false', 'boolean'),
                    'custom_branding': ('false', 'boolean'),
                    'multi_campus': ('false', 'boolean'),
                    'support_level': ('standard', 'string'),
                },
                'pro': {
                    'max_active_students_per_term': ('2000', 'number'),
                    'max_admin_accounts': ('10', 'number'),
                    'max_teacher_accounts': ('300', 'number'),
                    'storage_gb': ('50', 'number'),
                    'export_formats': ('["csv","pdf"]', 'json'),
                    'monthly_messages': ('5000', 'number'),
                    'api_access': ('optional_addon', 'string'),
                    'custom_branding': ('optional_addon', 'string'),
                    'multi_campus': ('optional_addon', 'string'),
                    'support_level': ('priority', 'string'),
                },
                'enterprise': {
                    'max_active_students_per_term': ('unlimited', 'string'),
                    'max_admin_accounts': ('unlimited', 'string'),
                    'max_teacher_accounts': ('unlimited', 'string'),
                    'storage_gb': ('unlimited', 'string'),
                    'export_formats': ('["csv","pdf","scheduled"]', 'json'),
                    'monthly_messages': ('unlimited', 'string'),
                    'api_access': ('true', 'boolean'),
                    'custom_branding': ('true', 'boolean'),
                    'multi_campus': ('true', 'boolean'),
                    'support_level': ('sla', 'string'),
                },
            }
            for slug, limits in limits_by_slug.items():
                pid = plan_id_by_slug.get(slug)
                if not pid:
                    continue
                for k, (v, t) in limits.items():
                    conn.execute(
                        sa.text('INSERT INTO plan_limits (plan_id, limit_key, limit_value, value_type) VALUES (:plan_id, :limit_key, :limit_value, :value_type)'),
                        {'plan_id': pid, 'limit_key': k, 'limit_value': str(v), 'value_type': t},
                    )

        basic_plan_id = plan_id_by_slug.get('basic')
        if basic_plan_id and insp.has_table('school_plan_subscriptions') and insp.has_table('tenants'):
            tenant_rows = conn.execute(sa.text('SELECT id FROM tenants')).fetchall() or []
            tenant_ids = [str(r[0]) for r in tenant_rows]
            active_rows = conn.execute(
                sa.text("SELECT DISTINCT school_id FROM school_plan_subscriptions WHERE status = 'active'")
            ).fetchall() or []
            has_active = {str(r[0]) for r in active_rows}
            today = date.today().isoformat()
            for tid in tenant_ids:
                if tid in has_active:
                    continue
                conn.execute(
                    sa.text(
                        "INSERT INTO school_plan_subscriptions (school_id, plan_id, starts_at, ends_at, status) "
                        "VALUES (:school_id, :plan_id, :starts_at, :ends_at, :status)"
                    ),
                    {
                        'school_id': tid,
                        'plan_id': basic_plan_id,
                        'starts_at': today,
                        'ends_at': None,
                        'status': 'active',
                    },
                )


def downgrade():
    op.drop_index('ix_messages_tenant_id', table_name='messages')
    with op.batch_alter_table('messages') as batch:
        try:
            batch.drop_column('tenant_id')
        except Exception:
            pass

    op.drop_index('ix_school_limit_overrides_limit_key', table_name='school_limit_overrides')
    op.drop_index('ix_school_limit_overrides_school_id', table_name='school_limit_overrides')
    op.drop_table('school_limit_overrides')

    op.drop_index('ix_school_feature_overrides_feature_key', table_name='school_feature_overrides')
    op.drop_index('ix_school_feature_overrides_school_id', table_name='school_feature_overrides')
    op.drop_table('school_feature_overrides')

    op.drop_index('ix_plan_limits_limit_key', table_name='plan_limits')
    op.drop_index('ix_plan_limits_plan_id', table_name='plan_limits')
    op.drop_table('plan_limits')

    op.drop_index('ix_plan_features_feature_key', table_name='plan_features')
    op.drop_index('ix_plan_features_plan_id', table_name='plan_features')
    op.drop_table('plan_features')

    if op.get_bind().dialect.name != 'sqlite':
        with op.batch_alter_table('billing_invoices') as batch:
            try:
                batch.drop_constraint('fk_billing_invoices_plan_id', type_='foreignkey')
            except Exception:
                pass
            batch.create_foreign_key('fk_billing_invoices_plan_id', 'billing_plans', ['plan_id'], ['id'])

        with op.batch_alter_table('school_plan_subscriptions') as batch:
            try:
                batch.drop_constraint('fk_school_plan_subs_plan_id', type_='foreignkey')
            except Exception:
                pass
            batch.create_foreign_key('fk_school_plan_subs_plan_id', 'billing_plans', ['plan_id'], ['id'])

    if op.get_bind().dialect.name != 'sqlite':
        with op.batch_alter_table('school_plan_subscriptions') as batch:
            for col in ['limits_snapshot', 'features_snapshot', 'currency_snapshot', 'price_per_student_snapshot']:
                try:
                    batch.drop_column(col)
                except Exception:
                    pass
            try:
                batch.alter_column('school_id', new_column_name='tenant_id')
            except Exception:
                pass
            try:
                batch.alter_column('starts_at', new_column_name='start_date')
            except Exception:
                pass
            try:
                batch.alter_column('ends_at', new_column_name='end_date')
            except Exception:
                pass

    if op.get_bind().dialect.name != 'sqlite':
        try:
            op.rename_table('plans', 'billing_plans')
        except Exception:
            pass
