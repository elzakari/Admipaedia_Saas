"""seed_plan_features_001 — Seed all plan_features rows for Trial/Basic/Pro/Enterprise

Revision ID: 20260521_seed_plan_features_001
Revises: 20260520_consolidate_billing_invoice_payments_001
Create Date: 2026-05-21

The plan_features table is empty, causing EntitlementService.getSchoolFeatures()
to return {} for every plan. This means every sidebar module is hidden because
hasFeature(key) returns False for all feature keys.

This migration seeds the canonical feature set for all four plans:
  trial     (plan_id=1) — all features enabled so schools can evaluate
  basic     (plan_id=2) — full feature set enabled
  pro       (plan_id=3) — full feature set enabled
  enterprise(plan_id=4) — full feature set enabled

After this migration, also refreshes the features_snapshot on all existing
active SchoolPlanSubscriptions so already-enrolled schools pick up the features
without needing to re-subscribe.
"""

from alembic import op
import json
import sqlalchemy as sa
from sqlalchemy import text


revision = '20260521_seed_plan_features_001'
down_revision = '20260520_consolidate_billing_invoice_payments_001'
branch_labels = None
depends_on = None

# Sidebar feature keys that gate nav items (from Sidebar.tsx featureByPath map)
# plus additional platform features used by other guards
ALL_FEATURES = [
    # Core module gates (sidebar)
    ('students.manage',      True,  'Manage student records'),
    ('teachers.manage',      True,  'Manage teacher records'),
    ('parents.manage',       True,  'Manage parent records'),
    ('academics.classes',    True,  'Access classes and academics'),
    ('academics.timetable',  True,  'Access timetable / schedule / calendar'),
    ('attendance.basic',     True,  'Basic attendance tracking'),
    ('exams.basic',          True,  'Basic exam management'),
    ('reports.standard',     True,  'Standard report generation'),
    ('admissions.basic',     True,  'Basic admissions module'),
    ('fees.basic',           True,  'Basic fees module'),
    ('library.basic',        True,  'Basic library module'),
    ('messaging.in_app',     True,  'In-app notifications and messages'),
    ('roles.basic',          True,  'Role-based administration'),
    # Extended features
    ('analytics.basic',      True,  'Basic analytics'),
    ('analytics.advanced',   False, 'Advanced AI analytics'),
    ('ai.insights',          False, 'AI-powered insights'),
    ('grading.advanced',     True,  'Advanced grading tools'),
    ('communication.email',  False, 'Email communication'),
    ('communication.sms',    False, 'SMS communication'),
    ('communication.whatsapp', False, 'WhatsApp communication'),
    ('portal.parent',        True,  'Parent portal access'),
    ('portal.student',       True,  'Student portal access'),
    ('curriculum.manage',    True,  'Curriculum management'),
    ('finance.basic',        True,  'Basic finance/fees tracking'),
]

# Per-plan overrides (None = use ALL_FEATURES default)
# Trial gets everything enabled so schools can evaluate the full product.
PLAN_OVERRIDES = {
    'trial':      {},   # all defaults
    'basic':      {},   # all defaults
    'pro':        {'analytics.advanced': True, 'ai.insights': True,
                   'communication.email': True, 'communication.sms': True},
    'enterprise': {'analytics.advanced': True, 'ai.insights': True,
                   'communication.email': True, 'communication.sms': True,
                   'communication.whatsapp': True},
}


def upgrade():
    conn = op.get_bind()

    # Look up plan IDs by slug
    rows = conn.execute(text("SELECT id, slug FROM plans")).fetchall()
    plan_map = {r[1]: r[0] for r in rows}  # slug -> id

    for slug, plan_id in plan_map.items():
        overrides = PLAN_OVERRIDES.get(slug, {})
        for feature_key, default_enabled, description in ALL_FEATURES:
            is_enabled = overrides.get(feature_key, default_enabled)

            # Upsert: insert if missing, update if present
            existing = conn.execute(text(
                "SELECT id FROM plan_features WHERE plan_id = :pid AND feature_key = :fk"
            ), {'pid': plan_id, 'fk': feature_key}).fetchone()

            if existing:
                conn.execute(text(
                    "UPDATE plan_features SET is_enabled = :en WHERE plan_id = :pid AND feature_key = :fk"
                ), {'en': is_enabled, 'pid': plan_id, 'fk': feature_key})
            else:
                conn.execute(text(
                    "INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES (:pid, :fk, :en)"
                ), {'pid': plan_id, 'fk': feature_key, 'en': is_enabled})

    # Refresh features_snapshot on all active subscriptions so existing
    # enrolled schools pick up the new feature rows immediately.
    active_subs = conn.execute(text(
        "SELECT id, school_id, plan_id FROM school_plan_subscriptions WHERE status = 'active'"
    )).fetchall()

    for sub_row in active_subs:
        sub_id = sub_row[0]
        plan_id = sub_row[2]

        # Build feature dict for this plan
        feat_rows = conn.execute(text(
            "SELECT feature_key, is_enabled FROM plan_features WHERE plan_id = :pid"
        ), {'pid': plan_id}).fetchall()

        features = {r[0]: bool(r[1]) for r in feat_rows}
        enabled_list = [k for k, v in features.items() if v]

        # Update subscription features_snapshot (JSONB column).
        # Use CAST() not :: because :: conflicts with SQLAlchemy :param syntax.
        conn.execute(text(
            "UPDATE school_plan_subscriptions "
            "SET features_snapshot = CAST(:snap AS jsonb) WHERE id = :sid"
        ), {'snap': json.dumps(features), 'sid': sub_id})

        # Update tenant enabled_features (PostgreSQL text[] ARRAY).
        # Embed the array literal directly in the SQL (no :param) to avoid
        # the text/array binding mismatch.
        if enabled_list:
            pg_array_literal = '{' + ','.join(f'"{v}"' for v in enabled_list) + '}'
        else:
            pg_array_literal = '{}'
        conn.execute(text(
            f"UPDATE tenants SET enabled_features = '{pg_array_literal}' WHERE id = "
            "(SELECT school_id FROM school_plan_subscriptions WHERE id = :sid)"
        ), {'sid': sub_id})



def downgrade():
    # Do not delete plan_features rows on downgrade — too destructive
    pass
