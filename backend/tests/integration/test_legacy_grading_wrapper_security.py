from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.extensions import db
from app.models.tenant import TenantMembership
from app.models.user import User


pytestmark = pytest.mark.usefixtures("rbac_defaults")


GRADE_URL = "/api/v1/grading/student/1/grade"
FINAL_URL = "/api/v1/grading/student/1/final-grade"


def _grade_payload():
    return {
        "subject_id": 1,
        "class_id": 1,
        "assessment_type_id": 1,
        "grading_scheme_id": 1,
        "raw_score": 80,
        "total_marks": 100,
        "assessment_name": "R10 Legacy Assessment",
        "assessment_date": "2026-09-14",
        "term": "Term 1",
        "academic_year": "2026-2027",
    }


def _final_payload():
    return {
        "subject_id": 1,
        "class_id": 1,
        "grading_scheme_id": 1,
        "term": "Term 1",
        "academic_year": "2026-2027",
        "external_score": 80,
    }


def _service_grade():
    return SimpleNamespace(
        id=901,
        grade_symbol="A",
        grade_points=4.0,
        percentage=80.0,
        weight=1.0,
    )


def _service_final_grade():
    return SimpleNamespace(
        id=902,
        class_score_average=75.0,
        external_exam_score=80.0,
        final_percentage=78.0,
        final_grade_symbol="A",
        final_grade_points=4.0,
    )


def _canonical_admin(db_session):
    """
    admin_headers is backed by this exact canonical test user.

    Do not create a second admin user here: the purpose of these
    tests is to mutate/probe the membership belonging to the same
    authenticated principal represented by admin_headers.
    """
    return (
        db_session.query(User)
        .filter_by(email="test@example.com")
        .one()
    )


def _unknown_tenant_headers(
    admin_headers,
):
    """
    Preserve the canonical tracked access JWT and change only the
    requested tenant context.

    This mirrors the production tenant-selection contract:
        Authorization -> authenticated user
        X-Tenant-ID   -> requested tenant context

    The random tenant has no active membership for the authenticated
    admin, therefore tenant_required must reject the request before
    EnhancedGradingService executes.
    """
    headers = dict(admin_headers)
    headers["X-Tenant-ID"] = str(uuid4())
    return headers


def _deactivate_admin_membership(
    db_session,
    sample_tenant,
):
    admin_user = _canonical_admin(
        db_session
    )

    membership = (
        db_session.query(TenantMembership)
        .filter_by(
            user_id=admin_user.id,
            tenant_id=sample_tenant.id,
        )
        .one()
    )

    assert membership.status == "active"

    membership.status = "inactive"
    db_session.commit()

    return admin_user, membership


def test_unknown_tenant_cannot_reach_legacy_grade_service(
    client,
    admin_headers,
):
    headers = _unknown_tenant_headers(
        admin_headers
    )

    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.create_enhanced_grade"
    ) as service:
        response = client.post(
            GRADE_URL,
            headers=headers,
            json=_grade_payload(),
        )

    assert response.status_code == 403, response.get_json()
    service.assert_not_called()


def test_unknown_tenant_cannot_reach_legacy_final_service(
    client,
    admin_headers,
):
    headers = _unknown_tenant_headers(
        admin_headers
    )

    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.calculate_final_grade"
    ) as service:
        response = client.post(
            FINAL_URL,
            headers=headers,
            json=_final_payload(),
        )

    assert response.status_code == 403, response.get_json()
    service.assert_not_called()


def test_valid_admin_legacy_grade_propagates_tenant(
    client,
    admin_headers,
    sample_tenant,
):
    fake_grade = _service_grade()

    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.create_enhanced_grade",
        return_value=(fake_grade, None),
    ) as service:
        response = client.post(
            GRADE_URL,
            headers=admin_headers,
            json=_grade_payload(),
        )

    assert response.status_code == 201, response.get_json()

    service.assert_called_once()

    kwargs = service.call_args.kwargs

    assert kwargs["tenant_id"] == sample_tenant.id
    assert kwargs["student_id"] == 1
    assert kwargs["subject_id"] == 1
    assert kwargs["class_id"] == 1
    assert kwargs["grading_scheme_id"] == 1


def test_valid_admin_legacy_final_propagates_tenant(
    client,
    admin_headers,
    sample_tenant,
):
    fake_final = _service_final_grade()

    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.calculate_final_grade",
        return_value=(fake_final, None),
    ) as service:
        response = client.post(
            FINAL_URL,
            headers=admin_headers,
            json=_final_payload(),
        )

    assert response.status_code == 201, response.get_json()

    service.assert_called_once()

    kwargs = service.call_args.kwargs

    assert kwargs["tenant_id"] == sample_tenant.id
    assert kwargs["student_id"] == 1
    assert kwargs["subject_id"] == 1
    assert kwargs["class_id"] == 1
    assert kwargs["grading_scheme_id"] == 1


def test_teacher_can_use_legacy_grade_create(
    client,
    teacher_headers,
    sample_tenant,
):
    fake_grade = _service_grade()

    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.create_enhanced_grade",
        return_value=(fake_grade, None),
    ) as service:
        response = client.post(
            GRADE_URL,
            headers=teacher_headers,
            json=_grade_payload(),
        )

    assert response.status_code == 201, response.get_json()

    service.assert_called_once()

    assert (
        service.call_args.kwargs["tenant_id"]
        == sample_tenant.id
    )


def test_teacher_cannot_use_legacy_final_approval(
    client,
    teacher_headers,
):
    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.calculate_final_grade"
    ) as service:
        response = client.post(
            FINAL_URL,
            headers=teacher_headers,
            json=_final_payload(),
        )

    assert response.status_code == 403, response.get_json()
    service.assert_not_called()


def test_inactive_membership_cannot_reach_legacy_grade_service(
    client,
    db_session,
    sample_tenant,
    admin_headers,
):
    _deactivate_admin_membership(
        db_session,
        sample_tenant,
    )

    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.create_enhanced_grade"
    ) as service:
        response = client.post(
            GRADE_URL,
            headers=admin_headers,
            json=_grade_payload(),
        )

    assert response.status_code == 403, response.get_json()
    service.assert_not_called()


def test_inactive_membership_cannot_reach_legacy_final_service(
    client,
    db_session,
    sample_tenant,
    admin_headers,
):
    _deactivate_admin_membership(
        db_session,
        sample_tenant,
    )

    with patch(
        "app.api.v1.grading.routes."
        "EnhancedGradingService.calculate_final_grade"
    ) as service:
        response = client.post(
            FINAL_URL,
            headers=admin_headers,
            json=_final_payload(),
        )

    assert response.status_code == 403, response.get_json()
    service.assert_not_called()
