"""
V28-R13H.4

Authenticated request-pipeline security contract for the activated
enhanced exam surface.

These tests deliberately exercise the real Flask HTTP pipeline:
JWT verification -> tenant/branch resolution -> tenant-effective RBAC
-> enhanced exam resource authorization.

No TESTING authentication bypass is used.
"""

from datetime import datetime, timedelta, timezone

import pytest
from flask_jwt_extended import create_access_token, decode_token

from app.extensions import db
from app.models.class_ import Class, ClassTeacherMapping
from app.models.exam import Exam
from app.models.parent import Parent
from app.models.session_token import SessionToken
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.tenant import Branch, Tenant, TenantMembership
from app.models.user import User
from app.services.rbac_service import RBACService


pytestmark = pytest.mark.integration


def _columns(model):
    return {
        column.name: column
        for column in model.__table__.columns
    }


def _set_if_present(values, model, **candidates):
    columns = _columns(model)

    for key, value in candidates.items():
        if key in columns:
            values[key] = value

    return values


def _required_defaults(model, seed):
    values = {}

    for name, column in _columns(model).items():
        if (
            column.primary_key
            or column.nullable
            or column.default is not None
            or column.server_default is not None
            or name in values
        ):
            continue

        python_type = None

        try:
            python_type = column.type.python_type
        except Exception:
            pass

        if python_type is str:
            values[name] = f"{seed}-{name}"[:40]
        elif python_type is int:
            values[name] = 1
        elif python_type is bool:
            values[name] = True
        elif python_type is datetime:
            values[name] = datetime.now(timezone.utc).replace(
                tzinfo=None
            )

    return values


def _make(model, seed, **values):
    payload = _required_defaults(model, seed)
    payload.update(values)

    obj = model(**payload)
    db.session.add(obj)
    db.session.flush()

    return obj


def _tenant(seed):
    values = {}

    _set_if_present(
        values,
        Tenant,
        name=f"R13H Tenant {seed}",
        slug=f"r13h-{seed}",
        code=f"R13H-{seed}",
        status="active",
        is_active=True,
    )

    return _make(Tenant, f"tenant-{seed}", **values)


def _branch(tenant, seed):
    values = {}

    _set_if_present(
        values,
        Branch,
        tenant_id=tenant.id,
        name=f"R13H Branch {seed}",
        code=f"R13HB-{seed}",
        status="active",
        is_active=True,
        is_default=False,
    )

    return _make(Branch, f"branch-{seed}", **values)


def _user(seed, global_role="admin"):
    values = {}

    _set_if_present(
        values,
        User,
        username=f"r13h-{seed}",
        email=f"r13h-{seed}@example.test",
        first_name="R13H",
        last_name=seed,
        role=global_role,
        global_role=global_role,
        status="active",
        is_active=True,
        password_hash="test",
    )

    return _make(User, f"user-{seed}", **values)


def _membership(user, tenant, branch, role):
    values = {}

    _set_if_present(
        values,
        TenantMembership,
        user_id=user.id,
        tenant_id=tenant.id,
        branch_id=branch.id,
        role=role,
        status="active",
        is_active=True,
    )

    return _make(
        TenantMembership,
        f"membership-{user.id}-{tenant.id}",
        **values,
    )


def _class(tenant, branch, seed):
    values = {}

    _set_if_present(
        values,
        Class,
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=f"R13H Class {seed}",
        class_name=f"R13H Class {seed}",
        code=f"R13HC-{seed}",
        grade_level="R13H",
        academic_year="2026-2027",
        status="active",
        is_active=True,
    )

    return _make(Class, f"class-{seed}", **values)


def _subject(tenant, seed):
    values = {}

    _set_if_present(
        values,
        Subject,
        tenant_id=tenant.id,
        name=f"R13H Subject {seed}",
        subject_name=f"R13H Subject {seed}",
        code=f"R13HS-{seed}",
        status="active",
        is_active=True,
    )

    return _make(Subject, f"subject-{seed}", **values)


