from __future__ import annotations

from datetime import date
from typing import Optional, Tuple

from app.extensions import db
from app.models.billing import Plan, SchoolPlanSubscription
from app.models.tenant import Tenant
from app.services.entitlements.service import EntitlementService
from app.services.integrations.token_service import ServiceTokenService


def assign_plan_to_tenant(
    tenant: Tenant,
    plan_slug: str,
    *,
    actor_user_id: Optional[int] = None,
) -> Tuple[Optional[SchoolPlanSubscription], Optional[str]]:
    slug = (plan_slug or '').strip().lower()
    if not slug:
        return None, 'plan is required'

    plan = Plan.query.filter_by(slug=slug).first()
    if not plan:
        return None, 'Plan not found'

    today = date.today()
    active = (
        SchoolPlanSubscription.query
        .filter_by(school_id=tenant.id, status='active')
        .order_by(SchoolPlanSubscription.starts_at.desc())
        .first()
    )

    if active and int(active.plan_id) == int(plan.id):
        tenant.plan = slug
        ServiceTokenService.provision_for_tenant(str(tenant.id), actor_user_id=actor_user_id)
        return active, None

    if active:
        active.status = 'inactive'
        active.ends_at = today

    sub = SchoolPlanSubscription(
        school_id=tenant.id,
        plan_id=plan.id,
        starts_at=today,
        ends_at=None,
        status='active'
    )
    db.session.add(sub)
    db.session.flush()

    features, _ = EntitlementService.getSchoolFeatures(str(tenant.id))
    limits, _ = EntitlementService.getSchoolLimits(str(tenant.id))
    if isinstance(features, dict):
        sub.features_snapshot = features
        tenant.enabled_features = [k for k, v in features.items() if v]
    if isinstance(limits, dict):
        sub.limits_snapshot = limits

    tenant.plan = slug
    ServiceTokenService.provision_for_tenant(str(tenant.id), actor_user_id=actor_user_id)
    return sub, None
