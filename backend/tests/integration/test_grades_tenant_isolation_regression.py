from datetime import datetime, timedelta
import uuid

import pytest

from app.extensions import db
from app.models.class_ import Class
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.subject import Subject
from app.models.tenant import Tenant
from app.models.user import User


pytestmark = pytest.mark.usefixtures("rbac_defaults")


def _tenant(db_session, prefix):
    tenant = Tenant(
        name=f"{prefix} School",
        slug=f"{prefix.lower()}-{uuid.uuid4().hex[:8]}",
        country_code="GH",
        currency="GHS",
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
    )
    db_session.add(tenant)
    db_session.flush()
    return tenant


def _class(db_session, tenant_id, name):
    row = Class(
        tenant_id=tenant_id,
        name=name,
        grade_level="Grade 10",
        academic_year="2024/2025",
        status="active",
    )
    db_session.add(row)
    db_session.flush()
    return row


def _subject(db_session, tenant_id, prefix):
    row = Subject(
        tenant_id=tenant_id,
        name=f"{prefix} Mathematics",
        code=f"{prefix[:3].upper()}{uuid.uuid4().hex[:5].upper()}",
    )
    db_session.add(row)
    db_session.flush()
    return row


def _exam(
    db_session,
    class_id,
    subject_id,
    created_by,
    title,
):
    row = Exam(
        title=title,
        subject_id=subject_id,
        class_id=class_id,
        exam_date=datetime.utcnow() + timedelta(days=7),
        duration=60,
        total_marks=100,
        passing_marks=40,
        created_by=created_by,
    )
    db_session.add(row)
    db_session.flush()
    return row


@pytest.fixture
def r9c_world(
    db_session,
    sample_tenant,
    sample_class,
    student_factory,
    admin_headers,
):
    """
    Build two independent tenant ownership graphs.

    Tenant A is the authenticated sample tenant.
    Tenant B is deliberately NOT added to the authenticated user's
    memberships.
    """
    tenant_a = sample_tenant

    tenant_b = _tenant(
        db_session,
        "Foreign",
    )

    class_a = sample_class

    class_a2 = _class(
        db_session,
        tenant_a.id,
        "Tenant A Other Class",
    )

    class_b = _class(
        db_session,
        tenant_b.id,
        "Tenant B Class",
    )

    subject_a = _subject(
        db_session,
        tenant_a.id,
        "Local",
    )

    subject_b = _subject(
        db_session,
        tenant_b.id,
        "Foreign",
    )

    student_a = student_factory(
        tenant_id=tenant_a.id,
        class_id=class_a.id,
    )

    wrong_class_student = student_factory(
        tenant_id=tenant_a.id,
        class_id=class_a2.id,
    )

    foreign_student = student_factory(
        tenant_id=tenant_b.id,
        class_id=class_b.id,
    )

    # admin_headers owns the canonical authenticated admin user.
    admin_user = db_session.query(User).filter_by(
        email="test@example.com"
    ).one()

    valid_exam = _exam(
        db_session,
        class_a.id,
        subject_a.id,
        admin_user.id,
        "Tenant A Valid Exam",
    )

    foreign_class_exam = _exam(
        db_session,
        class_b.id,
        subject_b.id,
        admin_user.id,
        "Foreign Class Exam",
    )

    # Deliberately inconsistent ownership graph:
    # local class + foreign subject.
    foreign_subject_exam = _exam(
        db_session,
        class_a.id,
        subject_b.id,
        admin_user.id,
        "Foreign Subject Exam",
    )

    db_session.commit()

    return {
        "tenant_a": tenant_a,
        "tenant_b": tenant_b,
        "class_a": class_a,
        "class_a2": class_a2,
        "class_b": class_b,
        "subject_a": subject_a,
        "subject_b": subject_b,
        "student_a": student_a,
        "wrong_class_student": wrong_class_student,
        "foreign_student": foreign_student,
        "valid_exam": valid_exam,
        "foreign_class_exam": foreign_class_exam,
        "foreign_subject_exam": foreign_subject_exam,
        "headers": dict(admin_headers),
    }


def _root_payload(student_id, exam_id):
    return {
        "student_id": student_id,
        "exam_id": exam_id,
        "marks_obtained": 80,
        "remarks": "R9C isolation test",
    }


def _bulk_payload(exam_id, student_id):
    return {
        "exam_id": exam_id,
        "grades": [
            {
                "student_id": student_id,
                "marks_obtained": 80,
                "remarks": "R9C isolation test",
            }
        ],
    }


