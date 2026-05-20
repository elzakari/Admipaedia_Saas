from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Optional

from flask import jsonify, request, g

from app.models.billing import BillingInvoice
from app.models.payments import Payment
from app.services.payments.service import PaymentService
from app.services.saas import subscription_change_ops
from app.services.billing import plan_pricing_ops
from app.utils.billing_access import super_admin_required, school_admin_required
from app.utils.tenant_context import tenant_required
from app.utils.file_utils import FileUtils

from . import billing_bp


def _parse_uuid(value: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(str(value))
    except Exception:
        return None


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)).date()
    except Exception:
        try:
            return datetime.strptime(str(value), '%Y-%m-%d').date()
        except Exception:
            return None


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        try:
            return datetime.strptime(str(value), '%Y-%m-%d')
        except Exception:
            return None


@billing_bp.route('/gateways', methods=['GET'])
@super_admin_required
def list_payment_gateways():
    gateways = PaymentService.list_gateways()
    return jsonify({'success': True, 'gateways': [PaymentService.serialize_gateway(g) for g in gateways]}), 200


@billing_bp.route('/gateways', methods=['POST'])
@super_admin_required
def create_payment_gateway():
    data = request.get_json() or {}
    gw, err = PaymentService.upsert_gateway(
        gateway_id=None,
        name=data.get('name'),
        display_name=data.get('display_name'),
        country_code=data.get('country_code'),
        currency=data.get('currency'),
        public_key=data.get('public_key'),
        secret_key=data.get('secret_key'),
        webhook_secret=data.get('webhook_secret'),
        supported_channels=data.get('supported_channels'),
        environment=data.get('environment'),
        is_active=bool(data.get('is_active', True)),
        is_default=bool(data.get('is_default', False)),
    )
    if err or not gw:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    return jsonify({'success': True, 'gateway': PaymentService.serialize_gateway(gw)}), 201


@billing_bp.route('/gateways/<int:gateway_id>', methods=['PUT', 'PATCH'])
@super_admin_required
def update_payment_gateway(gateway_id: int):
    data = request.get_json() or {}
    gw, err = PaymentService.upsert_gateway(
        gateway_id=int(gateway_id),
        name=data.get('name'),
        display_name=data.get('display_name'),
        country_code=data.get('country_code'),
        currency=data.get('currency'),
        public_key=data.get('public_key'),
        secret_key=data.get('secret_key'),
        webhook_secret=data.get('webhook_secret'),
        supported_channels=data.get('supported_channels'),
        environment=data.get('environment'),
        is_active=bool(data.get('is_active', True)),
        is_default=bool(data.get('is_default', False)),
    )
    if err or not gw:
        status = 404 if err == 'Gateway not found' else 400
        return jsonify({'success': False, 'message': err or 'Failed'}), status
    return jsonify({'success': True, 'gateway': PaymentService.serialize_gateway(gw)}), 200


@billing_bp.route('/payments', methods=['GET'])
@super_admin_required
def platform_list_payments():
    status = request.args.get('status')
    gateway = request.args.get('gateway')
    country_code = request.args.get('country_code')
    tenant_id = request.args.get('tenant_id')
    tenant_uuid = _parse_uuid(tenant_id) if tenant_id else None
    date_from = _parse_date(request.args.get('date_from'))
    date_to = _parse_date(request.args.get('date_to'))

    items = PaymentService.platform_list_payments(
        status=status,
        gateway=gateway,
        country_code=country_code,
        tenant_id=tenant_uuid or tenant_id,
        date_from=date_from,
        date_to=date_to,
    )
    return jsonify({'success': True, 'payments': [PaymentService.serialize_payment(p) for p in items]}), 200


@billing_bp.route('/payments/<int:payment_id>/verify', methods=['POST'])
@super_admin_required
def platform_verify_payment(payment_id: int):
    p, err = PaymentService.verify_payment(int(payment_id))
    if err or not p:
        status = 404 if err == 'Payment not found' else 400
        return jsonify({'success': False, 'message': err or 'Failed'}), status
    return jsonify({'success': True, 'payment': PaymentService.serialize_payment(p)}), 200


