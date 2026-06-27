from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional, Tuple

from app.extensions import db
from app.models.academic_term import AcademicTerm
from app.models.billing import Plan, SchoolPlanSubscription, SubscriptionChangeRequest
from app.models.tenant import Tenant
from app.models.user import User
from app.services.entitlements.service import EntitlementService
from app.services.payments.service import PaymentService
from app.services.saas.plan_ops import assign_plan_to_tenant


def serialize_plan(plan: Plan) -> dict:
    return {
        'id': int(plan.id),
        'name': plan.name,
        'slug': plan.slug,
        'description': plan.description,
        'price_per_student': float(plan.price_per_student or 0),
        'currency': plan.currency,
        'is_active': bool(plan.is_active),
        'billing_min_months': int(getattr(plan, 'billing_min_months', 3) or 3),
    }


def serialize_term(term: AcademicTerm) -> dict:
    return {
        'id': int(term.id),
        'name': term.name,
        'start_date': term.start_date.isoformat() if term.start_date else None,
        'end_date': term.end_date.isoformat() if term.end_date else None,
    }


def serialize_change_request(r: SubscriptionChangeRequest) -> dict:
    tenant = Tenant.query.get(r.school_id) if r.school_id else None
    effective_term = AcademicTerm.query.get(int(r.effective_academic_term_id)) if r.effective_academic_term_id else None
    current_plan, _ = _get_current_plan_for_tenant(r.school_id) if r.school_id else (None, None)
    created_by_user = User.query.get(int(r.created_by_user_id)) if r.created_by_user_id else None
    approved_by_user = User.query.get(int(r.approved_by_user_id)) if r.approved_by_user_id else None
    return {
        'id': int(r.id),
        'school_id': str(r.school_id),
        'school_name': tenant.name if tenant else None,
        'school_slug': tenant.slug if tenant else None,
        'requested_plan_id': int(r.requested_plan_id),
        'request_type': r.request_type,
        'status': r.status,
        'effective_academic_term_id': int(r.effective_academic_term_id) if r.effective_academic_term_id else None,
        'effective_date': r.effective_date.isoformat() if r.effective_date else None,
        'created_by_user_id': r.created_by_user_id,
        'approved_by_user_id': r.approved_by_user_id,
        'decision_note': r.decision_note,
        'decided_at': r.decided_at.isoformat() if r.decided_at else None,
        'created_at': r.created_at.isoformat() if r.created_at else None,
        'updated_at': r.updated_at.isoformat() if r.updated_at else None,
        'requested_plan': serialize_plan(r.requested_plan) if r.requested_plan else None,
        'current_plan': serialize_plan(current_plan) if current_plan else None,
        'effective_term': serialize_term(effective_term) if effective_term else None,
        'created_by_user': {
            'id': int(created_by_user.id),
            'email': created_by_user.email,
            'username': created_by_user.username,
        } if created_by_user else None,
        'approved_by_user': {
            'id': int(approved_by_user.id),
            'email': approved_by_user.email,
            'username': approved_by_user.username,
        } if approved_by_user else None,
    }


def list_active_plans() -> list[Plan]:
    return Plan.query.filter_by(is_active=True).order_by(Plan.price_per_student.asc(), Plan.id.asc()).all()


def list_terms_for_tenant(tenant_id) -> list[AcademicTerm]:
    return AcademicTerm.query.filter_by(tenant_id=tenant_id).order_by(AcademicTerm.start_date.desc()).all()


def _get_current_plan_for_tenant(tenant_id) -> tuple[Optional[Plan], Optional[str]]:
    active, err = EntitlementService.getSchoolActivePlan(str(tenant_id))
    if active and active.plan:
        return active.plan, None

    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return None, 'School not found'

    fallback_slug = (getattr(tenant, 'plan', None) or '').strip().lower()
    if fallback_slug:
        fallback_plan = Plan.query.filter_by(slug=fallback_slug, is_active=True).first()
        if fallback_plan:
            return fallback_plan, None

    latest_subscription = (
        SchoolPlanSubscription.query
        .filter_by(school_id=tenant.id)
        .order_by(SchoolPlanSubscription.starts_at.desc(), SchoolPlanSubscription.id.desc())
        .first()
    )
    if latest_subscription:
        plan = Plan.query.get(int(latest_subscription.plan_id))
        if plan:
            return plan, None

    return None, err or 'School has no active plan'


