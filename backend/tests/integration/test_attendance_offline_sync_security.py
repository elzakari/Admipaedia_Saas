from datetime import date
import uuid

import pytest

from app.extensions import db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.tenant import (
    Branch,
    Tenant,
    TenantMembership,
)
from app.models.user import User
from tests.conftest import _create_tracked_test_access_token


SYNC_URL = "/api/v1/attendances/sync"
SYNC_DATE = date(2026, 9, 15)


def _token(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _tenant(prefix):
    suffix = uuid.uuid4().hex[:8]

    tenant = Tenant(
        name=f"{prefix} {suffix}",
        slug=f"{prefix.lower().replace(' ', '-')}-{suffix}",
        country_code="GH",
        schema_name=f"t_{suffix}",
        status="active",
    )

    db.session.add(tenant)
    db.session.flush()

    return tenant


def _branch(tenant, prefix):
    suffix = uuid.uuid4().hex[:6]

    branch = Branch(
        tenant_id=tenant.id,
        name=f"{prefix} {suffix}",
        code=f"B{suffix[:5]}",
        is_active=True,
    )

    db.session.add(branch)
    db.session.flush()

    return branch


def _user(prefix, global_role="teacher"):
    suffix = uuid.uuid4().hex[:8]

    user = User(
        username=f"{prefix}_{suffix}",
        email=f"{prefix}_{suffix}@example.com",
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
    membership = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role=role,
        status=status,
    )

    db.session.add(membership)
    db.session.flush()

    return membership


def _teacher(
    user,
    tenant,
    branch,
    prefix="EMP",
):
    suffix = uuid.uuid4().hex[:7].upper()

    teacher = Teacher(
        user_id=user.id,
        tenant_id=tenant.id,
        branch_id=branch.id,
        employee_id=f"{prefix}-{suffix}",
        first_name="Offline",
        last_name="Teacher",
        status="active",
    )

    db.session.add(teacher)
    db.session.flush()

    return teacher


def _class(
    tenant,
    branch,
    teacher_id=None,
    prefix="Class",
):
    suffix = uuid.uuid4().hex[:6]

    class_ = Class(
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=f"{prefix} {suffix}",
        code=f"C-{suffix}",
        grade_level="Primary 1",
        academic_year="2026/2027",
        teacher_id=teacher_id,
        status="active",
    )

    db.session.add(class_)
    db.session.flush()

    return class_


def _student(
    tenant,
    branch,
    class_,
    prefix="Student",
):
    suffix = uuid.uuid4().hex[:8]

    user = _user(
        f"{prefix}_user",
        global_role="student",
    )

    student = Student(
        tenant_id=tenant.id,
        branch_id=branch.id,
        class_id=class_.id,
        user_id=user.id,
        admission_number=f"ADM-{suffix}",
        first_name="Offline",
        last_name=f"Student{suffix}",
        date_of_birth=date(2012, 1, 15),
        gender="male",
        status="active",
    )

    db.session.add(student)
    db.session.flush()

    return student


def _subject(tenant, prefix="SUB"):
    suffix = uuid.uuid4().hex[:6].upper()

    subject = Subject(
        tenant_id=tenant.id,
        name=f"{prefix} {suffix}",
        code=f"{prefix[:4]}-{suffix}",
        credit_hours=1,
        is_active=True,
    )

    db.session.add(subject)
    db.session.flush()

    return subject


def _headers(user, tenant, branch):
    jwt = _create_tracked_test_access_token(
        user.id
    )

    return {
        "Authorization": f"Bearer {jwt}",
        "X-Tenant-ID": str(tenant.id),
        "X-Branch-ID": str(branch.id),
    }


def _sync_row(
    class_,
    student,
    subject=None,
    status="present",
    **extra,
):
    row = {
        "student_id": student.id,
        "class_id": class_.id,
        "date": SYNC_DATE.isoformat(),
        "status": status,
        "remarks": "R11B.4D2",
    }

    if subject is not None:
        row["subject_id"] = subject.id

    row.update(extra)

    return row


def _post(
    client,
    user,
    tenant,
    branch,
    payload,
):
    return client.post(
        SYNC_URL,
        json=payload,
        headers=_headers(
            user,
            tenant,
            branch,
        ),
    )


@pytest.fixture
def sync_graph(app, rbac_defaults):
    """
    Two tenants and multiple branches with authoritative
    attendance resources.

    rbac_defaults is intentionally required: effective permissions
    must come from the real tenant RBAC templates.
    """
    with app.app_context():
        tenant_a = _tenant("Offline Tenant A")
        tenant_b = _tenant("Offline Tenant B")

        branch_a1 = _branch(
            tenant_a,
            "Campus A1",
        )
        branch_a2 = _branch(
            tenant_a,
            "Campus A2",
        )
        branch_b1 = _branch(
            tenant_b,
            "Campus B1",
        )

        admin = _user(
            "offline_admin",
            global_role="admin",
        )
        _membership(
            admin,
            tenant_a,
            "admin",
        )

        teacher_user = _user(
            "offline_teacher",
            global_role="teacher",
        )
        _membership(
            teacher_user,
            tenant_a,
            "teacher",
        )

        teacher = _teacher(
            teacher_user,
            tenant_a,
            branch_a1,
        )

        unrelated_user = _user(
            "offline_unrelated_teacher",
            global_role="teacher",
        )
        _membership(
            unrelated_user,
            tenant_a,
            "teacher",
        )

        unrelated_teacher = _teacher(
            unrelated_user,
            tenant_a,
            branch_a1,
            prefix="UNREL",
        )

        class_a1 = _class(
            tenant_a,
            branch_a1,
            teacher_id=teacher.id,
            prefix="A1",
        )

        class_a2 = _class(
            tenant_a,
            branch_a2,
            prefix="A2",
        )

        class_b1 = _class(
            tenant_b,
            branch_b1,
            prefix="B1",
        )

        student_a1 = _student(
            tenant_a,
            branch_a1,
            class_a1,
            prefix="A1",
        )

        student_a2 = _student(
            tenant_a,
            branch_a2,
            class_a2,
            prefix="A2",
        )

        student_b1 = _student(
            tenant_b,
            branch_b1,
            class_b1,
            prefix="B1",
        )

        subject_a = _subject(
            tenant_a,
            "SA",
        )

        subject_b = _subject(
            tenant_b,
            "SB",
        )

        db.session.commit()

        yield {
            "tenant_a": tenant_a,
            "tenant_b": tenant_b,
            "branch_a1": branch_a1,
            "branch_a2": branch_a2,
            "branch_b1": branch_b1,
            "admin": admin,
            "teacher_user": teacher_user,
            "teacher": teacher,
            "unrelated_user": unrelated_user,
            "unrelated_teacher": unrelated_teacher,
            "class_a1": class_a1,
            "class_a2": class_a2,
            "class_b1": class_b1,
            "student_a1": student_a1,
            "student_a2": student_a2,
            "student_b1": student_b1,
            "subject_a": subject_a,
            "subject_b": subject_b,
        }


def _attendance_identity(
    student_id,
    class_id,
    attendance_date=SYNC_DATE,
):
    return (
        Attendance.query
        .without_tenant_filter()
        .filter(
            Attendance.student_id == student_id,
            Attendance.class_id == class_id,
            Attendance.date == attendance_date,
        )
        .all()
    )


def test_admin_can_sync_valid_attendance(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_a"],
            )
        ],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["received"] == 1
    assert body["result"]["synced"] == 1
    assert body["result"]["errors"] == []

    with app.app_context():
        rows = _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        )

        assert len(rows) == 1
        assert rows[0].recorded_by == g["admin"].id
        assert rows[0].branch_id == g["branch_a1"].id


