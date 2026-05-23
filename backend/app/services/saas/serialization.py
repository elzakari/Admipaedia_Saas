from app.models.tenant import Tenant, PlatformInvoice, PlatformPayment


def serialize_tenant(t: Tenant):
    settings = getattr(t, 'settings', None) or {}
    logo_url = None
    if isinstance(settings, dict):
        logo_url = settings.get('logo_url') or settings.get('logo') or settings.get('school_logo')
    return {
        'id': str(t.id),
        'slug': t.slug,
        'name': t.name,
        'country_code': t.country_code,
        'default_language': getattr(t, 'default_language', None),
        'enabled_features': list(getattr(t, 'enabled_features', None) or []),
        'plan': t.plan,
        'plan_expires_at': t.plan_expires_at.isoformat() if getattr(t, 'plan_expires_at', None) else None,
        'trial_ends_at': t.trial_ends_at.isoformat() if getattr(t, 'trial_ends_at', None) else None,
        'status': t.status,
        'currency': t.currency,
        'is_setup_completed': getattr(t, 'is_setup_completed', False),
        'custom_domain': getattr(t, 'custom_domain', None),
        'schema_name': getattr(t, 'schema_name', None),
        'logo_url': logo_url,
        'created_at': t.created_at.isoformat() if t.created_at else None
    }


def serialize_invoice(i: PlatformInvoice):
    return {
        'id': str(i.id),
        'tenant_id': str(i.tenant_id),
        'invoice_number': i.invoice_number,
        'status': i.status,
        'amount': float(i.amount),
        'currency': i.currency,
        'issued_on': i.issued_on.isoformat() if i.issued_on else None,
        'due_on': i.due_on.isoformat() if i.due_on else None,
        'created_at': i.created_at.isoformat() if i.created_at else None
    }


def serialize_payment(p: PlatformPayment):
    return {
        'id': str(p.id),
        'tenant_id': str(p.tenant_id),
        'invoice_id': str(p.invoice_id) if p.invoice_id else None,
        'amount': float(p.amount),
        'currency': p.currency,
        'method': p.method,
        'reference': p.reference,
        'paid_on': p.paid_on.isoformat() if p.paid_on else None,
        'created_at': p.created_at.isoformat() if p.created_at else None
    }
