from __future__ import annotations

from typing import Optional, Tuple

from app.extensions import db
from app.models.billing import Plan, PlanPricingTier


def serialize_tier(t: PlanPricingTier) -> dict:
    return {
        'id': int(t.id),
        'plan_id': int(t.plan_id),
        'country_code': t.country_code,
        'currency': t.currency,
        'min_students': int(t.min_students),
        'max_students': int(t.max_students) if t.max_students is not None else None,
        'price_per_student_month': float(t.price_per_student_month or 0),
        'is_active': bool(t.is_active),
        'created_at': t.created_at.isoformat() if t.created_at else None,
        'updated_at': t.updated_at.isoformat() if t.updated_at else None,
    }


def list_tiers(plan_id: int) -> list[PlanPricingTier]:
    return (
        PlanPricingTier.query
        .filter_by(plan_id=int(plan_id))
        .order_by(PlanPricingTier.currency.asc(), PlanPricingTier.country_code.asc().nullsfirst(), PlanPricingTier.min_students.asc())
        .all()
    )


def _overlaps(a_min: int, a_max: Optional[int], b_min: int, b_max: Optional[int]) -> bool:
    a_hi = a_max if a_max is not None else 10**9
    b_hi = b_max if b_max is not None else 10**9
    return not (a_hi < b_min or b_hi < a_min)


def upsert_tier(
    *,
    tier_id: Optional[int],
    plan_id: int,
    country_code: Optional[str],
    currency: str,
    min_students: int,
    max_students: Optional[int],
    price_per_student_month: float,
    is_active: bool,
) -> Tuple[Optional[PlanPricingTier], Optional[str]]:
    plan = Plan.query.get(int(plan_id))
    if not plan:
        return None, 'Plan not found'

    cur = (currency or '').strip().upper()
    if not cur or len(cur) != 3:
        return None, 'Invalid currency'

    cc = (country_code or '').strip().upper() or None
    if cc is not None and len(cc) != 2:
        return None, 'Invalid country_code'

    mn = int(min_students or 0)
    if mn < 0:
        return None, 'min_students must be >= 0'
    mx = int(max_students) if max_students is not None and str(max_students) != '' else None
    if mx is not None and mx < mn:
        return None, 'max_students must be >= min_students'

    try:
        price = float(price_per_student_month)
    except Exception:
        return None, 'Invalid price_per_student_month'
    if price <= 0:
        return None, 'price_per_student_month must be > 0'

    tier = PlanPricingTier.query.get(int(tier_id)) if tier_id else PlanPricingTier(plan_id=int(plan.id))
    if tier_id and not tier:
        return None, 'Tier not found'

    if is_active:
        existing = PlanPricingTier.query.filter_by(plan_id=int(plan.id), currency=cur, is_active=True)
        if cc is None:
            existing = existing.filter(PlanPricingTier.country_code.is_(None))
        else:
            existing = existing.filter(PlanPricingTier.country_code == cc)
        if tier_id:
            existing = existing.filter(PlanPricingTier.id != int(tier_id))
        for r in existing.all():
            if _overlaps(mn, mx, int(r.min_students), int(r.max_students) if r.max_students is not None else None):
                return None, 'Pricing ranges overlap'

    tier.plan_id = int(plan.id)
    tier.country_code = cc
    tier.currency = cur
    tier.min_students = mn
    tier.max_students = mx
    tier.price_per_student_month = price
    tier.is_active = bool(is_active)

    if not tier_id:
        db.session.add(tier)
    db.session.commit()
    return tier, None


def delete_tier(tier_id: int) -> Tuple[bool, Optional[str]]:
    tier = PlanPricingTier.query.get(int(tier_id))
    if not tier:
        return False, 'Tier not found'
    db.session.delete(tier)
    db.session.commit()
    return True, None


def update_plan_billing_min_months(*, plan_id: int, min_months: int) -> Tuple[Optional[Plan], Optional[str]]:
    plan = Plan.query.get(int(plan_id))
    if not plan:
        return None, 'Plan not found'
    m = int(min_months or 0)
    if m < 1:
        return None, 'min_months must be >= 1'
    plan.billing_min_months = m
    db.session.commit()
    return plan, None


def seed_default_plans() -> list[Plan]:
    defaults = [
        {'slug': 'trial', 'name': 'Trial', 'currency': 'XOF', 'price_per_student': 0, 'billing_min_months': 3},
        {'slug': 'basic', 'name': 'Basic', 'currency': 'XOF', 'price_per_student': 0, 'billing_min_months': 3},
        {'slug': 'pro', 'name': 'Pro', 'currency': 'XOF', 'price_per_student': 0, 'billing_min_months': 3},
        {'slug': 'enterprise', 'name': 'Enterprise', 'currency': 'XOF', 'price_per_student': 0, 'billing_min_months': 3},
    ]
    created = False
    for d in defaults:
        existing = Plan.query.filter_by(slug=d['slug']).first()
        if existing:
            continue
        p = Plan(
            slug=d['slug'],
            name=d['name'],
            currency=d['currency'],
            price_per_student=d['price_per_student'],
            billing_min_months=d['billing_min_months'],
            is_active=True,
        )
        db.session.add(p)
        created = True
    if created:
        db.session.commit()
    return Plan.query.order_by(Plan.id.asc()).all()