def test_assigned_teacher_can_sync_own_class(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["teacher_user"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_a"],
            )
        ],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["synced"] == 1

    with app.app_context():
        rows = _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        )

        assert len(rows) == 1
        assert rows[0].recorded_by == g["teacher_user"].id


def test_unrelated_teacher_cannot_sync_class(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["unrelated_user"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_a"],
            )
        ],
    )

    assert response.status_code == 403

    with app.app_context():
        assert _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        ) == []


def test_teacher_foreign_branch_class_is_denied(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["teacher_user"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a2"],
                g["student_a2"],
            )
        ],
    )

    assert response.status_code == 403

    with app.app_context():
        assert _attendance_identity(
            g["student_a2"].id,
            g["class_a2"].id,
        ) == []


def test_teacher_foreign_tenant_class_is_denied(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["teacher_user"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_b1"],
                g["student_b1"],
            )
        ],
    )

    assert response.status_code == 403

    with app.app_context():
        assert _attendance_identity(
            g["student_b1"].id,
            g["class_b1"].id,
        ) == []


def test_admin_foreign_tenant_student_is_not_synced(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    row = _sync_row(
        g["class_a1"],
        g["student_b1"],
        g["subject_a"],
    )

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [row],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["received"] == 1
    assert body["result"]["synced"] == 0
    assert len(body["result"]["errors"]) == 1
    assert (
        body["result"]["errors"][0]["student_id"]
        == g["student_b1"].id
    )

    with app.app_context():
        assert _attendance_identity(
            g["student_b1"].id,
            g["class_a1"].id,
        ) == []


def test_admin_foreign_branch_student_is_not_synced(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    row = _sync_row(
        g["class_a1"],
        g["student_a2"],
        g["subject_a"],
    )

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [row],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["synced"] == 0
    assert len(body["result"]["errors"]) == 1

    with app.app_context():
        assert _attendance_identity(
            g["student_a2"].id,
            g["class_a1"].id,
        ) == []


def test_admin_foreign_subject_is_rejected(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_b"],
            )
        ],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["synced"] == 0
    assert len(body["result"]["errors"]) == 1
    assert (
        "Subject not found"
        in body["result"]["errors"][0]["error"]
    )

    with app.app_context():
        assert _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        ) == []


