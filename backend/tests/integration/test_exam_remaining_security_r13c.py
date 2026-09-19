
"""
V28-R13C remaining canonical Exam security matrix.

These tests intentionally exercise boundaries not covered by
the already-certified R13B CRUD matrix.

Security invariants:
- tenant membership is authoritative; global User.role is not
- exam.read is required for upcoming
- Exam ownership inherits through Class tenant/branch
- teacher access is limited to assigned classes
- conflict and analytics helpers may not trust bare IDs
"""

import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from flask import g
from flask_jwt_extended import create_access_token, decode_token

from app.extensions import db
from app.models.class_ import Class
from app.models.exam import Exam
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.tenant import Branch, Tenant, TenantMembership
from app.models.user import User
from app.services.exam_service import ExamService
from app.services.enhanced_exam_service import EnhancedExamService
from app.services.rbac_service import RBACService


def _unique(prefix):
    stamp = datetime.now(timezone.utc).strftime(
        "%H%M%S%f"
    )
    return f"{prefix}-{stamp}"


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
    """
    Supply conservative values only for required scalar columns
    that are not PKs, FKs, server-defaulted, or already supplied.

    This is test-fixture infrastructure only.
    """
    values = {}
    columns = _columns(model)

    for name, column in columns.items():
        if column.primary_key:
            continue

        if column.foreign_keys:
            continue

        if column.nullable:
            continue

        if column.default is not None:
            continue

        if column.server_default is not None:
            continue

        python_type = None

        try:
            python_type = column.type.python_type
        except Exception:
            pass

        if python_type is str:
            values[name] = f"{seed}-{name}"
        elif python_type is bool:
            values[name] = True
        elif python_type is int:
            values[name] = 1
        elif python_type is float:
            values[name] = 1.0

    return values


def _make(model, seed, **explicit):
    values = _required_defaults(
        model,
        seed,
    )
    values.update(explicit)

    obj = model(**values)

    db.session.add(obj)
    db.session.flush()

    return obj


def _make_user(email, role="student"):
    seed = _unique(
        email.split("@")[0]
    )

    values = {}

    _set_if_present(
        values,
        User,
        email=email,
        username=seed,
        first_name="R13C",
        last_name="Security",
        role=role,
        global_role=role,
        status="active",
        is_active=True,
        password_hash="test",
    )

    user = _make(
        User,
        f"user-{seed}",
        **values,
    )

    if (
        hasattr(user, "set_password")
        and not getattr(
            user,
            "password_hash",
            None,
        )
    ):
        user.set_password(
            "R13C-test-password"
        )
        db.session.flush()

    return user



def _make_tenant(name):
    seed = _unique(
        name.lower()
        .replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Tenant,
        name=name,
        slug=seed[:63],
        country_code="GH",
        schema_name=(
            "r13c_"
            + seed.replace("-", "_")
        )[:63],
        status="active",
        currency="GHS",
    )

    return _make(
        Tenant,
        f"tenant-{seed}",
        **values,
    )



def _make_branch(tenant, name):
    seed = _unique(
        name.lower()
        .replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Branch,
        tenant_id=tenant.id,
        name=name,
        code=seed[:50],
        status="active",
        is_active=True,
    )

    return _make(
        Branch,
        f"branch-{seed}",
        **values,
    )



def _membership(user, tenant, branch, role):
    """
    TenantMembership is tenant-authoritative.

    branch is accepted because the adversarial graph carries an
    active branch context, but it is assigned only when the model
    actually has a branch_id column.
    """
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
        (
            f"membership-"
            f"{user.id}-"
            f"{tenant.id}"
        ),
        **values,
    )



def _class(tenant, branch, name):
    seed = _unique(
        name.lower()
        .replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Class,
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=name,
        class_name=name,
        code=seed[:50],
        grade_level="R13C",
        academic_year="2026-2027",
        status="active",
        is_active=True,
    )

    return _make(
        Class,
        f"class-{seed}",
        **values,
    )



def _subject(tenant, name):
    seed = _unique(
        name.lower()
        .replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Subject,
        tenant_id=tenant.id,
        name=name,
        subject_name=name,
        code=seed[:20],
        status="active",
        is_active=True,
    )

    return _make(
        Subject,
        f"subject-{seed}",
        **values,
    )



def _exam(cls, subject, creator, title):
    exam = Exam(
        title=title,
        exam_date=datetime.now(timezone.utc)
        + timedelta(days=2),
        duration=60,
        total_marks=100,
        passing_marks=50,
        class_id=cls.id,
        subject_id=subject.id,
        created_by=creator.id,
        status="scheduled",
        assessment_type="exam",
    )

    db.session.add(exam)
    db.session.flush()

    return exam