def _plan_order_map() -> dict[str, int]:
    plans = list_active_plans()
    return {
        str(plan.slug or '').strip().lower(): index
        for index, plan in enumerate(plans)
    }


def create_upgrade(
    *,
    tenant_id,
    user_id: int,
    plan_slug: str,
    academic_term_id: int,
    payment_channel: Optional[str],
    return_url: Optional[str],
    notify_url: Optional[str],
) -> Tuple[Optional[dict], Optional[str]]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return None, 'School not found'

    plan = Plan.query.filter_by(slug=(plan_slug or '').strip().lower(), is_active=True).first()
    if not plan:
        return None, 'Plan not found'

    current_plan, current_plan_error = _get_current_plan_for_tenant(tenant.id)
    if current_plan_error or not current_plan:
        return None, current_plan_error or 'School has no active plan'

    current_slug = str(current_plan.slug or '').strip().lower()
    target_slug = str(plan.slug or '').strip().lower()
    if current_slug == target_slug:
        return None, 'School is already on this plan'

    plan_order = _plan_order_map()
    if current_slug in plan_order and target_slug in plan_order and plan_order[target_slug] <= plan_order[current_slug]:
        return None, 'Use downgrade request for lower or equal plans'

    existing_pending = (
        SubscriptionChangeRequest.query
        .filter(
            SubscriptionChangeRequest.school_id == tenant.id,
            SubscriptionChangeRequest.request_type == 'upgrade',
            SubscriptionChangeRequest.status.in_(['pending', 'payment_pending']),
        )
        .first()
    )
    if existing_pending:
        return None, 'An upgrade request is already in progress'

    req = SubscriptionChangeRequest(
        school_id=tenant.id,
        requested_plan_id=int(plan.id),
        request_type='upgrade',
        status='payment_pending',
        effective_academic_term_id=int(academic_term_id),
        created_by_user_id=int(user_id),
        effective_date=date.today(),
        decision_note='Awaiting payment confirmation',
    )
    db.session.add(req)
    db.session.flush()

    invoice, ierr = PaymentService.generate_invoice_for_school_term(
        school_id=tenant.id,
        academic_term_id=int(academic_term_id),
        plan_override=plan,
        due_date=None,
    )
    if ierr or not invoice:
        db.session.rollback()
        return None, ierr or 'Failed to generate invoice'

    payment = None
    if payment_channel:
        payment, perr = PaymentService.initializeInvoicePayment(
            invoice_id=int(invoice.id),
            user_id=int(user_id),
            payment_channel=payment_channel,
            return_url=return_url,
            notify_url=notify_url,
        )
        if perr:
            db.session.rollback()
            return None, perr

    db.session.commit()

    return {
        'plan': serialize_plan(plan),
        'invoice': PaymentService.serialize_invoice(invoice),
        'payment': PaymentService.serialize_payment(payment) if payment else None,
        'change_request': serialize_change_request(req),
    }, None