def test_client_recorded_by_cannot_spoof_actor(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    row = _sync_row(
        g["class_a1"],
        g["student_a1"],
        g["subject_a"],

        # Deliberately malicious client field.
        recorded_by=g["unrelated_user"].id,
    )

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [row],
    )

    assert response.status_code == 200
    assert response.get_json()["result"]["synced"] == 1

    with app.app_context():
        rows = _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        )

        assert len(rows) == 1
        assert rows[0].recorded_by == g["admin"].id
        assert rows[0].recorded_by != g["unrelated_user"].id


def test_client_branch_id_cannot_override_class_branch(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    row = _sync_row(
        g["class_a1"],
        g["student_a1"],
        g["subject_a"],

        # Deliberately malicious client field.
        branch_id=str(g["branch_a2"].id),
    )

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [row],
    )

    assert response.status_code == 200
    assert response.get_json()["result"]["synced"] == 1

    with app.app_context():
        rows = _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        )

        assert len(rows) == 1
        assert rows[0].branch_id == g["branch_a1"].id
        assert rows[0].branch_id != g["branch_a2"].id


def test_global_admin_role_cannot_override_tenant_teacher_scope(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    # TenantMembership remains authoritative.
    # Only mutate the legacy/global role.
    g["unrelated_user"].role = "admin"
    db.session.commit()

    response = _post(
        client,
        g["unrelated_user"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_a"],
            )
        ],
    )

    assert response.status_code == 403

    with app.app_context():
        assert _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        ) == []


def test_inactive_membership_cannot_use_global_admin_role(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    attacker = _user(
        "offline_inactive",
        global_role="admin",
    )

    _membership(
        attacker,
        g["tenant_a"],
        "admin",
        status="inactive",
    )

    db.session.commit()

    response = _post(
        client,
        attacker,
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_a"],
            )
        ],
    )

    assert response.status_code in {
        401,
        403,
    }

    with app.app_context():
        assert _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        ) == []


def test_mixed_batch_preserves_partial_sync_contract(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    valid = _sync_row(
        g["class_a1"],
        g["student_a1"],
        g["subject_a"],
    )

    invalid = _sync_row(
        g["class_a1"],
        g["student_b1"],
        g["subject_a"],
        status="absent",
    )

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [
            valid,
            invalid,
        ],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["received"] == 2
    assert body["result"]["synced"] == 1
    assert len(body["result"]["errors"]) == 1

    with app.app_context():
        valid_rows = _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        )

        invalid_rows = _attendance_identity(
            g["student_b1"].id,
            g["class_a1"].id,
        )

        assert len(valid_rows) == 1
        assert invalid_rows == []


def test_historical_null_branch_identity_is_repaired_not_duplicated(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    with app.app_context():
        historical = Attendance(
            student_id=g["student_a1"].id,
            class_id=g["class_a1"].id,
            subject_id=None,
            branch_id=None,
            date=SYNC_DATE,
            status="absent",
            recorded_by=g["admin"].id,
            remarks="historical-null-branch",
        )

        db.session.add(historical)
        db.session.commit()

        historical_id = historical.id

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_a"],
                status="present",
            )
        ],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["synced"] == 1

    with app.app_context():
        rows = _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        )

        assert len(rows) == 1

        row = rows[0]

        assert row.id == historical_id
        assert row.branch_id == g["branch_a1"].id
        assert row.status == "present"
        assert row.subject_id == g["subject_a"].id
        assert row.recorded_by == g["admin"].id


def test_foreign_non_null_branch_identity_conflict_fails_closed(
    app,
    client,
    sync_graph,
):
    g = sync_graph

    with app.app_context():
        conflicting = Attendance(
            student_id=g["student_a1"].id,
            class_id=g["class_a1"].id,

            # Deliberately inconsistent historical row:
            # identity belongs to A1 parents but row says A2.
            branch_id=g["branch_a2"].id,

            date=SYNC_DATE,
            status="absent",
            recorded_by=g["admin"].id,
            remarks="foreign-branch-conflict",
        )

        db.session.add(conflicting)
        db.session.commit()

        conflicting_id = conflicting.id

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        [
            _sync_row(
                g["class_a1"],
                g["student_a1"],
                g["subject_a"],
                status="present",
            )
        ],
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert body["result"]["synced"] == 0
    assert len(body["result"]["errors"]) == 1

    assert (
        "branch conflicts"
        in body["result"]["errors"][0]["error"]
    )

    with app.app_context():
        rows = _attendance_identity(
            g["student_a1"].id,
            g["class_a1"].id,
        )

        assert len(rows) == 1

        row = rows[0]

        assert row.id == conflicting_id
        assert row.branch_id == g["branch_a2"].id
        assert row.status == "absent"


def test_empty_teacher_batch_fails_closed(
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["teacher_user"],
        g["tenant_a"],
        g["branch_a1"],
        [],
    )

    assert response.status_code == 403


def test_non_list_payload_is_rejected(
    client,
    sync_graph,
):
    g = sync_graph

    response = _post(
        client,
        g["admin"],
        g["tenant_a"],
        g["branch_a1"],
        {
            "student_id": g["student_a1"].id,
        },
    )

    assert response.status_code == 400

    body = response.get_json()

    assert body["success"] is False