@billing_bp.route('/payments/<int:payment_id>/manual-review', methods=['POST'])
@super_admin_required
def platform_review_manual_payment(payment_id: int):
    data = request.get_json() or {}
    approve = bool(data.get('approve'))
    note = data.get('note')
    reviewer_id = getattr(g, 'current_user', None).id
    p, err = PaymentService.review_manual_payment(payment_id=int(payment_id), reviewer_id=int(reviewer_id), approve=approve, note=note)
    if err or not p:
        status = 404 if err == 'Payment not found' else 400
        return jsonify({'success': False, 'message': err or 'Failed'}), status
    return jsonify({'success': True, 'payment': PaymentService.serialize_payment(p)}), 200


@billing_bp.route('/tenants/<tenant_id>/invoices', methods=['GET'])
@super_admin_required
def platform_list_invoices_for_tenant(tenant_id: str):
    tid = _parse_uuid(tenant_id) or tenant_id
    items = PaymentService.list_invoices_for_tenant(tid)
    return jsonify({'success': True, 'invoices': [PaymentService.serialize_invoice(i) for i in items]}), 200


@billing_bp.route('/tenants/<tenant_id>/invoices/generate', methods=['POST'])
@super_admin_required
def platform_generate_invoice(tenant_id: str):
    data = request.get_json() or {}
    academic_term_id = data.get('academic_term_id')
    if not academic_term_id:
        return jsonify({'success': False, 'message': 'academic_term_id is required'}), 400
    due_date = _parse_date(data.get('due_date'))
    tid = _parse_uuid(tenant_id) or tenant_id
    invoice, err = PaymentService.generate_invoice_for_school_term(
        school_id=tid,
        academic_term_id=int(academic_term_id),
        due_date=due_date,
    )
    if err or not invoice:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    return jsonify({'success': True, 'invoice': PaymentService.serialize_invoice(invoice)}), 201


@billing_bp.route('/school/invoices', methods=['GET'])
@tenant_required
@school_admin_required
def school_list_invoices():
    tenant_id = g.tenant_id
    try:
        items = PaymentService.list_invoices_for_tenant(tenant_id)
        serialized = []
        for i in items:
            try:
                serialized.append(PaymentService.serialize_invoice(i))
            except Exception:
                pass
        return jsonify({'success': True, 'invoices': serialized}), 200
    except Exception as ex:
        return jsonify({'success': False, 'message': str(ex) or 'Failed to load invoices', 'invoices': []}), 200


@billing_bp.route('/school/payments', methods=['GET'])
@tenant_required
@school_admin_required
def school_list_payments():
    tenant_id = g.tenant_id
    try:
        items = PaymentService.list_payments_for_tenant(tenant_id)
        serialized = []
        for p in items:
            try:
                serialized.append(PaymentService.serialize_payment(p))
            except Exception:
                # Skip records with missing columns rather than crashing
                pass
        return jsonify({'success': True, 'payments': serialized}), 200
    except Exception as ex:
        return jsonify({'success': False, 'message': str(ex) or 'Failed to load payments', 'payments': []}), 200


@billing_bp.route('/school/payment-options', methods=['GET'])
@tenant_required
@school_admin_required
def school_payment_options():
    tenant_id = g.tenant_id
    try:
        selected, err = PaymentService.get_best_gateway_for_school(tenant_id)
    except Exception as ex:
        return jsonify({'success': False, 'message': str(ex) or 'Gateway lookup failed'}), 400
    if err or not selected:
        return jsonify({'success': False, 'message': err or 'No gateway configured for this school'}), 400
    channels = getattr(selected, 'supported_channels', None) or []
    return jsonify({
        'success': True,
        'gateway': PaymentService.serialize_gateway(selected),
        'supported_channels': channels,
    }), 200