def request_downgrade(
    *,
    tenant_id,
    user_id: int,
    plan_slug: str,
    effective_academic_term_id: int,
) -> Tuple[Optional[SubscriptionChangeRequest], Optional[str]]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return None, 'School not found'

    plan = Plan.query.filter_by(slug=(plan_slug or '').strip().lower(), is_active=True).first()
    if not plan:
        return None, 'Plan not found'

    current_plan, current_plan_error = _get_current_plan_for_tenant(tenant.id)
    if current_plan_error or not current_plan:
        return None, current_plan_error or 'School has no active plan'

    current_slug = str(current_plan.slug or '').strip().lower()
    target_slug = str(plan.slug or '').strip().lower()
    if current_slug == target_slug:
        return None, 'School is already on this plan'

    plan_order = _plan_order_map()
    if current_slug in plan_order and target_slug in plan_order and plan_order[target_slug] >= plan_order[current_slug]:
        return None, 'Downgrade target must be lower than the current plan'

    term = AcademicTerm.query.filter_by(id=int(effective_academic_term_id), tenant_id=tenant.id).first()
    if not term or not term.start_date:
        return None, 'Academic term not found'

    if term.start_date <= date.today():
        return None, 'Effective term must be in the future'

    pending = SubscriptionChangeRequest.query.filter_by(school_id=tenant.id, status='pending', request_type='downgrade').first()
    if pending:
        return None, 'A downgrade request is already pending'

    req = SubscriptionChangeRequest(
        school_id=tenant.id,
        requested_plan_id=int(plan.id),
        request_type='downgrade',
        status='pending',
        effective_academic_term_id=int(term.id),
        effective_date=term.start_date,
        created_by_user_id=int(user_id),
    )
    db.session.add(req)
    db.session.commit()
    return req, None


def list_school_requests(tenant_id) -> list[SubscriptionChangeRequest]:
    return (
        SubscriptionChangeRequest.query
        .filter_by(school_id=tenant_id)
        .order_by(SubscriptionChangeRequest.created_at.desc())
        .all()
    )


def list_platform_requests(*, status: Optional[str] = None) -> list[SubscriptionChangeRequest]:
    q = SubscriptionChangeRequest.query
    if status:
        q = q.filter(SubscriptionChangeRequest.status == status)
    return q.order_by(SubscriptionChangeRequest.created_at.desc()).all()


def approve_request(*, request_id: int, reviewer_user_id: int) -> Tuple[Optional[SubscriptionChangeRequest], Optional[str]]:
    req = SubscriptionChangeRequest.query.filter_by(id=int(request_id)).with_for_update().first()
    if not req:
        return None, 'Request not found'
    if req.status != 'pending':
        return None, 'Request is not pending'
    if req.request_type != 'downgrade':
        return None, 'Only downgrade requests require approval'

    tenant = Tenant.query.get(req.school_id)
    if not tenant:
        return None, 'School not found'

    term = AcademicTerm.query.filter_by(id=int(req.effective_academic_term_id), tenant_id=tenant.id).first() if req.effective_academic_term_id else None
    if not term or not term.start_date:
        return None, 'Effective term not found'

    starts_at = term.start_date
    if starts_at <= date.today():
        return None, 'Effective date must be in the future'

    active, err = EntitlementService.getSchoolActivePlan(str(tenant.id))
    if err or not active:
        return None, err or 'School has no active plan'

    current = active.subscription
    new_end = starts_at - timedelta(days=1)
    if not current.ends_at or current.ends_at > new_end:
        current.ends_at = new_end

    scheduled = SchoolPlanSubscription(
        school_id=tenant.id,
        plan_id=int(req.requested_plan_id),
        starts_at=starts_at,
        ends_at=None,
        status='active',
    )
    db.session.add(scheduled)

    req.status = 'approved'
    req.approved_by_user_id = int(reviewer_user_id)
    req.decided_at = datetime.utcnow()
    req.decision_note = (req.decision_note or '').strip() or 'Approved'

    db.session.commit()
    return req, None


def reject_request(*, request_id: int, reviewer_user_id: int, note: Optional[str]) -> Tuple[Optional[SubscriptionChangeRequest], Optional[str]]:
    req = SubscriptionChangeRequest.query.filter_by(id=int(request_id)).with_for_update().first()
    if not req:
        return None, 'Request not found'
    if req.status != 'pending':
        return None, 'Request is not pending'

    req.status = 'rejected'
    req.approved_by_user_id = int(reviewer_user_id)
    req.decided_at = datetime.utcnow()
    req.decision_note = (note or '').strip() or 'Rejected'
    db.session.commit()
    return req, None
