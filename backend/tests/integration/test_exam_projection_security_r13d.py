"""
V28-R13D.1 - Exam projection/resource-scope security matrix.

SECURITY CONTRACT
-----------------
1. Collection visibility must be resource scoped before pagination.
2. Student authority is constrained to the authenticated student's class.
3. Parent authority is constrained to classes belonging to linked children.
4. Global User.role must not expand tenant-effective student/parent authority.
5. Direct exam/statistics lookups must enforce the same resource boundary.
6. Tenant and branch ownership continue to inherit through Exam -> Class.

This is intentionally a RED security matrix. Production code must not be
modified merely to make fixture construction succeed.
"""

from datetime import date

import pytest

from app.extensions import db
from app.models.user import User
from app.models.student import Student

try:
    from app.models.parent import Parent
except ImportError:
    Parent = None

from tests.integration.test_exam_remaining_security_r13c import (
    r13c_graph,
    _headers,
    _make,
    _make_user,
    _membership,
    _set_if_present,
    _unique,
)


def _pick(env, *names):
    """Return the first fixture key present in env."""
    for name in names:
        if name in env:
            return env[name]

    raise AssertionError(
        "R13D fixture contract could not locate any of: "
        + ", ".join(names)
        + ". Do not patch production code; inspect the fixture."
    )


def _id(obj):
    return getattr(obj, "id", obj)


def _response_exam_ids(response):
    payload = response.get_json() or {}

    exams = payload.get("exams", [])

    return {
        item["id"]
        for item in exams
        if isinstance(item, dict)
        and "id" in item
    }


def _make_user_like(reference_user, *, role):
    """
    Create a local test user using the same mandatory identity fields
    as the proven fixture user.

    We deliberately inspect the SQLAlchemy model instead of guessing
    optional schema fields.
    """
    values = {}

    mapper = User.__mapper__

    for column in mapper.columns:

        name = column.key

        if name == "id":
            continue

        if name == "role":
            values[name] = role
            continue

        if name in {
            "created_at",
            "updated_at",
            "last_login",
        }:
            continue

        if column.nullable or column.default is not None:
            continue

        if name in {
            "tenant_id",
            "branch_id",
        }:
            ref = getattr(reference_user, name, None)
            if ref is not None:
                values[name] = ref
            continue

        if name in {
            "email",
            "username",
            "phone",
        }:
            original = getattr(reference_user, name, "") or ""

            if name == "email":
                values[name] = (
                    f"r13d_{role}_{id(reference_user)}@example.test"
                )
            elif name == "username":
                values[name] = (
                    f"r13d_{role}_{id(reference_user)}"
                )
            else:
                values[name] = original
            continue

        if name in {
            "password_hash",
            "password",
        }:
            values[name] = getattr(
                reference_user,
                name,
                "r13d-test-only",
            )
            continue

        if hasattr(reference_user, name):
            values[name] = getattr(reference_user, name)

    user = User(**values)

    db.session.add(user)
    db.session.flush()

    return user


def _make_student_for_class(
    reference_student,
    user,
    class_obj,
    *,
    tenant_id,
    branch_id,
):
    """
    Clone mandatory Student fields from an existing fixture student,
    replacing only authoritative ownership/identity fields.
    """
    values = {}

    for column in Student.__mapper__.columns:

        name = column.key

        if name == "id":
            continue

        if name == "user_id":
            values[name] = user.id
            continue

        if name == "class_id":
            values[name] = _id(class_obj)
            continue

        if name == "tenant_id":
            values[name] = tenant_id
            continue

        if name == "branch_id":
            values[name] = branch_id
            continue

        if name in {
            "created_at",
            "updated_at",
        }:
            continue

        if column.nullable or column.default is not None:
            continue

        if name in {
            "student_id",
            "admission_number",
            "registration_number",
        }:
            values[name] = (
                f"R13D-{user.id}"
            )
            continue

        if hasattr(reference_student, name):
            values[name] = getattr(
                reference_student,
                name,
            )

    student = Student(**values)

    db.session.add(student)
    db.session.flush()

    return student


