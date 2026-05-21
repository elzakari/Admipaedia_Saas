from __future__ import annotations

import json
import uuid
from datetime import datetime, date
from typing import Any, Optional

from flask import current_app
from sqlalchemy import and_

from app.extensions import db
from app.models.billing import BillingInvoice
from app.models.payments import Payment, PaymentGateway, new_reference
from app.models.academic_term import AcademicTerm
from app.models.tenant import Tenant, TenantMembership
from app.services.adapters.payment import PaymentGatewayFactory
from app.services.billing.pricing_service import PricingService
from app.services.entitlements.service import EntitlementService


class PaymentService:
    @staticmethod
    def _months_for_term(tenant_id, academic_term_id: int, *, min_months: int) -> int:
        m = int(min_months or 3)
        if m < 1:
            m = 1
        term = AcademicTerm.query.filter_by(id=int(academic_term_id), tenant_id=tenant_id).first()
        if not term or not term.start_date or not term.end_date:
            return m
        days = (term.end_date - term.start_date).days
        months = int((days + 29) // 30) or 1
        return max(months, m)

    @staticmethod
    def serialize_gateway(g: PaymentGateway) -> dict[str, Any]:
        return {
            'id': int(g.id),
            'name': g.name,
            'display_name': g.display_name,
            'country_code': g.country_code,
            'currency': g.currency,
            'public_key': g.public_key,
            'is_active': bool(g.is_active),
            'is_default': bool(g.is_default),
            'supported_channels': g.supported_channels or [],
            'environment': g.environment,
            'secret_key_set': bool(g.secret_key_encrypted),
            'webhook_secret_set': bool(g.webhook_secret_encrypted),
            'created_at': g.created_at.isoformat() if g.created_at else None,
            'updated_at': g.updated_at.isoformat() if g.updated_at else None,
        }

    @staticmethod
    def serialize_payment(p: Payment) -> dict[str, Any]:
        _dt = lambda v: v.isoformat() if v else None  # noqa: E731
        paid_at = getattr(p, 'paid_at', None)
        verified_at = getattr(p, 'verified_at', None)
        reviewed_at = getattr(p, 'reviewed_at', None)
        manual_paid_at = getattr(p, 'manual_paid_at', None)
        return {
            'id': int(p.id),
            'invoice_id': int(p.invoice_id),
            'school_id': str(p.school_id),
            'payment_gateway_id': int(p.payment_gateway_id) if p.payment_gateway_id is not None else None,
            'gateway_name': getattr(p, 'gateway_name', None),
            'payment_reference': getattr(p, 'payment_reference', None),
            'gateway_transaction_id': getattr(p, 'gateway_transaction_id', None),
            'amount': float(p.amount) if p.amount is not None else 0.0,
            'currency': getattr(p, 'currency', ''),
            'payment_channel': getattr(p, 'payment_channel', ''),
            'status': getattr(p, 'status', 'pending'),
            'payment_link': getattr(p, 'payment_link', None),
            'paid_at': _dt(paid_at),
            'verified_at': _dt(verified_at),
            'submitted_by_user_id': getattr(p, 'submitted_by_user_id', None),
            'reviewed_by_user_id': getattr(p, 'reviewed_by_user_id', None),
            'review_note': getattr(p, 'review_note', None),
            'reviewed_at': _dt(reviewed_at),
            'proof_path': getattr(p, 'proof_path', None),
            'manual_method': getattr(p, 'manual_method', None),
            'manual_reference': getattr(p, 'manual_reference', None),
            'manual_paid_at': _dt(manual_paid_at),
            'created_at': _dt(getattr(p, 'created_at', None)),
        }

    @staticmethod
    def serialize_invoice(inv: BillingInvoice) -> dict[str, Any]:
        _dt = lambda v: v.isoformat() if v else None  # noqa: E731
        return {
            'id': int(inv.id),
            'invoice_number': inv.invoice_number,
            'tenant_id': str(inv.tenant_id),
            'plan_id': int(inv.plan_id),
            'academic_term_id': int(inv.academic_term_id),
            'active_student_count': int(inv.active_student_count or 0),
            'price_per_student_snapshot': float(inv.price_per_student_snapshot or 0),
            'billing_months': int(getattr(inv, 'billing_months', 0) or 0),
            'subtotal': float(inv.subtotal or 0),
            'discount_amount': float(inv.discount_amount or 0),
            'tax_amount': float(inv.tax_amount or 0),
            'total_amount': float(inv.total_amount or 0),
            'currency': getattr(inv, 'currency', ''),
            'status': getattr(inv, 'status', 'pending'),
            'due_date': _dt(getattr(inv, 'due_date', None)),
            'paid_at': _dt(getattr(inv, 'paid_at', None)),
            'payment_status': getattr(inv, 'payment_status', 'unpaid'),
            'payment_link': getattr(inv, 'payment_link', None),
            'payment_reference': getattr(inv, 'payment_reference', None),
            'gateway_name': getattr(inv, 'gateway_name', None),
            'amount_paid': float(getattr(inv, 'amount_paid', None) or 0),
            'balance_due': float(getattr(inv, 'balance_due', None) or 0),
            'created_at': _dt(getattr(inv, 'created_at', None)),
            'updated_at': _dt(getattr(inv, 'updated_at', None)),
        }

    @staticmethod
    def get_best_gateway_for_school(school_id) -> tuple[Optional[PaymentGateway], Optional[str]]:
        selected = PaymentGatewayFactory.getBestPaymentGatewayForSchool(school_id)
        if not selected:
            return None, 'No payment gateway configured'
        return selected.gateway, None

    @staticmethod
    def list_gateways() -> list[PaymentGateway]:
        return PaymentGateway.query.order_by(PaymentGateway.name.asc(), PaymentGateway.country_code.asc().nullsfirst()).all()

    @staticmethod
    def upsert_gateway(
        *,
        gateway_id: Optional[int],
        name: str,
        display_name: Optional[str],
        country_code: Optional[str],
        currency: Optional[str],
        public_key: Optional[str],
        secret_key: Optional[str],
        webhook_secret: Optional[str],
        supported_channels: Optional[list[str]],
        environment: Optional[str],
        is_active: bool,
        is_default: bool,
    ) -> tuple[Optional[PaymentGateway], Optional[str]]:
        key = (name or '').strip().lower()
        if key not in ('paystack', 'cinetpay', 'flutterwave', 'manual'):
            return None, 'Invalid gateway name'

        cc = (country_code or '').strip().upper() or None
        cur = (currency or '').strip().upper() or None

        gw = PaymentGateway.query.get(int(gateway_id)) if gateway_id else PaymentGateway(name=key)
        if not gw:
            return None, 'Gateway not found'

        gw.name = key
        gw.display_name = (display_name or '').strip() or None
        gw.country_code = cc
        gw.currency = cur
        gw.public_key = (public_key or '').strip() or None
        gw.is_active = bool(is_active)
        gw.is_default = bool(is_default)
        gw.environment = (environment or 'sandbox').strip().lower()
        gw.supported_channels = supported_channels or []

        if secret_key and secret_key != '********':
            gw.set_secret_key(secret_key.strip())
        if webhook_secret and webhook_secret != '********':
            gw.set_webhook_secret(webhook_secret.strip())

        if not gateway_id:
            db.session.add(gw)
            db.session.flush()

        if gw.is_default:
            q = PaymentGateway.query.filter(PaymentGateway.id != gw.id, PaymentGateway.name == gw.name)
            if gw.country_code is None:
                q = q.filter(PaymentGateway.country_code.is_(None))
            else:
                q = q.filter(PaymentGateway.country_code == gw.country_code)
            if gw.currency is None:
                q = q.filter(PaymentGateway.currency.is_(None))
            else:
                q = q.filter(PaymentGateway.currency == gw.currency)
            q.update({'is_default': False})

        db.session.commit()
        return gw, None

    @staticmethod
    def generate_invoice_for_school_term(
        *,
        school_id,
        academic_term_id: int,
        months: Optional[int] = None,
        due_date: Optional[date] = None,
    ) -> tuple[Optional[BillingInvoice], Optional[str]]:
        tenant = Tenant.query.get(school_id)
        if not tenant:
            return None, 'School not found'

        active, err = EntitlementService.getSchoolActivePlan(str(tenant.id))
        if err or not active:
            # Fallback: accept Trial or any subscription for the school so that
            # invoice generation is not blocked during trial periods.
            from app.models.billing import SchoolPlanSubscription, Plan
            sub = (
                SchoolPlanSubscription.query
                .filter_by(school_id=tenant.id)
                .order_by(SchoolPlanSubscription.starts_at.desc())
                .first()
            )
            if sub:
                plan_obj = Plan.query.get(sub.plan_id)
                if plan_obj:
                    from app.services.entitlements.service import ActivePlan
                    active = ActivePlan(subscription=sub, plan=plan_obj)
                    err = None
            if err or not active:
                return None, err or 'School has no active plan'

        count = EntitlementService.count_active_registered_students_for_term(str(tenant.id), int(academic_term_id))

        # Anti-tampering logic: check historical peak and running average recorded in tenant_academic_settings
        from app.models.tenant_academic_settings import TenantAcademicSettings
        settings_rec = TenantAcademicSettings.query.filter_by(tenant_id=tenant.id).first()
        if settings_rec and isinstance(settings_rec.settings, dict):
            settings = settings_rec.settings
            peak_keys = ('billing_peak_students', 'peak_student_count', 'historical_peak_active_students')
            avg_keys = ('billing_average_students', 'average_student_count', 'running_average_active_students')
            
            peak_val = None
            for pk in peak_keys:
                if pk in settings and settings[pk] is not None:
                    try:
                        peak_val = int(settings[pk])
                        break
                    except (ValueError, TypeError):
                        pass
            
            avg_val = None
            for ak in avg_keys:
                if ak in settings and settings[ak] is not None:
                    try:
                        avg_val = int(settings[ak])
                        break
                    except (ValueError, TypeError):
                        pass
            
            if peak_val is not None:
                count = max(count, peak_val)
            if avg_val is not None:
                count = max(count, avg_val)

        # Use resolve_price_and_currency so the invoice currency is always
        # authoritative from the configured pricing tier, not the tenant record.
        # This fixes invoices being generated with 0 amount when tenant.currency
        # differs from the pricing tier currency (e.g. GHS vs XOF).
        resolved = PricingService.resolve_price_and_currency(
            plan=active.plan,
            student_count=int(count),
            country_code=tenant.country_code,
            preferred_currency=tenant.currency or None,
        )
        price = resolved.price
        currency = resolved.resolved_currency

        min_months = int(getattr(active.plan, 'billing_min_months', 3) or 3)
        if months is None:
            months_to_bill = PaymentService._months_for_term(tenant.id, int(academic_term_id), min_months=min_months)
        else:
            months_to_bill = int(months)
            if months_to_bill < min_months:
                months_to_bill = min_months

        # total_amount = active_student_count * tier_price_per_student * billing_months
        subtotal = round(float(price) * float(count) * float(months_to_bill), 2)

        invoice = BillingInvoice.query.filter_by(tenant_id=tenant.id, academic_term_id=int(academic_term_id)).first()
        if invoice:
            invoice.price_per_student_snapshot = price
            invoice.billing_months = months_to_bill
            invoice.active_student_count = count
            invoice.subtotal = subtotal
            invoice.total_amount = subtotal
            invoice.currency = currency
            if float(invoice.amount_paid or 0) <= 0:
                invoice.balance_due = subtotal
                invoice.payment_status = 'unpaid'
            db.session.commit()
            return invoice, None

        inv_no = f"BILL-{academic_term_id}-{str(tenant.id)[:8]}-{uuid.uuid4().hex[:6]}".upper()
        invoice = BillingInvoice(
            invoice_number=inv_no,
            tenant_id=tenant.id,
            plan_id=int(active.plan.id),
            academic_term_id=int(academic_term_id),
            price_per_student_snapshot=price,
            billing_months=months_to_bill,
            active_student_count=count,
            subtotal=subtotal,
            discount_amount=0,
            tax_amount=0,
            total_amount=subtotal,
            currency=currency,
            status='pending',
            due_date=due_date,
            payment_status='unpaid',
            amount_paid=0,
            balance_due=subtotal,
        )
        db.session.add(invoice)
        db.session.commit()
        return invoice, None


    @staticmethod
    def list_invoices_for_tenant(tenant_id) -> list[BillingInvoice]:
        return BillingInvoice.query.filter_by(tenant_id=tenant_id).order_by(BillingInvoice.created_at.desc()).all()

    @staticmethod
    def list_payments_for_tenant(tenant_id) -> list[Payment]:
        return Payment.query.filter_by(school_id=tenant_id).order_by(Payment.created_at.desc()).all()

    @staticmethod
    def initializeInvoicePayment(
        *,
        invoice_id: int,
        user_id: int,
        payment_channel: str,
        return_url: Optional[str],
        notify_url: Optional[str],
    ) -> tuple[Optional[Payment], Optional[str]]:
        channel = (payment_channel or '').strip().lower()
        if channel not in ('mobile_money', 'card', 'bank_transfer', 'wallet', 'manual'):
            return None, 'Invalid payment channel'

        inv = BillingInvoice.query.filter_by(id=int(invoice_id)).with_for_update().first()
        if not inv:
            return None, 'Invoice not found'

        if str(inv.payment_status or '').lower() == 'paid' or float(inv.balance_due or 0) <= 0:
            return None, 'Invoice already paid'

        tenant = Tenant.query.get(inv.tenant_id)
        if not tenant:
            return None, 'School not found'

        selected = PaymentGatewayFactory.getBestPaymentGatewayForSchool(tenant.id)
        if not selected:
            return None, 'No payment gateway configured'
        gw = selected.gateway
        adapter = selected.adapter

        supported = gw.supported_channels or []
        if channel != 'manual' and supported and channel not in supported:
            return None, 'Payment channel not supported'

        ref = new_reference('PMT')
        payment = Payment(
            invoice_id=int(inv.id),
            school_id=tenant.id,
            payment_gateway_id=int(gw.id),
            gateway_name=str(gw.name),
            payment_reference=ref,
            amount=float(inv.balance_due or inv.total_amount or 0),
            currency=inv.currency,
            payment_channel=channel,
            status='pending',
            submitted_by_user_id=int(user_id),
            idempotency_key=uuid.uuid4().hex,
        )
        db.session.add(payment)
        db.session.flush()

        try:
            init = adapter.initialize(gateway=gw, invoice=inv, payment=payment, return_url=return_url, notify_url=notify_url)
        except Exception as e:
            payment.status = 'failed'
            payment.gateway_response = {'error': str(e)}
            db.session.commit()
            return None, str(e)

        payment.payment_link = init.authorization_url
        payment.gateway_transaction_id = init.gateway_transaction_id
        payment.gateway_response = init.raw

        inv.payment_reference = payment.payment_reference
        inv.payment_link = payment.payment_link
        inv.gateway_name = payment.gateway_name
        inv.payment_status = 'pending'

        db.session.commit()
        return payment, None

    @staticmethod
    def apply_payment_success(payment: Payment, *, verified_amount: Optional[float], verified_currency: Optional[str]):
        inv = BillingInvoice.query.filter_by(id=int(payment.invoice_id)).with_for_update().first()
        if not inv:
            return
        if str(inv.payment_status or '').lower() == 'paid':
            return
        if verified_currency and str(verified_currency).upper() != str(inv.currency).upper():
            return

        expected = float(payment.amount or 0)
        actual = float(verified_amount) if verified_amount is not None else expected
        if expected > 0 and abs(actual - expected) > 0.01:
            return

        inv.amount_paid = float(inv.amount_paid or 0) + expected
        inv.balance_due = max(0.0, float(inv.total_amount or 0) - float(inv.amount_paid or 0))
        if inv.balance_due <= 0.01:
            inv.payment_status = 'paid'
            inv.status = 'paid'
            inv.paid_at = datetime.utcnow()
        else:
            inv.payment_status = 'partially_paid'

    @staticmethod
    def verify_payment(payment_id: int) -> tuple[Optional[Payment], Optional[str]]:
        p = Payment.query.filter_by(id=int(payment_id)).with_for_update().first()
        if not p:
            return None, 'Payment not found'

        if str(p.status).lower() == 'successful':
            return p, None

        gw = PaymentGateway.query.get(int(p.payment_gateway_id)) if p.payment_gateway_id else None
        if not gw:
            return None, 'Gateway not found'
        adapter = PaymentGatewayFactory.adapter_for(gw.name)
        res = adapter.verify(gateway=gw, payment=p)

        p.verified_at = datetime.utcnow()
        p.gateway_response = res.raw or p.gateway_response
        if res.paid:
            p.status = 'successful'
            p.paid_at = p.paid_at or datetime.utcnow()
            if res.gateway_transaction_id:
                p.gateway_transaction_id = res.gateway_transaction_id
            PaymentService.apply_payment_success(p, verified_amount=res.amount, verified_currency=res.currency)
        else:
            p.status = 'failed'

        db.session.commit()
        return p, None

    @staticmethod
    def extract_reference_from_webhook(gateway_name: str, payload: Any) -> Optional[str]:
        g = (gateway_name or '').strip().lower()
        if g == 'paystack':
            data = (payload or {}).get('data') if isinstance(payload, dict) else None
            ref = (data or {}).get('reference') if isinstance(data, dict) else None
            return str(ref) if ref else None
        if g == 'flutterwave':
            data = (payload or {}).get('data') if isinstance(payload, dict) else None
            ref = (data or {}).get('tx_ref') or (payload or {}).get('tx_ref') if isinstance(payload, dict) else None
            return str(ref) if ref else None
        if g == 'cinetpay':
            if isinstance(payload, dict):
                ref = payload.get('cpm_trans_id') or payload.get('transaction_id')
                return str(ref) if ref else None
            return None
        return None

    @staticmethod
    def handle_webhook(*, gateway_name: str, headers: dict[str, str], body: bytes) -> tuple[bool, str]:
        gname = (gateway_name or '').strip().lower()
        gw = PaymentGateway.query.filter_by(name=gname, is_active=True).order_by(PaymentGateway.is_default.desc()).first()
        if not gw:
            return False, 'Gateway not configured'

        adapter = PaymentGatewayFactory.adapter_for(gw.name)
        if not adapter.verify_webhook(gateway=gw, body=body, headers=headers):
            return False, 'Invalid signature'

        payload: Any = None
        try:
            payload = json.loads(body.decode('utf-8')) if body else {}
        except Exception:
            try:
                from urllib.parse import parse_qs
                parsed = parse_qs(body.decode('utf-8') if body else '')
                payload = {k: v[0] if isinstance(v, list) and v else v for k, v in parsed.items()}
            except Exception:
                payload = {}

        ref = PaymentService.extract_reference_from_webhook(gname, payload)
        if not ref:
            return True, 'No reference'

        p = Payment.query.filter_by(gateway_name=gname, payment_reference=str(ref)).with_for_update().first()
        if not p:
            return True, 'Payment not found'

        p.gateway_response = payload if isinstance(payload, dict) else {'raw': payload}

        if str(p.status).lower() == 'successful':
            db.session.commit()
            return True, 'Already processed'

        verified, _ = PaymentService.verify_payment(int(p.id))
        if not verified:
            db.session.commit()
            return True, 'Verification failed'
        return True, 'OK'

    @staticmethod
    def submit_manual_payment(
        *,
        invoice_id: int,
        tenant_id,
        user_id: int,
        amount: float,
        currency: str,
        method: str,
        reference: str,
        paid_at: Optional[datetime],
        proof_path: Optional[str],
    ) -> tuple[Optional[Payment], Optional[str]]:
        inv = BillingInvoice.query.filter_by(id=int(invoice_id), tenant_id=tenant_id).with_for_update().first()
        if not inv:
            return None, 'Invoice not found'

        if float(inv.balance_due or 0) <= 0 or str(inv.payment_status or '').lower() == 'paid':
            return None, 'Invoice already paid'

        manual = PaymentGateway.query.filter_by(name='manual', is_active=True).order_by(PaymentGateway.is_default.desc()).first()
        if not manual:
            return None, 'Manual payments not enabled'

        p = Payment(
            invoice_id=int(inv.id),
            school_id=tenant_id,
            payment_gateway_id=int(manual.id),
            gateway_name='manual',
            payment_reference=new_reference('MAN'),
            amount=float(amount),
            currency=(currency or inv.currency or 'USD').upper(),
            payment_channel='manual',
            status='pending',
            submitted_by_user_id=int(user_id),
            manual_method=(method or '').strip().lower() or None,
            manual_reference=(reference or '').strip() or None,
            manual_paid_at=paid_at,
            proof_path=proof_path,
            idempotency_key=uuid.uuid4().hex,
        )
        db.session.add(p)
        inv.payment_status = 'pending'
        db.session.commit()
        return p, None

    @staticmethod
    def review_manual_payment(*, payment_id: int, reviewer_id: int, approve: bool, note: Optional[str]) -> tuple[Optional[Payment], Optional[str]]:
        p = Payment.query.filter_by(id=int(payment_id)).with_for_update().first()
        if not p:
            return None, 'Payment not found'
        if str(p.gateway_name) != 'manual':
            return None, 'Only manual payments can be reviewed'
        if str(p.status).lower() == 'successful':
            return p, None

        p.reviewed_by_user_id = int(reviewer_id)
        p.review_note = (note or '').strip() or None
        p.reviewed_at = datetime.utcnow()
        if approve:
            p.status = 'successful'
            p.paid_at = p.paid_at or (p.manual_paid_at or datetime.utcnow())
            PaymentService.apply_payment_success(p, verified_amount=float(p.amount or 0), verified_currency=p.currency)

            # ── Post-approval: activate tenant plan ──────────────────────────
            # When a manual payment is approved, upgrade the school's plan from
            # Trial to the plan associated with their billing invoice, so that
            # the frontend sidebar features and plan context are unlocked.
            try:
                inv = BillingInvoice.query.get(int(p.invoice_id)) if p.invoice_id else None
                if inv:
                    from app.models.billing import SchoolPlanSubscription, Plan as BillingPlan
                    from app.services.saas.plan_ops import assign_plan_to_tenant

                    # Determine target plan: use invoice's plan_id, falling
                    # back to 'basic' if the plan is still on trial.
                    target_plan_id = getattr(inv, 'plan_id', None)
                    target_plan = BillingPlan.query.get(int(target_plan_id)) if target_plan_id else None
                    target_slug = (target_plan.slug if target_plan else None) or 'basic'

                    # Don't downgrade — only upgrade away from trial
                    tenant = Tenant.query.get(inv.tenant_id)
                    if tenant:
                        current_plan_slug = (tenant.plan or '').strip().lower()
                        if current_plan_slug in ('', 'trial', None) or current_plan_slug != target_slug:
                            tenant.status = 'active'
                            assign_plan_to_tenant(tenant, target_slug, actor_user_id=reviewer_id)
            except Exception as _act_err:
                # Activation failure must not roll back the payment approval
                current_app.logger.warning(
                    'post-payment plan activation failed for payment %s: %s', payment_id, _act_err
                )
        else:
            p.status = 'failed'

        db.session.commit()
        return p, None


    @staticmethod
    def platform_list_payments(
        *,
        status: Optional[str] = None,
        gateway: Optional[str] = None,
        country_code: Optional[str] = None,
        tenant_id: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[Payment]:
        q = Payment.query
        if status:
            q = q.filter(Payment.status == status)
        if gateway:
            q = q.filter(Payment.gateway_name == gateway)
        if tenant_id:
            q = q.filter(Payment.school_id == tenant_id)
        if date_from:
            q = q.filter(Payment.created_at >= datetime(date_from.year, date_from.month, date_from.day))
        if date_to:
            q = q.filter(Payment.created_at <= datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59))
        if country_code:
            cc = country_code.strip().upper()
            q = q.join(Tenant, Tenant.id == Payment.school_id)
            q = q.filter(Tenant.country_code == cc)
        return q.order_by(Payment.created_at.desc()).all()
