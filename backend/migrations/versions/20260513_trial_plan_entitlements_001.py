"""trial_plan_entitlements

Revision ID: 20260513_trial_plan_entitlements_001
Revises: 20260513_platform_integrations_tokens_001
Create Date: 2026-05-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = '20260513_trial_plan_entitlements_001'
down_revision = '20260513_platform_integrations_tokens_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)

    if not insp.has_table('plans') or not insp.has_table('plan_features') or not insp.has_table('plan_limits'):
        return

    slug = 'trial'
    exists = conn.execute(sa.text('SELECT id FROM plans WHERE slug = :slug LIMIT 1'), {'slug': slug}).fetchone()
    if exists:
        trial_id = int(exists[0])
    else:
        conn.execute(
            sa.text(
                'INSERT INTO plans (name, slug, description, price_per_student, currency, is_active) '
                'VALUES (:name, :slug, :description, 0, :currency, true)'
            ),
            {'name': 'Trial', 'slug': slug, 'description': 'Trial plan', 'currency': 'USD'}
        )
        trial_id = int(conn.execute(sa.text('SELECT id FROM plans WHERE slug = :slug LIMIT 1'), {'slug': slug}).fetchone()[0])

    trial_features = [
        'students.manage',
        'teachers.manage',
        'parents.manage',
        'academics.classes',
        'academics.subjects',
        'attendance.basic',
        'exams.basic',
        'reports.standard',
        'messaging.in_app',
        'admissions.basic',
        'fees.basic',
        'library.basic',
        'billing.view',
        'audit.basic',
        'integrations.email',
        'integrations.sms',
        'ai.external'
    ]

    for f in trial_features:
        f_exists = conn.execute(
            sa.text('SELECT 1 FROM plan_features WHERE plan_id = :pid AND feature_key = :k LIMIT 1'),
            {'pid': trial_id, 'k': f}
        ).fetchone()
        if f_exists:
            continue
        conn.execute(
            sa.text('INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES (:pid, :k, true)'),
            {'pid': trial_id, 'k': f}
        )

    trial_limits = {
        'max_active_students_per_term': ('100', 'number'),
        'max_admin_accounts': ('1', 'number'),
        'max_teacher_accounts': ('10', 'number'),
        'storage_gb': ('1', 'number'),
        'monthly_messages': ('200', 'number'),
        'tokens.email.monthly': ('200', 'number'),
        'tokens.sms.monthly': ('50', 'number'),
        'tokens.whatsapp.monthly': ('0', 'number'),
        'tokens.ai.monthly': ('100', 'number'),
    }

    for k, (v, vt) in trial_limits.items():
        l_exists = conn.execute(
            sa.text('SELECT 1 FROM plan_limits WHERE plan_id = :pid AND limit_key = :k LIMIT 1'),
            {'pid': trial_id, 'k': k}
        ).fetchone()
        if l_exists:
            continue
        conn.execute(
            sa.text('INSERT INTO plan_limits (plan_id, limit_key, limit_value, value_type) VALUES (:pid, :k, :v, :t)'),
            {'pid': trial_id, 'k': k, 'v': str(v), 't': vt}
        )


def downgrade():
    conn = op.get_bind()
    try:
        row = conn.execute(sa.text("SELECT id FROM plans WHERE slug = 'trial' LIMIT 1")).fetchone()
    except Exception:
        row = None
    if not row:
        return
    trial_id = int(row[0])
    try:
        conn.execute(sa.text('DELETE FROM plan_limits WHERE plan_id = :pid'), {'pid': trial_id})
        conn.execute(sa.text('DELETE FROM plan_features WHERE plan_id = :pid'), {'pid': trial_id})
        conn.execute(sa.text('DELETE FROM plans WHERE id = :pid'), {'pid': trial_id})
    except Exception:
        pass