def _exam(cls, subject, creator, seed):
    exam = Exam(
        title=f"R13H Exam {seed}",
        description="Authenticated enhanced exam pipeline test",
        exam_date=(
            datetime.now(timezone.utc) + timedelta(days=7)
        ),
        duration=60,
        total_marks=100,
        passing_marks=50,
        class_id=cls.id,
        subject_id=subject.id,
        created_by=creator.id,
        status="scheduled",
    )

    if hasattr(Exam, "assessment_type"):
        exam.assessment_type = "exam"

    db.session.add(exam)
    db.session.flush()

    return exam


def _teacher_profile(user, tenant, branch, seed):
    values = {}

    _set_if_present(
        values,
        Teacher,
        user_id=user.id,
        tenant_id=tenant.id,
        branch_id=branch.id,
        employee_id=f"R13HT-{seed}",
        first_name="R13H",
        last_name="Teacher",
        email=user.email,
        status="active",
        is_active=True,
    )

    return _make(Teacher, f"teacher-{seed}", **values)


def _student_profile(
    user,
    tenant,
    branch,
    cls,
    seed,
    parent=None,
):
    values = {}

    _set_if_present(
        values,
        Student,
        tenant_id=tenant.id,
        branch_id=branch.id,
        user_id=user.id,
        admission_number=f"R13HS-{seed}",
        first_name="R13H",
        last_name="Student",
        date_of_birth=datetime(2010, 1, 1).date(),
        gender="male",
        email=user.email,
        class_id=cls.id,
        parent_id=parent.id if parent else None,
        status="active",
        is_active=True,
    )

    return _make(Student, f"student-{seed}", **values)


def _parent_profile(user, tenant, seed):
    values = {}

    _set_if_present(
        values,
        Parent,
        tenant_id=tenant.id,
        user_id=user.id,
        relationship="Parent",
        status="active",
        is_active=True,
    )

    return _make(Parent, f"parent-{seed}", **values)


def _headers(user, tenant, branch=None):
    token = create_access_token(identity=user.id)
    payload = decode_token(token)

    expires_at = datetime.fromtimestamp(
        payload["exp"],
        tz=timezone.utc,
    ).replace(tzinfo=None)

    session_token = SessionToken(
        jti=str(payload["jti"]),
        user_id=user.id,
        token_type="access",
        expires_at=expires_at,
    )

    db.session.add(session_token)
    db.session.commit()

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    if branch is not None:
        headers["X-Branch-ID"] = str(branch.id)

    return headers


