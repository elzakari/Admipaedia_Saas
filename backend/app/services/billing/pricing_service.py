from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.models.billing import Plan, PlanPricingTier


# When a school is on the 'trial' plan and no dedicated trial pricing tiers
# exist, fall back to this plan's tiers for price calculation.  This means
# the Super Admin only needs to configure one set of pricing rules (under
# 'basic') and trial schools automatically inherit those rates.
TRIAL_FALLBACK_SLUG = 'basic'

# Plans whose own tiers should be resolved via TRIAL_FALLBACK_SLUG when no
# direct tiers are found.  Extend this list if other alias slugs are needed.
PRICING_ALIAS_SLUGS: frozenset[str] = frozenset({'trial'})


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

    ``via_alias`` is True when the price was resolved through the trial-alias
    fallback plan rather than the school's own plan tiers.
    """
    price: float
    resolved_currency: str
    via_alias: bool = False


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
    def _pick_tier_in_range(
        plan_id: int,
        count: int,
        *,
        country_code: Optional[str],
        currency: str,
    ) -> Optional[PlanPricingTier]:
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
    def _get_highest_tier(
        plan_id: int,
        *,
        country_code: Optional[str],
        currency: str,
    ) -> Optional[PlanPricingTier]:
        """Return the highest active tier for the plan within (country_code, currency) when count exceeds defined bounds."""
        q = PricingService._query_tiers(int(plan_id), country_code=country_code, currency=currency)
        q = q.order_by(
            PlanPricingTier.min_students.desc(),
            PlanPricingTier.max_students.desc().nullsfirst(),
            PlanPricingTier.id.desc(),
        )
        return q.first()

    @staticmethod
    def _any_tier_for_country(
        plan_id: int,
        count: int,
        country_code: Optional[str],
    ) -> Optional[PlanPricingTier]:
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

    @staticmethod
    def _any_highest_tier_for_country(
        plan_id: int,
        country_code: Optional[str],
    ) -> Optional[PlanPricingTier]:
        """Find the highest active tier for *country_code* regardless of currency when count exceeds defined bounds."""
        q = PlanPricingTier.query.filter_by(plan_id=int(plan_id), is_active=True)
        if country_code is None:
            q = q.filter(PlanPricingTier.country_code.is_(None))
        else:
            q = q.filter(
                PlanPricingTier.country_code == (country_code or '').strip().upper()
            )
        q = q.order_by(
            PlanPricingTier.min_students.desc(),
            PlanPricingTier.max_students.desc().nullsfirst(),
            PlanPricingTier.id.desc(),
        )
        return q.first()

    @staticmethod
    def _alias_plan(plan: Plan) -> Optional[Plan]:
        """Return the fallback Plan to use for tier lookups when *plan* has no tiers.

        If the school is on the 'trial' plan (or any PRICING_ALIAS_SLUGS entry)
        and that plan has no configured pricing tiers, we transparently resolve
        pricing from the TRIAL_FALLBACK_SLUG ('basic') plan instead.
        Returns None if the alias plan doesn't exist or isn't needed.
        """
        slug = (plan.slug or '').strip().lower()
        if slug not in PRICING_ALIAS_SLUGS:
            return None
        fallback = Plan.query.filter_by(slug=TRIAL_FALLBACK_SLUG, is_active=True).first()
        return fallback  # may be None if basic plan not seeded yet

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
        fallback, then the trial-alias plan tiers, then plan.price_per_student.
        """
        count = max(0, int(student_count or 0))
        cc = (country_code or '').strip().upper() or None
        cur = (currency or plan.currency or 'USD').strip().upper()

        tier = (
            PricingService._pick_tier_in_range(int(plan.id), count, country_code=cc, currency=cur)
            or PricingService._pick_tier_in_range(int(plan.id), count, country_code=None, currency=cur)
        )
        if not tier:
            tier = (
                PricingService._get_highest_tier(int(plan.id), country_code=cc, currency=cur)
                or PricingService._get_highest_tier(int(plan.id), country_code=None, currency=cur)
            )
        if tier:
            return float(tier.price_per_student_month or 0)

        # Trial alias fallback — try the 'basic' plan's tiers
        alias = PricingService._alias_plan(plan)
        if alias:
            alias_tier = (
                PricingService._pick_tier_in_range(int(alias.id), count, country_code=cc, currency=cur)
                or PricingService._pick_tier_in_range(int(alias.id), count, country_code=None, currency=cur)
            )
            if not alias_tier:
                alias_tier = (
                    PricingService._get_highest_tier(int(alias.id), country_code=cc, currency=cur)
                    or PricingService._get_highest_tier(int(alias.id), country_code=None, currency=cur)
                )
            if alias_tier:
                return float(alias_tier.price_per_student_month or 0)

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
        1. Exact match: (country_code, preferred_currency) on the plan's own tiers
        2. Country fallback: any active tier for country_code on the plan's own tiers
        3. Global fallback: any global tier (country_code=NULL) on the plan's own tiers
        4. Trial alias: repeat steps 1-3 on the TRIAL_FALLBACK_SLUG ('basic') plan
           when the school's plan slug is in PRICING_ALIAS_SLUGS ('trial', etc.)
         5. Hard fallback: plan.price_per_student with preferred_currency

        This prevents the "0.00 GHS" problem where:
        - The tenant's stored currency differs from configured tier currencies, OR
        - The school is on the 'trial' plan which has no own tiers (tiers only
          exist on the 'basic' plan configured by Super Admin).
        """
        count = max(0, int(student_count or 0))
        cc = (country_code or '').strip().upper() or None
        pref_cur = (preferred_currency or plan.currency or 'USD').strip().upper()

        def _resolve_for_plan_id(pid: int, via_alias: bool) -> Optional[ResolvedPrice]:
            """Attempt all tier resolution steps for a given plan_id."""
            # Step A: exact (country + preferred currency) match
            if pref_cur:
                tier = (
                    PricingService._pick_tier_in_range(pid, count, country_code=cc, currency=pref_cur)
                    or PricingService._pick_tier_in_range(pid, count, country_code=None, currency=pref_cur)
                )
                if not tier:
                    tier = (
                        PricingService._get_highest_tier(pid, country_code=cc, currency=pref_cur)
                        or PricingService._get_highest_tier(pid, country_code=None, currency=pref_cur)
                    )
                if tier:
                    return ResolvedPrice(
                        price=float(tier.price_per_student_month or 0),
                        resolved_currency=str(tier.currency).upper(),
                        via_alias=via_alias,
                    )

            # Step B: country fallback — any currency configured for this country
            if cc:
                tier = PricingService._any_tier_for_country(pid, count, country_code=cc)
                if not tier:
                    tier = PricingService._any_highest_tier_for_country(pid, country_code=cc)
                if tier:
                    return ResolvedPrice(
                        price=float(tier.price_per_student_month or 0),
                        resolved_currency=str(tier.currency).upper(),
                        via_alias=via_alias,
                    )

            # Step C: global fallback — tiers with no country restriction
            tier = PricingService._any_tier_for_country(pid, count, country_code=None)
            if not tier:
                tier = PricingService._any_highest_tier_for_country(pid, country_code=None)
            if tier:
                return ResolvedPrice(
                    price=float(tier.price_per_student_month or 0),
                    resolved_currency=str(tier.currency).upper(),
                    via_alias=via_alias,
                )

            return None

        # 1-3: Try the plan's own tiers first
        result = _resolve_for_plan_id(int(plan.id), via_alias=False)
        if result:
            return result

        # 4: Trial alias fallback — try the 'basic' plan's tiers
        alias = PricingService._alias_plan(plan)
        if alias:
            result = _resolve_for_plan_id(int(alias.id), via_alias=True)
            if result:
                return result

        # 5: Ultimate fallback: plan base price with preferred currency
        return ResolvedPrice(
            price=float(plan.price_per_student or 0),
            resolved_currency=pref_cur,
            via_alias=False,
        )