@billing_bp.route('/school/invoices/<int:invoice_id>/initialize-payment', methods=['POST'])
@tenant_required
@school_admin_required
def school_initialize_payment(invoice_id: int):
    tenant_id = g.tenant_id
    inv = BillingInvoice.query.filter_by(id=int(invoice_id), tenant_id=tenant_id).first()
    if not inv:
        return jsonify({'success': False, 'message': 'Invoice not found'}), 404

    data = request.get_json() or {}
    payment_channel = data.get('payment_channel')
    return_url = data.get('return_url')
    notify_url = data.get('notify_url')
    user_id = getattr(g, 'current_user', None).id

    p, err = PaymentService.initializeInvoicePayment(
        invoice_id=int(inv.id),
        user_id=int(user_id),
        payment_channel=payment_channel,
        return_url=return_url,
        notify_url=notify_url,
    )
    if err or not p:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    return jsonify({'success': True, 'payment': PaymentService.serialize_payment(p), 'invoice': PaymentService.serialize_invoice(inv)}), 200


@billing_bp.route('/school/payments/<int:payment_id>/verify', methods=['POST'])
@tenant_required
@school_admin_required
def school_verify_payment(payment_id: int):
    tenant_id = g.tenant_id
    p0 = Payment.query.filter_by(id=int(payment_id), school_id=tenant_id).first()
    if not p0:
        return jsonify({'success': False, 'message': 'Payment not found'}), 404
    p, err = PaymentService.verify_payment(int(payment_id))
    if err or not p:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    inv = BillingInvoice.query.filter_by(id=int(p.invoice_id), tenant_id=tenant_id).first()
    return jsonify({
        'success': True,
        'payment': PaymentService.serialize_payment(p),
        'invoice': PaymentService.serialize_invoice(inv) if inv else None
    }), 200


@billing_bp.route('/school/invoices/<int:invoice_id>/manual-payment', methods=['POST'])
@tenant_required
@school_admin_required
def school_submit_manual_payment(invoice_id: int):
    tenant_id = g.tenant_id
    user_id = getattr(g, 'current_user', None).id

    amount_raw = request.form.get('amount')
    currency = request.form.get('currency')
    method = request.form.get('method')
    reference = request.form.get('reference')
    paid_at_raw = request.form.get('paid_at')

    try:
        amount = float(amount_raw) if amount_raw is not None else 0.0
    except Exception:
        amount = 0.0
    if amount <= 0:
        return jsonify({'success': False, 'message': 'amount must be > 0'}), 400

    paid_at = _parse_datetime(paid_at_raw)

    proof_path = None
    if 'proof' in request.files:
        proof_path, err = FileUtils.upload_payment_proof(request.files['proof'], payment_reference=reference)
        if err:
            return jsonify({'success': False, 'message': err}), 400

    p, err = PaymentService.submit_manual_payment(
        invoice_id=int(invoice_id),
        tenant_id=tenant_id,
        user_id=int(user_id),
        amount=amount,
        currency=currency,
        method=method,
        reference=reference,
        paid_at=paid_at,
        proof_path=proof_path,
    )
    if err or not p:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    return jsonify({'success': True, 'payment': PaymentService.serialize_payment(p)}), 201


@billing_bp.route('/plans', methods=['GET'])
@super_admin_required
def platform_list_plans():
    plans = subscription_change_ops.list_active_plans()
    return jsonify({'success': True, 'plans': [subscription_change_ops.serialize_plan(p) for p in plans]}), 200


@billing_bp.route('/plans/seed-defaults', methods=['POST'])
@super_admin_required
def platform_seed_default_plans():
    plans = plan_pricing_ops.seed_default_plans()
    return jsonify({'success': True, 'plans': [subscription_change_ops.serialize_plan(p) for p in plans]}), 201


