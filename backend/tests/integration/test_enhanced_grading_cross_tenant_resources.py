from datetime import date
from uuid import uuid4

import pytest

from app.extensions import db
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.student import Student
from app.models.user import User
from app.models.tenant import Tenant, TenantMembership
from app.models.grading_system import (
    GradingScheme,
    GradingStandard,
)
from app.models.grading_system import EnhancedGrade, FinalGrade
from app.extensions import bcrypt


pytestmark = pytest.mark.usefixtures("rbac_defaults")


def _tenant(prefix):
    suffix = uuid4().hex[:8]

    tenant = Tenant(
        id=uuid4(),
        slug=f"{prefix.lower()}-{suffix}",
        name=f"{prefix} School",
        country_code="GH",
        currency="GHS",
        schema_name=f"{prefix.lower()}_{suffix}",
        status="active",
    )

    db.session.add(tenant)
    db.session.flush()

    return tenant


def _class(tenant, prefix):
    row = Class(
        tenant_id=tenant.id,
        name=f"{prefix} Class",
        grade_level="Grade 10",
        academic_year="2026-2027",
        status="active",
    )

    db.session.add(row)
    db.session.flush()

    return row


def _subject(tenant, prefix):
    row = Subject(
        tenant_id=tenant.id,
        name=f"{prefix} Mathematics",
        code=f"{prefix[:3].upper()}{uuid4().hex[:6].upper()}",
    )

    db.session.add(row)
    db.session.flush()

    return row


def _scheme(tenant, prefix):
    row = GradingScheme(
        tenant_id=tenant.id,
        name=f"{prefix} Scheme",
        standard=GradingStandard.INTERNAL_EXAM,
        is_active=True,
        is_default=False,
        class_score_weight=40,
        external_exam_weight=60,
    )

    db.session.add(row)
    db.session.flush()

    return row


def _student(tenant, class_obj, prefix):
    user = User(
        username=f"{prefix}_{uuid4().hex[:8]}",
        email=f"{prefix}_{uuid4().hex[:8]}@example.com",
        password_hash=bcrypt.generate_password_hash(
            "Password123!"
        ).decode("utf-8"),
        role="student",
        status="active",
    )

    db.session.add(user)
    db.session.flush()

    row = Student(
        tenant_id=tenant.id,
        user_id=user.id,
        class_id=class_obj.id,
        admission_number=f"{prefix.upper()}-{uuid4().hex[:8]}",
        first_name=prefix.title(),
        last_name="Student",
        date_of_birth=date(2011, 1, 1),
        gender="male",
        status="active",
    )

    db.session.add(row)
    db.session.flush()

    return row


def _count_rows():
    return (
        EnhancedGrade.query.count(),
        FinalGrade.query.count(),
    )


def _base_payload(student, subject, class_obj, scheme):
    return {
        "student_id": student.id,
        "subject_id": subject.id,
        "class_id": class_obj.id,
        "assessment_type_id": 1,
        "grading_scheme_id": scheme.id,
        "raw_score": 80,
        "total_marks": 100,
        "assessment_name": "R9D4 Assessment",
        "assessment_date": "2026-09-14",
        "term": "Term 1",
        "academic_year": "2026-2027",
    }


@pytest.fixture
def r9d4_world(
    db_session,
    sample_tenant,
    admin_headers,
):
    local_class = _class(
        sample_tenant,
        "Local",
    )

    local_subject = _subject(
        sample_tenant,
        "Local",
    )

    local_scheme = _scheme(
        sample_tenant,
        "Local",
    )

    local_student = _student(
        sample_tenant,
        local_class,
        "local",
    )

    foreign_tenant = _tenant(
        "R9D4 Foreign",
    )

    foreign_class = _class(
        foreign_tenant,
        "Foreign",
    )

    foreign_subject = _subject(
        foreign_tenant,
        "Foreign",
    )

    foreign_scheme = _scheme(
        foreign_tenant,
        "Foreign",
    )

    foreign_student = _student(
        foreign_tenant,
        foreign_class,
        "foreign",
    )

    db.session.commit()

    return {
        "headers": admin_headers,
        "tenant": sample_tenant,
        "local_class": local_class,
        "local_subject": local_subject,
        "local_scheme": local_scheme,
        "local_student": local_student,
        "foreign_tenant": foreign_tenant,
        "foreign_class": foreign_class,
        "foreign_subject": foreign_subject,
        "foreign_scheme": foreign_scheme,
        "foreign_student": foreign_student,
    }


