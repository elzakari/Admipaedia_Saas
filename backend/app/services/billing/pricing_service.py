from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

from app.models.billing import Plan, PlanPricingTier


@dataclass
class SelectedTier:
    tier: PlanPricingTier
    price_per_student_month: float


@dataclass
class ResolvedPrice:
    """Price and the currency that was authoritative for that price.

    The currency here comes from the matched pricing tier, *not* from the
    tenant record.  Callers should use ``resolved_currency`` when writing
    invoices or building dashboard responses so the displayed currency is
    always consistent with what was actually configured.
    """
    price: float
    resolved_currency: str


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
    def _pick_tier_in_range(plan_id: int, count: int, *, country_code: Optional[str], currency: str) -> Optional[PlanPricingTier]:
        """Return the best active tier for *count* students within (country_code, currency)."""
        q = PricingService._query_tiers(int(plan_id), country_code=country_code, currency=currency)
        q = q.filter(PlanPricingTier.min_students <= count)
        q = q.filter(
            (PlanPricingTier.max_students.is_(None)) | (PlanPricingTier.max_students >= count)
        )
        q = q.order_by(
            PlanPricingTier.min_students.desc(),
            PlanPricingTier.max_students.asc().nullsfirst(),
            PlanPricingTier.id.desc(),
        )
        return q.first()

    @staticmethod
    def _any_tier_for_country(plan_id: int, count: int, country_code: Optional[str]) -> Optional[PlanPricingTier]:
        """Find the best active tier for *country_code* regardless of currency.

        Used as a fallback when the tenant's stored currency does not match any
        configured pricing tier.  The returned tier's ``currency`` field is the
        authoritative currency for that country.
        """
        q = PlanPricingTier.query.filter_by(plan_id=int(plan_id), is_active=True)
        if country_code is None:
            q = q.filter(PlanPricingTier.country_code.is_(None))
        else:
            q = q.filter(
                PlanPricingTier.country_code == (country_code or '').strip().upper()
            )
        q = q.filter(PlanPricingTier.min_students <= count)
        q = q.filter(
            (PlanPricingTier.max_students.is_(None)) | (PlanPricingTier.max_students >= count)
        )
        q = q.order_by(
            PlanPricingTier.min_students.desc(),
            PlanPricingTier.max_students.asc().nullsfirst(),
            PlanPricingTier.id.desc(),
        )
        return q.first()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @staticmethod
    def get_price_per_student_month(
        *,
        plan: Plan,
        student_count: int,
        country_code: Optional[str],
        currency: str,
    ) -> float:
        """Return the tier price for *student_count* students.

        Tries (country_code, currency) first, then the global (None, currency)
        fallback, then falls back to ``plan.price_per_student``.
        """
        count = max(0, int(student_count or 0))
        cc = (country_code or '').strip().upper() or None
        cur = (currency or plan.currency or 'USD').strip().upper()

        tier = (
            PricingService._pick_tier_in_range(int(plan.id), count, country_code=cc, currency=cur)
            or PricingService._pick_tier_in_range(int(plan.id), count, country_code=None, currency=cur)
        )
        if tier:
            return float(tier.price_per_student_month or 0)
        return float(plan.price_per_student or 0)

    @staticmethod
    def resolve_price_and_currency(
        *,
        plan: Plan,
        student_count: int,
        country_code: Optional[str],
        preferred_currency: Optional[str] = None,
    ) -> ResolvedPrice:
        """Resolve the correct price **and** the authoritative currency for a school.

        Resolution order:
        1. Exact match: (country_code, preferred_currency) tier
        2. Country fallback: any active tier for country_code — uses **that tier's
           currency** so the displayed currency is always what was configured for
           the country, not what happens to be stored on the tenant record.
        3. Global fallback: any active tier with country_code=NULL
        4. Hard fallback: plan.price_per_student with preferred_currency

        This prevents the "0.00 GHS" problem where a tenant's stored currency
        differs from the pricing tiers configured by the Super Admin.
        """
        count = max(0, int(student_count or 0))
        cc = (country_code or '').strip().upper() or None
        pref_cur = (preferred_currency or plan.currency or 'USD').strip().upper()

        # 1. Exact (country + preferred currency) match
        if pref_cur:
            tier = (
                PricingService._pick_tier_in_range(int(plan.id), count, country_code=cc, currency=pref_cur)
                or PricingService._pick_tier_in_range(int(plan.id), count, country_code=None, currency=pref_cur)
            )
            if tier:
                return ResolvedPrice(
                    price=float(tier.price_per_student_month or 0),
                    resolved_currency=str(tier.currency).upper(),
                )

        # 2. Country fallback — any currency configured for this country
        if cc:
            tier = PricingService._any_tier_for_country(int(plan.id), count, country_code=cc)
            if tier:
                return ResolvedPrice(
                    price=float(tier.price_per_student_month or 0),
                    resolved_currency=str(tier.currency).upper(),
                )

        # 3. Global fallback — tiers with no country restriction
        tier = PricingService._any_tier_for_country(int(plan.id), count, country_code=None)
        if tier:
            return ResolvedPrice(
                price=float(tier.price_per_student_month or 0),
                resolved_currency=str(tier.currency).upper(),
            )

        # 4. Ultimate fallback: plan base price with preferred currency
        return ResolvedPrice(
            price=float(plan.price_per_student or 0),
            resolved_currency=pref_cur,
        )
