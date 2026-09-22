import uuid
from datetime import date

from flask import g

from app.extensions import db
from app.models.tenant import TenantMembership
from app.models.user import User
from app.services.attendance_service import AttendanceService
from app.api.v1.attendances import routes as attendance_routes
from tests.conftest import _create_tracked_test_access_token


def _make_user(global_role):
    suffix = uuid.uuid4().hex[:10]

    user = User(
        username=f"r11a3c2_{suffix}",
        email=f"r11a3c2_{suffix}@example.com",
        role=global_role,
        status="active",
    )
    user.set_password("Password123!")

    db.session.add(user)
    db.session.flush()

    return user


def _membership(
    user,
    tenant,
    role,
    status="active",
):
    row = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role=role,
        status=status,
    )

    db.session.add(row)
    db.session.flush()

    return row


def _headers(user, tenant, branch):
    token = _create_tracked_test_access_token(
        user.id
    )

    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
        "X-Branch-ID": str(branch.id),
    }


def _payload():
    """
    Schema-valid authorization payload.

    Persistence is intentionally stubbed in this certificate,
    so the synthetic identifiers never reach database mutation.
    The payload must nevertheless satisfy the real canonical
    AttendanceBulkCreateSchema before RBAC is evaluated.
    """
    return {
        "class_id": 999999,
        "date": date.today().isoformat(),
        "attendances": [
            {
                "student_id": 999999,
                "status": "present",
            }
        ],
    }


def _stub_service(monkeypatch):
    called = {"value": False}

    def stub(
        bulk_data,
        tenant_id=None,
        branch_id=None,
    ):
        called["value"] = True

        assert tenant_id == g.tenant_id
        assert branch_id == g.branch_id

        return [], None

    monkeypatch.setattr(
        AttendanceService,
        "bulk_create_attendance",
        staticmethod(stub),
    )

    return called


def test_real_tenant_admin_has_bulk_upsert_permissions(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    rbac_defaults,
    monkeypatch,
):
    """
    Real RBAC resolution:
      global role = student
      tenant role = admin

    Tenant admin must receive attendance.create + update and
    must not be subjected to teacher class scope.
    """
    user = _make_user("student")

    _membership(
        user,
        sample_tenant,
        "admin",
    )

    db.session.commit()

    scope_called = {"value": False}

    def teacher_scope(**kwargs):
        scope_called["value"] = True
        return False

    monkeypatch.setattr(
        attendance_routes,
        "_is_teacher_and_scoped_to_class",
        teacher_scope,
    )

    service_called = _stub_service(monkeypatch)

    response = client.post(
        "/api/v1/attendances/bulk",
        json=_payload(),
        headers=_headers(
            user,
            sample_tenant,
            sample_branch,
        ),
    )

    assert response.status_code == 201
    assert service_called["value"] is True
    assert scope_called["value"] is False


def test_global_admin_cannot_suppress_tenant_teacher_scope(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    rbac_defaults,
    monkeypatch,
):
    """
    global User.role = admin
    authoritative tenant role = teacher

    Real RBAC must treat the requester as teacher. Both
    attendance permissions should resolve from that tenant
    role, but unrelated-class scope must still deny.
    """
    user = _make_user("admin")

    _membership(
        user,
        sample_tenant,
        "teacher",
    )

    db.session.commit()

    scope_called = {"value": False}

    def unrelated_teacher(**kwargs):
        scope_called["value"] = True
        return False

    monkeypatch.setattr(
        attendance_routes,
        "_is_teacher_and_scoped_to_class",
        unrelated_teacher,
    )

    service_called = _stub_service(monkeypatch)

    response = client.post(
        "/api/v1/attendances/bulk",
        json=_payload(),
        headers=_headers(
            user,
            sample_tenant,
            sample_branch,
        ),
    )

    assert response.status_code == 403
    assert scope_called["value"] is True
    assert service_called["value"] is False


def test_global_admin_tenant_teacher_assigned_class_allowed(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    rbac_defaults,
    monkeypatch,
):
    """
    Same authority inversion as above, except the teacher is
    assigned to the requested class.

    This proves global admin does not bypass teacher scope,
    while a valid tenant teacher scope still permits the
    operation.
    """
    user = _make_user("admin")

    _membership(
        user,
        sample_tenant,
        "teacher",
    )

    db.session.commit()

    scope_called = {"value": False}

    def assigned_teacher(**kwargs):
        scope_called["value"] = True
        return True

    monkeypatch.setattr(
        attendance_routes,
        "_is_teacher_and_scoped_to_class",
        assigned_teacher,
    )

    service_called = _stub_service(monkeypatch)

    response = client.post(
        "/api/v1/attendances/bulk",
        json=_payload(),
        headers=_headers(
            user,
            sample_tenant,
            sample_branch,
        ),
    )

    assert response.status_code == 201
    assert scope_called["value"] is True
    assert service_called["value"] is True


def test_global_teacher_cannot_manufacture_teacher_scope_for_tenant_admin(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    rbac_defaults,
    monkeypatch,
):
    """
    global User.role = teacher
    authoritative tenant role = admin

    The global teacher role must not manufacture a teacher
    resource restriction inside the tenant.
    """
    user = _make_user("teacher")

    _membership(
        user,
        sample_tenant,
        "admin",
    )

    db.session.commit()

    scope_called = {"value": False}

    def teacher_scope(**kwargs):
        scope_called["value"] = True
        return False

    monkeypatch.setattr(
        attendance_routes,
        "_is_teacher_and_scoped_to_class",
        teacher_scope,
    )

    service_called = _stub_service(monkeypatch)

    response = client.post(
        "/api/v1/attendances/bulk",
        json=_payload(),
        headers=_headers(
            user,
            sample_tenant,
            sample_branch,
        ),
    )

    assert response.status_code == 201
    assert scope_called["value"] is False
    assert service_called["value"] is True


def test_tenant_student_cannot_inherit_global_admin_bulk_permissions(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    rbac_defaults,
    monkeypatch,
):
    """
    global User.role = admin
    authoritative tenant role = student

    Student must not inherit the global admin's attendance
    create/update permissions.
    """
    user = _make_user("admin")

    _membership(
        user,
        sample_tenant,
        "student",
    )

    db.session.commit()

    scope_called = {"value": False}

    def teacher_scope(**kwargs):
        scope_called["value"] = True
        return True

    monkeypatch.setattr(
        attendance_routes,
        "_is_teacher_and_scoped_to_class",
        teacher_scope,
    )

    service_called = _stub_service(monkeypatch)

    response = client.post(
        "/api/v1/attendances/bulk",
        json=_payload(),
        headers=_headers(
            user,
            sample_tenant,
            sample_branch,
        ),
    )

    assert response.status_code == 403
    assert scope_called["value"] is False
    assert service_called["value"] is False


def test_inactive_tenant_membership_cannot_use_global_admin(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    rbac_defaults,
    monkeypatch,
):
    """
    An inactive tenant membership must fail before service
    execution even when global User.role is admin.
    """
    user = _make_user("admin")

    _membership(
        user,
        sample_tenant,
        "admin",
        status="inactive",
    )

    db.session.commit()

    service_called = _stub_service(monkeypatch)

    response = client.post(
        "/api/v1/attendances/bulk",
        json=_payload(),
        headers=_headers(
            user,
            sample_tenant,
            sample_branch,
        ),
    )

    assert response.status_code == 403
    assert service_called["value"] is False