def test_create_rejects_foreign_class_without_write(
    client,
    r9d4_world,
):
    w = r9d4_world

    before = _count_rows()

    payload = _base_payload(
        w["local_student"],
        w["local_subject"],
        w["local_class"],
        w["local_scheme"],
    )

    payload["class_id"] = w["foreign_class"].id

    response = client.post(
        "/api/v1/enhanced-grading/create-grade",
        headers=w["headers"],
        json=payload,
    )

    assert response.status_code == 400
    assert _count_rows() == before


def test_create_rejects_foreign_subject_without_write(
    client,
    r9d4_world,
):
    w = r9d4_world

    before = _count_rows()

    payload = _base_payload(
        w["local_student"],
        w["local_subject"],
        w["local_class"],
        w["local_scheme"],
    )

    payload["subject_id"] = w["foreign_subject"].id

    response = client.post(
        "/api/v1/enhanced-grading/create-grade",
        headers=w["headers"],
        json=payload,
    )

    assert response.status_code == 400
    assert _count_rows() == before


def test_create_rejects_foreign_scheme_without_write(
    client,
    r9d4_world,
):
    w = r9d4_world

    before = _count_rows()

    payload = _base_payload(
        w["local_student"],
        w["local_subject"],
        w["local_class"],
        w["local_scheme"],
    )

    payload["grading_scheme_id"] = w["foreign_scheme"].id

    response = client.post(
        "/api/v1/enhanced-grading/create-grade",
        headers=w["headers"],
        json=payload,
    )

    assert response.status_code == 400
    assert _count_rows() == before


def test_final_grade_rejects_foreign_subject_without_write(
    client,
    r9d4_world,
):
    w = r9d4_world

    before = _count_rows()

    response = client.post(
        "/api/v1/enhanced-grading/calculate-final-grade",
        headers=w["headers"],
        json={
            "student_id": w["local_student"].id,
            "subject_id": w["foreign_subject"].id,
            "class_id": w["local_class"].id,
            "term": "Term 1",
            "academic_year": "2026-2027",
            "external_exam_score": 80,
            "grading_scheme_id": w["local_scheme"].id,
        },
    )

    assert response.status_code == 400
    assert _count_rows() == before


def test_final_grade_rejects_foreign_scheme_without_write(
    client,
    r9d4_world,
):
    w = r9d4_world

    before = _count_rows()

    response = client.post(
        "/api/v1/enhanced-grading/calculate-final-grade",
        headers=w["headers"],
        json={
            "student_id": w["local_student"].id,
            "subject_id": w["local_subject"].id,
            "class_id": w["local_class"].id,
            "term": "Term 1",
            "academic_year": "2026-2027",
            "external_exam_score": 80,
            "grading_scheme_id": w["foreign_scheme"].id,
        },
    )

    assert response.status_code == 400
    assert _count_rows() == before


def test_class_analytics_rejects_foreign_class(
    client,
    r9d4_world,
):
    w = r9d4_world

    response = client.get(
        (
            "/api/v1/enhanced-grading/"
            f"class-analytics/{w['foreign_class'].id}"
            "?academic_year=2026-2027"
        ),
        headers=w["headers"],
    )

    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "class" in data["message"].lower()


def test_class_analytics_rejects_foreign_subject(
    client,
    r9d4_world,
):
    w = r9d4_world

    response = client.get(
        (
            "/api/v1/enhanced-grading/"
            f"class-analytics/{w['local_class'].id}"
            f"?subject_id={w['foreign_subject'].id}"
            "&academic_year=2026-2027"
        ),
        headers=w["headers"],
    )

    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "subject" in data["message"].lower()
