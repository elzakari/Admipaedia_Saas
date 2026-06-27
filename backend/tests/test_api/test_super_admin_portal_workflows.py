import uuid
from datetime import date, timedelta

from app.extensions import db, bcrypt
from app.models.academic_term import AcademicTerm
from app.models.billing import BillingInvoice, Plan, SchoolPlanSubscription, SubscriptionChangeRequest
from app.models.payments import Payment, PaymentGateway
from app.models.security import SecurityEvent
from app.models.tenant import PlatformInvoice, PlatformPayment, Tenant, TenantMembership
from app.models.user import User
from app.services.saas.billing_ops import platform_financial_summary, platform_get_tenant_detail
from app.services.saas.subscription_change_ops import serialize_change_request


def _create_user(*, email: str, role: str, password: str = 'Password123!') -> User:
    user = User.query.filter_by(email=email).first()
    if user:
        user.role = role
        user.status = 'active'
        user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        db.session.commit()
        return user

    user = User(
        username=email.split('@')[0],
        email=email,
        role=role,
        status='active',
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
    )
    db.session.add(user)
    db.session.commit()
    return user


def _login(client, *, email: str, password: str = 'Password123!') -> str:
    response = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200
    token = response.json.get('access_token')
    assert token
    return token


def _create_tenant(*, name: str, country_code: str = 'GH', currency: str = 'GHS') -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        slug=f"{name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}",
        name=name,
        country_code=country_code,
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency=currency,
        status='active',
        plan='basic',
    )
    db.session.add(tenant)
    db.session.flush()
    return tenant


def _create_plan(slug: str, price: float, currency: str = 'GHS') -> Plan:
    plan = Plan.query.filter_by(slug=slug).first()
    if plan:
        plan.name = slug.upper()
        plan.price_per_student = price
        plan.currency = currency
        plan.is_active = True
        db.session.flush()
        return plan
    plan = Plan(
        name=slug.upper(),
        slug=slug,
        description=f'{slug} plan',
        price_per_student=price,
        currency=currency,
        is_active=True,
    )
    db.session.add(plan)
    db.session.flush()
    return plan


def _create_term(*, tenant_id, name: str) -> AcademicTerm:
    today = date.today()
    term = AcademicTerm(
        tenant_id=tenant_id,
        name=name,
        start_date=today - timedelta(days=10),
        end_date=today + timedelta(days=60),
    )
    db.session.add(term)
    db.session.flush()
    return term


def _set_active_subscription(*, tenant: Tenant, plan: Plan):
    subscription = SchoolPlanSubscription(
        school_id=tenant.id,
        plan_id=int(plan.id),
        starts_at=date.today(),
        ends_at=None,
        status='active',
    )
    db.session.add(subscription)
    tenant.plan = plan.slug
    db.session.commit()
    return subscription