@billing_bp.route('/plans/<int:plan_id>/billing-settings', methods=['PATCH'])
@super_admin_required
def platform_update_plan_billing_settings(plan_id: int):
    data = request.get_json() or {}
    min_months = data.get('billing_min_months') or data.get('min_months')
    if min_months is None:
        return jsonify({'success': False, 'message': 'billing_min_months is required'}), 400
    plan, err = plan_pricing_ops.update_plan_billing_min_months(plan_id=int(plan_id), min_months=int(min_months))
    if err or not plan:
        status = 404 if err == 'Plan not found' else 400
        return jsonify({'success': False, 'message': err or 'Failed'}), status
    return jsonify({'success': True, 'plan': subscription_change_ops.serialize_plan(plan)}), 200


@billing_bp.route('/plans/<int:plan_id>/pricing-tiers', methods=['GET'])
@super_admin_required
def platform_list_plan_pricing_tiers(plan_id: int):
    tiers = plan_pricing_ops.list_tiers(int(plan_id))
    return jsonify({'success': True, 'tiers': [plan_pricing_ops.serialize_tier(t) for t in tiers]}), 200


@billing_bp.route('/plans/<int:plan_id>/pricing-tiers', methods=['POST'])
@super_admin_required
def platform_create_plan_pricing_tier(plan_id: int):
    data = request.get_json() or {}
    tier, err = plan_pricing_ops.upsert_tier(
        tier_id=None,
        plan_id=int(plan_id),
        country_code=data.get('country_code'),
        currency=data.get('currency'),
        min_students=data.get('min_students'),
        max_students=data.get('max_students'),
        price_per_student_month=data.get('price_per_student_month'),
        is_active=bool(data.get('is_active', True)),
    )
    if err or not tier:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    return jsonify({'success': True, 'tier': plan_pricing_ops.serialize_tier(tier)}), 201


@billing_bp.route('/pricing-tiers/<int:tier_id>', methods=['PUT', 'PATCH'])
@super_admin_required
def platform_update_plan_pricing_tier(tier_id: int):
    data = request.get_json() or {}
    plan_id = data.get('plan_id')
    if not plan_id:
        existing = plan_pricing_ops.PlanPricingTier.query.get(int(tier_id))
        plan_id = existing.plan_id if existing else None
    if not plan_id:
        return jsonify({'success': False, 'message': 'plan_id is required'}), 400
    tier, err = plan_pricing_ops.upsert_tier(
        tier_id=int(tier_id),
        plan_id=int(plan_id),
        country_code=data.get('country_code'),
        currency=data.get('currency'),
        min_students=data.get('min_students'),
        max_students=data.get('max_students'),
        price_per_student_month=data.get('price_per_student_month'),
        is_active=bool(data.get('is_active', True)),
    )
    if err or not tier:
        status = 404 if err == 'Tier not found' else 400
        return jsonify({'success': False, 'message': err or 'Failed'}), status
    return jsonify({'success': True, 'tier': plan_pricing_ops.serialize_tier(tier)}), 200


@billing_bp.route('/pricing-tiers/<int:tier_id>', methods=['DELETE'])
@super_admin_required
def platform_delete_plan_pricing_tier(tier_id: int):
    ok, err = plan_pricing_ops.delete_tier(int(tier_id))
    if err:
        return jsonify({'success': False, 'message': err}), 404
    return jsonify({'success': True}), 200


@billing_bp.route('/subscription-change-requests', methods=['GET'])
@super_admin_required
def platform_list_plan_change_requests():
    status = request.args.get('status')
    items = subscription_change_ops.list_platform_requests(status=status)
    return jsonify({'success': True, 'requests': [subscription_change_ops.serialize_change_request(r) for r in items]}), 200


