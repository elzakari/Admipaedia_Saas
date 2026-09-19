"""
V28-R12C2
Canonical Attendance CRUD / statistics adversarial security tests.

Purpose:
    Establish the security baseline BEFORE R12C production hardening.

Important:
    * These tests intentionally exercise the real HTTP boundary.
    * JWTs use the repository's tracked-token fixture contract.
    * TenantMembership is authoritative.
    * Attendance has no tenant_id; ownership must be proven through
      authoritative Student/Class parents.
    * Previously certified bulk/offline paths are not modified here.
"""

from datetime import date, timedelta
from uuid import uuid4

import pytest

from app.extensions import db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.tenant import Branch, Tenant, TenantMembership
from app.models.user import User


TODAY = date.today()


def _user(prefix, global_role="student"):
    suffix = uuid4().hex[:10]

    user = User(
        username=f"{prefix}_{suffix}",
        email=f"{prefix}_{suffix}@example.test",
        role=global_role,
        status="active",
    )

    # Preserve the repository's normal password API if available.
    if hasattr(user, "set_password"):
        user.set_password("TestPass123!")

    db.session.add(user)
    db.session.flush()

    return user


def _membership(user, tenant, role, status="active"):
    membership = TenantMembership(
        user_id=user.id,
        tenant_id=tenant.id,
        role=role,
        status=status,
    )

    db.session.add(membership)
    db.session.flush()

    return membership


def _tenant(name):
    suffix = uuid4().hex[:8]

    tenant = Tenant(
        country_code="TG",
        name=f"{name} {suffix}",
        slug=f"{name.lower().replace(' ', '-')}-{suffix}",
        schema_name=f"t_{suffix}",
        status="active",
    )

    db.session.add(tenant)
    db.session.flush()

    return tenant


def _branch(tenant, name):
    suffix = uuid4().hex[:8]

    branch = Branch(
        tenant_id=tenant.id,
        name=name,
        code=f"B{suffix[:5]}",
        is_active=True,
    )

    db.session.add(branch)
    db.session.flush()

    return branch


def _class(tenant, branch, name):
    suffix = uuid4().hex[:8]

    row = Class(
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=name,
        code=f"C-{suffix}",
        grade_level="Primary 1",
        academic_year="2026/2027",
        status="active",
    )

    db.session.add(row)
    db.session.flush()

    return row


def _subject(tenant, name):
    suffix = uuid4().hex[:8]

    row = Subject(
        tenant_id=tenant.id,
        name=name,
        code=f"S-{suffix}",
        credit_hours=1,
        is_active=True,
    )

    db.session.add(row)
    db.session.flush()

    return row


def _student(tenant, branch, class_, prefix):
    suffix = uuid4().hex[:8]

    user = User(
        username=f"student_{suffix}",
        email=f"student_{suffix}@example.test",
        role="student",
        status="active",
    )

    if hasattr(user, "set_password"):
        user.set_password("TestPass123!")

    db.session.add(user)
    db.session.flush()

    row = Student(
        tenant_id=tenant.id,
        branch_id=branch.id,
        class_id=class_.id,
        user_id=user.id,
        admission_number=f"ADM-R12-{suffix}",
        first_name=prefix,
        last_name=suffix,
        student_id_number=f"R12-{suffix}",
        date_of_birth=date(2012, 1, 15),
        gender="male",
        status="active",
    )

    db.session.add(row)
    db.session.flush()

    return row


def _attendance(
    student,
    class_,
    recorded_by,
    *,
    branch_id=None,
    subject=None,
    status="present",
    day=None,
):
    row = Attendance(
        student_id=student.id,
        class_id=class_.id,
        subject_id=subject.id if subject else None,
        branch_id=(
            class_.branch_id
            if branch_id is None
            else branch_id
        ),
        date=day or TODAY,
        status=status,
        recorded_by=recorded_by.id,
    )

    db.session.add(row)
    db.session.flush()

    return row


def _headers(
    tracked_access_token_factory,
    user,
    tenant,
    branch=None,
):
    token = tracked_access_token_factory(user.id)

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    if branch is not None:
        headers["X-Branch-ID"] = str(branch.id)

    return headers


def _attendance_rows():
    return (
        Attendance.query
        .without_tenant_filter()
        .order_by(Attendance.id.asc())
        .all()
    )


