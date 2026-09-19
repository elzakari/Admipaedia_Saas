
from datetime import date
from uuid import uuid4

import pytest
from flask_jwt_extended import verify_jwt_in_request

from app.extensions import db
from app.models.associations import (
    class_subjects,
    teacher_subjects,
)
from app.models.tenant import Branch
from app.models.class_ import (
    Class,
    ClassTeacherMapping,
)
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User

from tests.conftest import (
    _create_tracked_test_access_token,
)


def _column_names(model):
    return {
        column.name
        for column in model.__table__.columns
    }


def _required_columns(model):
    result = set()

    for column in model.__table__.columns:
        if column.primary_key:
            continue

        if (
            not column.nullable
            and column.default is None
            and column.server_default is None
        ):
            result.add(column.name)

    return result


def _construct(model, **preferred):
    """Construct model using known values plus conservative defaults."""
    columns = _column_names(model)
    required = _required_columns(model)

    values = {
        key: value
        for key, value in preferred.items()
        if key in columns
    }

    defaults = {
        "name": "Test",
        "first_name": "Test",
        "last_name": "User",
        "username": f"user-{uuid4().hex[:12]}",
        "email": f"{uuid4().hex[:12]}@example.com",
        "slug": f"tenant-{uuid4().hex[:12]}",
        "schema_name": f"tenant_{uuid4().hex[:12]}",
        "country_code": "GH",
        "status": "active",
        "is_active": True,
        "role": "student",
        "code": f"T{uuid4().hex[:6]}",
        "academic_year": "2026/2027",
        "grade_level": "Grade 1",
        "employee_id": f"TCH-{uuid4().hex[:12]}",
        "description": "Test fixture",
        "phone": "+22890000000",
    }

    missing = []

    for name in required:
        if name in values:
            continue

        if name in defaults:
            values[name] = defaults[name]
        else:
            missing.append(name)

    if missing:
        raise AssertionError(
            f"Unsupported required columns for "
            f"{model.__name__}: {sorted(missing)}"
        )

    return model(**values)


def _flush(obj):
    db.session.add(obj)
    db.session.flush()
    return obj


def _tenant(name):
    return _flush(
        _construct(
            Tenant,
            name=name,
            slug=f"{name.lower()}-{uuid4().hex[:8]}",
            schema_name=(
                f"{name.lower().replace('-', '_')}_"
                f"{uuid4().hex[:8]}"
            ),
            country_code="GH",
        )
    )


def _branch(tenant, name):
    return _flush(
        _construct(
            Branch,
            tenant_id=tenant.id,
            name=name,
            code=f"B{uuid4().hex[:5]}",
            is_active=True,
        )
    )


def _user(global_role="student"):
    user = _construct(
        User,
        username=f"u-{uuid4().hex[:10]}",
        email=f"{uuid4().hex[:10]}@example.com",
        role=global_role,
        is_active=True,
    )

    # Most User implementations require a password hash through
    # a model helper rather than constructor input.
    if hasattr(user, "set_password_hash"):
        user.set_password_hash("TestPassword123!")
    elif hasattr(user, "set_password"):
        user.set_password("TestPassword123!")

    return _flush(user)


def _membership(user, tenant, role, status="active"):
    return _flush(
        _construct(
            TenantMembership,
            user_id=user.id,
            tenant_id=tenant.id,
            role=role,
            status=status,
        )
    )


def _teacher(user, tenant, branch):
    return _flush(
        _construct(
            Teacher,
            user_id=user.id,
            tenant_id=tenant.id,
            branch_id=branch.id,
            employee_id=f"TCH-{uuid4().hex[:12]}",
            first_name="Analytics",
            last_name="Teacher",
            email=f"{uuid4().hex[:10]}@teacher.test",
        )
    )


def _class(tenant, branch, teacher_id=None, name="Class"):
    return _flush(
        _construct(
            Class,
            tenant_id=tenant.id,
            branch_id=branch.id,
            teacher_id=teacher_id,
            name=name,
            code=f"C{uuid4().hex[:6]}",
            grade_level="Grade 1",
            academic_year="2026/2027",
        )
    )


