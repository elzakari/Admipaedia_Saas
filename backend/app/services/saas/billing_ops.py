from app.extensions import db
from app.models.tenant import Tenant, TenantMembership, PlatformInvoice, PlatformPayment
from app.models.billing import Plan, SchoolPlanSubscription, BillingInvoice
from app.models.payments import Payment as BillingPayment
from app.services.integrations.token_service import ServiceTokenService
from app.services.saas.plan_ops import assign_plan_to_tenant

import uuid
import logging
logger = logging.getLogger(__name__)
from datetime import datetime, timedelta, date, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from .serialization import serialize_invoice, serialize_payment, serialize_tenant
from .tenant_ops import get_tenant_for_user


def _as_utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def list_invoices(user_id: int, tenant_id):
    tenant, membership, err = get_tenant_for_user(user_id, tenant_id)
    if err:
        return None, err
    if not membership:
        return None, 'Unauthorized'

    invoices = PlatformInvoice.query.filter_by(tenant_id=tenant.id).order_by(PlatformInvoice.created_at.desc()).all()
    return [serialize_invoice(i) for i in invoices], None


def create_invoice(user_id: int, tenant_id, invoice_number: str, amount, currency: str, issued_on, due_on=None):
    tenant, membership, err = get_tenant_for_user(user_id, tenant_id)
    if err:
        return None, err

    if not membership or membership.role not in ('school_admin', 'school_finance'):
        return None, 'Unauthorized'

    invoice_number = (invoice_number or '').strip()
    if not invoice_number:
        return None, 'invoice_number is required'

    inv = PlatformInvoice(
        tenant_id=tenant.id,
        invoice_number=invoice_number,
        amount=amount,
        currency=(currency or tenant.currency or 'USD').upper(),
        issued_on=issued_on,
        due_on=due_on,
        status='sent'
    )
    db.session.add(inv)
    db.session.commit()
    return inv, None


def record_payment(user_id: int, tenant_id, invoice_id, amount, method: str, reference: str, paid_on):
    tenant, membership, err = get_tenant_for_user(user_id, tenant_id)
    if err:
        return None, err

    if not membership or membership.role not in ('school_admin', 'school_finance'):
        return None, 'Unauthorized'

    invoice = None
    if invoice_id:
        try:
            invoice_uuid = invoice_id if isinstance(invoice_id, uuid.UUID) else uuid.UUID(str(invoice_id))
            invoice = PlatformInvoice.query.get(invoice_uuid)
        except Exception:
            invoice = None
    if invoice and invoice.tenant_id != tenant.id:
        return None, 'Invoice not found'

    payment = PlatformPayment(
        tenant_id=tenant.id,
        invoice_id=invoice.id if invoice else None,
        amount=amount,
        currency=(invoice.currency if invoice else (tenant.currency or 'USD')),
        method=(method or None),
        reference=(reference or None),
        paid_on=paid_on
    )
    db.session.add(payment)
    if invoice and invoice.status != 'paid':
        invoice.status = 'paid'
    db.session.commit()
    return payment, None


def list_payments(user_id: int, tenant_id):
    tenant, membership, err = get_tenant_for_user(user_id, tenant_id)
    if err:
        return None, err
    if not membership:
        return None, 'Unauthorized'
    payments = PlatformPayment.query.filter_by(tenant_id=tenant.id).order_by(PlatformPayment.created_at.desc()).all()
    return [serialize_payment(p) for p in payments], None


def platform_list_tenants():
    tenants = Tenant.query.order_by(Tenant.created_at.desc()).all()
    return [serialize_tenant(t) for t in tenants]


def platform_list_tenants_filtered(
    q: str = None,
    status: str = None,
    plan: str = None,
    country_code: str = None,
    sort: str = None,
    page: int = 1,
    per_page: int = 50
):
    query = Tenant.query

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Tenant.name.ilike(term),
                Tenant.slug.ilike(term),
                Tenant.custom_domain.ilike(term)
            )
        )
    if status:
        query = query.filter(Tenant.status == status)
    if plan:
        query = query.filter(Tenant.plan == plan)
    if country_code:
        query = query.filter(Tenant.country_code == country_code.upper())

    if sort == 'name_asc':
        query = query.order_by(Tenant.name.asc())
    elif sort == 'name_desc':
        query = query.order_by(Tenant.name.desc())
    elif sort == 'created_at_asc':
        query = query.order_by(Tenant.created_at.asc())
    else:
        query = query.order_by(Tenant.created_at.desc())

    total = query.count()
    per_page = max(1, min(int(per_page or 50), 200))
    page = max(1, int(page or 1))
    total_pages = max(1, (total + per_page - 1) // per_page)
    if page > total_pages:
        page = total_pages

    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        'items': [serialize_tenant(t) for t in items],
        'pagination': {
            'total': total,
            'total_pages': total_pages,
            'current_page': page,
            'per_page': per_page
        }
    }


