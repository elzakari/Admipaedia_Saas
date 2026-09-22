"""
V28-R13E — Exam mutation authorization security.

RED-contract suite.

These tests prove that tenant-effective teacher authority is projected
to assigned classes for exam mutations and cannot be expanded by a
misleading global User.role.

Production must not be changed merely to make the fixture convenient.
"""

from datetime import datetime, timedelta

import pytest

from app.extensions import db
from app.models.class_ import ClassTeacherMapping
from app.models.exam import Exam

from tests.integration.test_exam_remaining_security_r13c import (
    r13c_graph,
    _headers,
)


pytestmark = pytest.mark.integration


def _future_exam_payload(graph, class_key="class_a1", **overrides):
    payload = {
        "title": "R13E Mutation Exam",
        "description": "R13E mutation authorization contract",
        "exam_date": (
            datetime.utcnow() + timedelta(days=30)
        ).isoformat(),
        "duration": 60,
        "total_marks": 100,
        "passing_marks": 50,
        "class_id": graph[class_key].id,
        "subject_id": graph["subject_a"].id,
        "status": "scheduled",
    }
    payload.update(overrides)
    return payload


def _teacher_headers(app, graph):
    return _headers(
        app,
        graph["teacher"],
        graph["tenant_a"],
    )


def _admin_headers(app, graph):
    return _headers(
        app,
        graph["admin"],
        graph["tenant_a"],
    )


@pytest.fixture
def r13e_graph(app, r13c_graph):
    """
    Extend the certified R13C graph with the canonical USER-id
    ClassTeacherMapping contract used by IdentityResolver.

    R13C already sets Class.teacher_id = Teacher.id.
    This fixture additionally guarantees the canonical mapping:
        ClassTeacherMapping.teacher_id = User.id
    """
    with app.app_context():
        graph = r13c_graph

        existing = (
            ClassTeacherMapping.query
            .filter_by(
                class_id=graph["class_a1"].id,
                teacher_id=graph["teacher"].id,
            )
            .first()
        )

        if existing is None:
            db.session.add(
                ClassTeacherMapping(
                    class_id=graph["class_a1"].id,
                    teacher_id=graph["teacher"].id,
                )
            )
            db.session.commit()

        yield graph


