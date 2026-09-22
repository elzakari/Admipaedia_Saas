"""R9D.2A final-grade approval authorization."""

import pytest


pytestmark = pytest.mark.usefixtures("rbac_defaults")


def test_teacher_cannot_calculate_final_grade(
    client,
    teacher_headers,
):
    response = client.post(
        "/api/v1/enhanced-grading/calculate-final-grade",
        json={},
        headers=teacher_headers,
    )

    assert response.status_code == 403


def test_teacher_cannot_bulk_calculate_final_grades(
    client,
    teacher_headers,
):
    response = client.post(
        "/api/v1/enhanced-grading/bulk-calculate-final/999999",
        json={},
        headers=teacher_headers,
    )

    assert response.status_code == 403
