import uuid
from datetime import date, timedelta

from app.extensions import db, bcrypt
from app.models.user import User
from app.models.tenant import Tenant, TenantMembership
from app.models.billing import BillingInvoice, Plan, SchoolPlanSubscription, StudentTermRegistration, SubscriptionChangeRequest
from app.models.academic_term import AcademicTerm
from app.models.payments import PaymentGateway
from app.models.student import Student
from app.services.payments.service import PaymentService


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


def _create_tenant(*, country_code: str = 'GH', currency: str = 'GHS') -> Tenant:
    t = Tenant(
        id=uuid.uuid4(),
        slug=f"test-{uuid.uuid4().hex[:6]}",
        name="Test School",
        country_code=country_code,
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency=currency,
        status='active',
        plan='trial',
    )
    db.session.add(t)
    db.session.flush()
    return t


def _create_school_membership(*, tenant_id, user_id: int):
    m = TenantMembership(tenant_id=tenant_id, user_id=int(user_id), role='school_admin', status='active')
    db.session.add(m)
    db.session.commit()
    return m


def _create_plan(slug: str, price: float, currency: str = 'GHS') -> Plan:
    p = Plan.query.filter_by(slug=slug).first()
    if p:
        p.name = slug.upper()
        p.description = f'{slug} plan'
        p.price_per_student = price
        p.currency = currency
        p.is_active = True
        db.session.flush()
        return p
    p = Plan(name=slug.upper(), slug=slug, description=f'{slug} plan', price_per_student=price, currency=currency, is_active=True)
    db.session.add(p)
    db.session.flush()
    return p


def _create_term(*, tenant_id, name: str, start: date, end: date) -> AcademicTerm:
    term = AcademicTerm(tenant_id=tenant_id, name=name, start_date=start, end_date=end)
    db.session.add(term)
    db.session.flush()
    return term


def _set_active_subscription(*, tenant: Tenant, plan: Plan):
    today = date.today()
    sub = SchoolPlanSubscription(school_id=tenant.id, plan_id=int(plan.id), starts_at=today, ends_at=None, status='active')
    db.session.add(sub)
    tenant.plan = plan.slug
    db.session.commit()
    return sub


def test_hybrid_upgrade_self_service_and_downgrade_approval(client):
    tenant = _create_tenant()
    basic = _create_plan('basic', 5.0, 'GHS')
    pro = _create_plan('pro', 10.0, 'GHS')
    enterprise = _create_plan('enterprise', 20.0, 'GHS')

    today = date.today()
    current_term = _create_term(tenant_id=tenant.id, name='Current Term', start=today - timedelta(days=10), end=today + timedelta(days=60))
    future_term = _create_term(tenant_id=tenant.id, name='Next Term', start=today + timedelta(days=90), end=today + timedelta(days=160))

    _set_active_subscription(tenant=tenant, plan=pro)

    school_user = _create_user('school_sub@example.com', role='user', password='Password123!')
    school_token = _login(client, 'school_sub@example.com', 'Password123!')
    _create_school_membership(tenant_id=tenant.id, user_id=school_user.id)

    headers = {'Authorization': f'Bearer {school_token}', 'X-Tenant-ID': str(tenant.id)}
    upgrade = client.post(
        '/api/v1/billing/school/subscription/upgrade',
        json={'plan_slug': 'enterprise', 'academic_term_id': current_term.id},
        headers=headers,
    )
    assert upgrade.status_code == 200
    assert upgrade.json['plan']['slug'] == 'enterprise'
    assert upgrade.json['invoice']['plan_id'] == int(enterprise.id)
    assert upgrade.json['change_request']['status'] == 'payment_pending'
    db.session.refresh(tenant)
    assert tenant.plan == 'pro'

    downgrade_req = client.post(
        '/api/v1/billing/school/subscription/downgrade-request',
        json={'plan_slug': 'basic', 'effective_academic_term_id': future_term.id},
        headers=headers,
    )
    assert downgrade_req.status_code == 201
    req_id = downgrade_req.json['request']['id']
    assert downgrade_req.json['request']['status'] == 'pending'

    super_user = _create_user('platformsuper_sub@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper_sub@example.com', 'Password123!')
    super_headers = {'Authorization': f'Bearer {super_token}'}

    approve = client.post(f'/api/v1/billing/subscription-change-requests/{req_id}/approve', headers=super_headers)
    assert approve.status_code == 200
    assert approve.json['request']['status'] == 'approved'

    scheduled = SchoolPlanSubscription.query.filter_by(school_id=tenant.id, plan_id=int(basic.id)).order_by(SchoolPlanSubscription.starts_at.desc()).first()
    assert scheduled is not None
    assert scheduled.starts_at == future_term.start_date


