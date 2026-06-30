import uuid

from app.extensions import bcrypt, db
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User
from app.services.user_deletion_policy_service import UserDeletionPolicyService


def _create_user(email: str, role: str = 'user', password: str = 'Password123!') -> User:
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
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        role=role,
        status='active',
    )
    db.session.add(user)
    db.session.commit()
    return user


def _create_tenant(name: str, status: str = 'active') -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        slug=f"{name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}",
        name=name,
        country_code='GH',
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency='GHS',
        status=status,
        plan='basic',
    )
    db.session.add(tenant)
    db.session.commit()
    return tenant


def _add_membership(*, tenant: Tenant, user: User, role: str, status: str = 'active') -> TenantMembership:
    membership = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role=role,
        status=status,
    )
    db.session.add(membership)
    db.session.commit()
    return membership


def test_super_admin_can_delete_orphan_user_via_policy_service():
    actor = _create_user('secure_delete_super_admin@example.com', role='super_admin')
    target = _create_user('secure_delete_orphan@example.com', role='user')

    status = UserDeletionPolicyService.get_delete_status(target.id, actor.id)
    assert status['can_delete'] is True
    assert status['mode'] == 'orphan'

    ok, result = UserDeletionPolicyService.delete_user(target.id, actor.id)
    assert ok is True
    assert result['success'] is True
    assert User.query.get(target.id) is None


def test_super_admin_can_delete_school_admin_from_suspended_school():
    actor = _create_user('secure_delete_suspended_super_admin@example.com', role='super_admin')
    suspended_tenant = _create_tenant('Suspended Campus', status='suspended')
    target = _create_user('secure_delete_suspended_school_admin@example.com', role='school_admin')
    _add_membership(tenant=suspended_tenant, user=target, role='school_admin')

    status = UserDeletionPolicyService.get_delete_status(target.id, actor.id)
    assert status['can_delete'] is True
    assert status['mode'] == 'purge'


def test_super_admin_cannot_delete_user_from_active_school():
    actor = _create_user('secure_delete_active_super_admin@example.com', role='super_admin')
    active_tenant = _create_tenant('Active Campus', status='active')
    target = _create_user('secure_delete_active_teacher@example.com', role='teacher')
    _add_membership(tenant=active_tenant, user=target, role='teacher')

    status = UserDeletionPolicyService.get_delete_status(target.id, actor.id)
    assert status['can_delete'] is False
    assert 'inactive or suspended schools' in status['reasons'][0]


def test_school_admin_can_delete_user_from_own_active_school():
    tenant = _create_tenant('School Admin Campus', status='active')
    actor = _create_user('secure_delete_school_admin@example.com', role='school_admin')
    target = _create_user('secure_delete_school_teacher@example.com', role='teacher')
    _add_membership(tenant=tenant, user=actor, role='school_admin')
    _add_membership(tenant=tenant, user=target, role='teacher')

    status = UserDeletionPolicyService.get_delete_status(target.id, actor.id, tenant_scope_id=tenant.id)
    assert status['can_delete'] is True
    assert status['mode'] == 'purge'

    ok, result = UserDeletionPolicyService.delete_user(target.id, actor.id, tenant_scope_id=tenant.id)
    assert ok is True
    assert result['success'] is True
    assert User.query.get(target.id) is None


def test_school_admin_cannot_delete_another_school_admin():
    tenant = _create_tenant('Admin Only Campus', status='active')
    actor = _create_user('secure_delete_admin_actor@example.com', role='school_admin')
    target = _create_user('secure_delete_admin_target@example.com', role='school_admin')
    _add_membership(tenant=tenant, user=actor, role='school_admin')
    _add_membership(tenant=tenant, user=target, role='school_admin')

    status = UserDeletionPolicyService.get_delete_status(target.id, actor.id, tenant_scope_id=tenant.id)
    assert status['can_delete'] is False
    assert status['reasons'] == ['School Admin cannot delete another School Admin account']


def test_school_admin_cannot_delete_user_linked_to_another_school():
    tenant = _create_tenant('Scoped Campus', status='active')
    second_tenant = _create_tenant('Other Campus', status='active')
    actor = _create_user('secure_delete_scoped_actor@example.com', role='school_admin')
    target = _create_user('secure_delete_multi_school_target@example.com', role='teacher')
    _add_membership(tenant=tenant, user=actor, role='school_admin')
    _add_membership(tenant=tenant, user=target, role='teacher')
    _add_membership(tenant=second_tenant, user=target, role='teacher')

    status = UserDeletionPolicyService.get_delete_status(target.id, actor.id, tenant_scope_id=tenant.id)
    assert status['can_delete'] is False
    assert status['reasons'] == ['User has links to another school and cannot be deleted from this school']
