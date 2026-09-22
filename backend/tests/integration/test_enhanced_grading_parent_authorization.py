"""R9D.3 parent -> student grading analytics authorization."""

from datetime import date
from uuid import uuid4

import pytest

from app.extensions import bcrypt
from app.models.parent import Parent
from app.models.student import Student
from app.models.user import User

from tests.conftest import _create_tracked_test_access_token
from tests.test_production_integration import create_test_membership


pytestmark = pytest.mark.usefixtures("rbac_defaults")


def _make_parent(
    db_session,
    sample_tenant,
    suffix,
):
    user = User(
        username=f"r9d3_parent_{suffix}",
        email=f"r9d3_parent_{suffix}@example.com",
        password_hash=bcrypt.generate_password_hash(
            "Password123!"
        ).decode("utf-8"),
        role="parent",
        status="active",
    )
    db_session.add(user)
    db_session.flush()

    parent = Parent(
        tenant_id=sample_tenant.id,
        user_id=user.id,
        relationship="Parent",
    )
    db_session.add(parent)
    db_session.flush()

    create_test_membership(
        db_session,
        sample_tenant.id,
        user.id,
        "parent",
    )

    db_session.commit()

    token = _create_tracked_test_access_token(
        user.id
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(sample_tenant.id),
    }

    return user, parent, headers


def _make_child(
    db_session,
    sample_tenant,
    parent,
    suffix,
):
    user = User(
        username=f"r9d3_student_{suffix}",
        email=f"r9d3_student_{suffix}@example.com",
        password_hash=bcrypt.generate_password_hash(
            "Password123!"
        ).decode("utf-8"),
        role="student",
        status="active",
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        tenant_id=sample_tenant.id,
        user_id=user.id,
        admission_number=f"R9D3-{suffix}",
        first_name="R9D3",
        last_name=f"Student{suffix}",
        date_of_birth=date(2012, 1, 1),
        gender="male",
        parent_id=parent.id,
        status="active",
    )

    db_session.add(student)
    db_session.flush()

    create_test_membership(
        db_session,
        sample_tenant.id,
        user.id,
        "student",
    )

    db_session.commit()

    return student


def test_parent_can_read_own_child_analytics(
    client,
    db_session,
    sample_tenant,
):
    _, parent, parent_headers = _make_parent(
        db_session,
        sample_tenant,
        "own",
    )

    child = _make_child(
        db_session,
        sample_tenant,
        parent,
        "own",
    )

    response = client.get(
        (
            "/api/v1/enhanced-grading/"
            f"student-analytics/{child.id}"
            "?academic_year=2026-2027"
        ),
        headers=parent_headers,
    )

    # Parent ownership authorization must pass.
    # Domain analytics may return either 200 or a domain-level
    # validation response, but not auth denial.
    assert response.status_code not in (401, 403)


def test_parent_cannot_read_another_parents_child(
    client,
    db_session,
    sample_tenant,
):
    _, parent_a, headers_a = _make_parent(
        db_session,
        sample_tenant,
        "a",
    )

    _, parent_b, _ = _make_parent(
        db_session,
        sample_tenant,
        "b",
    )

    _make_child(
        db_session,
        sample_tenant,
        parent_a,
        "a",
    )

    child_b = _make_child(
        db_session,
        sample_tenant,
        parent_b,
        "b",
    )

    response = client.get(
        (
            "/api/v1/enhanced-grading/"
            f"student-analytics/{child_b.id}"
            "?academic_year=2026-2027"
        ),
        headers=headers_a,
    )

    assert response.status_code == 403

    body = response.get_json() or {}
    assert body.get("success") is False
    assert body.get("message") == "Unauthorized"


def test_parent_cannot_probe_foreign_tenant_student(
    app,
    client,
    db_session,
    sample_tenant,
):
    from app.models.tenant import Tenant

    _, parent, headers = _make_parent(
        db_session,
        sample_tenant,
        "foreigncheck",
    )

    foreign_suffix = uuid4().hex[:8]

    foreign_tenant = Tenant(
        id=uuid4(),
        slug=f"r9d3-foreign-{foreign_suffix}",
        name=f"R9D3 Foreign {foreign_suffix}",
        country_code=sample_tenant.country_code,
        schema_name=f"r9d3_foreign_{foreign_suffix}",
        status="active",
    )
    db_session.add(foreign_tenant)
    db_session.flush()

    foreign_user = User(
        username=f"r9d3_foreign_{uuid4().hex[:8]}",
        email=f"r9d3_foreign_{uuid4().hex[:8]}@example.com",
        password_hash=bcrypt.generate_password_hash(
            "Password123!"
        ).decode("utf-8"),
        role="student",
        status="active",
    )
    db_session.add(foreign_user)
    db_session.flush()

    foreign_student = Student(
        tenant_id=foreign_tenant.id,
        user_id=foreign_user.id,
        admission_number=(
            f"R9D3-F-{uuid4().hex[:8]}"
        ),
        first_name="Foreign",
        last_name="Student",
        date_of_birth=date(2012, 1, 1),
        gender="female",
        status="active",
    )
    db_session.add(foreign_student)
    db_session.commit()

    response = client.get(
        (
            "/api/v1/enhanced-grading/"
            f"student-analytics/{foreign_student.id}"
            "?academic_year=2026-2027"
        ),
        headers=headers,
    )

    # Do not reveal cross-tenant ownership details.
    assert response.status_code == 404


def test_admin_student_analytics_behavior_unchanged(
    client,
    admin_headers,
):
    response = client.get(
        (
            "/api/v1/enhanced-grading/"
            "student-analytics/999999"
            "?academic_year=2026-2027"
        ),
        headers=admin_headers,
    )

    # Admin must cross the new parent ownership gate.
    assert response.status_code not in (401, 403)


def test_teacher_student_analytics_behavior_unchanged(
    client,
    teacher_headers,
):
    response = client.get(
        (
            "/api/v1/enhanced-grading/"
            "student-analytics/999999"
            "?academic_year=2026-2027"
        ),
        headers=teacher_headers,
    )

    # Teacher must cross the new parent ownership gate.
    assert response.status_code not in (401, 403)