def test_super_admin_users_can_be_filtered_by_school_membership(client):
    super_admin = _create_user(email='portal_super_admin@example.com', role='super_admin')
    token = _login(client, email=super_admin.email)

    school_a = _create_tenant(name='North Campus')
    school_b = _create_tenant(name='South Campus')
    school_user = _create_user(email='school_user@example.com', role='teacher')
    other_user = _create_user(email='other_school_user@example.com', role='teacher')

    db.session.add(TenantMembership(
        tenant_id=school_a.id,
        user_id=school_user.id,
        role='teacher',
        status='active',
    ))
    db.session.add(TenantMembership(
        tenant_id=school_b.id,
        user_id=other_user.id,
        role='teacher',
        status='active',
    ))
    db.session.commit()

    response = client.get(
        f'/api/v1/super-admin/users?tenant_id={school_a.id}',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 200
    assert response.json['success'] is True
    returned_emails = {user['email'] for user in response.json['users']}
    assert school_user.email in returned_emails
    assert other_user.email not in returned_emails

    target_user = next(user for user in response.json['users'] if user['email'] == school_user.email)
    assert target_user['school_memberships_count'] == 1
    assert target_user['active_school_memberships_count'] == 1
    assert target_user['primary_school']['tenant_id'] == str(school_a.id)
    assert target_user['primary_school']['tenant_name'] == school_a.name
    assert target_user['school_memberships'][0]['role'] == 'teacher'


def test_platform_financial_summary_counts_unpaid_school_billing_invoices():
    tenant = _create_tenant(name='Billing Campus')
    plan = _create_plan('portal-basic', 10.0, 'GHS')
    term = _create_term(tenant_id=tenant.id, name='Current Term')

    db.session.add(BillingInvoice(
        invoice_number=f'BILL-{uuid.uuid4().hex[:6].upper()}',
        tenant_id=tenant.id,
        plan_id=int(plan.id),
        academic_term_id=int(term.id),
        price_per_student_snapshot=10,
        billing_months=3,
        active_student_count=12,
        subtotal=360,
        discount_amount=0,
        tax_amount=0,
        total_amount=360,
        currency='GHS',
        status='pending',
        due_date=date.today() + timedelta(days=7),
        payment_status='unpaid',
        amount_paid=0,
        balance_due=360,
    ))
    db.session.commit()

    summary = platform_financial_summary()
    by_tenant = {item['tenant_id']: item for item in summary['by_tenant']}

    assert summary['invoice_total'] >= 360
    assert summary['school_billing_invoice_total'] >= 360
    assert str(tenant.id) in by_tenant
    assert by_tenant[str(tenant.id)]['invoice_total'] >= 360
    assert by_tenant[str(tenant.id)]['outstanding_total'] >= 360


def test_platform_payments_include_tenant_and_invoice_context(client):
    super_admin = _create_user(email='portal_payment_admin@example.com', role='super_admin')
    token = _login(client, email=super_admin.email)

    tenant = _create_tenant(name='Payment Campus')
    plan = _create_plan('payment-basic', 12.0, 'GHS')
    term = _create_term(tenant_id=tenant.id, name='Current Term')
    invoice = BillingInvoice(
        invoice_number=f'PAY-{uuid.uuid4().hex[:6].upper()}',
        tenant_id=tenant.id,
        plan_id=int(plan.id),
        academic_term_id=int(term.id),
        price_per_student_snapshot=12,
        billing_months=3,
        active_student_count=10,
        subtotal=360,
        discount_amount=0,
        tax_amount=0,
        total_amount=360,
        currency='GHS',
        status='pending',
        due_date=date.today() + timedelta(days=7),
        payment_status='unpaid',
        amount_paid=0,
        balance_due=360,
    )
    db.session.add(invoice)
    db.session.flush()

    payment = Payment(
        invoice_id=int(invoice.id),
        school_id=tenant.id,
        payment_gateway_id=None,
        gateway_name='manual',
        payment_reference=f'PMT-{uuid.uuid4().hex[:8].upper()}',
        amount=360,
        currency='GHS',
        payment_channel='manual',
        status='pending',
        manual_reference='BANK-DEP-001',
    )
    db.session.add(payment)
    db.session.commit()

    response = client.get('/api/v1/billing/payments', headers={'Authorization': f'Bearer {token}'})

    assert response.status_code == 200
    assert response.json['success'] is True
    matching = next(item for item in response.json['payments'] if item['id'] == int(payment.id))
    assert matching['tenant_name'] == tenant.name
    assert matching['tenant_slug'] == tenant.slug
    assert matching['invoice_number'] == invoice.invoice_number


def test_platform_tenant_detail_blends_legacy_and_school_billing_totals():
    tenant = _create_tenant(name='Blend Campus')
    plan = _create_plan('blend-basic', 10.0, 'GHS')
    term = _create_term(tenant_id=tenant.id, name='Blend Term')

    platform_invoice = PlatformInvoice(
        tenant_id=tenant.id,
        invoice_number=f'LEG-{uuid.uuid4().hex[:6].upper()}',
        status='sent',
        amount=200,
        currency='GHS',
        issued_on=date.today(),
        due_on=date.today() + timedelta(days=7),
    )
    db.session.add(platform_invoice)
    db.session.flush()
    db.session.add(PlatformPayment(
        tenant_id=tenant.id,
        invoice_id=platform_invoice.id,
        amount=50,
        currency='GHS',
        method='bank_transfer',
        reference='LEGACY-001',
        paid_on=date.today(),
    ))

    school_invoice = BillingInvoice(
        invoice_number=f'SCH-{uuid.uuid4().hex[:6].upper()}',
        tenant_id=tenant.id,
        plan_id=int(plan.id),
        academic_term_id=int(term.id),
        price_per_student_snapshot=10,
        billing_months=3,
        active_student_count=12,
        subtotal=360,
        discount_amount=0,
        tax_amount=0,
        total_amount=360,
        currency='GHS',
        status='pending',
        due_date=date.today() + timedelta(days=7),
        payment_status='partially_paid',
        amount_paid=120,
        balance_due=240,
    )
    db.session.add(school_invoice)
    db.session.flush()
    db.session.add(Payment(
        invoice_id=int(school_invoice.id),
        school_id=tenant.id,
        payment_gateway_id=None,
        gateway_name='manual',
        payment_reference=f'SCHPAY-{uuid.uuid4().hex[:8].upper()}',
        amount=120,
        currency='GHS',
        payment_channel='manual',
        status='successful',
    ))
    db.session.commit()

    detail, err = platform_get_tenant_detail(str(tenant.id))

    assert err is None
    assert detail is not None
    assert detail['legacy_invoice_total'] == 200.0
    assert detail['legacy_payment_total'] == 50.0
    assert detail['school_billing_invoice_total'] == 360.0
    assert detail['school_billing_payment_total'] == 120.0
    assert detail['invoice_total'] == 560.0
    assert detail['payment_total'] == 170.0
    assert detail['outstanding_total'] == 390.0


def test_serialize_change_request_includes_school_and_plan_context():
    tenant = _create_tenant(name='Request Campus')
    target_plan = _create_plan('request-basic', 8.0, 'GHS')
    current_plan = _create_plan('request-pro', 15.0, 'GHS')
    requester = _create_user(email='requester@example.com', role='user')
    future_term = AcademicTerm(
        tenant_id=tenant.id,
        name='Next Term',
        start_date=date.today() + timedelta(days=30),
        end_date=date.today() + timedelta(days=120),
    )
    db.session.add(future_term)
    db.session.flush()
    _set_active_subscription(tenant=tenant, plan=current_plan)

    request = SubscriptionChangeRequest(
        school_id=tenant.id,
        requested_plan_id=int(target_plan.id),
        request_type='downgrade',
        status='pending',
        effective_academic_term_id=int(future_term.id),
        effective_date=future_term.start_date,
        created_by_user_id=int(requester.id),
    )
    db.session.add(request)
    db.session.commit()

    serialized = serialize_change_request(request)

    assert serialized['school_name'] == tenant.name
    assert serialized['school_slug'] == tenant.slug
    assert serialized['current_plan']['slug'] == current_plan.slug
    assert serialized['requested_plan']['slug'] == target_plan.slug
    assert serialized['effective_term']['name'] == future_term.name
    assert serialized['created_by_user']['email'] == requester.email


def test_payment_gateway_create_is_audited_and_duplicate_protected(client):
    super_admin = _create_user(email='gateway_admin@example.com', role='super_admin')
    token = _login(client, email=super_admin.email)
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'name': 'paystack',
        'display_name': 'Paystack Ghana',
        'country_code': 'GH',
        'currency': 'GHS',
        'public_key': 'pk_test_gateway',
        'secret_key': 'sk_test_gateway',
        'supported_channels': ['card', 'mobile_money'],
        'environment': 'sandbox',
        'is_active': 'false',
        'is_default': 'true',
    }

    created = client.post('/api/v1/billing/gateways', json=payload, headers=headers)
    assert created.status_code == 201
    assert created.json['gateway']['is_active'] is False
    assert created.json['gateway']['is_default'] is True

    audit_event = SecurityEvent.query.filter_by(event_type='super_admin.payment_gateway_created').order_by(SecurityEvent.id.desc()).first()
    assert audit_event is not None
    assert audit_event.user_id == super_admin.id
    assert audit_event.details['gateway_name'] == 'paystack'
    assert audit_event.details['country_code'] == 'GH'

    duplicate = client.post('/api/v1/billing/gateways', json=payload, headers=headers)
    assert duplicate.status_code == 400
    assert 'already exists' in duplicate.json['message']


def test_super_admin_audit_event_types_endpoint_lists_dynamic_events(client):
    super_admin = _create_user(email='audit_types_admin@example.com', role='super_admin')
    token = _login(client, email=super_admin.email)

    db.session.add(SecurityEvent(
        event_type='super_admin.payment_gateway_updated',
        user_id=super_admin.id,
        endpoint='/api/v1/billing/gateways/1',
        method='PATCH',
        severity='info',
        details={'gateway_id': 1},
    ))
    db.session.commit()

    response = client.get('/api/v1/super-admin/audit-logs/event-types', headers={'Authorization': f'Bearer {token}'})

    assert response.status_code == 200
    assert response.json['success'] is True
    assert 'super_admin.payment_gateway_updated' in response.json['event_types']
