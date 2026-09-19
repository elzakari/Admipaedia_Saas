import uuid

import pytest

from app.extensions import db
from app.models.class_ import Class
from app.models.parent import Parent
from app.models.student import Student
from app.models.tenant import TenantMembership
from app.models.user import User
from tests.conftest import _create_tracked_test_access_token


ENDPOINT = "/api/v1/attendance/student/{student_id}/report"


def _membership(user_id, tenant_id, role, status="active"):
    membership = TenantMembership(
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        status=status,
    )
    db.session.add(membership)
    db.session.flush()
    return membership


def _headers(user_id, tenant_id, branch_id=None):
    token = _create_tracked_test_access_token(user_id)

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant_id),
    }

    if branch_id is not None:
        headers["X-Branch-ID"] = str(branch_id)

    return headers


def _make_user(role):
    suffix = uuid.uuid4().hex[:10]

    user = User(
        username=f"r11a3b_{role}_{suffix}",
        email=f"r11a3b_{role}_{suffix}@example.com",
        role=role,
        status="active",
    )
    user.set_password("Password123!")

    db.session.add(user)
    db.session.flush()

    return user


def _make_parent(tenant_id):
    user = _make_user("parent")

    parent = Parent(
        tenant_id=tenant_id,
        user_id=user.id,
        relationship="Parent",
    )

    db.session.add(parent)
    db.session.flush()

    _membership(
        user.id,
        tenant_id,
        "parent",
    )

    return user, parent


def _make_student(
    tenant_id,
    class_id=None,
    branch_id=None,
    parent_id=None,
):
    user = _make_user("student")
    suffix = uuid.uuid4().hex[:8].upper()

    student = Student(
        tenant_id=tenant_id,
        branch_id=branch_id,
        user_id=user.id,
        admission_number=f"R11A3B-{suffix}",
        first_name="Resource",
        last_name="Student",
        date_of_birth=__import__("datetime").date(2010, 1, 1),
        gender="male",
        email=user.email,
        class_id=class_id,
        parent_id=parent_id,
        status="active",
    )

    db.session.add(student)
    db.session.flush()

    _membership(
        user.id,
        tenant_id,
        "student",
    )

    return user, student


def _make_class(
    tenant_id,
    branch_id=None,
    teacher_id=None,
    name_prefix="R11A3B",
):
    cls = Class(
        tenant_id=tenant_id,
        branch_id=branch_id,
        name=f"{name_prefix}-{uuid.uuid4().hex[:6]}",
        grade_level="Primary 4",
        academic_year="2026/2027",
        capacity=30,
        teacher_id=teacher_id,
        status="active",
    )

    db.session.add(cls)
    db.session.flush()

    return cls


def _request(client, headers, student_id):
    return client.get(
        ENDPOINT.format(student_id=student_id),
        headers=headers,
    )


def test_student_can_read_own_attendance_report(
    client,
    db_session,
    sample_tenant,
    rbac_defaults,
):
    user, student = _make_student(
        sample_tenant.id,
    )

    db.session.commit()

    response = _request(
        client,
        _headers(user.id, sample_tenant.id),
        student.id,
    )

    assert response.status_code == 200


def test_student_cannot_read_unrelated_student_report(
    client,
    db_session,
    sample_tenant,
    rbac_defaults,
):
    requester, _ = _make_student(
        sample_tenant.id,
    )

    _, target = _make_student(
        sample_tenant.id,
    )

    db.session.commit()

    response = _request(
        client,
        _headers(requester.id, sample_tenant.id),
        target.id,
    )

    assert response.status_code == 403


def test_parent_can_read_own_child_report(
    client,
    db_session,
    sample_tenant,
    rbac_defaults,
):
    parent_user, parent = _make_parent(
        sample_tenant.id,
    )

    _, child = _make_student(
        sample_tenant.id,
        parent_id=parent.id,
    )

    db.session.commit()

    response = _request(
        client,
        _headers(
            parent_user.id,
            sample_tenant.id,
        ),
        child.id,
    )

    assert response.status_code == 200


def test_parent_cannot_read_unrelated_child_report(
    client,
    db_session,
    sample_tenant,
    rbac_defaults,
):
    requester_user, _ = _make_parent(
        sample_tenant.id,
    )

    _, actual_parent = _make_parent(
        sample_tenant.id,
    )

    _, child = _make_student(
        sample_tenant.id,
        parent_id=actual_parent.id,
    )

    db.session.commit()

    response = _request(
        client,
        _headers(
            requester_user.id,
            sample_tenant.id,
        ),
        child.id,
    )

    assert response.status_code == 403