@pytest.fixture
def r13h_graph(app):
    with app.app_context():
        RBACService.initialize_default_permissions()
        RBACService.initialize_default_roles()

        tenant_a = _tenant("a")
        tenant_b = _tenant("b")

        branch_a1 = _branch(tenant_a, "a1")
        branch_a2 = _branch(tenant_a, "a2")
        branch_b1 = _branch(tenant_b, "b1")

        class_a1 = _class(tenant_a, branch_a1, "a1")
        class_a1_other = _class(
            tenant_a,
            branch_a1,
            "a1-other",
        )
        class_a2 = _class(tenant_a, branch_a2, "a2")
        class_b1 = _class(tenant_b, branch_b1, "b1")

        subject_a = _subject(tenant_a, "a")
        subject_b = _subject(tenant_b, "b")

        admin = _user("admin", "student")
        teacher = _user("teacher", "admin")
        student = _user("student", "admin")
        parent = _user("parent", "admin")

        _membership(
            admin,
            tenant_a,
            branch_a1,
            "school_admin",
        )
        _membership(
            teacher,
            tenant_a,
            branch_a1,
            "teacher",
        )
        _membership(
            student,
            tenant_a,
            branch_a1,
            "student",
        )
        _membership(
            parent,
            tenant_a,
            branch_a1,
            "parent",
        )

        teacher_profile = _teacher_profile(
            teacher,
            tenant_a,
            branch_a1,
            "a1",
        )

        if hasattr(class_a1, "teacher_id"):
            class_a1.teacher_id = teacher_profile.id

        db.session.add(
            ClassTeacherMapping(
                class_id=class_a1.id,
                teacher_id=teacher.id,
            )
        )

        parent_profile = _parent_profile(
            parent,
            tenant_a,
            "a1",
        )

        _student_profile(
            student,
            tenant_a,
            branch_a1,
            class_a1,
            "own",
        )

        linked_child_user = _user(
            "linked-child",
            "student",
        )
        _student_profile(
            linked_child_user,
            tenant_a,
            branch_a1,
            class_a1,
            "linked",
            parent=parent_profile,
        )

        unrelated_child_user = _user(
            "unrelated-child",
            "student",
        )
        _student_profile(
            unrelated_child_user,
            tenant_a,
            branch_a1,
            class_a1_other,
            "unrelated",
        )

        exam_a1 = _exam(
            class_a1,
            subject_a,
            admin,
            "a1",
        )
        exam_a1_other = _exam(
            class_a1_other,
            subject_a,
            admin,
            "a1-other",
        )
        exam_a2 = _exam(
            class_a2,
            subject_a,
            admin,
            "a2",
        )

        foreign_creator = _user(
            "foreign-creator",
            "admin",
        )
        _membership(
            foreign_creator,
            tenant_b,
            branch_b1,
            "school_admin",
        )

        exam_b1 = _exam(
            class_b1,
            subject_b,
            foreign_creator,
            "b1",
        )

        db.session.commit()

        graph = {
            "tenant_a": tenant_a,
            "tenant_b": tenant_b,
            "branch_a1": branch_a1,
            "branch_a2": branch_a2,
            "branch_b1": branch_b1,
            "class_a1": class_a1,
            "class_a1_other": class_a1_other,
            "class_a2": class_a2,
            "class_b1": class_b1,
            "subject_a": subject_a,
            "subject_b": subject_b,
            "admin": admin,
            "teacher": teacher,
            "student": student,
            "parent": parent,
            "exam_a1": exam_a1,
            "exam_a1_other": exam_a1_other,
            "exam_a2": exam_a2,
            "exam_b1": exam_b1,
        }

        yield graph

        db.session.rollback()


def _analytics(client, graph, user, exam, branch=None):
    return client.get(
        f"/api/v1/exams/{exam.id}/analytics",
        headers=_headers(
            user,
            graph["tenant_a"],
            branch or graph["branch_a1"],
        ),
    )


def _schedule(client, graph, user, cls, branch=None):
    return client.get(
        f"/api/v1/exams/classes/{cls.id}/schedule",
        headers=_headers(
            user,
            graph["tenant_a"],
            branch or graph["branch_a1"],
        ),
    )


def test_teacher_assigned_class_reaches_analytics_pipeline(
    client,
    r13h_graph,
):
    response = _analytics(
        client,
        r13h_graph,
        r13h_graph["teacher"],
        r13h_graph["exam_a1"],
    )

    # Authorization must succeed. The analytics implementation may
    # legitimately return a non-200 business response when no grades
    # exist, but it must not be rejected by RBAC/resource scope.
    assert response.status_code not in (401, 403, 404), (
        response.get_json()
    )


def test_teacher_global_admin_role_does_not_unlock_unassigned_class(
    client,
    r13h_graph,
):
    response = _analytics(
        client,
        r13h_graph,
        r13h_graph["teacher"],
        r13h_graph["exam_a1_other"],
    )

    assert response.status_code == 403, response.get_json()


def test_student_global_admin_role_can_read_own_class_schedule(
    client,
    r13h_graph,
):
    response = _schedule(
        client,
        r13h_graph,
        r13h_graph["student"],
        r13h_graph["class_a1"],
    )

    assert response.status_code not in (401, 403), (
        response.get_json()
    )


def test_student_global_admin_role_cannot_read_other_class_schedule(
    client,
    r13h_graph,
):
    response = _schedule(
        client,
        r13h_graph,
        r13h_graph["student"],
        r13h_graph["class_a1_other"],
    )

    assert response.status_code == 403, response.get_json()


def test_parent_global_admin_role_can_read_linked_child_class(
    client,
    r13h_graph,
):
    response = _schedule(
        client,
        r13h_graph,
        r13h_graph["parent"],
        r13h_graph["class_a1"],
    )

    assert response.status_code not in (401, 403), (
        response.get_json()
    )


