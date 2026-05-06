import uuid

from app.extensions import db, bcrypt
from app.models.user import User


STRONG_PASSWORD = 'Admipaedia!9K7xTq'


def _create_user(email: str, role: str = 'user', password: str = 'Password123!'):
    user = User.query.filter_by(email=email).first()
    if user:
        user.role = role
        user.set_password_hash(password)
        db.session.commit()
        return user
    user = User(
        username=email.split('@')[0],
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        role=role,
        status='active'
    )
    db.session.add(user)
    db.session.commit()
    return user


def _login(client, email: str, password: str):
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200
    token = resp.json.get('access_token')
    assert token
    return token


def _create_school_registration_link(client, super_admin_token: str, payload: dict):
    resp = client.post(
        '/api/v1/super-admin/school-registration-links',
        json=payload,
        headers={'Authorization': f'Bearer {super_admin_token}'}
    )
    assert resp.status_code == 201
    url = resp.json.get('registration_url')
    assert url and 'token=' in url
    token = url.split('token=')[1]
    assert token
    return token


def _complete_school_registration(client, token: str, password: str = STRONG_PASSWORD, admin_name: str = 'School Admin'):
    resp = client.post(
        '/api/v1/saas/registration-links/complete',
        json={'token': token, 'admin_name': admin_name, 'password': password, 'confirm_password': password}
    )
    assert resp.status_code == 200
    assert resp.json.get('success') is True
    access = resp.json.get('access_token')
    assert access
    tenant = resp.json.get('tenant')
    assert tenant and tenant.get('id')
    return access, tenant['id']


def test_saas_tenant_onboarding_and_membership(client):
    _create_user('platformsuper@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper@example.com', 'Password123!')

    reg_token = _create_school_registration_link(client, super_token, {
        'school_name': 'Test School',
        'school_slug': f'test-school-{uuid.uuid4().hex[:6]}',
        'country_code': 'GH',
        'currency': 'GHS',
        'admin_email': 'schoolowner@example.com'
    })

    owner_token, tenant_id = _complete_school_registration(client, reg_token, password=STRONG_PASSWORD)

    resp2 = client.get('/api/v1/saas/tenants', headers={'Authorization': f'Bearer {owner_token}'})
    assert resp2.status_code == 200
    items = resp2.json['items']
    assert len(items) == 1
    assert items[0]['tenant']['id'] == tenant_id
    assert items[0]['membership']['role'] == 'school_admin'


def test_school_registration_link_is_single_use(client):
    _create_user('platformsuper_single@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper_single@example.com', 'Password123!')

    reg_token = _create_school_registration_link(client, super_token, {
        'school_name': 'Single Use School',
        'school_slug': f'single-use-{uuid.uuid4().hex[:6]}',
        'country_code': 'GH',
        'currency': 'GHS',
        'admin_email': 'singleuse_admin@example.com'
    })

    preview = client.post('/api/v1/saas/registration-links/preview', json={'token': reg_token})
    assert preview.status_code == 200
    assert preview.json.get('success') is True

    _complete_school_registration(client, reg_token, password=STRONG_PASSWORD)

    second = client.post(
        '/api/v1/saas/registration-links/complete',
        json={'token': reg_token, 'admin_name': 'School Admin', 'password': STRONG_PASSWORD, 'confirm_password': STRONG_PASSWORD}
    )
    assert second.status_code == 400
    assert second.json.get('success') is False


