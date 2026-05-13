from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.models.billing import Plan, PlanPricingTier


@dataclass
class SelectedTier:
    tier: PlanPricingTier
    price_per_student_month: float


class PricingService:
    @staticmethod
    def _query_tiers(plan_id: int, *, country_code: Optional[str], currency: str):
        q = PlanPricingTier.query.filter_by(plan_id=int(plan_id), is_active=True)
        q = q.filter(PlanPricingTier.currency == (currency or '').strip().upper())
        if country_code is None:
            q = q.filter(PlanPricingTier.country_code.is_(None))
        else:
            q = q.filter(PlanPricingTier.country_code == (country_code or '').strip().upper())
        return q

    @staticmethod
    def get_price_per_student_month(
        *,
        plan: Plan,
        student_count: int,
        country_code: Optional[str],
        currency: str,
    ) -> float:
        count = int(student_count or 0)
        if count < 0:
            count = 0
        cc = (country_code or '').strip().upper() or None
        cur = (currency or plan.currency or 'USD').strip().upper()

        def pick(cc_value: Optional[str]):
            q = PricingService._query_tiers(int(plan.id), country_code=cc_value, currency=cur)
            q = q.filter(PlanPricingTier.min_students <= count)
            q = q.filter((PlanPricingTier.max_students.is_(None)) | (PlanPricingTier.max_students >= count))
            q = q.order_by(PlanPricingTier.min_students.desc(), PlanPricingTier.max_students.asc().nullsfirst(), PlanPricingTier.id.desc())
            return q.first()

        tier = pick(cc) or pick(None)
        if tier:
            return float(tier.price_per_student_month or 0)
        return float(plan.price_per_student or 0)

