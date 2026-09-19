"""R9D.2 enhanced-grading authorization regression."""

from uuid import uuid4

import pytest


pytestmark = pytest.mark.usefixtures("rbac_defaults")


def test_enhanced_create_rejects_unknown_tenant(
    client,
    teacher_headers,
):
    headers = dict(teacher_headers)
    headers["X-Tenant-ID"] = str(uuid4())

    response = client.post(
        "/api/v1/enhanced-grading/create-grade",
        json={},
        headers=headers,
    )

    assert response.status_code == 403
    body = response.get_json() or {}
    assert (
        body.get("message") == "Tenant access denied"
        or body.get("error") == "Tenant access denied"
    )


def test_enhanced_final_rejects_unknown_tenant(
    client,
    teacher_headers,
):
    headers = dict(teacher_headers)
    headers["X-Tenant-ID"] = str(uuid4())

    response = client.post(
        "/api/v1/enhanced-grading/calculate-final-grade",
        json={},
        headers=headers,
    )

    assert response.status_code == 403


def test_enhanced_student_analytics_rejects_unknown_tenant(
    client,
    teacher_headers,
):
    headers = dict(teacher_headers)
    headers["X-Tenant-ID"] = str(uuid4())

    response = client.get(
        "/api/v1/enhanced-grading/"
        "student-analytics/999999"
        "?academic_year=2026-2027",
        headers=headers,
    )

    assert response.status_code == 403


def test_enhanced_class_analytics_rejects_unknown_tenant(
    client,
    teacher_headers,
):
    headers = dict(teacher_headers)
    headers["X-Tenant-ID"] = str(uuid4())

    response = client.get(
        "/api/v1/enhanced-grading/"
        "class-analytics/999999",
        headers=headers,
    )

    assert response.status_code == 403


def test_enhanced_bulk_rejects_unknown_tenant(
    client,
    teacher_headers,
):
    headers = dict(teacher_headers)
    headers["X-Tenant-ID"] = str(uuid4())

    response = client.post(
        "/api/v1/enhanced-grading/"
        "bulk-calculate-final/999999",
        json={
            "term": "First Term",
            "academic_year": "2026-2027",
        },
        headers=headers,
    )

    assert response.status_code == 403


def test_ges_boundaries_remains_non_tenant_reference_endpoint(
    client,
    auth_headers,
):
    response = client.get(
        "/api/v1/enhanced-grading/"
        "ges-grade-boundaries",
        headers=auth_headers,
    )

    assert response.status_code == 200

    body = response.get_json()

    assert body["success"] is True
    assert "grade_boundaries" in body["data"]
