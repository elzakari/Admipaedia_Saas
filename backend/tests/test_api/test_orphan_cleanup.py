import uuid

from app.extensions import db, bcrypt
from app.models.user import User
from app.models.tenant import Tenant, TenantMembership


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


def _create_orphan_tenant():
    slug = f"orphan-{uuid.uuid4().hex[:8]}"
    tenant = Tenant(
        slug=slug,
        name=f"Orphan {slug}",
        country_code='GH',
        currency='GHS',
        schema_name=f"tenant_{uuid.uuid4().hex[:12]}"
    )
    db.session.add(tenant)
    db.session.commit()
    return tenant


def test_super_admin_can_delete_orphan_tenant(client):
    _create_user('platformsuper_orphan_tenant@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_orphan_tenant@example.com', 'Password123!')

    tenant = _create_orphan_tenant()

    status = client.get(
        f"/api/v1/super-admin/orphans/tenants/{tenant.id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status.status_code == 200
    assert status.json['status']['can_delete'] is True

    no_confirm = client.delete(
        f"/api/v1/super-admin/orphans/tenants/{tenant.id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert no_confirm.status_code == 400

    deleted = client.delete(
        f"/api/v1/super-admin/orphans/tenants/{tenant.id}?confirm=true",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert deleted.status_code == 200
    assert deleted.json['success'] is True

    gone = client.get(
        f"/api/v1/super-admin/orphans/tenants/{tenant.id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert gone.status_code == 404 or gone.json['status']['exists'] is False


def test_super_admin_cannot_delete_tenant_with_memberships(client):
    _create_user('platformsuper_orphan_tenant_block@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_orphan_tenant_block@example.com', 'Password123!')

    tenant = _create_orphan_tenant()
    member = _create_user('member_for_tenant@example.com', role='admin', password='Password123!')
    db.session.add(TenantMembership(tenant_id=tenant.id, user_id=member.id, role='school_admin', status='active'))
    db.session.commit()

    status = client.get(
        f"/api/v1/super-admin/orphans/tenants/{tenant.id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status.status_code == 200
    assert status.json['status']['can_delete'] is False

    deleted = client.delete(
        f"/api/v1/super-admin/orphans/tenants/{tenant.id}?confirm=true",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert deleted.status_code == 400


def test_super_admin_can_delete_orphan_user(client):
    _create_user('platformsuper_orphan_user@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_orphan_user@example.com', 'Password123!')

    orphan = _create_user('orphan_user@example.com', role='user', password='Password123!')

    status = client.get(
        f"/api/v1/super-admin/orphans/users/{orphan.id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status.status_code == 200
    assert status.json['status']['can_delete'] is True

    deleted = client.delete(
        f"/api/v1/super-admin/orphans/users/{orphan.id}?confirm=true",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert deleted.status_code == 200
    assert deleted.json['success'] is True


def test_super_admin_cannot_delete_user_with_membership(client):
    _create_user('platformsuper_orphan_user_block@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_orphan_user_block@example.com', 'Password123!')

    tenant = _create_orphan_tenant()
    u = _create_user('member_user@example.com', role='admin', password='Password123!')
    db.session.add(TenantMembership(tenant_id=tenant.id, user_id=u.id, role='school_admin', status='active'))
    db.session.commit()

    status = client.get(
        f"/api/v1/super-admin/orphans/users/{u.id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status.status_code == 200
    assert status.json['status']['can_delete'] is False

    deleted = client.delete(
        f"/api/v1/super-admin/orphans/users/{u.id}?confirm=true",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert deleted.status_code == 400

