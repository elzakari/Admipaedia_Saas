"""
V28-R11B.3C3F

Final authorization proof for legacy attendance analytics.

Policy:
- tenant admin may run tenant/branch analytics via attendance.reports
- school_admin inherits the tenant admin permission template
- teacher template retains attendance.read
- teacher template does NOT receive attendance.reports

This file intentionally uses the canonical tracked JWT helper and
TenantMembership authority. Global User.role must not manufacture
tenant authority.
"""

from uuid import uuid4

import pytest

from app.extensions import db
from app.models.tenant import (
    Branch,
    Tenant,
    TenantMembership,
)
from app.models.user import User
from app.models.rbac import RBACRole
from tests.conftest import (
    _create_tracked_test_access_token,
)


def _construct(model, **overrides):
    values = {}

    for column in model.__table__.columns:
        if column.name in overrides:
            values[column.name] = overrides[column.name]
            continue

        if (
            column.primary_key
            or column.nullable
            or column.default is not None
            or column.server_default is not None
            or column.autoincrement is True
        ):
            continue

        if column.name == "name":
            values[column.name] = (
                f"Test {model.__name__}"
            )
        elif column.name == "code":
            values[column.name] = (
                f"T{uuid4().hex[:8]}"
            )
        elif column.name == "email":
            values[column.name] = (
                f"{uuid4().hex[:12]}@test.local"
            )
        elif column.name == "password_hash":
            values[column.name] = "test-password-hash"
        elif column.name == "first_name":
            values[column.name] = "Analytics"
        elif column.name == "last_name":
            values[column.name] = "Admin"
        elif column.name == "role":
            values[column.name] = "student"
        elif column.name == "status":
            values[column.name] = "active"
        elif column.name == "is_active":
            values[column.name] = True
        else:
            raise AssertionError(
                "Unsupported required column for "
                f"{model.__name__}: {column.name}"
            )

    values.update(overrides)

    obj = model(**values)
    db.session.add(obj)
    db.session.flush()
    return obj


def _user(global_role="student"):
    suffix = uuid4().hex[:12]

    user = _construct(
        User,
        username=f"analytics_admin_{suffix}",
        email=f"{suffix}@analytics.test",
        role=global_role,
        status="active",
    )

    # Match the canonical attendance test-user contract:
    # create a real password hash through the model helper.
    if hasattr(user, "set_password_hash"):
        user.set_password_hash("TestPassword123!")
    elif hasattr(user, "set_password"):
        user.set_password("TestPassword123!")
    else:
        raise AssertionError(
            "User model exposes no supported password setter"
        )

    db.session.flush()

    return user


def _membership(
    user,
    tenant,
    role,
    status="active",
):
    return _construct(
        TenantMembership,
        user_id=user.id,
        tenant_id=tenant.id,
        role=role,
        status=status,
    )


def _headers(user, tenant, branch):
    token = _create_tracked_test_access_token(
        user.id
    )

    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
        "X-Branch-ID": str(branch.id),
    }


@pytest.fixture()
def admin_analytics_world(app, rbac_defaults):
    with app.app_context():
        tenant = _construct(
            Tenant,
            name="Analytics Admin Tenant",
            slug=f"analytics-admin-{uuid4().hex[:12]}",
            country_code="GH",
            currency="GHS",
            schema_name=f"analytics_admin_{uuid4().hex[:12]}",
        )

        branch = _construct(
            Branch,
            tenant_id=tenant.id,
            name="Analytics Admin Branch",
            code=f"AAB-{uuid4().hex[:8]}",
        )

        db.session.commit()

        yield {
            "tenant": tenant,
            "branch": branch,
        }

        db.session.rollback()


def test_tenant_admin_can_run_branch_analytics_without_class_id(
    client,
    admin_analytics_world,
):
    world = admin_analytics_world

    admin = _user(
        global_role="student"
    )

    _membership(
        admin,
        world["tenant"],
        "admin",
    )

    db.session.commit()

    response = client.get(
        "/api/v1/attendance/analytics",
        headers=_headers(
            admin,
            world["tenant"],
            world["branch"],
        ),
    )

    assert response.status_code == 200


def test_school_admin_can_run_branch_analytics_without_class_id(
    client,
    admin_analytics_world,
):
    world = admin_analytics_world

    school_admin = _user(
        global_role="student"
    )

    _membership(
        school_admin,
        world["tenant"],
        "school_admin",
    )

    db.session.commit()

    response = client.get(
        "/api/v1/attendance/analytics",
        headers=_headers(
            school_admin,
            world["tenant"],
            world["branch"],
        ),
    )

    assert response.status_code == 200


def test_global_admin_cannot_override_tenant_student_membership(
    client,
    admin_analytics_world,
):
    world = admin_analytics_world

    user = _user(
        global_role="admin"
    )

    _membership(
        user,
        world["tenant"],
        "student",
    )

    db.session.commit()

    response = client.get(
        "/api/v1/attendance/analytics",
        headers=_headers(
            user,
            world["tenant"],
            world["branch"],
        ),
    )

    assert response.status_code == 403


def test_teacher_template_has_read_but_not_reports(
    app,
    rbac_defaults,
):
    with app.app_context():
        teacher = (
            RBACRole.query
            .filter_by(
                name="teacher",
                is_active=True,
            )
            .first()
        )

        assert teacher is not None

        permissions = set(
            teacher.get_all_permissions(
                include_inherited=True
            )
        )

        assert "attendance.read" in permissions
        assert "attendance.reports" not in permissions


def test_admin_template_has_attendance_reports(
    app,
    rbac_defaults,
):
    with app.app_context():
        admin = (
            RBACRole.query
            .filter_by(
                name="admin",
                is_active=True,
            )
            .first()
        )

        assert admin is not None

        permissions = set(
            admin.get_all_permissions(
                include_inherited=True
            )
        )

        assert "attendance.reports" in permissions