def test_saas_invite_and_accept_flow(client):
    _create_user('platformsuper_invite@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper_invite@example.com', 'Password123!')

    reg_token = _create_school_registration_link(client, super_token, {
        'school_name': 'Invite School',
        'school_slug': f'invite-school-{uuid.uuid4().hex[:6]}',
        'country_code': 'GH',
        'currency': 'GHS',
        'admin_email': 'owner2@example.com'
    })
    owner_token, tenant_id = _complete_school_registration(client, reg_token, password=STRONG_PASSWORD)

    invitee_email = 'finance1@example.com'
    _create_user(invitee_email, role='user', password='Password123!')

    invite_resp = client.post(
        f'/api/v1/saas/tenants/{tenant_id}/invitations',
        json={'email': invitee_email, 'role': 'school_finance'},
        headers={'Authorization': f'Bearer {owner_token}'}
    )
    assert invite_resp.status_code == 201
    token = invite_resp.json['invitation']['token']
    assert token

    invitee_token = _login(client, invitee_email, 'Password123!')
    accept_resp = client.post(
        '/api/v1/saas/invitations/accept',
        json={'token': token},
        headers={'Authorization': f'Bearer {invitee_token}'}
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json['membership']['tenant_id'] == tenant_id
    assert accept_resp.json['membership']['role'] == 'school_finance'


def test_platform_super_admin_can_list_tenants(client):
    _create_user('platformsuper@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper@example.com', 'Password123!')

    resp = client.get('/api/v1/saas/platform/tenants', headers={'Authorization': f'Bearer {super_token}'})
    assert resp.status_code == 200
    assert 'items' in resp.json
    assert 'pagination' in resp.json


def test_platform_super_admin_kpis_and_detail(client):
    _create_user('platformsuper2@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper2@example.com', 'Password123!')

    kpis_resp = client.get('/api/v1/saas/platform/kpis', headers={'Authorization': f'Bearer {super_token}'})
    assert kpis_resp.status_code == 200
    assert 'kpis' in kpis_resp.json
    assert 'tenants_total' in kpis_resp.json['kpis']

    reg_token = _create_school_registration_link(client, super_token, {
        'school_name': 'Detail School',
        'school_slug': f'detail-school-{uuid.uuid4().hex[:6]}',
        'country_code': 'GH',
        'currency': 'GHS',
        'admin_email': 'owner3@example.com'
    })
    _, tenant_id = _complete_school_registration(client, reg_token, password=STRONG_PASSWORD)

    detail_resp = client.get(
        f'/api/v1/saas/platform/tenants/{tenant_id}',
        headers={'Authorization': f'Bearer {super_token}'}
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json['detail']['tenant']['id'] == tenant_id


def test_platform_super_admin_can_manage_tenant_members(client):
    _create_user('platformsuper3@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper3@example.com', 'Password123!')

    reg_token = _create_school_registration_link(client, super_token, {
        'school_name': 'Members School',
        'school_slug': f'members-school-{uuid.uuid4().hex[:6]}',
        'country_code': 'GH',
        'currency': 'GHS',
        'admin_email': 'owner4@example.com'
    })
    _, tenant_id = _complete_school_registration(client, reg_token, password=STRONG_PASSWORD)

    finance_email = 'finance2@example.com'
    finance_user = _create_user(finance_email, role='user', password='Password123!')

    upsert = client.post(
        f'/api/v1/saas/platform/tenants/{tenant_id}/members',
        json={'email': finance_email, 'role': 'school_finance', 'status': 'active'},
        headers={'Authorization': f'Bearer {super_token}'}
    )
    assert upsert.status_code == 201
    assert upsert.json['membership']['user_id'] == finance_user.id

    members_resp = client.get(
        f'/api/v1/saas/platform/tenants/{tenant_id}/members',
        headers={'Authorization': f'Bearer {super_token}'}
    )
    assert members_resp.status_code == 200
    members = members_resp.json['members']
    assert len(members) >= 2

    admin_member = next((m for m in members if m['role'] == 'school_admin' and m['status'] == 'active'), None)
    finance_member = next((m for m in members if m['user']['id'] == finance_user.id), None)
    assert admin_member
    assert finance_member

    suspend_resp = client.patch(
        f"/api/v1/saas/platform/tenants/{tenant_id}/members/{finance_member['id']}",
        json={'status': 'suspended'},
        headers={'Authorization': f'Bearer {super_token}'}
    )
    assert suspend_resp.status_code == 200
    assert suspend_resp.json['membership']['status'] == 'suspended'

    delete_last_admin = client.delete(
        f"/api/v1/saas/platform/tenants/{tenant_id}/members/{admin_member['id']}",
        headers={'Authorization': f'Bearer {super_token}'}
    )
    assert delete_last_admin.status_code == 400

    promote_finance = client.patch(
        f"/api/v1/saas/platform/tenants/{tenant_id}/members/{finance_member['id']}",
        json={'role': 'school_admin', 'status': 'active'},
        headers={'Authorization': f'Bearer {super_token}'}
    )
    assert promote_finance.status_code == 200
    assert promote_finance.json['membership']['role'] == 'school_admin'
    assert promote_finance.json['membership']['status'] == 'active'

    delete_admin = client.delete(
        f"/api/v1/saas/platform/tenants/{tenant_id}/members/{admin_member['id']}",
        headers={'Authorization': f'Bearer {super_token}'}
    )
    assert delete_admin.status_code == 200