def platform_get_tenant_detail(tenant_id):
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
    except Exception:
        return None, 'Tenant not found'

    tenant = Tenant.query.get(tenant_uuid)
    if not tenant:
        return None, 'Tenant not found'

    members_count = TenantMembership.query.filter_by(tenant_id=tenant.id).count()

    invoices = PlatformInvoice.query.options(joinedload(PlatformInvoice.tenant))\
        .filter_by(tenant_id=tenant.id).order_by(PlatformInvoice.created_at.desc()).limit(10).all()
    payments = PlatformPayment.query.options(joinedload(PlatformPayment.tenant))\
        .filter_by(tenant_id=tenant.id).order_by(PlatformPayment.created_at.desc()).limit(10).all()

    invoice_total = db.session.query(func.coalesce(func.sum(PlatformInvoice.amount), 0)).filter(PlatformInvoice.tenant_id == tenant.id).scalar() or 0
    payment_total = db.session.query(func.coalesce(func.sum(PlatformPayment.amount), 0)).filter(PlatformPayment.tenant_id == tenant.id).scalar() or 0

    invoice_total_f = float(invoice_total)
    payment_total_f = float(payment_total)

    return {
        'tenant': serialize_tenant(tenant),
        'members_count': int(members_count),
        'invoice_total': invoice_total_f,
        'payment_total': payment_total_f,
        'outstanding_total': max(0.0, invoice_total_f - payment_total_f),
        'recent_invoices': [
            {
                **serialize_invoice(i),
                'tenant_name': i.tenant.name if i.tenant else None
            }
            for i in invoices
        ],
        'recent_payments': [
            {
                **serialize_payment(p),
                'tenant_name': p.tenant.name if p.tenant else None
            }
            for p in payments
        ]
    }, None


def platform_kpis():
    try:
        tenants = Tenant.query.all()
    except Exception as e:
        logger.error(f"Error fetching tenants in platform_kpis: {str(e)}")
        tenants = []

    status_counts = {}
    plan_counts = {}
    country_counts = {}

    for t in tenants:
        try:
            status = t.status or 'inactive'
            plan = t.plan or 'trial'
            country = t.country_code or 'US'
            status_counts[status] = status_counts.get(status, 0) + 1
            plan_counts[plan] = plan_counts.get(plan, 0) + 1
            country_counts[country] = country_counts.get(country, 0) + 1
        except Exception:
            continue

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    new_last_30d = 0
    for t in tenants:
        if not t.created_at:
            continue
        try:
            if _as_utc_aware(t.created_at) >= cutoff:
                new_last_30d += 1
        except Exception:
            continue

    # --- Platform invoices / payments (legacy SaaS billing) ---
    try:
        platform_invoice_total = float(
            db.session.query(func.coalesce(func.sum(PlatformInvoice.amount), 0)).scalar() or 0
        )
        platform_payment_total = float(
            db.session.query(func.coalesce(func.sum(PlatformPayment.amount), 0)).scalar() or 0
        )
        invoices_count = PlatformInvoice.query.count()
        paid_invoices = PlatformInvoice.query.filter(PlatformInvoice.status == 'paid').count()
        sent_invoices = PlatformInvoice.query.filter(PlatformInvoice.status == 'sent').count()
    except Exception as e:
        logger.error(f"Error fetching platform invoice/payment metrics: {str(e)}")
        platform_invoice_total = 0.0
        platform_payment_total = 0.0
        invoices_count = 0
        paid_invoices = 0
        sent_invoices = 0

    # --- Billing invoices / payments (school-fee SaaS billing) ---
    try:
        billing_invoice_total = float(
            db.session.query(func.coalesce(func.sum(BillingInvoice.total_amount), 0))
            .filter(BillingInvoice.payment_status.in_(['paid', 'partially_paid']))
            .scalar() or 0
        )
        billing_payment_total = float(
            db.session.query(func.coalesce(func.sum(BillingPayment.amount), 0))
            .filter(BillingPayment.status == 'successful')
            .scalar() or 0
        )
        billing_invoices_count = BillingInvoice.query.count()
        billing_paid_invoices = BillingInvoice.query.filter(
            BillingInvoice.payment_status == 'paid'
        ).count()
    except Exception as e:
        logger.error(f"Error fetching school-fee billing invoice/payment metrics: {str(e)}")
        billing_invoice_total = 0.0
        billing_payment_total = 0.0
        billing_invoices_count = 0
        billing_paid_invoices = 0

    try:
        from app.models.student import Student
        students_total = int(db.session.query(func.count(Student.id)).scalar() or 0)
    except Exception as e:
        logger.error(f"Error fetching platform students count: {str(e)}")
        students_total = 0

    invoice_total_f = platform_invoice_total + billing_invoice_total
    payment_total_f = platform_payment_total + billing_payment_total

    return {
        'tenants_total': len(tenants),
        'tenants_new_last_30d': int(new_last_30d),
        'tenants_by_status': status_counts,
        'tenants_by_plan': plan_counts,
        'tenants_by_country': country_counts,
        'invoice_total': invoice_total_f,
        'payment_total': payment_total_f,
        'outstanding_total': max(0.0, invoice_total_f - payment_total_f),
        'invoices_count': int(invoices_count + billing_invoices_count),
        'invoices_sent_count': int(sent_invoices),
        'invoices_paid_count': int(paid_invoices + billing_paid_invoices),
        'students_total': students_total,
    }


