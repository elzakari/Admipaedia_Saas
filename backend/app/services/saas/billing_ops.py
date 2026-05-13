from app.extensions import db
from app.models.tenant import Tenant, TenantMembership, PlatformInvoice, PlatformPayment
from app.models.billing import Plan, SchoolPlanSubscription
from app.services.integrations.token_service import ServiceTokenService
from app.services.saas.plan_ops import assign_plan_to_tenant

import uuid
from datetime import datetime, timedelta, date

from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from .serialization import serialize_invoice, serialize_payment, serialize_tenant
from .tenant_ops import get_tenant_for_user


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
    tenants = Tenant.query.all()

    status_counts = {}
    plan_counts = {}
    country_counts = {}

    for t in tenants:
        status_counts[t.status] = status_counts.get(t.status, 0) + 1
        plan_counts[t.plan] = plan_counts.get(t.plan, 0) + 1
        country_counts[t.country_code] = country_counts.get(t.country_code, 0) + 1

    now = datetime.utcnow()
    cutoff = now - timedelta(days=30)
    new_last_30d = sum(1 for t in tenants if t.created_at and t.created_at >= cutoff)

    invoice_total = db.session.query(func.coalesce(func.sum(PlatformInvoice.amount), 0)).scalar() or 0
    payment_total = db.session.query(func.coalesce(func.sum(PlatformPayment.amount), 0)).scalar() or 0

    invoices_count = PlatformInvoice.query.count()
    paid_invoices = PlatformInvoice.query.filter(PlatformInvoice.status == 'paid').count()
    sent_invoices = PlatformInvoice.query.filter(PlatformInvoice.status == 'sent').count()

    invoice_total_f = float(invoice_total)
    payment_total_f = float(payment_total)

    return {
        'tenants_total': len(tenants),
        'tenants_new_last_30d': int(new_last_30d),
        'tenants_by_status': status_counts,
        'tenants_by_plan': plan_counts,
        'tenants_by_country': country_counts,
        'invoice_total': invoice_total_f,
        'payment_total': payment_total_f,
        'outstanding_total': max(0.0, invoice_total_f - payment_total_f),
        'invoices_count': int(invoices_count),
        'invoices_sent_count': int(sent_invoices),
        'invoices_paid_count': int(paid_invoices)
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
    tenants = Tenant.query.all()
    invoices = PlatformInvoice.query.all()
    payments = PlatformPayment.query.all()

    invoice_total = sum([float(i.amount) for i in invoices])
    payment_total = sum([float(p.amount) for p in payments])

    by_tenant = {}
    for t in tenants:
        by_tenant[str(t.id)] = {
            'tenant_id': str(t.id),
            'tenant_name': t.name,
            'invoice_total': 0.0,
            'payment_total': 0.0
        }
    for i in invoices:
        key = str(i.tenant_id)
        if key in by_tenant:
            by_tenant[key]['invoice_total'] += float(i.amount)
    for p in payments:
        key = str(p.tenant_id)
        if key in by_tenant:
            by_tenant[key]['payment_total'] += float(p.amount)

    return {
        'invoice_total': invoice_total,
        'payment_total': payment_total,
        'outstanding_total': max(0.0, invoice_total - payment_total),
        'by_tenant': list(by_tenant.values())
    }