def test_root_grade_positive_control(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades",
        headers=w["headers"],
        json=_root_payload(
            w["student_a"].id,
            w["valid_exam"].id,
        ),
    )

    assert response.status_code == 201

    grade = Grade.query.filter_by(
        student_id=w["student_a"].id,
        exam_id=w["valid_exam"].id,
    ).first()

    assert grade is not None


def test_root_grade_rejects_foreign_student(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades",
        headers=w["headers"],
        json=_root_payload(
            w["foreign_student"].id,
            w["valid_exam"].id,
        ),
    )

    assert response.status_code == 404

    assert Grade.query.filter_by(
        student_id=w["foreign_student"].id,
        exam_id=w["valid_exam"].id,
    ).first() is None


def test_root_grade_rejects_exam_owned_by_foreign_class(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades",
        headers=w["headers"],
        json=_root_payload(
            w["student_a"].id,
            w["foreign_class_exam"].id,
        ),
    )

    assert response.status_code == 404

    assert Grade.query.filter_by(
        student_id=w["student_a"].id,
        exam_id=w["foreign_class_exam"].id,
    ).first() is None


def test_root_grade_rejects_exam_owned_by_foreign_subject(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades",
        headers=w["headers"],
        json=_root_payload(
            w["student_a"].id,
            w["foreign_subject_exam"].id,
        ),
    )

    assert response.status_code == 404

    assert Grade.query.filter_by(
        student_id=w["student_a"].id,
        exam_id=w["foreign_subject_exam"].id,
    ).first() is None


def test_bulk_positive_control_writes_local_student(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades/bulk",
        headers=w["headers"],
        json=_bulk_payload(
            w["valid_exam"].id,
            w["student_a"].id,
        ),
    )

    assert response.status_code == 200

    grade = Grade.query.filter_by(
        student_id=w["student_a"].id,
        exam_id=w["valid_exam"].id,
    ).first()

    assert grade is not None


def test_bulk_skips_foreign_student_without_write(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades/bulk",
        headers=w["headers"],
        json=_bulk_payload(
            w["valid_exam"].id,
            w["foreign_student"].id,
        ),
    )

    assert response.status_code == 200

    assert Grade.query.filter_by(
        student_id=w["foreign_student"].id,
        exam_id=w["valid_exam"].id,
    ).first() is None


def test_bulk_skips_same_tenant_wrong_class_student(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades/bulk",
        headers=w["headers"],
        json=_bulk_payload(
            w["valid_exam"].id,
            w["wrong_class_student"].id,
        ),
    )

    assert response.status_code == 200

    assert Grade.query.filter_by(
        student_id=w["wrong_class_student"].id,
        exam_id=w["valid_exam"].id,
    ).first() is None


def test_bulk_rejects_foreign_exam_class(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades/bulk",
        headers=w["headers"],
        json=_bulk_payload(
            w["foreign_class_exam"].id,
            w["student_a"].id,
        ),
    )

    assert response.status_code == 404

    assert Grade.query.filter_by(
        student_id=w["student_a"].id,
        exam_id=w["foreign_class_exam"].id,
    ).first() is None


def test_bulk_rejects_foreign_exam_subject(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.post(
        "/api/v1/grades/bulk",
        headers=w["headers"],
        json=_bulk_payload(
            w["foreign_subject_exam"].id,
            w["student_a"].id,
        ),
    )

    assert response.status_code == 404

    assert Grade.query.filter_by(
        student_id=w["student_a"].id,
        exam_id=w["foreign_subject_exam"].id,
    ).first() is None


def test_analytics_positive_control_crosses_tenant_boundary(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.get(
        (
            f"/api/v1/grades/analytics/class/{w['class_a'].id}"
            f"?subject_id={w['subject_a'].id}"
            "&term=First%20Term"
            "&academic_year=2024/2025"
        ),
        headers=w["headers"],
    )

    # Empty analytics data is valid. The positive control proves
    # authorization and tenant ownership checks did not reject the
    # authenticated tenant's resources.
    assert response.status_code == 200

    payload = response.get_json()
    assert payload["success"] is True


def test_analytics_rejects_foreign_class(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.get(
        (
            f"/api/v1/grades/analytics/class/{w['class_b'].id}"
            f"?subject_id={w['subject_b'].id}"
        ),
        headers=w["headers"],
    )

    assert response.status_code == 404


def test_analytics_rejects_foreign_subject(
    client,
    r9c_world,
):
    w = r9c_world

    response = client.get(
        (
            f"/api/v1/grades/analytics/class/{w['class_a'].id}"
            f"?subject_id={w['subject_b'].id}"
        ),
        headers=w["headers"],
    )

    assert response.status_code == 404