@pytest.fixture
def crud_graph(app, rbac_defaults):
    """
    Two tenants.

    Tenant A:
        branch A1
        branch A2
        class A1
        class A2
        student A1
        student A2
        subject A
        admin
        tenant-teacher whose global role is deliberately mutable
        unrelated user

    Tenant B:
        branch B1
        class B1
        student B1
        subject B
    """

    with app.app_context():
        tenant_a = _tenant("R12 Tenant A")
        tenant_b = _tenant("R12 Tenant B")

        branch_a1 = _branch(
            tenant_a,
            "R12 Branch A1",
        )
        branch_a2 = _branch(
            tenant_a,
            "R12 Branch A2",
        )
        branch_b1 = _branch(
            tenant_b,
            "R12 Branch B1",
        )

        class_a1 = _class(
            tenant_a,
            branch_a1,
            "R12 Class A1",
        )
        class_a2 = _class(
            tenant_a,
            branch_a2,
            "R12 Class A2",
        )
        class_b1 = _class(
            tenant_b,
            branch_b1,
            "R12 Class B1",
        )

        subject_a = _subject(
            tenant_a,
            "R12 Subject A",
        )
        subject_b = _subject(
            tenant_b,
            "R12 Subject B",
        )

        student_a1 = _student(
            tenant_a,
            branch_a1,
            class_a1,
            "StudentA1",
        )
        student_a2 = _student(
            tenant_a,
            branch_a2,
            class_a2,
            "StudentA2",
        )
        student_b1 = _student(
            tenant_b,
            branch_b1,
            class_b1,
            "StudentB1",
        )

        admin = _user(
            "r12_admin",
            global_role="admin",
        )
        _membership(
            admin,
            tenant_a,
            "admin",
        )

        teacher_user = _user(
            "r12_teacher",
            global_role="teacher",
        )
        _membership(
            teacher_user,
            tenant_a,
            "teacher",
        )

        unrelated_user = _user(
            "r12_unrelated",
            global_role="student",
        )
        _membership(
            unrelated_user,
            tenant_a,
            "student",
        )

        tenant_b_admin = _user(
            "r12_b_admin",
            global_role="admin",
        )
        _membership(
            tenant_b_admin,
            tenant_b,
            "admin",
        )

        db.session.commit()

        yield {
            "tenant_a": tenant_a,
            "tenant_b": tenant_b,
            "branch_a1": branch_a1,
            "branch_a2": branch_a2,
            "branch_b1": branch_b1,
            "class_a1": class_a1,
            "class_a2": class_a2,
            "class_b1": class_b1,
            "subject_a": subject_a,
            "subject_b": subject_b,
            "student_a1": student_a1,
            "student_a2": student_a2,
            "student_b1": student_b1,
            "admin": admin,
            "teacher_user": teacher_user,
            "unrelated_user": unrelated_user,
            "tenant_b_admin": tenant_b_admin,
        }