def _headers(app, user, tenant):
    """
    Build the same V27-valid synthetic access token contract
    already proven by R13B.

    SessionToken stores JTI authority; no TESTING bypass.
    """
    token = create_access_token(
        identity=user.id
    )

    payload = decode_token(token)

    jti = payload["jti"]
    exp = payload["exp"]

    expires_at = datetime.fromtimestamp(
        exp,
        tz=timezone.utc,
    ).replace(tzinfo=None)

    from app.models.session_token import SessionToken

    session_token = SessionToken(
        jti=str(jti),
        user_id=user.id,
        token_type="access",
        expires_at=expires_at,
    )

    db.session.add(session_token)
    db.session.commit()

    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }



@pytest.fixture
def r13c_graph(app):
    """
    Two tenants and two branches in tenant A.

    Teacher's global role is deliberately admin while their
    tenant membership is teacher. This proves global User.role
    cannot escalate tenant authority.
    """

    with app.app_context():
        RBACService.initialize_default_permissions()
        RBACService.initialize_default_roles()

        tenant_a = _make_tenant(
            _unique("R13C Tenant A")
        )
        tenant_b = _make_tenant(
            _unique("R13C Tenant B")
        )

        branch_a1 = _make_branch(
            tenant_a,
            "A1",
        )
        branch_a2 = _make_branch(
            tenant_a,
            "A2",
        )
        branch_b1 = _make_branch(
            tenant_b,
            "B1",
        )

        admin = _make_user(
            _unique("r13c-admin") + "@test.local",
            role="admin",
        )

        teacher = _make_user(
            _unique("r13c-teacher") + "@test.local",
            # Deliberately misleading global authority.
            role="admin",
        )

        no_exam_reader = _make_user(
            _unique("r13c-staff") + "@test.local",
            role="school_staff",
        )

        _membership(
            admin,
            tenant_a,
            branch_a1,
            "admin",
        )

        _membership(
            teacher,
            tenant_a,
            branch_a1,
            "teacher",
        )

        _membership(
            no_exam_reader,
            tenant_a,
            branch_a1,
            "school_staff",
        )

        subject_a = _subject(
            tenant_a,
            "R13C Subject A",
        )
        subject_b = _subject(
            tenant_b,
            "R13C Subject B",
        )

        class_a1 = _class(
            tenant_a,
            branch_a1,
            "R13C A1 Class",
        )
        class_a1_other = _class(
            tenant_a,
            branch_a1,
            "R13C A1 Other Class",
        )
        class_a2 = _class(
            tenant_a,
            branch_a2,
            "R13C A2 Class",
        )
        class_b1 = _class(
            tenant_b,
            branch_b1,
            "R13C B1 Class",
        )

        # Canonical Class.teacher_id uses Teacher.id.
        teacher_values = {}

        _set_if_present(
            teacher_values,
            Teacher,
            user_id=teacher.id,
            tenant_id=tenant_a.id,
            branch_id=branch_a1.id,
            employee_id=_unique("R13CT")[:20],
            first_name="R13C",
            last_name="Teacher",
            status="active",
        )

        teacher_profile = _make(
            Teacher,
            "teacher-profile",
            **teacher_values,
        )

        class_a1.teacher_id = teacher_profile.id

        exam_a1 = _exam(
            class_a1,
            subject_a,
            admin,
            "R13C Own Class Exam",
        )
        exam_a1_other = _exam(
            class_a1_other,
            subject_a,
            admin,
            "R13C Other Class Exam",
        )
        exam_a2 = _exam(
            class_a2,
            subject_a,
            admin,
            "R13C Other Branch Exam",
        )
        exam_b1 = _exam(
            class_b1,
            subject_b,
            admin,
            "R13C Foreign Tenant Exam",
        )

        db.session.commit()

        graph = {
            "tenant_a": tenant_a,
            "tenant_b": tenant_b,
            "branch_a1": branch_a1,
            "branch_a2": branch_a2,
            "branch_b1": branch_b1,
            "admin": admin,
            "teacher": teacher,
            "no_exam_reader": no_exam_reader,
            "teacher_profile": teacher_profile,
            "class_a1": class_a1,
            "class_a1_other": class_a1_other,
            "class_a2": class_a2,
            "class_b1": class_b1,
            "subject_a": subject_a,
            "subject_b": subject_b,
            "exam_a1": exam_a1,
            "exam_a1_other": exam_a1_other,
            "exam_a2": exam_a2,
            "exam_b1": exam_b1,
        }

        yield graph