def test_teacher_can_create_exam_in_assigned_class(
    app,
    client,
    r13e_graph,
):
    response = client.post(
        "/api/v1/exams",
        json=_future_exam_payload(r13e_graph),
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code == 201, response.get_json()

    payload = response.get_json()
    assert payload["success"] is True
    assert payload["exam"]["class_id"] == r13e_graph["class_a1"].id


def test_teacher_cannot_create_exam_in_unassigned_same_branch_class(
    app,
    client,
    r13e_graph,
):
    response = client.post(
        "/api/v1/exams",
        json=_future_exam_payload(
            r13e_graph,
            class_key="class_a1_other",
        ),
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code == 403, response.get_json()


def test_global_admin_role_cannot_expand_tenant_teacher_create_scope(
    app,
    client,
    r13e_graph,
):
    assert r13e_graph["teacher"].role == "admin"

    response = client.post(
        "/api/v1/exams",
        json=_future_exam_payload(
            r13e_graph,
            class_key="class_a1_other",
            title="R13E Global Role Create Probe",
        ),
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code == 403, response.get_json()


def test_teacher_cannot_create_exam_in_other_branch(
    app,
    client,
    r13e_graph,
):
    response = client.post(
        "/api/v1/exams",
        json=_future_exam_payload(
            r13e_graph,
            class_key="class_a2",
            title="R13E Cross Branch Create Probe",
        ),
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()


def test_teacher_cannot_create_exam_in_foreign_tenant(
    app,
    client,
    r13e_graph,
):
    payload = _future_exam_payload(
        r13e_graph,
        class_key="class_b1",
        title="R13E Foreign Tenant Create Probe",
    )
    payload["subject_id"] = r13e_graph["subject_b"].id

    response = client.post(
        "/api/v1/exams",
        json=payload,
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()


def test_teacher_can_update_exam_in_assigned_class(
    app,
    client,
    r13e_graph,
):
    response = client.put(
        f'/api/v1/exams/{r13e_graph["exam_a1"].id}',
        json={"title": "R13E Authorized Teacher Update"},
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code == 200, response.get_json()

    payload = response.get_json()
    assert payload["success"] is True
    assert payload["exam"]["title"] == "R13E Authorized Teacher Update"


def test_teacher_cannot_update_unassigned_same_branch_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_a1_other"].id
    original_title = r13e_graph["exam_a1_other"].title

    response = client.put(
        f"/api/v1/exams/{exam_id}",
        json={"title": "R13E Unauthorized Same Branch Update"},
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code == 403, response.get_json()

    db.session.expire_all()
    exam = db.session.get(Exam, exam_id)

    assert exam is not None
    assert exam.title == original_title


def test_global_admin_role_cannot_expand_tenant_teacher_update_scope(
    app,
    client,
    r13e_graph,
):
    assert r13e_graph["teacher"].role == "admin"

    exam_id = r13e_graph["exam_a1_other"].id
    original_title = r13e_graph["exam_a1_other"].title

    response = client.put(
        f"/api/v1/exams/{exam_id}",
        json={"title": "R13E Global Role Update Probe"},
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code == 403, response.get_json()

    db.session.expire_all()
    exam = db.session.get(Exam, exam_id)

    assert exam is not None
    assert exam.title == original_title


def test_teacher_cannot_update_other_branch_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_a2"].id
    original_title = r13e_graph["exam_a2"].title

    response = client.put(
        f"/api/v1/exams/{exam_id}",
        json={"title": "R13E Cross Branch Update Probe"},
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()

    db.session.expire_all()
    exam = db.session.get(Exam, exam_id)

    assert exam is not None
    assert exam.title == original_title


def test_teacher_cannot_update_foreign_tenant_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_b1"].id
    original_title = r13e_graph["exam_b1"].title

    response = client.put(
        f"/api/v1/exams/{exam_id}",
        json={"title": "R13E Foreign Tenant Update Probe"},
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()

    db.session.expire_all()
    exam = db.session.get(Exam, exam_id)

    assert exam is not None
    assert exam.title == original_title


def test_teacher_delete_is_denied_by_rbac_even_for_assigned_class(
    app,
    client,
    r13e_graph,
):
    """
    Teacher role intentionally lacks exam.delete.

    This test preserves the RBAC contract rather than granting an
    artificial delete permission merely to exercise resource scope.
    """
    exam_id = r13e_graph["exam_a1"].id

    response = client.delete(
        f"/api/v1/exams/{exam_id}",
        headers=_teacher_headers(app, r13e_graph),
    )

    assert response.status_code == 403, response.get_json()

    db.session.expire_all()
    assert db.session.get(Exam, exam_id) is not None


def test_admin_can_update_same_branch_exam(
    app,
    client,
    r13e_graph,
):
    response = client.put(
        f'/api/v1/exams/{r13e_graph["exam_a1_other"].id}',
        json={"title": "R13E Admin Authorized Update"},
        headers=_admin_headers(app, r13e_graph),
    )

    assert response.status_code == 200, response.get_json()


def test_admin_cannot_update_other_branch_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_a2"].id
    original_title = r13e_graph["exam_a2"].title

    response = client.put(
        f"/api/v1/exams/{exam_id}",
        json={"title": "R13E Admin Cross Branch Probe"},
        headers=_admin_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()

    db.session.expire_all()
    exam = db.session.get(Exam, exam_id)

    assert exam is not None
    assert exam.title == original_title


def test_admin_cannot_update_foreign_tenant_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_b1"].id
    original_title = r13e_graph["exam_b1"].title

    response = client.put(
        f"/api/v1/exams/{exam_id}",
        json={"title": "R13E Admin Foreign Tenant Probe"},
        headers=_admin_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()

    db.session.expire_all()
    exam = db.session.get(Exam, exam_id)

    assert exam is not None
    assert exam.title == original_title


def test_admin_can_delete_same_branch_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_a1_other"].id

    response = client.delete(
        f"/api/v1/exams/{exam_id}",
        headers=_admin_headers(app, r13e_graph),
    )

    assert response.status_code == 200, response.get_json()

    db.session.expire_all()
    assert db.session.get(Exam, exam_id) is None


def test_admin_cannot_delete_other_branch_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_a2"].id

    response = client.delete(
        f"/api/v1/exams/{exam_id}",
        headers=_admin_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()

    db.session.expire_all()
    assert db.session.get(Exam, exam_id) is not None


def test_admin_cannot_delete_foreign_tenant_exam(
    app,
    client,
    r13e_graph,
):
    exam_id = r13e_graph["exam_b1"].id

    response = client.delete(
        f"/api/v1/exams/{exam_id}",
        headers=_admin_headers(app, r13e_graph),
    )

    assert response.status_code in {403, 404}, response.get_json()

    db.session.expire_all()
    assert db.session.get(Exam, exam_id) is not None
