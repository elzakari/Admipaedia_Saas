import uuid
from datetime import date, timedelta

from app.extensions import db, bcrypt
from app.models.user import User
from app.models.tenant import Tenant, TenantMembership
from app.models.billing import Plan, SchoolPlanSubscription
from app.models.academic_term import AcademicTerm


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

    today = date.today()
    current_term = _create_term(tenant_id=tenant.id, name='Current Term', start=today - timedelta(days=10), end=today + timedelta(days=60))
    future_term = _create_term(tenant_id=tenant.id, name='Next Term', start=today + timedelta(days=90), end=today + timedelta(days=160))

    _set_active_subscription(tenant=tenant, plan=basic)

    school_user = _create_user('school_sub@example.com', role='user', password='Password123!')
    school_token = _login(client, 'school_sub@example.com', 'Password123!')
    _create_school_membership(tenant_id=tenant.id, user_id=school_user.id)

    headers = {'Authorization': f'Bearer {school_token}', 'X-Tenant-ID': str(tenant.id)}
    upgrade = client.post(
        '/api/v1/billing/school/subscription/upgrade',
        json={'plan_slug': 'pro', 'academic_term_id': current_term.id},
        headers=headers,
    )
    assert upgrade.status_code == 200
    assert upgrade.json['plan']['slug'] == 'pro'
    assert upgrade.json['invoice']['plan_id'] == int(pro.id)

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

