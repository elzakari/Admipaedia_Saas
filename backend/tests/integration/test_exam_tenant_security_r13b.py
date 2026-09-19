from datetime import datetime, timedelta

import pytest
from flask_jwt_extended import create_access_token, decode_token

from app.extensions import db
from app.models.exam import Exam
from app.models.user import User
from app.models.tenant import Tenant
from app.models.tenant import Branch
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.tenant import TenantMembership
from app.models.session_token import SessionToken
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
    """
    Supply conservative values only for required scalar columns
    that are not PKs, FKs, server-defaulted, or already supplied.

    This is a test fixture helper only.
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
    values = _required_defaults(model, seed)
    values.update(explicit)

    obj = model(**values)
    db.session.add(obj)
    db.session.flush()

    return obj


def _make_tenant(seed):
    values = {}

    _set_if_present(
        values,
        Tenant,
        name=f"R13 {seed}",
        slug=f"r13-{seed.lower()}",
        code=f"R13{seed.upper()}",
        status="active",
        is_active=True,
    )

    return _make(
        Tenant,
        f"tenant-{seed}",
        **values,
    )


def _make_branch(tenant, seed):
    values = {}

    _set_if_present(
        values,
        Branch,
        tenant_id=tenant.id,
        name=f"Branch {seed}",
        code=f"BR-{seed}",
        status="active",
        is_active=True,
    )

    return _make(
        Branch,
        f"branch-{seed}",
        **values,
    )


def _make_user(seed, role="admin"):
    values = {}

    _set_if_present(
        values,
        User,
        email=f"r13-{seed}@example.test",
        username=f"r13-{seed}",
        first_name="R13",
        last_name=seed,
        role=role,
        global_role=role,
        status="active",
        is_active=True,
        password_hash="test",
    )

    return _make(
        User,
        f"user-{seed}",
        **values,
    )


def _make_membership(user, tenant, branch, role):
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


def _make_class(tenant, branch, seed):
    values = {}

    _set_if_present(
        values,
        Class,
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=f"Class {seed}",
        class_name=f"Class {seed}",
        code=f"CLS-{seed}",
        status="active",
        is_active=True,
    )

    return _make(
        Class,
        f"class-{seed}",
        **values,
    )


def _make_subject(tenant, seed):
    values = {}

    _set_if_present(
        values,
        Subject,
        tenant_id=tenant.id,
        name=f"Subject {seed}",
        subject_name=f"Subject {seed}",
        code=f"SUB-{seed}",
        status="active",
        is_active=True,
    )

    return _make(
        Subject,
        f"subject-{seed}",
        **values,
    )


def _make_exam(class_, subject, user, seed):
    return Exam(
        title=f"R13 Exam {seed}",
        description="R13 security test",
        exam_date=datetime.utcnow() + timedelta(days=7),
        duration=60,
        total_marks=100,
        passing_marks=50,
        class_id=class_.id,
        subject_id=subject.id,
        created_by=user.id,
        status="scheduled",
    )


def _headers(app, user, tenant, branch):
    """
    Build a V27-valid authenticated request.

    The JWT identity is the authenticated User, never the Flask
    application object. The synthetic access JWT is persisted in
    SessionToken so the real fail-closed token blocklist remains
    fully active during this security test.
    """
    token = create_access_token(
        identity=user.id
    )

    payload = decode_token(token)

    jti = payload["jti"]
    exp = payload["exp"]

    from datetime import datetime, timezone

    expires_at = datetime.fromtimestamp(
        exp,
        tz=timezone.utc,
    ).replace(tzinfo=None)

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
def exam_security_graph(app):
    with app.app_context():
        # TenantMembership.role is authoritative for request RBAC,
        # but effective permissions are resolved through the
        # canonical system RBAC role templates. Initialize those
        # templates exactly as production does; do not bypass RBAC.
        assert RBACService.initialize_default_permissions() is True
        assert RBACService.initialize_default_roles() is True

        tenant_a = _make_tenant("A")
        tenant_b = _make_tenant("B")

        branch_a1 = _make_branch(tenant_a, "A1")
        branch_a2 = _make_branch(tenant_a, "A2")
        branch_b1 = _make_branch(tenant_b, "B1")

        admin_a = _make_user("admin-a", "admin")
        admin_b = _make_user("admin-b", "admin")
        student_a = _make_user("student-a", "student")

        _make_membership(
            admin_a,
            tenant_a,
            branch_a1,
            "admin",
        )
        _make_membership(
            admin_b,
            tenant_b,
            branch_b1,
            "admin",
        )
        _make_membership(
            student_a,
            tenant_a,
            branch_a1,
            "student",
        )

        class_a1 = _make_class(
            tenant_a,
            branch_a1,
            "A1",
        )
        class_a2 = _make_class(
            tenant_a,
            branch_a2,
            "A2",
        )
        class_b1 = _make_class(
            tenant_b,
            branch_b1,
            "B1",
        )

        subject_a = _make_subject(
            tenant_a,
            "A",
        )
        subject_b = _make_subject(
            tenant_b,
            "B",
        )

        exam_a1 = _make_exam(
            class_a1,
            subject_a,
            admin_a,
            "A1",
        )
        exam_a2 = _make_exam(
            class_a2,
            subject_a,
            admin_a,
            "A2",
        )
        exam_b1 = _make_exam(
            class_b1,
            subject_b,
            admin_b,
            "B1",
        )

        db.session.add_all(
            [
                exam_a1,
                exam_a2,
                exam_b1,
            ]
        )
        db.session.commit()

        graph = {
            "tenant_a": tenant_a,
            "tenant_b": tenant_b,
            "branch_a1": branch_a1,
            "branch_a2": branch_a2,
            "branch_b1": branch_b1,
            "admin_a": admin_a,
            "admin_b": admin_b,
            "student_a": student_a,
            "class_a1": class_a1,
            "class_a2": class_a2,
            "class_b1": class_b1,
            "subject_a": subject_a,
            "subject_b": subject_b,
            "exam_a1": exam_a1,
            "exam_a2": exam_a2,
            "exam_b1": exam_b1,
        }

        # Force all required IDs to materialize before leaving
        # the fixture's app context.
        for obj in graph.values():
            if hasattr(obj, "id"):
                _ = obj.id

        yield graph


def test_exam_model_is_ownershipless():
    assert not hasattr(Exam, "tenant_id")
    assert not hasattr(Exam, "branch_id")

    assert hasattr(Exam, "class_id")
    assert hasattr(Exam, "subject_id")


def test_get_exam_rejects_foreign_tenant(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.get(
        f"/api/v1/exams/{g['exam_b1'].id}",
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 404


def test_get_exam_rejects_foreign_branch(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.get(
        f"/api/v1/exams/{g['exam_a2'].id}",
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 404


def test_exam_collection_excludes_foreign_tenant(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.get(
        "/api/v1/exams",
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200

    payload = response.get_json()

    serialized = str(payload)

    assert g["exam_a1"].title in serialized
    assert g["exam_b1"].title not in serialized


def test_exam_collection_excludes_foreign_branch(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.get(
        "/api/v1/exams",
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 200

    serialized = str(response.get_json())

    assert g["exam_a1"].title in serialized
    assert g["exam_a2"].title not in serialized


def test_create_exam_rejects_foreign_tenant_class(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    payload = {
        "title": "Foreign class attack",
        "description": "R13",
        "exam_date": (
            datetime.utcnow()
            + timedelta(days=10)
        ).isoformat(),
        "duration": 60,
        "total_marks": 100,
        "passing_marks": 50,
        "class_id": g["class_b1"].id,
        "subject_id": g["subject_a"].id,
        "created_by": g["admin_b"].id,
        "status": "scheduled",
    }

    response = client.post(
        "/api/v1/exams",
        json=payload,
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in (403, 404)


def test_create_exam_rejects_foreign_branch_class(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    payload = {
        "title": "Foreign branch attack",
        "description": "R13",
        "exam_date": (
            datetime.utcnow()
            + timedelta(days=10)
        ).isoformat(),
        "duration": 60,
        "total_marks": 100,
        "passing_marks": 50,
        "class_id": g["class_a2"].id,
        "subject_id": g["subject_a"].id,
        "created_by": g["admin_a"].id,
        "status": "scheduled",
    }

    response = client.post(
        "/api/v1/exams",
        json=payload,
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in (403, 404)


def test_create_exam_rejects_foreign_subject(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    payload = {
        "title": "Foreign subject attack",
        "description": "R13",
        "exam_date": (
            datetime.utcnow()
            + timedelta(days=10)
        ).isoformat(),
        "duration": 60,
        "total_marks": 100,
        "passing_marks": 50,
        "class_id": g["class_a1"].id,
        "subject_id": g["subject_b"].id,
        "created_by": g["admin_a"].id,
        "status": "scheduled",
    }

    response = client.post(
        "/api/v1/exams",
        json=payload,
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code in (403, 404)


def test_create_exam_ignores_client_created_by(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    payload = {
        "title": "Actor authority test",
        "description": "R13",
        "exam_date": (
            datetime.utcnow()
            + timedelta(days=10)
        ).isoformat(),
        "duration": 60,
        "total_marks": 100,
        "passing_marks": 50,
        "class_id": g["class_a1"].id,
        "subject_id": g["subject_a"].id,
        "created_by": g["admin_b"].id,
        "status": "scheduled",
    }

    response = client.post(
        "/api/v1/exams",
        json=payload,
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 201

    with app.app_context():
        created = (
            Exam.query
            .filter_by(title="Actor authority test")
            .one()
        )

        assert created.created_by == g["admin_a"].id


def test_update_exam_rejects_foreign_tenant_target(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.put(
        f"/api/v1/exams/{g['exam_b1'].id}",
        json={"title": "Compromised"},
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 404


def test_update_exam_rejects_foreign_branch_target(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.put(
        f"/api/v1/exams/{g['exam_a2'].id}",
        json={"title": "Compromised"},
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 404


def test_delete_exam_requires_effective_permission(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.delete(
        f"/api/v1/exams/{g['exam_a1'].id}",
        headers=_headers(
            app,
            g["student_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 403

    with app.app_context():
        assert (
            db.session.get(
                Exam,
                g["exam_a1"].id,
            )
            is not None
        )


def test_delete_exam_rejects_foreign_tenant(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.delete(
        f"/api/v1/exams/{g['exam_b1'].id}",
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 404

    with app.app_context():
        assert (
            db.session.get(
                Exam,
                g["exam_b1"].id,
            )
            is not None
        )


def test_delete_exam_rejects_foreign_branch(
    client,
    app,
    exam_security_graph,
):
    g = exam_security_graph

    response = client.delete(
        f"/api/v1/exams/{g['exam_a2'].id}",
        headers=_headers(
            app,
            g["admin_a"],
            g["tenant_a"],
            g["branch_a1"],
        ),
    )

    assert response.status_code == 404

    with app.app_context():
        assert (
            db.session.get(
                Exam,
                g["exam_a2"].id,
            )
            is not None
        )