def _parse_date(value):
    if value is None or value == '':
        return None
    try:
        return date.fromisoformat(value)
    except Exception:
        return None


def platform_list_invoices(
    tenant_id: str = None,
    status: str = None,
    q: str = None,
    date_from: str = None,
    date_to: str = None,
    page: int = 1,
    per_page: int = 50
):
    query = PlatformInvoice.query.options(joinedload(PlatformInvoice.tenant))

    if tenant_id:
        try:
            tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
            query = query.filter(PlatformInvoice.tenant_id == tenant_uuid)
        except Exception:
            query = query.filter(db.text('1=0'))
    if status:
        query = query.filter(PlatformInvoice.status == status)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(PlatformInvoice.invoice_number.ilike(term))

    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    if df:
        query = query.filter(PlatformInvoice.issued_on >= df)
    if dt:
        query = query.filter(PlatformInvoice.issued_on <= dt)

    query = query.order_by(PlatformInvoice.created_at.desc())

    total = query.count()
    per_page = max(1, min(int(per_page or 50), 200))
    page = max(1, int(page or 1))
    total_pages = max(1, (total + per_page - 1) // per_page)
    if page > total_pages:
        page = total_pages

    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        'items': [
            {
                **serialize_invoice(i),
                'tenant_name': i.tenant.name if i.tenant else None
            }
            for i in items
        ],
        'pagination': {
            'total': total,
            'total_pages': total_pages,
            'current_page': page,
            'per_page': per_page
        }
    }


def platform_list_payments(
    tenant_id: str = None,
    method: str = None,
    q: str = None,
    date_from: str = None,
    date_to: str = None,
    page: int = 1,
    per_page: int = 50
):
    query = PlatformPayment.query.options(joinedload(PlatformPayment.tenant), joinedload(PlatformPayment.invoice))

    if tenant_id:
        try:
            tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
            query = query.filter(PlatformPayment.tenant_id == tenant_uuid)
        except Exception:
            query = query.filter(db.text('1=0'))
    if method:
        query = query.filter(PlatformPayment.method == method)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(or_(PlatformPayment.reference.ilike(term), PlatformPayment.method.ilike(term)))

    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    if df:
        query = query.filter(PlatformPayment.paid_on >= df)
    if dt:
        query = query.filter(PlatformPayment.paid_on <= dt)

    query = query.order_by(PlatformPayment.created_at.desc())

    total = query.count()
    per_page = max(1, min(int(per_page or 50), 200))
    page = max(1, int(page or 1))
    total_pages = max(1, (total + per_page - 1) // per_page)
    if page > total_pages:
        page = total_pages

    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        'items': [
            {
                **serialize_payment(p),
                'tenant_name': p.tenant.name if p.tenant else None,
                'invoice_number': p.invoice.invoice_number if p.invoice else None
            }
            for p in items
        ],
        'pagination': {
            'total': total,
            'total_pages': total_pages,
            'current_page': page,
            'per_page': per_page
        }
    }


