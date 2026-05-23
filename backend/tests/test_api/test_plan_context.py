from datetime import date


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


def _make_tenant(db, slug: str, plan: str):
    from app.models.tenant import Tenant
    t = Tenant(
        slug=slug,
        name=f'{slug} School',
        country_code='GH',
        schema_name=f'{slug}_schema',
        status='active',
        plan=plan
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
    db.session.add(PlanFeature(plan_id=plan_id, feature_key='integrations.sms', is_enabled=True))
    db.session.add(PlanLimit(plan_id=plan_id, limit_key='tokens.sms.monthly', limit_value='3', value_type='number'))
    db.session.commit()


def _make_subscription(db, tenant_id, plan_id):
    from app.models.billing import SchoolPlanSubscription
    sub = SchoolPlanSubscription(school_id=tenant_id, plan_id=plan_id, starts_at=date.today(), ends_at=None, status='active')
    db.session.add(sub)
    db.session.commit()
    return sub


def test_plan_context_requires_tenant_header(client, db):
    _make_user(db, 'super_admin', 'superpc1@example.com')
    _make_tenant(db, 'pc1', 'free')
    token = _login(client, 'superpc1@example.com', 'password')
    headers = {'Authorization': f'Bearer {token}'}
    r = client.get('/api/v1/plan-context', headers=headers)
    assert r.status_code in (400, 403)


def test_plan_context_returns_features_limits_and_usage(client, db):
    _make_user(db, 'super_admin', 'superpc2@example.com')
    token = _login(client, 'superpc2@example.com', 'password')

    tenant = _make_tenant(db, 'pc2', 'pro')
    plan = _make_plan(db, 'pro')
    _set_feature_and_limits(db, plan.id)
    _make_subscription(db, tenant.id, plan.id)

    headers = {'Authorization': f'Bearer {token}', 'X-Tenant-ID': str(tenant.id)}
    r = client.get('/api/v1/plan-context', headers=headers)
    assert r.status_code == 200
    assert r.json['success'] is True
    assert r.json['data']['plan']['slug'] == 'pro'
    assert 'features' in r.json['data']
    assert 'limits' in r.json['data']
    assert 'token_usage' in r.json['data']
    assert 'sms' in r.json['data']['token_usage']

