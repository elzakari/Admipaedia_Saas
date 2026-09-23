"""API regression tests for the Super Admin plan pricing matrix.

These replay the request sequence the /super-admin/plan-pricing page sends
(a single atomic PUT of the whole matrix to /plans/<id>/pricing-matrix),
plus the per-row tier endpoints it still shares validation rules with.
"""

import uuid

from app.extensions import db, bcrypt
from app.models.billing import Plan, PlanPricingTier
from app.models.user import User


def _create_user(email: str, role: str, password: str = 'Password123!') -> User:
    u = User.query.filter_by(email=email).first()
    if u:
        u.role = role
        u.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        u.status = 'active'
        db.session.commit()
        return u
    u = User(
        username=email.split('@')[0],
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        role=role,
        status='active',
    )
    db.session.add(u)
    db.session.commit()
    return u


def _login(client, email: str, password: str = 'Password123!') -> dict:
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200
    return {'Authorization': f"Bearer {resp.json['access_token']}"}


def _plan() -> Plan:
    suffix = uuid.uuid4().hex[:6]
    p = Plan(
        name=f'Matrix Plan {suffix}',
        slug=f"matrix-{suffix}",
        price_per_student=0,
        currency='USD',
        is_active=True,
        billing_min_months=3,
    )
    db.session.add(p)
    db.session.commit()
    return p


def _super_admin_headers(client) -> dict:
    _create_user('matrix_super@example.com', role='super_admin')
    return _login(client, 'matrix_super@example.com')


def _tier(plan_id, cc, cur, mn, mx, price, active=True):
    return {
        'plan_id': plan_id,
        'country_code': cc,
        'currency': cur,
        'min_students': mn,
        'max_students': mx,
        'price_per_student_month': price,
        'is_active': active,
    }


def test_super_admin_matrix_create_retrieve_update_retrieve(client):
    headers = _super_admin_headers(client)
    plan = _plan()
    pid = int(plan.id)
    url = f'/api/v1/billing/plans/{pid}/pricing-matrix'

    # create: Global two brackets + GH one uncapped bracket + min months
    r = client.put(url, json={'billing_min_months': 6, 'tiers': [
        _tier(pid, None, 'USD', 0, 100, 2.5),
        _tier(pid, None, 'USD', 101, None, 2.0),
        _tier(pid, 'GH', 'GHS', 0, None, 30),
    ]}, headers=headers)
    assert r.status_code == 200, r.json
    assert r.json['plan']['billing_min_months'] == 6

    r = client.get(f'/api/v1/billing/plans/{pid}/pricing-tiers', headers=headers)
    assert r.status_code == 200
    tiers = r.json['tiers']
    assert len(tiers) == 3
    glob = sorted([t for t in tiers if t['country_code'] is None], key=lambda t: t['min_students'])
    assert [(t['min_students'], t['max_students'], t['price_per_student_month']) for t in glob] == [
        (0, 100, 2.5),
        (101, None, 2.0),
    ]
    gh = [t for t in tiers if t['country_code'] == 'GH']
    assert gh[0]['currency'] == 'GHS' and gh[0]['max_students'] is None

    # update: move the Global boundary up (0-200, 201-inf) and drop GH.
    # Saved row-by-row this is rejected as a transient overlap; the matrix
    # endpoint validates the final state as a whole.
    upd = dict(_tier(pid, None, 'USD', 0, 200, 2.75), id=glob[0]['id'])
    upd2 = dict(_tier(pid, None, 'USD', 201, None, 1.5), id=glob[1]['id'])
    r = client.put(url, json={'tiers': [upd, upd2]}, headers=headers)
    assert r.status_code == 200, r.json

    r = client.get(f'/api/v1/billing/plans/{pid}/pricing-tiers', headers=headers)
    tiers = r.json['tiers']
    assert [(t['id'], t['min_students'], t['max_students'], t['price_per_student_month']) for t in
            sorted(tiers, key=lambda t: t['min_students'])] == [
        (glob[0]['id'], 0, 200, 2.75),
        (glob[1]['id'], 201, None, 1.5),
    ]
    assert db.session.get(Plan, pid).billing_min_months == 6