@pytest.fixture
def r13d_env(r13c_graph):
    """
    Extend the proven R13C graph with deterministic student identities.

    Security-critical adversarial identity:
        global User.role = admin
        tenant membership role = student

    TenantMembership is authoritative for tenant resource scope.
    """
    env = dict(r13c_graph)

    tenant_a = _pick(
        env,
        "tenant_a",
        "tenant1",
        "tenant",
    )

    branch_a1 = _pick(
        env,
        "branch_a1",
        "branch1",
        "branch",
    )

    branch_a2 = _pick(
        env,
        "branch_a2",
        "branch2",
    )

    class_a1 = _pick(
        env,
        "class_a1",
        "class1",
        "class_1",
    )

    class_a1_other = env["class_a1_other"]

    class_a2 = _pick(
        env,
        "class_a2",
        "class2",
        "class_2",
    )

    class_b1 = env["class_b1"]
    tenant_b = env["tenant_b"]
    branch_b1 = env["branch_b1"]

    exam_a1 = _pick(
        env,
        "exam_a1",
        "exam1",
        "exam_1",
    )

    exam_a1_other = env["exam_a1_other"]

    exam_a2 = _pick(
        env,
        "exam_a2",
        "exam2",
        "exam_2",
    )

    exam_b1 = env["exam_b1"]

    # -----------------------------------------------------
    # Normal tenant-effective student.
    # -----------------------------------------------------

    student_user = _make_user(
        _unique("r13d-student") + "@test.local",
        role="student",
    )

    _membership(
        student_user,
        tenant_a,
        branch_a1,
        "student",
    )

    student_values = {}

    _set_if_present(
        student_values,
        Student,
        tenant_id=_id(tenant_a),
        branch_id=_id(branch_a1),
        user_id=student_user.id,
        class_id=_id(class_a1),
        admission_number=_unique("R13D-STUDENT"),
        student_id=_unique("R13D-STUDENT"),
        registration_number=_unique("R13D-STUDENT"),
        first_name="R13D",
        last_name="Student",
        date_of_birth=date(2010, 1, 1),
        gender="male",
        status="active",
        is_active=True,
    )

    student = _make(
        Student,
        _unique("r13d-student-profile"),
        **student_values,
    )

    # -----------------------------------------------------
    # Adversarial authority probe.
    #
    # Global role deliberately admin-like.
    # Tenant-effective membership deliberately student.
    #
    # If global User.role expands exam visibility, the
    # security test must RED.
    # -----------------------------------------------------

    escalated_student_user = _make_user(
        _unique("r13d-escalated-student")
        + "@test.local",
        role="admin",
    )

    _membership(
        escalated_student_user,
        tenant_a,
        branch_a1,
        "student",
    )

    escalated_values = {}

    _set_if_present(
        escalated_values,
        Student,
        tenant_id=_id(tenant_a),
        branch_id=_id(branch_a1),
        user_id=escalated_student_user.id,
        class_id=_id(class_a1),
        admission_number=_unique("R13D-ESCALATED"),
        student_id=_unique("R13D-ESCALATED"),
        registration_number=_unique("R13D-ESCALATED"),
        first_name="R13D",
        last_name="EscalatedStudent",
        date_of_birth=date(2010, 1, 2),
        gender="male",
        status="active",
        is_active=True,
    )

    escalated_student = _make(
        Student,
        _unique("r13d-escalated-profile"),
        **escalated_values,
    )

    # -----------------------------------------------------
    # Normal tenant-effective parent with one linked child.
    # -----------------------------------------------------

    parent_user = _make_user(
        _unique("r13d-parent") + "@test.local",
        role="parent",
    )

    _membership(
        parent_user,
        tenant_a,
        branch_a1,
        "parent",
    )

    parent = _make(
        Parent,
        _unique("r13d-parent-profile"),
        tenant_id=_id(tenant_a),
        user_id=parent_user.id,
        relationship="Father",
    )

    linked_child_values = {}

    _set_if_present(
        linked_child_values,
        Student,
        tenant_id=_id(tenant_a),
        branch_id=_id(branch_a1),
        user_id=None,
        class_id=_id(class_a1),
        parent_id=parent.id,
        admission_number=_unique("R13D-PARENT-CHILD"),
        student_id=_unique("R13D-PARENT-CHILD"),
        registration_number=_unique("R13D-PARENT-CHILD"),
        first_name="R13D",
        last_name="ParentChild",
        date_of_birth=date(2011, 1, 1),
        gender="female",
        status="active",
        is_active=True,
    )

    # Student.user_id is non-nullable in the real model.
    linked_child_user = _make_user(
        _unique("r13d-parent-child") + "@test.local",
        role="student",
    )

    linked_child_values["user_id"] = linked_child_user.id

    linked_child = _make(
        Student,
        _unique("r13d-parent-child-profile"),
        **linked_child_values,
    )

    # -----------------------------------------------------
    # Adversarial parent:
    # global admin role, tenant-effective parent.
    # -----------------------------------------------------

    escalated_parent_user = _make_user(
        _unique("r13d-escalated-parent") + "@test.local",
        role="admin",
    )

    _membership(
        escalated_parent_user,
        tenant_a,
        branch_a1,
        "parent",
    )

    escalated_parent = _make(
        Parent,
        _unique("r13d-escalated-parent-profile"),
        tenant_id=_id(tenant_a),
        user_id=escalated_parent_user.id,
        relationship="Guardian",
    )

    escalated_child_user = _make_user(
        _unique("r13d-escalated-child") + "@test.local",
        role="student",
    )

    escalated_child_values = {}

    _set_if_present(
        escalated_child_values,
        Student,
        tenant_id=_id(tenant_a),
        branch_id=_id(branch_a1),
        user_id=escalated_child_user.id,
        class_id=_id(class_a1),
        parent_id=escalated_parent.id,
        admission_number=_unique("R13D-ESC-PARENT-CHILD"),
        student_id=_unique("R13D-ESC-PARENT-CHILD"),
        registration_number=_unique("R13D-ESC-PARENT-CHILD"),
        first_name="R13D",
        last_name="EscalatedParentChild",
        date_of_birth=date(2011, 1, 2),
        gender="female",
        status="active",
        is_active=True,
    )

    escalated_child = _make(
        Student,
        _unique("r13d-escalated-child-profile"),
        **escalated_child_values,
    )

    db.session.commit()

    env.update(
        {
            "r13d_tenant": tenant_a,
            "r13d_branch": branch_a1,
            "r13d_other_branch": branch_a2,
            "r13d_foreign_tenant": tenant_b,
            "r13d_foreign_branch": branch_b1,
            "r13d_class": class_a1,
            "r13d_same_branch_other_class": class_a1_other,
            "r13d_other_class": class_a2,
            "r13d_foreign_class": class_b1,
            "r13d_exam": exam_a1,
            "r13d_same_branch_other_exam": exam_a1_other,
            "r13d_other_exam": exam_a2,
            "r13d_foreign_exam": exam_b1,
            "r13d_student_user": student_user,
            "r13d_student": student,
            "r13d_escalated_student_user": (
                escalated_student_user
            ),
            "r13d_escalated_student": (
                escalated_student
            ),
            "r13d_parent_user": parent_user,
            "r13d_parent": parent,
            "r13d_parent_child": linked_child,
            "r13d_escalated_parent_user": escalated_parent_user,
            "r13d_escalated_parent": escalated_parent,
            "r13d_escalated_parent_child": escalated_child,
        }
    )

    return env