@billing_bp.route('/subscription-change-requests/<int:request_id>/approve', methods=['POST'])
@super_admin_required
def platform_approve_plan_change_request(request_id: int):
    reviewer_id = getattr(g, 'current_user', None).id
    req, err = subscription_change_ops.approve_request(request_id=int(request_id), reviewer_user_id=int(reviewer_id))
    if err or not req:
        status = 404 if err == 'Request not found' else 400
        return jsonify({'success': False, 'message': err or 'Failed'}), status
    return jsonify({'success': True, 'request': subscription_change_ops.serialize_change_request(req)}), 200


@billing_bp.route('/subscription-change-requests/<int:request_id>/reject', methods=['POST'])
@super_admin_required
def platform_reject_plan_change_request(request_id: int):
    data = request.get_json() or {}
    reviewer_id = getattr(g, 'current_user', None).id
    req, err = subscription_change_ops.reject_request(
        request_id=int(request_id),
        reviewer_user_id=int(reviewer_id),
        note=data.get('note'),
    )
    if err or not req:
        status = 404 if err == 'Request not found' else 400
        return jsonify({'success': False, 'message': err or 'Failed'}), status
    return jsonify({'success': True, 'request': subscription_change_ops.serialize_change_request(req)}), 200


@billing_bp.route('/school/plans', methods=['GET'])
@tenant_required
@school_admin_required
def school_list_plans():
    from app.models.tenant import Tenant
    from app.services.billing.pricing_service import PricingService
    from app.services.entitlements.service import EntitlementService
    from app.models.academic_term import AcademicTerm

    tenant_id = g.tenant_id
    tenant = Tenant.query.filter_by(id=tenant_id).first()
    if not tenant:
        return jsonify({'success': False, 'message': 'Tenant not found'}), 404

    # Resolve active student count — use the most recent term if available,
    # otherwise fall back to all active students for the school.
    term = AcademicTerm.query.filter_by(tenant_id=tenant.id).order_by(AcademicTerm.start_date.desc()).first()
    if term:
        count = EntitlementService.count_active_registered_students_for_term(str(tenant.id), term.id)
    else:
        from app.models.student import Student
        count = Student.query.filter_by(tenant_id=tenant.id, status='active').count()

    # Determine the school's current active plan for marking in the response.
    current_plan_slug: str | None = None
    active_plan, _ = EntitlementService.getSchoolActivePlan(str(tenant.id))
    if not active_plan:
        # Trial fallback: any subscription (even non-active-status)
        from app.models.billing import SchoolPlanSubscription, Plan as _Plan
        _sub = (
            SchoolPlanSubscription.query
            .filter_by(school_id=tenant.id)
            .order_by(SchoolPlanSubscription.starts_at.desc())
            .first()
        )
        if _sub:
            _p = _Plan.query.get(_sub.plan_id)
            if _p:
                current_plan_slug = str(_p.slug or '').strip().lower()
    else:
        current_plan_slug = str(active_plan.plan.slug or '').strip().lower()

    plans = subscription_change_ops.list_active_plans()
    serialized_plans = []
    for p in plans:
        # resolve_price_and_currency applies the trial-alias fallback automatically:
        # if the school is on 'trial' and tiers only exist on 'basic', it uses
        # the 'basic' tier price while returning the tier's authoritative currency.
        resolved = PricingService.resolve_price_and_currency(
            plan=p,
            student_count=count,
            country_code=tenant.country_code,
            preferred_currency=tenant.currency or None,
        )
        sp = subscription_change_ops.serialize_plan(p)
        sp['price_per_student'] = resolved.price
        sp['currency'] = resolved.resolved_currency
        sp['active_student_count'] = count
        sp['total_per_month'] = round(resolved.price * count, 2)
        sp['is_current_plan'] = (
            str(p.slug or '').strip().lower() == current_plan_slug
        )
        sp['pricing_via_alias'] = resolved.via_alias
        serialized_plans.append(sp)

    return jsonify({
        'success': True,
        'plans': serialized_plans,
        'current_plan_slug': current_plan_slug,
        'active_student_count': count,
    }), 200