def test_teacher_can_read_student_in_assigned_class(
    client,
    db_session,
    sample_tenant,
    tenant_teacher,
    rbac_defaults,
):
    _membership(
        tenant_teacher.user_id,
        sample_tenant.id,
        "teacher",
    )

    cls = _make_class(
        sample_tenant.id,
        teacher_id=tenant_teacher.id,
    )

    _, student = _make_student(
        sample_tenant.id,
        class_id=cls.id,
    )

    db.session.commit()

    response = _request(
        client,
        _headers(
            tenant_teacher.user_id,
            sample_tenant.id,
        ),
        student.id,
    )

    assert response.status_code == 200


def test_teacher_cannot_read_student_outside_assigned_class(
    client,
    db_session,
    sample_tenant,
    tenant_teacher,
    rbac_defaults,
):
    _membership(
        tenant_teacher.user_id,
        sample_tenant.id,
        "teacher",
    )

    unrelated_class = _make_class(
        sample_tenant.id,
    )

    _, student = _make_student(
        sample_tenant.id,
        class_id=unrelated_class.id,
    )

    db.session.commit()

    response = _request(
        client,
        _headers(
            tenant_teacher.user_id,
            sample_tenant.id,
        ),
        student.id,
    )

    assert response.status_code == 403


def test_foreign_tenant_student_is_concealed(
    client,
    db_session,
    sample_tenant,
    rbac_defaults,
):
    requester, _ = _make_student(
        sample_tenant.id,
    )

    from app.models.tenant import Tenant

    suffix = uuid.uuid4().hex[:8]

    foreign_tenant = Tenant(
        slug=f"r11a3b-foreign-{suffix}",
        name=f"R11A3B Foreign {suffix}",
        country_code="GH",
        schema_name=f"r11a3b_foreign_{suffix}",
    )

    db.session.add(foreign_tenant)
    db.session.flush()

    _, foreign_student = _make_student(
        foreign_tenant.id,
    )

    db.session.commit()

    response = _request(
        client,
        _headers(
            requester.id,
            sample_tenant.id,
        ),
        foreign_student.id,
    )

    assert response.status_code == 404


def test_inactive_membership_is_rejected(
    client,
    db_session,
    sample_tenant,
    rbac_defaults,
):
    user = _make_user("student")

    student = Student(
        tenant_id=sample_tenant.id,
        user_id=user.id,
        admission_number=f"R11A3B-INACTIVE-{uuid.uuid4().hex[:6]}",
        first_name="Inactive",
        last_name="Student",
        date_of_birth=__import__("datetime").date(2010, 1, 1),
        gender="male",
        email=user.email,
        status="active",
    )

    db.session.add(student)
    db.session.flush()

    _membership(
        user.id,
        sample_tenant.id,
        "student",
        status="inactive",
    )

    db.session.commit()

    response = _request(
        client,
        _headers(
            user.id,
            sample_tenant.id,
        ),
        student.id,
    )

    assert response.status_code == 403


def test_school_admin_retains_tenant_report_access(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    admin_headers,
    rbac_defaults,
):
    _, student = _make_student(
        sample_tenant.id,
        branch_id=sample_branch.id,
    )

    db.session.commit()

    headers = dict(admin_headers)
    headers["X-Branch-ID"] = str(sample_branch.id)

    response = _request(
        client,
        headers,
        student.id,
    )

    assert response.status_code == 200


def test_global_user_role_cannot_override_tenant_membership_role(
    client,
    db_session,
    sample_tenant,
    sample_branch,
    rbac_defaults,
):
    """
    Global User.role is admin, but the authoritative tenant
    membership is student.

    The unrelated target Student is deliberately in the same
    tenant and branch so branch concealment cannot satisfy
    this test. Tenant membership authority must produce 403.
    """
    requester = _make_user("admin")

    _membership(
        requester.id,
        sample_tenant.id,
        "student",
    )

    _, target = _make_student(
        sample_tenant.id,
        branch_id=sample_branch.id,
    )

    db.session.commit()

    headers = _headers(
        requester.id,
        sample_tenant.id,
        branch_id=sample_branch.id,
    )

    response = _request(
        client,
        headers,
        target.id,
    )

    assert response.status_code == 403
