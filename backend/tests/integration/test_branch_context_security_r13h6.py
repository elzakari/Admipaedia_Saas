from datetime import date
import uuid

import pytest
from flask import g

from app import create_app
from app.extensions import db
from app.models.tenant import Branch, Tenant
from app.models.user import User
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.parent import Parent
from app.utils.tenant_context import resolve_branch_for_request


def _required_defaults(model, explicit):
    values = dict(explicit)

    for column in model.__table__.columns:
        if column.name in values:
            continue

        if column.primary_key:
            continue

        if column.default is not None:
            continue

        if column.server_default is not None:
            continue

        if column.nullable:
            continue

        pytype = None

        try:
            pytype = column.type.python_type
        except Exception:
            pass

        if pytype is str:
            values[column.name] = f"r13h6-{column.name}"

        elif pytype is int:
            values[column.name] = 1

        elif pytype is bool:
            values[column.name] = True

    return values


def _make(model, **kwargs):
    obj = model(
        **_required_defaults(
            model,
            kwargs,
        )
    )

    db.session.add(obj)
    db.session.flush()

    return obj


@pytest.fixture
def branch_graph(app):
    with app.app_context():
        tenant_a = _make(
            Tenant,
            name="R13H6 Tenant A",
            slug="r13h6-tenant-a",
            schema_name="r13h6_tenant_a",
        )

        tenant_b = _make(
            Tenant,
            name="R13H6 Tenant B",
            slug="r13h6-tenant-b",
            schema_name="r13h6_tenant_b",
        )

        branch_a1 = _make(
            Branch,
            tenant_id=tenant_a.id,
            name="R13H6 A1",
            code="R13H6-A1",
            is_active=True,
        )

        branch_a2 = _make(
            Branch,
            tenant_id=tenant_a.id,
            name="R13H6 A2",
            code="R13H6-A2",
            is_active=True,
        )

        branch_b1 = _make(
            Branch,
            tenant_id=tenant_b.id,
            name="R13H6 B1",
            code="R13H6-B1",
            is_active=True,
        )

        teacher_user = _make(
            User,
            username="r13h6-teacher",
            email="r13h6-teacher@example.invalid",
            role="teacher",
            status="active",
            is_active=True,
            password_hash="not-used",
        )

        student_user = _make(
            User,
            username="r13h6-student",
            email="r13h6-student@example.invalid",
            role="student",
            status="active",
            is_active=True,
            password_hash="not-used",
        )

        parent_user = _make(
            User,
            username="r13h6-parent",
            email="r13h6-parent@example.invalid",
            role="parent",
            status="active",
            is_active=True,
            password_hash="not-used",
        )

        admin_user = _make(
            User,
            username="r13h6-admin",
            email="r13h6-admin@example.invalid",
            role="admin",
            status="active",
            is_active=True,
            password_hash="not-used",
        )

        teacher = _make(
            Teacher,
            tenant_id=tenant_a.id,
            user_id=teacher_user.id,
            branch_id=branch_a1.id,
        )

        student = _make(
            Student,
            tenant_id=tenant_a.id,
            user_id=student_user.id,
            branch_id=branch_a1.id,
            admission_number="R13H6-STUDENT",
            first_name="R13H6",
            last_name="Student",
            date_of_birth=date(2010, 1, 1),
            gender="other",
        )

        parent = _make(
            Parent,
            tenant_id=tenant_a.id,
            user_id=parent_user.id,
            relationship="guardian",
        )
        student.parent_id = parent.id
        db.session.flush()

        db.session.commit()

        return {
            "tenant_a_id": tenant_a.id,
            "tenant_b_id": tenant_b.id,
            "branch_a1_id": branch_a1.id,
            "branch_a2_id": branch_a2.id,
            "branch_b1_id": branch_b1.id,
            "teacher_id": teacher_user.id,
            "student_id": student_user.id,
            "parent_id": parent_user.id,
            "admin_id": admin_user.id,
        }


def _load_user(user_id):
    return db.session.get(User, user_id)


def _resolve(app, tenant_id, user_id, branch_header=None):
    headers = {}

    if branch_header is not None:
        headers["X-Branch-ID"] = str(branch_header)

    with app.test_request_context(
        "/r13h6-branch-probe",
        headers=headers,
    ):
        user = _load_user(user_id)

        return resolve_branch_for_request(
            tenant_id,
            user,
        )


def test_valid_profile_branch_is_selected(
    app,
    branch_graph,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph["teacher_id"],
            branch_graph["branch_a1_id"],
        )

        assert resolved == branch_graph["branch_a1_id"]


def test_missing_header_uses_profile_branch(
    app,
    branch_graph,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph["teacher_id"],
        )

        assert resolved == branch_graph["branch_a1_id"]


@pytest.mark.parametrize(
    "user_key",
    [
        "teacher_id",
        "student_id",

    ],
)
def test_profile_bound_user_cannot_select_other_same_tenant_branch(
    app,
    branch_graph,
    user_key,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph[user_key],
            branch_graph["branch_a2_id"],
        )

        # Security contract:
        # explicit unauthorized branch selection must fail closed.
        #
        # It must NOT silently switch to A1 because that would make
        # the request execute under a branch different from the one
        # the caller explicitly selected.
        assert resolved is None


def test_foreign_tenant_branch_header_fails_closed(
    app,
    branch_graph,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph["teacher_id"],
            branch_graph["branch_b1_id"],
        )

        assert resolved is None


def test_nonexistent_branch_header_fails_closed(
    app,
    branch_graph,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph["teacher_id"],
            uuid.uuid4(),
        )

        assert resolved is None


def test_malformed_explicit_branch_header_fails_closed(
    app,
    branch_graph,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph["teacher_id"],
            "definitely-not-a-uuid",
        )

        assert resolved is None


def test_admin_can_explicitly_select_valid_same_tenant_branch(
    app,
    branch_graph,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph["admin_id"],
            branch_graph["branch_a2_id"],
        )

        assert resolved == branch_graph["branch_a2_id"]


def test_admin_foreign_branch_header_does_not_fallback(
    app,
    branch_graph,
):
    with app.app_context():
        resolved = _resolve(
            app,
            branch_graph["tenant_a_id"],
            branch_graph["admin_id"],
            branch_graph["branch_b1_id"],
        )

        assert resolved is None
