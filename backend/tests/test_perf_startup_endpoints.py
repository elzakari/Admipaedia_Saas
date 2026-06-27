import json
import statistics
import time
from datetime import date

from sqlalchemy import event

from app.extensions import bcrypt, db
from app.models.billing import Plan, PlanFeature, PlanLimit, SchoolPlanSubscription
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User


def _create_user(email: str, password: str = 'Password123!', role: str = 'school_admin') -> User:
    user = User(
        username=email.split('@')[0],
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        role=role,
        status='active',
        email_verified=True,
    )
    db.session.add(user)
    db.session.flush()
    return user


def _login(client, email: str, password: str = 'Password123!') -> str:
    response = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200
    token = response.json.get('access_token')
    assert token
    return token


def _seed_startup_state():
    user = _create_user('startupperf@example.com')

    tenant = Tenant(
        slug='startup-perf-school',
        name='Startup Perf School',
        country_code='GH',
        schema_name='startup_perf_school',
        status='active',
        plan='pro',
        currency='GHS',
    )
    db.session.add(tenant)
    db.session.flush()

    membership = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role='school_admin',
        status='active',
    )
    db.session.add(membership)

    plan = Plan(
        name='Pro',
        slug='pro',
        description='Performance measurement plan',
        price_per_student=0,
        currency='USD',
        is_active=True,
    )
    db.session.add(plan)
    db.session.flush()

    db.session.add(PlanFeature(plan_id=plan.id, feature_key='integrations.sms', is_enabled=True))
    db.session.add(PlanLimit(plan_id=plan.id, limit_key='tokens.sms.monthly', limit_value='300', value_type='number'))
    db.session.add(
        SchoolPlanSubscription(
            school_id=tenant.id,
            plan_id=plan.id,
            starts_at=date.today(),
            ends_at=None,
            status='active',
        )
    )
    db.session.commit()

    return user, tenant


def _measure_endpoint(client, path: str, headers: dict, repeats: int = 6) -> dict:
    timings_ms = []
    query_counts = []
    engine = db.engine

    for _ in range(repeats):
        statements = 0

        def before_cursor_execute(*args, **kwargs):
            nonlocal statements
            statements += 1

        event.listen(engine, 'before_cursor_execute', before_cursor_execute)
        started = time.perf_counter()
        response = client.get(path, headers=headers)
        elapsed_ms = (time.perf_counter() - started) * 1000
        event.remove(engine, 'before_cursor_execute', before_cursor_execute)

        assert response.status_code == 200
        timings_ms.append(elapsed_ms)
        query_counts.append(statements)

    warm_timings = timings_ms[1:] if len(timings_ms) > 1 else timings_ms
    warm_queries = query_counts[1:] if len(query_counts) > 1 else query_counts

    return {
        'path': path,
        'repeats': repeats,
        'first_ms': round(timings_ms[0], 2),
        'median_warm_ms': round(statistics.median(warm_timings), 2),
        'avg_warm_ms': round(statistics.mean(warm_timings), 2),
        'first_queries': query_counts[0],
        'median_warm_queries': int(statistics.median(warm_queries)),
        'samples_ms': [round(v, 2) for v in timings_ms],
        'samples_queries': query_counts,
    }


def test_measure_startup_endpoints(client):
    _, tenant = _seed_startup_state()
    token = _login(client, 'startupperf@example.com')

    auth_headers = {'Authorization': f'Bearer {token}'}
    tenant_headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id),
    }

    results = {
        'auth_me': _measure_endpoint(client, '/api/v1/auth/me', auth_headers),
        'saas_tenants': _measure_endpoint(client, '/api/v1/saas/tenants', auth_headers),
        'plan_context': _measure_endpoint(client, '/api/v1/plan-context', tenant_headers),
    }

    print('\nSTARTUP_ENDPOINT_PERF=' + json.dumps(results, sort_keys=True))
