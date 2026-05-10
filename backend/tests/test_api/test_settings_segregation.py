import uuid


def _login_and_headers(client, email: str, password: str):
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    token = resp.json.get('access_token')
    return {'Authorization': f'Bearer {token}'}


def test_platform_settings_super_admin_only(db_session, client, user_factory):
    super_admin = user_factory('super_admin')
    admin = user_factory('admin')

    super_headers = _login_and_headers(client, super_admin.email, 'Password123!')
    admin_headers = _login_and_headers(client, admin.email, 'Password123!')

    resp = client.get('/api/v1/platform/settings', headers=admin_headers)
    assert resp.status_code in (401, 403)

    resp = client.get('/api/v1/platform/settings', headers=super_headers)
    assert resp.status_code == 200
    assert resp.json.get('success') is True
    assert isinstance(resp.json.get('data'), dict)


def test_tenant_kv_settings_school_admin_only(db_session, client, user_factory):
    from app.models.tenant import Tenant, TenantMembership

    tenant = Tenant(
        slug='test-school',
        name='Test School',
        country_code='GH',
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        settings={'admission_form_price': '150.00'}
    )
    db_session.add(tenant)
    db_session.flush()

    school_admin_user = user_factory('admin')
    teacher_user = user_factory('teacher')

    db_session.add(TenantMembership(tenant_id=tenant.id, user_id=school_admin_user.id, role='school_admin', status='active'))
    db_session.add(TenantMembership(tenant_id=tenant.id, user_id=teacher_user.id, role='teacher', status='active'))
    db_session.commit()

    school_admin_headers = _login_and_headers(client, school_admin_user.email, 'Password123!')
    school_admin_headers['X-Tenant-ID'] = str(tenant.id)

    teacher_headers = _login_and_headers(client, teacher_user.email, 'Password123!')
    teacher_headers['X-Tenant-ID'] = str(tenant.id)

    resp = client.get('/api/v1/settings/', headers=teacher_headers)
    assert resp.status_code in (401, 403)

    resp = client.get('/api/v1/settings/', headers=school_admin_headers)
    assert resp.status_code == 200
    assert resp.json.get('success') is True
    assert isinstance(resp.json.get('data'), dict)

    resp = client.post('/api/v1/settings/update', headers=school_admin_headers, json={
        'key': 'admission_form_price',
        'value': '200.00',
        'setting_type': 'string'
    })
    assert resp.status_code == 200
    assert resp.json.get('success') is True