def test_rejected_matrix_leaves_stored_matrix_untouched(client):
    headers = _super_admin_headers(client)
    pid = int(_plan().id)
    other = int(_plan().id)
    url = f'/api/v1/billing/plans/{pid}/pricing-matrix'
    ok = client.put(url, json={'tiers': [_tier(pid, None, 'USD', 0, None, 3)]}, headers=headers)
    assert ok.status_code == 200
    kept = ok.json['tiers'][0]

    bad_matrices = [
        [_tier(pid, None, 'USD', 0, None, 0)],                                        # zero price
        [_tier(pid, None, 'USD', 0, None, -1)],                                       # negative price
        [_tier(pid, None, 'USD', -5, None, 1)],                                       # negative enrollment
        [_tier(pid, None, 'USD', 50, 10, 1)],                                         # from > up to
        [_tier(pid, None, 'USD', 0, None, 1), _tier(pid, None, 'USD', 0, None, 1)],   # duplicate / 2 uncapped
        [_tier(pid, None, 'USD', 0, None, 1), _tier(pid, None, 'USD', 101, 200, 1)],  # uncapped not last
        [_tier(pid, None, 'USD', 0, 100, 1), _tier(pid, None, 'USD', 100, None, 1)],  # overlap
        [_tier(pid, 'GHA', 'GHS', 0, None, 1)],                                       # bad country
        [_tier(pid, 'GH', 'CEDI', 0, None, 1)],                                       # bad currency
        [dict(_tier(pid, None, 'USD', 0, None, 1), id=999999)],                       # unknown tier id
    ]
    for tiers in bad_matrices:
        r = client.put(url, json={'tiers': tiers}, headers=headers)
        assert r.status_code == 400, tiers
        assert r.json['success'] is False and r.json['message']
    assert client.put(url, json={'tiers': [], 'billing_min_months': 0}, headers=headers).status_code == 400

    # another plan's tier id cannot be adopted into this plan
    foreign = client.put(f'/api/v1/billing/plans/{other}/pricing-matrix',
                         json={'tiers': [_tier(other, None, 'USD', 0, None, 9)]}, headers=headers).json['tiers'][0]
    r = client.put(url, json={'tiers': [dict(_tier(pid, None, 'USD', 0, None, 1), id=foreign['id'])]}, headers=headers)
    assert r.status_code == 400

    rows = PlanPricingTier.query.filter_by(plan_id=pid).all()
    assert [(int(t.id), float(t.price_per_student_month)) for t in rows] == [(kept['id'], 3.0)]
    assert PlanPricingTier.query.filter_by(plan_id=other).count() == 1

    # inactive tiers are not overlap-checked (existing contract)
    r = client.put(url, json={'tiers': [
        dict(_tier(pid, None, 'USD', 0, None, 3), id=kept['id']),
        _tier(pid, None, 'USD', 0, None, 4, active=False),
    ]}, headers=headers)
    assert r.status_code == 200

    missing = client.put('/api/v1/billing/plans/99999999/pricing-matrix', json={'tiers': []}, headers=headers)
    assert missing.status_code == 404


def test_matrix_rejects_invalid_tiers(client):
    headers = _super_admin_headers(client)
    pid = int(_plan().id)
    url = f'/api/v1/billing/plans/{pid}/pricing-tiers'

    assert client.post(url, json=_tier(pid, None, 'USD', 0, None, 0), headers=headers).status_code == 400
    assert client.post(url, json=_tier(pid, None, 'USD', 0, None, -1), headers=headers).status_code == 400
    assert client.post(url, json=_tier(pid, None, 'USD', -5, None, 1), headers=headers).status_code == 400
    assert client.post(url, json=_tier(pid, None, 'USD', 50, 10, 1), headers=headers).status_code == 400
    assert client.post(url, json=_tier(pid, None, 'US', 0, None, 1), headers=headers).status_code == 400

    assert client.post(url, json=_tier(pid, None, 'USD', 0, 100, 1), headers=headers).status_code == 201
    overlap = client.post(url, json=_tier(pid, None, 'USD', 50, None, 1), headers=headers)
    assert overlap.status_code == 400
    assert overlap.json['message'] == 'Pricing ranges overlap'
    assert PlanPricingTier.query.filter_by(plan_id=pid).count() == 1


def test_non_super_admin_cannot_modify_matrix(client):
    pid = int(_plan().id)
    _create_user('matrix_plain@example.com', role='admin')
    headers = _login(client, 'matrix_plain@example.com')

    r = client.post(
        f'/api/v1/billing/plans/{pid}/pricing-tiers',
        json=_tier(pid, None, 'USD', 0, None, 1),
        headers=headers,
    )
    assert r.status_code == 403
    assert client.post(
        f'/api/v1/billing/plans/{pid}/pricing-tiers', json=_tier(pid, None, 'USD', 0, None, 1)
    ).status_code == 401
    matrix = {'tiers': [_tier(pid, None, 'USD', 0, None, 1)]}
    assert client.put(f'/api/v1/billing/plans/{pid}/pricing-matrix', json=matrix, headers=headers).status_code == 403
    assert client.put(f'/api/v1/billing/plans/{pid}/pricing-matrix', json=matrix).status_code == 401
    assert PlanPricingTier.query.filter_by(plan_id=pid).count() == 0
