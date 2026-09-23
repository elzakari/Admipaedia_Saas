from __future__ import annotations

from typing import Optional, Tuple

from app.extensions import db
from app.models.billing import Plan, PlanPricingTier


def serialize_tier(t: PlanPricingTier) -> dict:
    return {
        "id": int(t.id),
        "plan_id": int(t.plan_id),
        "country_code": t.country_code,
        "currency": t.currency,
        "min_students": int(t.min_students),
        "max_students": int(t.max_students) if t.max_students is not None else None,
        "price_per_student_month": float(t.price_per_student_month or 0),
        "is_active": bool(t.is_active),
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def list_tiers(plan_id: int) -> list[PlanPricingTier]:
    return (
        PlanPricingTier.query.filter_by(plan_id=int(plan_id))
        .order_by(
            PlanPricingTier.currency.asc(),
            PlanPricingTier.country_code.asc().nullsfirst(),
            PlanPricingTier.min_students.asc(),
        )
        .all()
    )


def _overlaps(
    a_min: int, a_max: Optional[int], b_min: int, b_max: Optional[int]
) -> bool:
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
        return None, "Plan not found"

    cur = (currency or "").strip().upper()
    if not cur or len(cur) != 3:
        return None, "Invalid currency"

    cc = (country_code or "").strip().upper() or None
    if cc is not None and len(cc) != 2:
        return None, "Invalid country_code"

    mn = int(min_students or 0)
    if mn < 0:
        return None, "min_students must be >= 0"
    mx = (
        int(max_students)
        if max_students is not None and str(max_students) != ""
        else None
    )
    if mx is not None and mx < mn:
        return None, "max_students must be >= min_students"

    try:
        price = float(price_per_student_month)
    except Exception:
        return None, "Invalid price_per_student_month"
    if price <= 0:
        return None, "price_per_student_month must be > 0"

    tier = (
        PlanPricingTier.query.get(int(tier_id))
        if tier_id
        else PlanPricingTier(plan_id=int(plan.id))
    )
    if tier_id and not tier:
        return None, "Tier not found"

    if is_active:
        existing = PlanPricingTier.query.filter_by(
            plan_id=int(plan.id), currency=cur, is_active=True
        )
        if cc is None:
            existing = existing.filter(PlanPricingTier.country_code.is_(None))
        else:
            existing = existing.filter(PlanPricingTier.country_code == cc)
        if tier_id:
            existing = existing.filter(PlanPricingTier.id != int(tier_id))
        for r in existing.all():
            if _overlaps(
                mn,
                mx,
                int(r.min_students),
                int(r.max_students) if r.max_students is not None else None,
            ):
                return None, "Pricing ranges overlap"

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


def _clean_tier_fields(data: dict) -> Tuple[Optional[dict], Optional[str]]:
    """Apply the same per-tier rules as upsert_tier to one matrix row."""
    cur = (data.get("currency") or "").strip().upper()
    if not cur or len(cur) != 3:
        return None, "Invalid currency"

    cc = (data.get("country_code") or "").strip().upper() or None
    if cc is not None and len(cc) != 2:
        return None, "Invalid country_code"

    try:
        mn = int(data.get("min_students") or 0)
        raw_mx = data.get("max_students")
        mx = int(raw_mx) if raw_mx is not None and str(raw_mx) != "" else None
    except (TypeError, ValueError):
        return None, "Invalid enrollment range"
    if mn < 0:
        return None, "min_students must be >= 0"
    if mx is not None and mx < mn:
        return None, "max_students must be >= min_students"

    try:
        price = float(data.get("price_per_student_month"))
    except (TypeError, ValueError):
        return None, "Invalid price_per_student_month"
    if price <= 0:
        return None, "price_per_student_month must be > 0"

    return {
        "country_code": cc,
        "currency": cur,
        "min_students": mn,
        "max_students": mx,
        "price_per_student_month": price,
        "is_active": bool(data.get("is_active", True)),
    }, None


def replace_matrix(
    *,
    plan_id: int,
    tiers: list,
    billing_min_months: Optional[int] = None,
) -> Tuple[Optional[Plan], Optional[str]]:
    """Replace a plan's full pricing matrix in a single commit.

    Every row is validated (including overlaps between the submitted active
    rows of the same country/currency) before anything is written, so a
    rejected matrix leaves the stored one untouched. Tiers of the plan that
    are not in the submission are deleted.
    """
    plan = Plan.query.get(int(plan_id))
    if not plan:
        return None, "Plan not found"
    if not isinstance(tiers, list):
        return None, "tiers must be a list"

    months = None
    if billing_min_months is not None:
        try:
            months = int(billing_min_months)
        except (TypeError, ValueError):
            return None, "min_months must be >= 1"
        if months < 1:
            return None, "min_months must be >= 1"

    existing = {int(t.id): t for t in list_tiers(int(plan.id))}
    cleaned: list[Tuple[Optional[int], dict]] = []
    seen_ids: set[int] = set()
    for idx, row in enumerate(tiers, start=1):
        if not isinstance(row, dict):
            return None, f"Tier {idx}: invalid tier"
        fields, err = _clean_tier_fields(row)
        if err:
            region = (row.get("country_code") or "GLOBAL").upper()
            return None, f"{region} tier {idx}: {err}"
        tid = row.get("id")
        if tid is not None:
            try:
                tid = int(tid)
            except (TypeError, ValueError):
                return None, "Tier not found"
            if tid not in existing or tid in seen_ids:
                return None, "Tier not found"
            seen_ids.add(tid)
        cleaned.append((tid, fields))

    active = [f for _, f in cleaned if f["is_active"]]
    for i, a in enumerate(active):
        for b in active[i + 1 :]:
            if (a["country_code"], a["currency"]) != (
                b["country_code"],
                b["currency"],
            ):
                continue
            if _overlaps(
                a["min_students"], a["max_students"], b["min_students"], b["max_students"]
            ):
                region = a["country_code"] or "GLOBAL"
                return None, f"{region} ({a['currency']}): Pricing ranges overlap"

    for tid, tier in existing.items():
        if tid not in seen_ids:
            db.session.delete(tier)
    for tid, fields in cleaned:
        tier = existing[tid] if tid is not None else PlanPricingTier(plan_id=int(plan.id))
        for k, v in fields.items():
            setattr(tier, k, v)
        if tid is None:
            db.session.add(tier)
    if months is not None:
        plan.billing_min_months = months
    db.session.commit()
    return plan, None


def delete_tier(tier_id: int) -> Tuple[bool, Optional[str]]:
    tier = PlanPricingTier.query.get(int(tier_id))
    if not tier:
        return False, "Tier not found"
    db.session.delete(tier)
    db.session.commit()
    return True, None


def update_plan_billing_min_months(
    *, plan_id: int, min_months: int
) -> Tuple[Optional[Plan], Optional[str]]:
    plan = Plan.query.get(int(plan_id))
    if not plan:
        return None, "Plan not found"
    m = int(min_months or 0)
    if m < 1:
        return None, "min_months must be >= 1"
    plan.billing_min_months = m
    db.session.commit()
    return plan, None


def seed_default_plans() -> list[Plan]:
    defaults = [
        {
            "slug": "trial",
            "name": "Trial",
            "currency": "XOF",
            "price_per_student": 0,
            "billing_min_months": 3,
        },
        {
            "slug": "basic",
            "name": "Basic",
            "currency": "XOF",
            "price_per_student": 0,
            "billing_min_months": 3,
        },
        {
            "slug": "pro",
            "name": "Pro",
            "currency": "XOF",
            "price_per_student": 0,
            "billing_min_months": 3,
        },
        {
            "slug": "enterprise",
            "name": "Enterprise",
            "currency": "XOF",
            "price_per_student": 0,
            "billing_min_months": 3,
        },
    ]
    created = False
    for d in defaults:
        existing = Plan.query.filter_by(slug=d["slug"]).first()
        if existing:
            continue
        p = Plan(
            slug=d["slug"],
            name=d["name"],
            currency=d["currency"],
            price_per_student=d["price_per_student"],
            billing_min_months=d["billing_min_months"],
            is_active=True,
        )
        db.session.add(p)
        created = True
    if created:
        db.session.commit()
    return Plan.query.order_by(Plan.id.asc()).all()
