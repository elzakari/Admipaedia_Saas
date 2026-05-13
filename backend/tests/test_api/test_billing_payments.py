import uuid
from datetime import date

from app.extensions import db, bcrypt
from app.models.user import User
from app.models.tenant import Tenant, TenantMembership
from app.models.billing import Plan, BillingInvoice
from app.models.academic_term import AcademicTerm
from app.models.payments import PaymentGateway


def _create_user(email: str, role: str, password: str):
    user = User.query.filter_by(email=email).first()
    if user:
        user.role = role
        user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        user.status = 'active'
        db.session.commit()
        return user
    user = User(
        username=email.split('@')[0],
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        role=role,
        status='active',
    )
    db.session.add(user)
    db.session.commit()
    return user


def _login(client, email: str, password: str) -> str:
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200
    token = resp.json.get('access_token')
    assert token
    return token


def _create_tenant(*, country_code: str, currency: str) -> Tenant:
    t = Tenant(
        id=uuid.uuid4(),
        slug=f"test-{uuid.uuid4().hex[:6]}",
        name="Test School",
        country_code=country_code,
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency=currency,
        status='active',
    )
    db.session.add(t)
    db.session.flush()
    return t


def _create_school_membership(*, tenant_id, user_id: int):
    m = TenantMembership(tenant_id=tenant_id, user_id=int(user_id), role='school_admin', status='active')
    db.session.add(m)
    db.session.commit()
    return m


def _create_plan(currency: str) -> Plan:
    p = Plan(name="Trial", slug=f"trial-{uuid.uuid4().hex[:6]}", price_per_student=0, currency=currency, is_active=True)
    db.session.add(p)
    db.session.flush()
    return p


def _create_term(*, tenant_id) -> AcademicTerm:
    term = AcademicTerm(tenant_id=tenant_id, name="Term 1", start_date=date(2026, 1, 1), end_date=date(2026, 4, 1))
    db.session.add(term)
    db.session.flush()
    return term


def _create_invoice(*, tenant_id, plan_id: int, term_id: int, currency: str) -> BillingInvoice:
    inv = BillingInvoice(
        invoice_number=f"INV-{uuid.uuid4().hex[:10]}",
        tenant_id=tenant_id,
        plan_id=int(plan_id),
        academic_term_id=int(term_id),
        price_per_student_snapshot=0,
        active_student_count=0,
        subtotal=100,
        discount_amount=0,
        tax_amount=0,
        total_amount=100,
        currency=currency,
        status='pending',
        payment_status='unpaid',
        amount_paid=0,
        balance_due=100,
    )
    db.session.add(inv)
    db.session.commit()
    return inv


def _enable_gateway(*, name: str, country_code: str, currency: str, channels: list[str]):
    gw = PaymentGateway(
        name=name,
        display_name=name.title(),
        country_code=country_code,
        currency=currency,
        public_key='public_test_key',
        is_active=True,
        is_default=True,
        supported_channels=channels,
        environment='sandbox',
    )
    gw.set_secret_key('secret_test_key')
    gw.set_webhook_secret('webhook_test_secret')
    db.session.add(gw)
    db.session.commit()
    return gw


def test_school_initialize_and_verify_payment_updates_invoice(client):
    tenant = _create_tenant(country_code='GH', currency='GHS')
    plan = _create_plan('GHS')
    term = _create_term(tenant_id=tenant.id)
    invoice = _create_invoice(tenant_id=tenant.id, plan_id=plan.id, term_id=term.id, currency='GHS')
    _enable_gateway(name='paystack', country_code='GH', currency='GHS', channels=['mobile_money', 'card'])

    _create_user('school_admin_billing@example.com', role='user', password='Password123!')
    token = _login(client, 'school_admin_billing@example.com', 'Password123!')
    _create_school_membership(tenant_id=tenant.id, user_id=User.query.filter_by(email='school_admin_billing@example.com').first().id)

    headers = {'Authorization': f'Bearer {token}', 'X-Tenant-ID': str(tenant.id)}

    opts = client.get('/api/v1/billing/school/payment-options', headers=headers)
    assert opts.status_code == 200
    assert opts.json['gateway']['name'] == 'paystack'

    init = client.post(
        f'/api/v1/billing/school/invoices/{invoice.id}/initialize-payment',
        json={'payment_channel': 'mobile_money', 'return_url': 'https://example.test/return'},
        headers=headers,
    )
    assert init.status_code == 200
    payment_id = init.json['payment']['id']
    assert init.json['payment']['status'] == 'pending'
    assert init.json['payment']['payment_link']

    verified = client.post(f'/api/v1/billing/school/payments/{payment_id}/verify', headers=headers)
    assert verified.status_code == 200
    assert verified.json['payment']['status'] == 'successful'
    assert verified.json['invoice']['payment_status'] == 'paid'
    assert float(verified.json['invoice']['balance_due']) <= 0.01


def test_paystack_webhook_is_idempotent(client):
    tenant = _create_tenant(country_code='GH', currency='GHS')
    plan = _create_plan('GHS')
    term = _create_term(tenant_id=tenant.id)
    invoice = _create_invoice(tenant_id=tenant.id, plan_id=plan.id, term_id=term.id, currency='GHS')
    _enable_gateway(name='paystack', country_code='GH', currency='GHS', channels=['mobile_money', 'card'])

    _create_user('school_admin_webhook@example.com', role='user', password='Password123!')
    token = _login(client, 'school_admin_webhook@example.com', 'Password123!')
    _create_school_membership(tenant_id=tenant.id, user_id=User.query.filter_by(email='school_admin_webhook@example.com').first().id)
    headers = {'Authorization': f'Bearer {token}', 'X-Tenant-ID': str(tenant.id)}

    init = client.post(
        f'/api/v1/billing/school/invoices/{invoice.id}/initialize-payment',
        json={'payment_channel': 'card', 'return_url': 'https://example.test/return'},
        headers=headers,
    )
    assert init.status_code == 200
    ref = init.json['payment']['payment_reference']

    hook = client.post('/api/v1/webhooks/paystack', json={'data': {'reference': ref}})
    assert hook.status_code == 200

    hook2 = client.post('/api/v1/webhooks/paystack', json={'data': {'reference': ref}})
    assert hook2.status_code == 200


def test_super_admin_can_upsert_gateway_without_exposing_secrets(client):
    _create_user('platformsuper_gateway@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_gateway@example.com', 'Password123!')
    headers = {'Authorization': f'Bearer {token}'}

    created = client.post(
        '/api/v1/billing/gateways',
        json={
            'name': 'paystack',
            'display_name': 'Paystack GH',
            'country_code': 'GH',
            'currency': 'GHS',
            'public_key': 'public_test_key',
            'secret_key': 'secret_test_key',
            'webhook_secret': 'webhook_test_secret',
            'supported_channels': ['mobile_money', 'card'],
            'environment': 'sandbox',
            'is_active': True,
            'is_default': True,
        },
        headers=headers,
    )
    assert created.status_code == 201
    gw = created.json['gateway']
    assert gw['name'] == 'paystack'
    assert gw.get('secret_key') is None
    assert gw['secret_key_set'] is True