def _json_items(response):
    payload = response.get_json(silent=True)

    if isinstance(payload, list):
        return payload

    if not isinstance(payload, dict):
        return []

    for key in (
        "data",
        "exams",
        "items",
        "results",
    ):
        value = payload.get(key)

        if isinstance(value, list):
            return value

        if isinstance(value, dict):
            for nested in (
                "exams",
                "items",
                "results",
            ):
                nested_value = value.get(nested)

                if isinstance(
                    nested_value,
                    list,
                ):
                    return nested_value

    return []


def _ids(response):
    result = set()

    for item in _json_items(response):
        if isinstance(item, dict):
            value = item.get("id")

            if value is not None:
                result.add(int(value))

    return result


def test_upcoming_requires_exam_read(
    app,
    client,
    r13c_graph,
):
    graph = r13c_graph

    headers = _headers(
        app,
        graph["no_exam_reader"],
        graph["tenant_a"],
    )

    response = client.get(
        "/api/v1/exams/upcoming",
        headers=headers,
    )

    assert response.status_code == 403


def test_upcoming_admin_does_not_leak_other_branch(
    app,
    client,
    r13c_graph,
):
    graph = r13c_graph

    headers = _headers(
        app,
        graph["admin"],
        graph["tenant_a"],
    )

    response = client.get(
        "/api/v1/exams/upcoming",
        headers=headers,
    )

    assert response.status_code == 200

    ids = _ids(response)

    assert graph["exam_a1"].id in ids
    assert graph["exam_a2"].id not in ids
    assert graph["exam_b1"].id not in ids


def test_teacher_global_admin_role_cannot_expand_collection(
    app,
    client,
    r13c_graph,
):
    graph = r13c_graph

    headers = _headers(
        app,
        graph["teacher"],
        graph["tenant_a"],
    )

    response = client.get(
        "/api/v1/exams",
        headers=headers,
    )

    assert response.status_code == 200

    ids = _ids(response)

    assert graph["exam_a1"].id in ids
    assert graph["exam_a1_other"].id not in ids
    assert graph["exam_a2"].id not in ids
    assert graph["exam_b1"].id not in ids


def test_teacher_global_admin_role_cannot_read_other_class_grades(
    app,
    client,
    r13c_graph,
):
    graph = r13c_graph

    headers = _headers(
        app,
        graph["teacher"],
        graph["tenant_a"],
    )

    response = client.get(
        f"/api/v1/exams/"
        f"{graph['exam_a1_other'].id}/grades",
        headers=headers,
    )

    assert response.status_code in {
        403,
        404,
    }


def test_conflict_service_rejects_foreign_tenant_class_context(
    app,
    r13c_graph,
):
    graph = r13c_graph

    with app.app_context():
        g.tenant_id = graph["tenant_a"].id
        g.branch_id = graph["branch_a1"].id

        # A bare foreign class ID must not be accepted as
        # sufficient authority.
        result = ExamService.check_exam_conflicts(
            class_id=graph["class_b1"].id,
            exam_date=datetime.now(timezone.utc)
            + timedelta(days=2),
            duration=60,
        )

        # The exact hardened contract may be [] or an explicit
        # failure tuple, but it must not expose foreign exams.
        if isinstance(result, tuple):
            value = result[0]
        else:
            value = result

        assert not value


def test_enhanced_conflicts_do_not_expose_foreign_tenant_exam(
    app,
    r13c_graph,
):
    graph = r13c_graph

    with app.app_context():
        g.tenant_id = graph["tenant_a"].id
        g.branch_id = graph["branch_a1"].id

        result = EnhancedExamService.detect_exam_conflicts(
            class_id=graph["class_b1"].id,
            exam_date=graph["exam_b1"].exam_date,
            duration=60,
        )

        text = repr(result)

        assert str(graph["exam_b1"].id) not in text
        assert graph["exam_b1"].title not in text


def test_enhanced_analytics_rejects_foreign_tenant_exam(
    app,
    r13c_graph,
):
    graph = r13c_graph

    with app.app_context():
        g.tenant_id = graph["tenant_a"].id
        g.branch_id = graph["branch_a1"].id

        result = EnhancedExamService.get_exam_analytics(
            graph["exam_b1"].id
        )

        # Foreign resource should be unavailable. Do not
        # prescribe the final service error representation yet.
        assert (
            result is None
            or result == {}
            or (
                isinstance(result, tuple)
                and (
                    not result[0]
                    or result[1]
                )
            )
        )