def test_student_unfiltered_collection_is_own_class_only(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        "/api/v1/exams",
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code == 200

    ids = _response_exam_ids(response)

    assert _id(env["r13d_exam"]) in ids
    assert _id(env["r13d_other_exam"]) not in ids


def test_student_cannot_request_other_class_collection(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            "/api/v1/exams"
            f"?class_id={_id(env['r13d_other_class'])}"
        ),
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_upcoming_is_own_class_only(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        "/api/v1/exams/upcoming?days=3650",
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code == 200

    ids = _response_exam_ids(response)

    assert _id(env["r13d_other_exam"]) not in ids


def test_student_can_read_own_class_exam(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        f"/api/v1/exams/{_id(env['r13d_exam'])}",
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code == 200


def test_student_cannot_read_other_class_exam(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        f"/api/v1/exams/{_id(env['r13d_other_exam'])}",
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_cannot_read_other_class_statistics(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            f"/api/v1/exams/"
            f"{_id(env['r13d_other_exam'])}/statistics"
        ),
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_global_admin_role_does_not_expand_student_collection(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        "/api/v1/exams",
        headers=_headers(
            app,
            env["r13d_escalated_student_user"],
            env["r13d_tenant"],
        ),
    )

    # The global role must not be sufficient to escape the student's
    # resource relationship when tenant-effective authority is student.
    assert response.status_code == 200

    ids = _response_exam_ids(response)

    assert _id(env["r13d_other_exam"]) not in ids


def test_teacher_pagination_metadata_does_not_count_hidden_exams(
    app,
    client,
    r13c_graph,
):
    env = r13c_graph

    teacher = _pick(
        env,
        "teacher",
        "teacher_user",
        "user_teacher",
    )

    tenant = _pick(
        env,
        "tenant_a",
        "tenant1",
        "tenant",
    )

    assigned_exam = _pick(
        env,
        "exam_a1",
        "exam1",
        "exam_1",
    )

    other_exam = _pick(
        env,
        "exam_a2",
        "exam2",
        "exam_2",
    )

    response = client.get(
        "/api/v1/exams?per_page=100",
        headers=_headers(
            app,
            teacher,
            tenant,
        ),
    )

    assert response.status_code == 200

    payload = response.get_json() or {}
    ids = _response_exam_ids(response)

    assert _id(assigned_exam) in ids
    assert _id(other_exam) not in ids

    # Core pagination side-channel invariant:
    # total must describe the authorized result set,
    # not the pre-filtered tenant/branch result set.
    assert payload["pagination"]["total"] == len(
        payload.get("exams", [])
    )


# ------------------------------------------------------------
# Parent projection placeholder is deliberately explicit.
#
# We do NOT fabricate a Parent constructor contract. The discovery
# stage proved Parent.user_id -> Student.parent_id ownership, but
# the exact mandatory Parent model fields were not available in the
# R13C test source. This test fails loudly rather than silently
# inventing a production relationship.
# ------------------------------------------------------------

def test_parent_projection_fixture_contract_requires_explicit_model(
    r13d_env,
):
    if Parent is None:
        pytest.fail(
            "R13D parent projection requires the application's "
            "actual Parent model import path."
        )

    required = {
        c.key
        for c in Parent.__mapper__.columns
        if not c.nullable
        and c.default is None
        and c.key not in {
            "id",
            "created_at",
            "updated_at",
        }
    }

    assert "user_id" in {
        c.key
        for c in Parent.__mapper__.columns
    }, (
        "Parent model does not expose the discovered user_id "
        "ownership contract."
    )

    assert hasattr(Student, "parent_id"), (
        "Student model does not expose the discovered parent_id "
        "ownership contract."
    )


# ============================================================
# V28-R13D.1D expanded resource-boundary matrix
# ============================================================


def test_student_same_branch_other_class_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            "/api/v1/exams"
            f"?class_id="
            f"{_id(env['r13d_same_branch_other_class'])}"
        ),
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_same_branch_other_exam_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            f"/api/v1/exams/"
            f"{_id(env['r13d_same_branch_other_exam'])}"
        ),
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_cross_branch_exam_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        f"/api/v1/exams/{_id(env['r13d_other_exam'])}",
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_cross_tenant_exam_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        f"/api/v1/exams/{_id(env['r13d_foreign_exam'])}",
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_cross_tenant_class_collection_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            "/api/v1/exams"
            f"?class_id={_id(env['r13d_foreign_class'])}"
        ),
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_same_branch_statistics_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            f"/api/v1/exams/"
            f"{_id(env['r13d_same_branch_other_exam'])}"
            "/statistics"
        ),
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_student_cross_tenant_statistics_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            f"/api/v1/exams/"
            f"{_id(env['r13d_foreign_exam'])}"
            "/statistics"
        ),
        headers=_headers(
            app,
            env["r13d_student_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_parent_collection_is_linked_child_class_only(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        "/api/v1/exams",
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code == 200

    ids = _response_exam_ids(response)

    assert _id(env["r13d_exam"]) in ids

    assert (
        _id(env["r13d_same_branch_other_exam"])
        not in ids
    )

    assert _id(env["r13d_other_exam"]) not in ids
    assert _id(env["r13d_foreign_exam"]) not in ids


def test_parent_can_read_linked_child_class_exam(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        f"/api/v1/exams/{_id(env['r13d_exam'])}",
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code == 200


def test_parent_same_branch_unrelated_class_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            "/api/v1/exams"
            f"?class_id="
            f"{_id(env['r13d_same_branch_other_class'])}"
        ),
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_parent_same_branch_unrelated_exam_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            f"/api/v1/exams/"
            f"{_id(env['r13d_same_branch_other_exam'])}"
        ),
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_parent_cross_branch_exam_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        f"/api/v1/exams/{_id(env['r13d_other_exam'])}",
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_parent_cross_tenant_exam_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        f"/api/v1/exams/{_id(env['r13d_foreign_exam'])}",
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_parent_upcoming_is_linked_child_class_only(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        "/api/v1/exams/upcoming?days=3650",
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code == 200

    ids = _response_exam_ids(response)

    assert _id(env["r13d_exam"]) in ids

    assert (
        _id(env["r13d_same_branch_other_exam"])
        not in ids
    )

    assert _id(env["r13d_other_exam"]) not in ids
    assert _id(env["r13d_foreign_exam"]) not in ids


def test_parent_unrelated_statistics_is_denied(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            f"/api/v1/exams/"
            f"{_id(env['r13d_same_branch_other_exam'])}"
            "/statistics"
        ),
        headers=_headers(
            app,
            env["r13d_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}


def test_global_admin_role_does_not_expand_parent_collection(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        "/api/v1/exams",
        headers=_headers(
            app,
            env["r13d_escalated_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code == 200

    ids = _response_exam_ids(response)

    assert _id(env["r13d_exam"]) in ids

    assert (
        _id(env["r13d_same_branch_other_exam"])
        not in ids
    )

    assert _id(env["r13d_other_exam"]) not in ids
    assert _id(env["r13d_foreign_exam"]) not in ids


def test_global_admin_role_parent_cannot_read_unrelated_exam(
    app,
    client,
    r13d_env,
):
    env = r13d_env

    response = client.get(
        (
            f"/api/v1/exams/"
            f"{_id(env['r13d_same_branch_other_exam'])}"
        ),
        headers=_headers(
            app,
            env["r13d_escalated_parent_user"],
            env["r13d_tenant"],
        ),
    )

    assert response.status_code in {403, 404}