def test_upgrade_activates_only_after_paid_invoice_confirmation(client):
    tenant = _create_tenant()
    basic = _create_plan('basic', 5.0, 'GHS')
    pro = _create_plan('pro', 10.0, 'GHS')

    today = date.today()
    current_term = _create_term(tenant_id=tenant.id, name='Current Term', start=today - timedelta(days=10), end=today + timedelta(days=60))
    _set_active_subscription(tenant=tenant, plan=basic)

    school_user = _create_user('school_upgrade_pay@example.com', role='user', password='Password123!')
    school_token = _login(client, 'school_upgrade_pay@example.com', 'Password123!')
    _create_school_membership(tenant_id=tenant.id, user_id=school_user.id)

    student = Student(
        tenant_id=tenant.id,
        user_id=school_user.id,
        admission_number=f'UPGRADE-{uuid.uuid4().hex[:8]}',
        first_name='Billing',
        last_name='Student',
        date_of_birth=today - timedelta(days=3650),
        gender='male',
        status='active',
    )
    db.session.add(student)
    db.session.flush()
    db.session.add(StudentTermRegistration(
        tenant_id=tenant.id,
        student_id=int(student.id),
        academic_term_id=int(current_term.id),
        registration_status='registered',
        student_status='active',
    ))
    db.session.commit()

    manual_gateway = PaymentGateway.query.filter_by(name='manual').first()
    if not manual_gateway:
        manual_gateway = PaymentGateway(
            name='manual',
            display_name='Manual',
            country_code='GH',
            currency='GHS',
            is_active=True,
            is_default=True,
            supported_channels=['manual'],
            environment='sandbox',
        )
        db.session.add(manual_gateway)
    else:
        manual_gateway.is_active = True
        manual_gateway.is_default = True
        manual_gateway.supported_channels = ['manual']
    db.session.commit()

    headers = {'Authorization': f'Bearer {school_token}', 'X-Tenant-ID': str(tenant.id)}
    upgrade = client.post(
        '/api/v1/billing/school/subscription/upgrade',
        json={'plan_slug': 'pro', 'academic_term_id': current_term.id},
        headers=headers,
    )
    assert upgrade.status_code == 200
    invoice_id = int(upgrade.json['invoice']['id'])

    db.session.refresh(tenant)
    assert tenant.plan == 'basic'

    payment, err = PaymentService.submit_manual_payment(
        invoice_id=invoice_id,
        tenant_id=tenant.id,
        user_id=school_user.id,
        amount=float(upgrade.json['invoice']['total_amount']),
        currency=upgrade.json['invoice']['currency'],
        method='bank_deposit',
        reference='UPGRADE-MANUAL-001',
        paid_at=None,
        proof_path=None,
    )
    assert err is None
    assert payment is not None

    reviewed, review_err = PaymentService.review_manual_payment(payment_id=int(payment.id), reviewer_id=school_user.id, approve=True, note='Approved for test')
    assert review_err is None
    assert reviewed is not None

    db.session.refresh(tenant)
    assert tenant.plan == 'pro'

    invoice = BillingInvoice.query.get(invoice_id)
    assert invoice is not None
    assert invoice.payment_status == 'paid'

    request = SubscriptionChangeRequest.query.filter_by(school_id=tenant.id, requested_plan_id=int(pro.id), request_type='upgrade').order_by(SubscriptionChangeRequest.created_at.desc()).first()
    assert request is not None
    assert request.status == 'approved'