def _subject(tenant, name="Subject"):
    return _flush(
        _construct(
            Subject,
            tenant_id=tenant.id,
            name=name,
            code=f"S{uuid4().hex[:6]}",
        )
    )


def _tracked_headers(app, user, tenant, branch=None):
    with app.test_request_context():
        token = _create_tracked_test_access_token(
            user.id
        )

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    if branch is not None:
        headers["X-Branch-ID"] = str(branch.id)

    return headers


def _analytics(client, headers, class_id=None):
    url = "/api/v1/attendance/analytics"

    if class_id is not None:
        url += f"?class_id={class_id}"

    return client.get(
        url,
        headers=headers,
    )


@pytest.fixture()
def analytics_world(app, rbac_defaults):
    """Two tenants and multiple branches for adversarial authorization."""
    with app.app_context():
        tenant_a = _tenant("AnalyticsA")
        tenant_b = _tenant("AnalyticsB")

        branch_a1 = _branch(
            tenant_a,
            "A1",
        )
        branch_a2 = _branch(
            tenant_a,
            "A2",
        )
        branch_b1 = _branch(
            tenant_b,
            "B1",
        )

        # Global role deliberately student. TenantMembership must win.
        teacher_user = _user(
            global_role="student"
        )

        _membership(
            teacher_user,
            tenant_a,
            "teacher",
            "active",
        )

        teacher = _teacher(
            teacher_user,
            tenant_a,
            branch_a1,
        )

        unrelated_user = _user(
            global_role="admin"
        )

        _membership(
            unrelated_user,
            tenant_a,
            "teacher",
            "active",
        )

        # ClassTeacherMapping.teacher_id is a User.id domain,
        # while homeroom and teacher_subjects use Teacher.id.
        #
        # SQLite can allocate identical integer values from
        # the independent User and Teacher sequences. Advance
        # only the Teacher sequence so this adversarial case
        # proves the identity-domain distinction instead of
        # relying on coincidental numeric equality.
        padding_user = _user(
            global_role="student"
        )

        padding_teacher = _teacher(
            padding_user,
            tenant_a,
            branch_a1,
        )

        unrelated_teacher = _teacher(
            unrelated_user,
            tenant_a,
            branch_a1,
        )

        if unrelated_user.id == unrelated_teacher.id:
            raise RuntimeError(
                "Adversarial identity fixture failed to "
                "separate User.id from Teacher.id"
            )

        inactive_user = _user(
            global_role="admin"
        )

        _membership(
            inactive_user,
            tenant_a,
            "teacher",
            "inactive",
        )

        inactive_teacher = _teacher(
            inactive_user,
            tenant_a,
            branch_a1,
        )

        homeroom_class = _class(
            tenant_a,
            branch_a1,
            teacher_id=teacher.id,
            name="Homeroom",
        )

        mapping_class = _class(
            tenant_a,
            branch_a1,
            name="Mapped",
        )

        subject_class = _class(
            tenant_a,
            branch_a1,
            name="SubjectClass",
        )

        unrelated_class = _class(
            tenant_a,
            branch_a1,
            name="Unrelated",
        )

        foreign_branch_class = _class(
            tenant_a,
            branch_a2,
            name="ForeignBranch",
        )

        foreign_tenant_class = _class(
            tenant_b,
            branch_b1,
            name="ForeignTenant",
        )

        db.session.add(
            ClassTeacherMapping(
                class_id=mapping_class.id,
                teacher_id=teacher_user.id,
            )
        )

        subject = _subject(
            tenant_a,
            "Analytics Subject",
        )

        db.session.execute(
            class_subjects.insert().values(
                class_id=subject_class.id,
                subject_id=subject.id,
            )
        )

        db.session.execute(
            teacher_subjects.insert().values(
                teacher_id=teacher.id,
                subject_id=subject.id,
            )
        )

        db.session.commit()

        yield {
            "tenant_a": tenant_a,
            "tenant_b": tenant_b,
            "branch_a1": branch_a1,
            "branch_a2": branch_a2,
            "branch_b1": branch_b1,
            "teacher_user": teacher_user,
            "teacher": teacher,
            "unrelated_user": unrelated_user,
            "unrelated_teacher": unrelated_teacher,
            "inactive_user": inactive_user,
            "inactive_teacher": inactive_teacher,
            "homeroom_class": homeroom_class,
            "mapping_class": mapping_class,
            "subject_class": subject_class,
            "unrelated_class": unrelated_class,
            "foreign_branch_class": foreign_branch_class,
            "foreign_tenant_class": foreign_tenant_class,
        }