def platform_update_tenant(tenant_id, status=None, plan=None):
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
    except Exception:
        return None, 'Tenant not found'

    tenant = Tenant.query.get(tenant_uuid)
    if not tenant:
        return None, 'Tenant not found'
    if status is not None:
        tenant.status = status
    if plan is not None:
        _, err = assign_plan_to_tenant(tenant, str(plan), actor_user_id=None)
        if err:
            return None, err
    db.session.commit()
    return tenant, None


def platform_financial_summary():
    try:
        tenants = Tenant.query.all()
    except Exception as e:
        logger.error(f"Error fetching tenants in platform_financial_summary: {str(e)}")
        tenants = []

    # --- Platform invoices / payments (legacy SaaS billing) ---
    try:
        platform_invoices = PlatformInvoice.query.all()
        platform_payments = PlatformPayment.query.all()
        platform_inv_total = sum(float(i.amount or 0) for i in platform_invoices)
        platform_pmt_total = sum(float(p.amount or 0) for p in platform_payments)
    except Exception as e:
        logger.error(f"Error fetching platform billing records: {str(e)}")
        platform_invoices = []
        platform_payments = []
        platform_inv_total = 0.0
        platform_pmt_total = 0.0

    # --- Billing invoices / payments (school-fee SaaS billing) ---
    try:
        billing_inv_total = float(
            db.session.query(func.coalesce(func.sum(BillingInvoice.total_amount), 0))
            .filter(BillingInvoice.payment_status.in_(['paid', 'partially_paid']))
            .scalar() or 0
        )
        billing_pmt_total = float(
            db.session.query(func.coalesce(func.sum(BillingPayment.amount), 0))
            .filter(BillingPayment.status == 'successful')
            .scalar() or 0
        )
    except Exception as e:
        logger.error(f"Error fetching billing invoices or payments: {str(e)}")
        billing_inv_total = 0.0
        billing_pmt_total = 0.0

    invoice_total = platform_inv_total + billing_inv_total
    payment_total = platform_pmt_total + billing_pmt_total

    # Build per-tenant breakdown (platform billing only for now)
    by_tenant = {}
    for t in tenants:
        by_tenant[str(t.id)] = {
            'tenant_id': str(t.id),
            'tenant_name': t.name,
            'invoice_total': 0.0,
            'payment_total': 0.0,
        }
    for i in platform_invoices:
        key = str(i.tenant_id)
        if key in by_tenant:
            try:
                by_tenant[key]['invoice_total'] += float(i.amount or 0)
            except Exception:
                pass
    for p in platform_payments:
        key = str(p.tenant_id)
        if key in by_tenant:
            try:
                by_tenant[key]['payment_total'] += float(p.amount or 0)
            except Exception:
                pass

    # Add school-fee billing totals per tenant
    try:
        billing_inv_by_tenant = (
            db.session.query(BillingInvoice.tenant_id, func.sum(BillingInvoice.total_amount))
            .filter(BillingInvoice.payment_status.in_(['paid', 'partially_paid']))
            .group_by(BillingInvoice.tenant_id)
            .all()
        )
    except Exception as e:
        logger.error(f"Error grouping billing invoices by tenant: {str(e)}")
        billing_inv_by_tenant = []

    try:
        billing_pmt_by_tenant = (
            db.session.query(BillingPayment.school_id, func.sum(BillingPayment.amount))
            .filter(BillingPayment.status == 'successful')
            .group_by(BillingPayment.school_id)
            .all()
        )
    except Exception as e:
        logger.error(f"Error grouping billing payments by tenant: {str(e)}")
        billing_pmt_by_tenant = []

    for tid, total in billing_inv_by_tenant:
        key = str(tid)
        if key in by_tenant:
            try:
                by_tenant[key]['invoice_total'] += float(total or 0)
            except Exception:
                pass
        else:
            by_tenant[key] = {'tenant_id': key, 'tenant_name': key, 'invoice_total': float(total or 0), 'payment_total': 0.0}
    for tid, total in billing_pmt_by_tenant:
        key = str(tid)
        if key in by_tenant:
            try:
                by_tenant[key]['payment_total'] += float(total or 0)
            except Exception:
                pass

    return {
        'invoice_total': invoice_total,
        'payment_total': payment_total,
        'outstanding_total': max(0.0, invoice_total - payment_total),
        'by_tenant': list(by_tenant.values()),
    }