def test_list_does_not_expose_foreign_tenant_or_branch(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    with app.app_context():
        own = _attendance(
            g["student_a1"],
            g["class_a1"],
            g["admin"],
            subject=g["subject_a"],
        )

        foreign_branch = _attendance(
            g["student_a2"],
            g["class_a2"],
            g["admin"],
            subject=g["subject_a"],
        )

        foreign_tenant = _attendance(
            g["student_b1"],
            g["class_b1"],
            g["tenant_b_admin"],
            subject=g["subject_b"],
        )

        db.session.commit()

        own_id = own.id
        foreign_branch_id = foreign_branch.id
        foreign_tenant_id = foreign_tenant.id

    response = client.get(
        "/api/v1/attendances",
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200

    body = response.get_json()

    returned_ids = {
        item["id"]
        for item in body["attendances"]
    }

    assert own_id in returned_ids
    assert foreign_branch_id not in returned_ids
    assert foreign_tenant_id not in returned_ids


@pytest.mark.parametrize(
    "target_key",
    [
        "foreign_branch",
        "foreign_tenant",
    ],
)
def test_get_by_id_cannot_cross_scope(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
    target_key,
):
    g = crud_graph

    with app.app_context():
        rows = {
            "foreign_branch": _attendance(
                g["student_a2"],
                g["class_a2"],
                g["admin"],
                subject=g["subject_a"],
            ),
            "foreign_tenant": _attendance(
                g["student_b1"],
                g["class_b1"],
                g["tenant_b_admin"],
                subject=g["subject_b"],
            ),
        }

        db.session.commit()
        attendance_id = rows[target_key].id

    response = client.get(
        f"/api/v1/attendances/{attendance_id}",
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in {403, 404}


@pytest.mark.parametrize(
    "parent_case",
    [
        "foreign_tenant",
        "foreign_branch",
        "foreign_subject",
    ],
)
def test_create_rejects_foreign_parent_scope(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
    parent_case,
):
    g = crud_graph

    payload = {
        "student_id": g["student_a1"].id,
        "class_id": g["class_a1"].id,
        "subject_id": g["subject_a"].id,
        "date": TODAY.isoformat(),
        "status": "present",
    }

    if parent_case == "foreign_tenant":
        payload["student_id"] = g["student_b1"].id
        payload["class_id"] = g["class_b1"].id

    elif parent_case == "foreign_branch":
        payload["student_id"] = g["student_a2"].id
        payload["class_id"] = g["class_a2"].id

    elif parent_case == "foreign_subject":
        payload["subject_id"] = g["subject_b"].id

    with app.app_context():
        before = len(_attendance_rows())

    response = client.post(
        "/api/v1/attendances",
        json=payload,
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in {400, 403, 404}

    with app.app_context():
        after = len(_attendance_rows())

    assert after == before


def test_create_recorded_by_is_server_authoritative(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    payload = {
        "student_id": g["student_a1"].id,
        "class_id": g["class_a1"].id,
        "subject_id": g["subject_a"].id,
        "date": TODAY.isoformat(),
        "status": "present",

        # Deliberately malicious.
        "recorded_by": g["unrelated_user"].id,
    }

    response = client.post(
        "/api/v1/attendances",
        json=payload,
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 201

    with app.app_context():
        row = (
            Attendance.query
            .without_tenant_filter()
            .filter(
                Attendance.student_id
                == g["student_a1"].id,
                Attendance.class_id
                == g["class_a1"].id,
                Attendance.date
                == TODAY,
            )
            .one()
        )

        assert row.recorded_by == g["admin"].id
        assert (
            row.recorded_by
            != g["unrelated_user"].id
        )


@pytest.mark.parametrize(
    "target_key",
    [
        "foreign_branch",
        "foreign_tenant",
    ],
)
def test_update_cannot_cross_scope(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
    target_key,
):
    g = crud_graph

    with app.app_context():
        rows = {
            "foreign_branch": _attendance(
                g["student_a2"],
                g["class_a2"],
                g["admin"],
                subject=g["subject_a"],
                status="absent",
            ),
            "foreign_tenant": _attendance(
                g["student_b1"],
                g["class_b1"],
                g["tenant_b_admin"],
                subject=g["subject_b"],
                status="absent",
            ),
        }

        db.session.commit()

        target = rows[target_key]
        attendance_id = target.id

    response = client.put(
        f"/api/v1/attendances/{attendance_id}",
        json={
            "status": "present",
            "recorded_by": g["unrelated_user"].id,
        },
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in {403, 404}

    with app.app_context():
        row = (
            Attendance.query
            .without_tenant_filter()
            .filter(
                Attendance.id == attendance_id
            )
            .one()
        )

        assert row.status == "absent"


def test_update_recorded_by_is_server_authoritative(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    with app.app_context():
        row = _attendance(
            g["student_a1"],
            g["class_a1"],
            g["admin"],
            subject=g["subject_a"],
            status="absent",
        )

        db.session.commit()
        attendance_id = row.id

    response = client.put(
        f"/api/v1/attendances/{attendance_id}",
        json={
            "status": "present",
            "recorded_by": g["unrelated_user"].id,
        },
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200

    with app.app_context():
        row = (
            Attendance.query
            .without_tenant_filter()
            .filter(
                Attendance.id == attendance_id
            )
            .one()
        )

        assert row.status == "present"
        assert row.recorded_by == g["admin"].id


@pytest.mark.parametrize(
    "target_key",
    [
        "foreign_branch",
        "foreign_tenant",
    ],
)
def test_delete_cannot_cross_scope(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
    target_key,
):
    g = crud_graph

    with app.app_context():
        rows = {
            "foreign_branch": _attendance(
                g["student_a2"],
                g["class_a2"],
                g["admin"],
                subject=g["subject_a"],
            ),
            "foreign_tenant": _attendance(
                g["student_b1"],
                g["class_b1"],
                g["tenant_b_admin"],
                subject=g["subject_b"],
            ),
        }

        db.session.commit()

        attendance_id = rows[target_key].id

    response = client.delete(
        f"/api/v1/attendances/{attendance_id}",
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in {403, 404}

    with app.app_context():
        row = (
            Attendance.query
            .without_tenant_filter()
            .filter(
                Attendance.id == attendance_id
            )
            .first()
        )

        assert row is not None


def test_stats_exclude_foreign_tenant_and_branch(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    with app.app_context():
        _attendance(
            g["student_a1"],
            g["class_a1"],
            g["admin"],
            subject=g["subject_a"],
            status="present",
        )

        # These must never affect A/A1 statistics.
        _attendance(
            g["student_a2"],
            g["class_a2"],
            g["admin"],
            subject=g["subject_a"],
            status="absent",
        )

        _attendance(
            g["student_b1"],
            g["class_b1"],
            g["tenant_b_admin"],
            subject=g["subject_b"],
            status="absent",
        )

        db.session.commit()

    response = client.get(
        "/api/v1/attendances/stats",
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True

    stats = body["stats"]

    # Active tenant/branch A1 contains exactly one
    # attendance and it is present. Foreign branch and
    # foreign tenant rows must not contribute.
    assert stats["total"] == 1
    assert stats["present"] == 1
    assert stats["absent"] == 0
    assert stats["late"] == 0
    assert stats["excused"] == 0


def test_trends_exclude_foreign_tenant_and_branch(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    with app.app_context():
        _attendance(
            g["student_a1"],
            g["class_a1"],
            g["admin"],
            subject=g["subject_a"],
            status="present",
            day=TODAY - timedelta(days=1),
        )

        for student, class_, actor, subject in [
            (
                g["student_a2"],
                g["class_a2"],
                g["admin"],
                g["subject_a"],
            ),
            (
                g["student_b1"],
                g["class_b1"],
                g["tenant_b_admin"],
                g["subject_b"],
            ),
        ]:
            _attendance(
                student,
                class_,
                actor,
                subject=subject,
                status="absent",
                day=TODAY - timedelta(days=1),
            )

        db.session.commit()

    response = client.get(
        "/api/v1/attendances/analytics/trends",
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True

    trends = body["trends"]

    day_key = (
        TODAY - timedelta(days=1)
    ).isoformat()

    assert day_key in trends

    day = trends[day_key]

    # Active tenant/branch A1 contributes exactly one
    # present row. Foreign branch and tenant rows must
    # not contribute to the aggregate.
    assert day["total"] == 1
    assert day["present"] == 1
    assert day["absent"] == 0
    assert day["late"] == 0
    assert day["excused"] == 0


def test_global_admin_role_cannot_override_tenant_membership(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    """
    Global User.role=admin must not convert an authoritative
    tenant student membership into branch-wide attendance
    authority.
    """
    g = crud_graph

    with app.app_context():
        g["unrelated_user"].role = "admin"
        db.session.commit()

    response = client.get(
        "/api/v1/attendances",
        headers=_headers(
            tracked_access_token_factory,
            g["unrelated_user"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    # This fixture user has no Student profile. Its tenant
    # membership remains student despite the global role
    # mutation, so resource authorization must fail closed.
    assert response.status_code == 403

# === R12C4B EXTENDED ADVERSARIAL SECURITY MATRIX ===


def _r12c4b_teacher_for_user(
    g,
    user,
):
    from app.models.teacher import Teacher

    query = (
        Teacher.query
        .without_tenant_filter()
        .filter(
            Teacher.user_id == user.id,
            Teacher.tenant_id == g["tenant_a"].id,
            Teacher.branch_id == g["branch_a1"].id,
        )
    )

    return query.first()


def _r12c4b_ensure_teacher_profile(
    g,
    user,
):
    """
    Establish the exact teacher identity used by
    Attendance authorization:

        User.id -> Teacher.user_id
        Teacher.tenant_id -> active tenant
        Teacher.branch_id -> active branch

    The HTTP/JWT actor remains User.id.
    """
    from app.models.teacher import Teacher

    teacher = _r12c4b_teacher_for_user(
        g,
        user,
    )

    if teacher is not None:
        return teacher

    suffix = uuid4().hex[:7].upper()

    teacher = Teacher(
        user_id=user.id,
        tenant_id=g["tenant_a"].id,
        branch_id=g["branch_a1"].id,
        employee_id=f"R12-{suffix}",
        first_name="R12C4B",
        last_name="Teacher",
        status="active",
    )

    db.session.add(teacher)
    db.session.flush()

    return teacher


def _r12c4b_assign_teacher_to_class(
    g,
    user,
    class_obj,
):
    """
    Certified identity contract:

        Class.teacher_id -> Teacher.id

    ClassTeacherMapping.teacher_id remains a separate
    User.id contract and is intentionally untouched here.
    """
    teacher = _r12c4b_ensure_teacher_profile(
        g,
        user,
    )

    class_obj.teacher_id = teacher.id

    db.session.flush()

    return teacher


def _r12c4b_make_attendance(
    g,
    student,
    class_obj,
    *,
    recorded_by=None,
    subject=None,
    status="present",
    day=None,
):
    """
    Thin adapter over the established helper.

    _attendance contract:

        student,
        class_,
        recorded_by,
        *,
        branch_id=None,
        subject=None,
        status="present",
        day=None
    """
    actor = recorded_by or g["admin"]

    return _attendance(
        student,
        class_obj,
        actor,
        subject=subject,
        status=status,
        day=day,
    )


def test_r12c4b_teacher_can_get_assigned_class_attendance(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    with app.app_context():
        _r12c4b_assign_teacher_to_class(
            g,
            g["teacher_user"],
            g["class_a1"],
        )

        row = _r12c4b_make_attendance(
            g,
            g["student_a1"],
            g["class_a1"],
            recorded_by=g["admin"],
            subject=g["subject_a"],
        )

        db.session.commit()
        attendance_id = row.id

    response = client.get(
        f"/api/v1/attendances/{attendance_id}",
        headers=_headers(
            tracked_access_token_factory,
            g["teacher_user"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200, (
        response.get_json()
    )


def test_r12c4b_teacher_cannot_get_unassigned_class_attendance(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    with app.app_context():
        # A Teacher profile must exist so this proves
        # assignment denial rather than missing-profile denial.
        _r12c4b_ensure_teacher_profile(
            g,
            g["teacher_user"],
        )

        row = _r12c4b_make_attendance(
            g,
            g["student_a1"],
            g["class_a1"],
            recorded_by=g["admin"],
            subject=g["subject_a"],
        )

        db.session.commit()
        attendance_id = row.id

    response = client.get(
        f"/api/v1/attendances/{attendance_id}",
        headers=_headers(
            tracked_access_token_factory,
            g["teacher_user"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 403, (
        response.get_json()
    )


def test_r12c4b_teacher_can_update_assigned_class_attendance(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    from app.models.attendance import Attendance

    g = crud_graph

    with app.app_context():
        _r12c4b_assign_teacher_to_class(
            g,
            g["teacher_user"],
            g["class_a1"],
        )

        row = _r12c4b_make_attendance(
            g,
            g["student_a1"],
            g["class_a1"],
            recorded_by=g["admin"],
            subject=g["subject_a"],
            status="absent",
        )

        db.session.commit()
        attendance_id = row.id
        teacher_user_id = g["teacher_user"].id

    response = client.put(
        f"/api/v1/attendances/{attendance_id}",
        json={
            "status": "present",

            # Deliberate actor spoof attempt.
            "recorded_by": g["unrelated_user"].id,
        },
        headers=_headers(
            tracked_access_token_factory,
            g["teacher_user"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200, (
        response.get_json()
    )

    with app.app_context():
        row = db.session.get(
            Attendance,
            attendance_id,
        )

        assert row is not None
        assert row.status == "present"

        # recorded_by must be the authenticated User.id,
        # never the client-supplied spoof value.
        assert row.recorded_by == teacher_user_id


def test_r12c4b_teacher_cannot_update_unassigned_class_attendance(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    from app.models.attendance import Attendance

    g = crud_graph

    with app.app_context():
        _r12c4b_ensure_teacher_profile(
            g,
            g["teacher_user"],
        )

        row = _r12c4b_make_attendance(
            g,
            g["student_a1"],
            g["class_a1"],
            recorded_by=g["admin"],
            subject=g["subject_a"],
            status="absent",
        )

        db.session.commit()
        attendance_id = row.id

    response = client.put(
        f"/api/v1/attendances/{attendance_id}",
        json={
            "status": "present",
        },
        headers=_headers(
            tracked_access_token_factory,
            g["teacher_user"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 403, (
        response.get_json()
    )

    with app.app_context():
        row = db.session.get(
            Attendance,
            attendance_id,
        )

        assert row is not None
        assert row.status == "absent"


def test_r12c4b_inactive_membership_cannot_use_global_admin(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    from app.models.tenant import TenantMembership

    g = crud_graph

    with app.app_context():
        attacker = g["unrelated_user"]

        # Deliberate global-role escalation attempt.
        attacker.role = "admin"

        membership = (
            TenantMembership.query
            .filter_by(
                user_id=attacker.id,
                tenant_id=g["tenant_a"].id,
            )
            .one()
        )

        membership.status = "inactive"

        db.session.commit()

    response = client.get(
        "/api/v1/attendances",
        headers=_headers(
            tracked_access_token_factory,
            g["unrelated_user"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 403, (
        response.get_json()
    )


def test_r12c4b_untracked_access_jwt_fails_closed(
    app,
    client,
    crud_graph,
):
    from flask_jwt_extended import create_access_token

    g = crud_graph

    with app.app_context():
        token = create_access_token(
            identity=str(g["admin"].id)
        )

    response = client.get(
        "/api/v1/attendances",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(g["tenant_a"].id),
            "X-Branch-ID": str(g["branch_a1"].id),
        },
    )

    assert response.status_code in {
        401,
        403,
    }, response.get_json()


def test_r12c4b_admin_can_get_own_scope_attendance(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    g = crud_graph

    with app.app_context():
        row = _r12c4b_make_attendance(
            g,
            g["student_a1"],
            g["class_a1"],
            recorded_by=g["admin"],
            subject=g["subject_a"],
        )

        db.session.commit()
        attendance_id = row.id

    response = client.get(
        f"/api/v1/attendances/{attendance_id}",
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200, (
        response.get_json()
    )

    body = response.get_json()

    assert body["success"] is True

    payload = (
        body.get("attendance")
        or body.get("data")
    )

    assert payload is not None
    assert payload["id"] == attendance_id


def test_r12c4b_admin_can_delete_own_scope_attendance(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    from app.models.attendance import Attendance

    g = crud_graph

    with app.app_context():
        row = _r12c4b_make_attendance(
            g,
            g["student_a1"],
            g["class_a1"],
            recorded_by=g["admin"],
            subject=g["subject_a"],
        )

        db.session.commit()
        attendance_id = row.id

    response = client.delete(
        f"/api/v1/attendances/{attendance_id}",
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in {
        200,
        204,
    }, response.get_json()

    with app.app_context():
        assert (
            db.session.get(
                Attendance,
                attendance_id,
            )
            is None
        )


def test_r12c4b_at_risk_is_tenant_and_branch_isolated(
    app,
    client,
    tracked_access_token_factory,
    crud_graph,
):
    """
    Local at-risk student must remain visible.

    Foreign-branch and foreign-tenant students must not
    enter the active tenant/branch projection.
    """
    g = crud_graph

    with app.app_context():

        # Local student: 25% attendance across four days.
        for offset, status in [
            (0, "present"),
            (1, "absent"),
            (2, "absent"),
            (3, "absent"),
        ]:
            _attendance(
                g["student_a1"],
                g["class_a1"],
                g["admin"],
                subject=g["subject_a"],
                status=status,
                day=TODAY - timedelta(days=offset),
            )

        # Foreign branch.
        _attendance(
            g["student_a2"],
            g["class_a2"],
            g["admin"],
            subject=g["subject_a"],
            status="absent",
            day=TODAY,
        )

        # Foreign tenant.
        _attendance(
            g["student_b1"],
            g["class_b1"],
            g["tenant_b_admin"],
            subject=g["subject_b"],
            status="absent",
            day=TODAY,
        )

        db.session.commit()

        local_id = g["student_a1"].id
        foreign_branch_id = g["student_a2"].id
        foreign_tenant_id = g["student_b1"].id

    response = client.get(
        (
            "/api/v1/attendances/"
            "analytics/at-risk?threshold=80"
        ),
        headers=_headers(
            tracked_access_token_factory,
            g["admin"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200, (
        response.get_json()
    )

    body = response.get_json()

    assert body["success"] is True

    students = (
        body.get("students")
        or body.get("at_risk_students")
        or body.get("data")
        or []
    )

    returned_ids = {
        item["student_id"]
        for item in students
        if isinstance(item, dict)
        and "student_id" in item
    }

    assert local_id in returned_ids
    assert foreign_branch_id not in returned_ids
    assert foreign_tenant_id not in returned_ids