@billing_bp.route('/school/academic-terms', methods=['GET'])
@tenant_required
@school_admin_required
def school_list_academic_terms():
    from app.models.academic_term import AcademicTerm
    from app.services.academic_configuration_service import AcademicConfigurationService

    tenant_id = g.tenant_id
    terms = subscription_change_ops.list_terms_for_tenant(tenant_id)
    if not terms:
        # Automatically seed a default academic term if none exists
        from datetime import date
        from app.extensions import db
        config = AcademicConfigurationService.build_harmonized_config(tenant_id)
        term_name = config.get('currentTerm') or 'First Term'
        today = date.today()
        # Seed the term for the current calendar year
        start_date = date(today.year, 1, 1)
        end_date = date(today.year, 12, 31)

        t = AcademicTerm(
            tenant_id=tenant_id,
            name=term_name,
            start_date=start_date,
            end_date=end_date
        )
        db.session.add(t)
        db.session.commit()
        terms = [t]

    return jsonify({'success': True, 'terms': [subscription_change_ops.serialize_term(t) for t in terms]}), 200


@billing_bp.route('/school/subscription-change-requests', methods=['GET'])
@tenant_required
@school_admin_required
def school_list_plan_change_requests():
    tenant_id = g.tenant_id
    items = subscription_change_ops.list_school_requests(tenant_id)
    return jsonify({'success': True, 'requests': [subscription_change_ops.serialize_change_request(r) for r in items]}), 200


def _resolve_academic_term_id(tenant_id, value) -> Optional[int]:
    if value is None:
        return None
    # Try to parse as integer directly
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        pass
    
    # Try to find by name for the tenant
    from app.models.academic_term import AcademicTerm
    term = AcademicTerm.query.filter_by(tenant_id=tenant_id).filter(AcademicTerm.name.ilike(str(value).strip())).first()
    if term:
        return int(term.id)
    return None


@billing_bp.route('/school/subscription/upgrade', methods=['POST'])
@tenant_required
@school_admin_required
def school_upgrade_plan():
    tenant_id = g.tenant_id
    user_id = getattr(g, 'current_user', None).id
    data = request.get_json() or {}
    plan_slug = data.get('plan_slug') or data.get('plan')
    raw_term = data.get('academic_term_id') or data.get('term_id')
    academic_term_id = _resolve_academic_term_id(tenant_id, raw_term)
    if not academic_term_id:
        return jsonify({'success': False, 'message': 'academic_term_id could not be resolved or is missing'}), 400
    result, err = subscription_change_ops.create_upgrade(
        tenant_id=tenant_id,
        user_id=int(user_id),
        plan_slug=plan_slug,
        academic_term_id=int(academic_term_id),
        payment_channel=data.get('payment_channel') or data.get('channel'),
        return_url=data.get('return_url'),
        notify_url=data.get('notify_url'),
    )
    if err or not result:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    return jsonify({'success': True, **result}), 200


@billing_bp.route('/school/subscription/downgrade-request', methods=['POST'])
@tenant_required
@school_admin_required
def school_request_downgrade():
    tenant_id = g.tenant_id
    user_id = getattr(g, 'current_user', None).id
    data = request.get_json() or {}
    plan_slug = data.get('plan_slug') or data.get('plan')
    raw_term = data.get('effective_academic_term_id') or data.get('effective_term_id') or data.get('term_id')
    effective_term_id = _resolve_academic_term_id(tenant_id, raw_term)
    if not effective_term_id:
        return jsonify({'success': False, 'message': 'effective_academic_term_id could not be resolved or is missing'}), 400
    req, err = subscription_change_ops.request_downgrade(
        tenant_id=tenant_id,
        user_id=int(user_id),
        plan_slug=plan_slug,
        effective_academic_term_id=int(effective_term_id),
    )
    if err or not req:
        return jsonify({'success': False, 'message': err or 'Failed'}), 400
    return jsonify({'success': True, 'request': subscription_change_ops.serialize_change_request(req)}), 201
