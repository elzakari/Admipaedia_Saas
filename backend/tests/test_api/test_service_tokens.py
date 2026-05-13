from datetime import date
import uuid


def _login(client, email: str, password: str):
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200
    token = resp.json.get('access_token')
    assert token
    return token


def _make_user(db, role: str, email: str):
    from app.models.user import User
    user = User(username=email.split('@')[0], email=email, role=role)
    user.set_password_hash('password')
    db.session.add(user)
    db.session.commit()
    return user


def _make_tenant(db, slug: str):
    from app.models.tenant import Tenant
    t = Tenant(
        slug=slug,
        name=f'{slug} School',
        country_code='GH',
        schema_name=f'{slug}_schema',
        status='active',
        plan='pro'
    )
    db.session.add(t)
    db.session.commit()
    return t


def _make_plan(db, slug: str):
    from app.models.billing import Plan
    p = Plan(name=slug.title(), slug=slug, description=slug, price_per_student=0, currency='USD', is_active=True)
    db.session.add(p)
    db.session.commit()
    return p


def _set_feature_and_limits(db, plan_id: int):
    from app.models.billing import PlanFeature, PlanLimit
    for key in ('integrations.email', 'integrations.sms', 'integrations.whatsapp', 'ai.external'):
        db.session.add(PlanFeature(plan_id=plan_id, feature_key=key, is_enabled=True))
    for k, v in (
        ('tokens.email.monthly', '5'),
        ('tokens.sms.monthly', '3'),
        ('tokens.whatsapp.monthly', '2'),
        ('tokens.ai.monthly', '2')
    ):
        db.session.add(PlanLimit(plan_id=plan_id, limit_key=k, limit_value=v, value_type='number'))
    db.session.commit()


def _make_subscription(db, tenant_id, plan_id):
    from app.models.billing import SchoolPlanSubscription
    sub = SchoolPlanSubscription(school_id=tenant_id, plan_id=plan_id, starts_at=date.today(), ends_at=None, status='active')
    db.session.add(sub)
    db.session.commit()
    return sub


def test_token_provision_and_quota_enforcement(client, db):
    _make_user(db, 'super_admin', 'super@example.com')
    token = _login(client, 'super@example.com', 'password')
    headers = {'Authorization': f'Bearer {token}'}

    tenant = _make_tenant(db, 't1')
    plan = _make_plan(db, 'pro')
    _set_feature_and_limits(db, plan.id)
    _make_subscription(db, tenant.id, plan.id)

    prov = client.post(f'/api/v1/saas/platform/tenants/{tenant.id}/service-tokens/provision', json={}, headers=headers)
    assert prov.status_code == 200
    issued = prov.json['issued']
    assert issued['sms']

    sms_token = issued['sms']

    ok = client.post('/api/v1/service-tokens/consume', json={'service_type': 'sms', 'token': sms_token, 'amount': 1})
    assert ok.status_code == 200
    assert ok.json['remaining'] == 2

    ok2 = client.post('/api/v1/service-tokens/consume', json={'service_type': 'sms', 'token': sms_token, 'amount': 2})
    assert ok2.status_code == 200
    assert ok2.json['remaining'] == 0

    over = client.post('/api/v1/service-tokens/consume', json={'service_type': 'sms', 'token': sms_token, 'amount': 1})
    assert over.status_code == 429

    from app.models.service_tokens import TenantServiceTokenEvent
    ev = TenantServiceTokenEvent.query.filter_by(tenant_id=str(tenant.id), service_type='sms', event_type='quota_exceeded').first()
    assert ev is not None


def test_platform_integrations_requires_super_role(client, db):
    _make_user(db, 'admin', 'admin@example.com')
    token = _login(client, 'admin@example.com', 'password')
    headers = {'Authorization': f'Bearer {token}'}

    r = client.get('/api/v1/platform/integrations/providers', headers=headers)
    assert r.status_code in (401, 403)


def test_school_settings_updates_blocked_for_non_super(client, db):
    _make_user(db, 'admin', 'admin2@example.com')
    token = _login(client, 'admin2@example.com', 'password')
    headers = {'Authorization': f'Bearer {token}', 'X-Tenant-ID': str(uuid.uuid4())}

    resp = client.put('/api/v1/settings/notifications', json={'smtpHost': 'example.com'}, headers=headers)
    assert resp.status_code == 403