def test_parent_global_admin_role_cannot_read_unrelated_child_class(
    client,
    r13h_graph,
):
    response = _schedule(
        client,
        r13h_graph,
        r13h_graph["parent"],
        r13h_graph["class_a1_other"],
    )

    assert response.status_code == 403, response.get_json()


def test_school_admin_global_student_role_keeps_tenant_authority(
    client,
    r13h_graph,
):
    response = _schedule(
        client,
        r13h_graph,
        r13h_graph["admin"],
        r13h_graph["class_a1"],
    )

    assert response.status_code not in (401, 403), (
        response.get_json()
    )


def test_same_tenant_wrong_branch_exam_is_not_exposed(
    client,
    r13h_graph,
):
    response = _analytics(
        client,
        r13h_graph,
        r13h_graph["admin"],
        r13h_graph["exam_a2"],
        branch=r13h_graph["branch_a1"],
    )

    assert response.status_code in (403, 404), (
        response.get_json()
    )


def test_foreign_tenant_exam_is_not_exposed(
    client,
    r13h_graph,
):
    response = _analytics(
        client,
        r13h_graph,
        r13h_graph["admin"],
        r13h_graph["exam_b1"],
    )

    assert response.status_code in (403, 404), (
        response.get_json()
    )


def test_foreign_branch_header_cannot_expose_foreign_branch_resource(
    client,
    r13h_graph,
):
    headers = _headers(
        r13h_graph["admin"],
        r13h_graph["tenant_a"],
        r13h_graph["branch_b1"],
    )

    response = client.get(
        (
            "/api/v1/exams/classes/"
            f"{r13h_graph['class_b1'].id}/schedule"
        ),
        headers=headers,
    )

    assert response.status_code in (403, 404), (
        response.get_json()
    )


def test_conflict_check_cannot_probe_foreign_tenant_class(
    client,
    r13h_graph,
):
    headers = _headers(
        r13h_graph["admin"],
        r13h_graph["tenant_a"],
        r13h_graph["branch_a1"],
    )

    response = client.post(
        "/api/v1/exams/conflicts/check",
        json={
            "class_id": r13h_graph["class_b1"].id,
            "exam_date": (
                datetime.now(timezone.utc)
                + timedelta(days=8)
            ).isoformat(),
            "duration": 60,
        },
        headers=headers,
    )

    assert response.status_code in (403, 404), (
        response.get_json()
    )


def test_duration_cannot_resolve_foreign_tenant_subject(
    client,
    r13h_graph,
):
    headers = _headers(
        r13h_graph["student"],
        r13h_graph["tenant_a"],
        r13h_graph["branch_a1"],
    )

    response = client.post(
        "/api/v1/exams/duration/calculate",
        json={
            "subject_id": r13h_graph["subject_b"].id,
            "total_marks": 100,
        },
        headers=headers,
    )

    assert response.status_code in (403, 404), (
        response.get_json()
    )


def test_batch_analytics_fails_closed_on_mixed_authorization(
    client,
    r13h_graph,
):
    headers = _headers(
        r13h_graph["teacher"],
        r13h_graph["tenant_a"],
        r13h_graph["branch_a1"],
    )

    response = client.post(
        "/api/v1/exams/batch-analytics",
        json={
            "exam_ids": [
                r13h_graph["exam_a1"].id,
                r13h_graph["exam_a1_other"].id,
            ]
        },
        headers=headers,
    )

    assert response.status_code == 403, response.get_json()


def test_teacher_performance_trends_reject_unassigned_class_filter(
    client,
    r13h_graph,
):
    headers = _headers(
        r13h_graph["teacher"],
        r13h_graph["tenant_a"],
        r13h_graph["branch_a1"],
    )

    response = client.get(
        "/api/v1/exams/performance-trends",
        query_string={
            "class_id": r13h_graph["class_a1_other"].id,
        },
        headers=headers,
    )

    assert response.status_code == 403, response.get_json()