def test_teacher_homeroom_assignment_allows_analytics(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["teacher_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["homeroom_class"].id,
    )

    assert response.status_code == 200


def test_teacher_user_id_mapping_allows_analytics(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["teacher_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["mapping_class"].id,
    )

    assert response.status_code == 200


def test_teacher_subject_assignment_allows_analytics(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["teacher_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["subject_class"].id,
    )

    assert response.status_code == 200


def test_unassigned_teacher_is_denied(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["teacher_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["unrelated_class"].id,
    )

    assert response.status_code == 403


def test_teacher_without_class_id_is_denied(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["teacher_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
    )

    assert response.status_code == 403


def test_foreign_branch_class_is_not_visible(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["teacher_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["foreign_branch_class"].id,
    )

    assert response.status_code == 404


def test_foreign_tenant_class_is_not_visible(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["teacher_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["foreign_tenant_class"].id,
    )

    assert response.status_code == 404


def test_global_admin_role_cannot_escape_tenant_teacher_scope(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    # Global User.role is admin, but active TenantMembership is teacher.
    headers = _tracked_headers(
        app,
        w["unrelated_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["unrelated_class"].id,
    )

    assert response.status_code == 403


def test_inactive_membership_cannot_use_global_admin_role(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    headers = _tracked_headers(
        app,
        w["inactive_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        w["unrelated_class"].id,
    )

    assert response.status_code in (401, 403)


def test_mapping_identity_is_user_id_not_teacher_id(
    app,
    client,
    analytics_world,
):
    """A numeric Teacher.id collision must not become mapping authority."""
    w = analytics_world

    # Ensure the adversarial IDs are genuinely different.
    assert (
        w["unrelated_user"].id
        != w["unrelated_teacher"].id
    )

    with app.app_context():
        collision_class = _class(
            w["tenant_a"],
            w["branch_a1"],
            name="IdentityCollision",
        )

        # Deliberately WRONG identity domain:
        # mapping expects User.id, but insert Teacher.id.
        db.session.add(
            ClassTeacherMapping(
                class_id=collision_class.id,
                teacher_id=w["unrelated_teacher"].id,
            )
        )

        db.session.commit()

        collision_class_id = collision_class.id

    headers = _tracked_headers(
        app,
        w["unrelated_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        collision_class_id,
    )

    # The Teacher.id value must not authorize this User.
    assert response.status_code == 403


def test_correct_user_id_mapping_allows_when_ids_differ(
    app,
    client,
    analytics_world,
):
    w = analytics_world

    assert (
        w["unrelated_user"].id
        != w["unrelated_teacher"].id
    )

    with app.app_context():
        mapped_class = _class(
            w["tenant_a"],
            w["branch_a1"],
            name="CorrectIdentity",
        )

        db.session.add(
            ClassTeacherMapping(
                class_id=mapped_class.id,
                teacher_id=w["unrelated_user"].id,
            )
        )

        db.session.commit()

        mapped_class_id = mapped_class.id

    headers = _tracked_headers(
        app,
        w["unrelated_user"],
        w["tenant_a"],
        w["branch_a1"],
    )

    response = _analytics(
        client,
        headers,
        mapped_class_id,
    )

    assert response.status_code == 200
