import uuid
from datetime import date

from app.extensions import db, bcrypt
from app.models.associations import class_subjects
from app.models.billing import Plan, SchoolPlanSubscription
from app.models.class_ import Class
from app.models.security import TenantCredentialCounter
from app.models.student import Student
from app.models.subject import Subject
from app.models.user import User
from app.models.tenant import Tenant, TenantMembership
from app.services.orphan_cleanup_service import OrphanCleanupService


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


def _create_plan(slug: str = 'purge-basic'):
    plan = Plan.query.filter_by(slug=slug).first()
    if plan:
        plan.is_active = True
        db.session.commit()
        return plan
    plan = Plan(
        name=slug.upper(),
        slug=slug,
        description=f'{slug} plan',
        price_per_student=10,
        currency='GHS',
        is_active=True,
    )
    db.session.add(plan)
    db.session.commit()
    return plan


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


def test_purge_tenant_removes_school_id_references():
    actor = _create_user('platformsuper_purge_tenant@example.com', role='super_admin', password='Password123!')
    tenant = _create_orphan_tenant()
    plan = _create_plan()
    db.session.add(SchoolPlanSubscription(
        school_id=tenant.id,
        plan_id=int(plan.id),
        starts_at=date.today(),
        status='active',
    ))
    db.session.commit()

    status = OrphanCleanupService.get_tenant_purge_status(str(tenant.id))
    assert status['can_delete'] is True

    ok, purged = OrphanCleanupService.purge_tenant(str(tenant.id), actor_user_id=actor.id)
    assert ok is True
    assert purged['deleted']['tenant'] == 1
    assert Tenant.query.get(tenant.id) is None
    assert SchoolPlanSubscription.query.filter_by(school_id=tenant.id).count() == 0


def test_purge_tenant_removes_string_tenant_id_references():
    actor = _create_user('platformsuper_purge_tenant_counter@example.com', role='super_admin', password='Password123!')
    tenant = _create_orphan_tenant()
    db.session.add(TenantCredentialCounter(
        tenant_id=str(tenant.id),
        year=date.today().year,
        last_value=3,
    ))
    db.session.commit()

    status = OrphanCleanupService.get_tenant_purge_status(str(tenant.id))
    assert status['can_delete'] is True

    ok, purged = OrphanCleanupService.purge_tenant(str(tenant.id), actor_user_id=actor.id)
    assert ok is True
    assert purged['deleted']['tenant'] == 1
    assert Tenant.query.get(tenant.id) is None
    assert TenantCredentialCounter.query.filter_by(tenant_id=str(tenant.id)).count() == 0


def test_purge_tenant_removes_non_tenant_child_rows():
    actor = _create_user('platformsuper_purge_tenant_children@example.com', role='super_admin', password='Password123!')
    tenant = _create_orphan_tenant()
    school_class = Class(
        tenant_id=tenant.id,
        name='Purge Class',
        grade_level='Primary 1',
        academic_year='2024/2025',
    )
    subject = Subject(
        tenant_id=tenant.id,
        name='Purge Subject',
        code='PURGE-SUBJECT',
    )
    db.session.add(school_class)
    db.session.add(subject)
    db.session.flush()
    db.session.execute(
        class_subjects.insert().values(
            class_id=school_class.id,
            subject_id=subject.id,
        )
    )
    db.session.commit()

    status = OrphanCleanupService.get_tenant_purge_status(str(tenant.id))
    assert status['can_delete'] is True

    ok, purged = OrphanCleanupService.purge_tenant(str(tenant.id), actor_user_id=actor.id)
    assert ok is True
    assert purged['deleted']['tenant'] == 1
    assert Tenant.query.get(tenant.id) is None
    remaining = db.session.execute(
        class_subjects.select().where(class_subjects.c.subject_id == subject.id)
    ).fetchall()
    assert remaining == []


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


def test_super_admin_can_delete_platform_only_student_user(client):
    _create_user('platformsuper_orphan_student@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_orphan_student@example.com', 'Password123!')

    orphan_student = _create_user('platform_only_student@example.com', role='student', password='Password123!')
    db.session.add(Student(
        tenant_id=uuid.uuid4(),
        user_id=orphan_student.id,
        admission_number=f'ADM-{uuid.uuid4().hex[:6].upper()}',
        first_name='Platform',
        last_name='Student',
        date_of_birth=date(2012, 1, 1),
        gender='f',
    ))
    db.session.commit()

    status = client.get(
        f"/api/v1/super-admin/orphans/users/{orphan_student.id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status.status_code == 200
    assert status.json['status']['can_delete'] is True

    deleted = client.delete(
        f"/api/v1/super-admin/orphans/users/{orphan_student.id}?confirm=true",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert deleted.status_code == 200
    assert deleted.json['success'] is True
    assert User.query.get(orphan_student.id) is None


def test_super_admin_cannot_delete_user_with_membership(client):
    _create_user('platformsuper_orphan_user_block@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_orphan_user_block@example.com', 'Password123!')

    tenant = _create_orphan_tenant()
    u = _create_user('member_user@example.com', role='admin', password='Password123!')
    membership = TenantMembership(tenant_id=tenant.id, user_id=u.id, role='school_admin', status='active')
    db.session.add(membership)
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


def test_super_admin_can_force_purge_user(client):
    _create_user('platformsuper_force_purge@example.com', role='super_admin', password='Password123!')
    token = _login(client, 'platformsuper_force_purge@example.com', 'Password123!')

    # 1. Test standard hyphenated /api/v1/super-admin/users/<id>/force-purge path
    tenant1 = _create_orphan_tenant()
    u1 = _create_user('member_force1@example.com', role='admin', password='Password123!')
    db.session.add(TenantMembership(tenant_id=tenant1.id, user_id=u1.id, role='school_admin', status='active'))
    db.session.commit()
    u1_id = u1.id

    # Normal delete should block
    status1 = client.get(
        f"/api/v1/super-admin/orphans/users/{u1_id}",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert status1.json['status']['can_delete'] is False

    # Force purge should bypass constraints and succeed
    purge1 = client.post(
        f"/api/v1/super-admin/users/{u1_id}/force-purge",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert purge1.status_code == 200
    assert purge1.json['success'] is True

    # User 1 should be completely gone
    assert User.query.get(u1_id) is None

    # 2. Test non-hyphenated /api/v1/superadmin/users/<id>/force-purge path
    tenant2 = _create_orphan_tenant()
    u2 = _create_user('member_force2@example.com', role='admin', password='Password123!')
    db.session.add(TenantMembership(tenant_id=tenant2.id, user_id=u2.id, role='school_admin', status='active'))
    db.session.commit()
    u2_id = u2.id

    purge2 = client.post(
        f"/api/v1/superadmin/users/{u2_id}/force-purge",
        headers={'Authorization': f'Bearer {token}'}
    )
    assert purge2.status_code == 200
    assert purge2.json['success'] is True

    # User 2 should be completely gone
    assert User.query.get(u2_id) is None




