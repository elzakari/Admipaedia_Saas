from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional, Tuple

from app.extensions import db
from app.models.academic_term import AcademicTerm
from app.models.billing import Plan, SchoolPlanSubscription, SubscriptionChangeRequest
from app.models.tenant import Tenant
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
    return {
        'id': int(r.id),
        'school_id': str(r.school_id),
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
    }


def list_active_plans() -> list[Plan]:
    return Plan.query.filter_by(is_active=True).order_by(Plan.price_per_student.asc(), Plan.id.asc()).all()


def list_terms_for_tenant(tenant_id) -> list[AcademicTerm]:
    return AcademicTerm.query.filter_by(tenant_id=tenant_id).order_by(AcademicTerm.start_date.desc()).all()


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

    sub, err = assign_plan_to_tenant(tenant, plan.slug, actor_user_id=int(user_id))
    if err or not sub:
        return None, err or 'Failed to assign plan'

    req = SubscriptionChangeRequest(
        school_id=tenant.id,
        requested_plan_id=int(plan.id),
        request_type='upgrade',
        status='approved',
        created_by_user_id=int(user_id),
        decided_at=datetime.utcnow(),
        decision_note='Self-service upgrade',
    )
    db.session.add(req)
    db.session.commit()

    invoice, ierr = PaymentService.generate_invoice_for_school_term(
        school_id=tenant.id,
        academic_term_id=int(academic_term_id),
        due_date=None,
    )
    if ierr or not invoice:
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
            return None, perr

    return {
        'subscription_id': int(sub.id),
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
