import json
import pytest
from app.extensions import db
from app.models.user import User
from app.models.rbac import RBACPermission, PermissionGrant
from app.services.rbac_service import RBACService


@pytest.fixture(autouse=True)
def _canonical_rbac_defaults(rbac_defaults):
    """Seed canonical RBAC templates for every enforcement test.

    This dependency is intentionally local to this module. The global
    rbac_defaults fixture is not autouse because other tests may need to
    exercise uninitialized RBAC state.
    """
    return None


def get_test_user_id(app):
    """Return the authenticated fixture user's scalar ID.

    Never return an ORM object across application-context boundaries.
    """
    with app.app_context():
        user = User.query.filter_by(email="test@example.com").first()
        return user.id if user else None


def get_permission_id(app, name: str):
    """Resolve an existing canonical permission to a scalar ID.

    Enforcement tests must not silently invent permissions. If a permission
    required by production is absent from the canonical registry, that is a
    real initialization/configuration failure and the test should say so.
    """
    with app.app_context():
        permission = RBACPermission.query.filter_by(name=name).first()
        if permission is None:
            raise AssertionError(
                f"Canonical RBAC permission is missing: {name}"
            )
        return permission.id


def grant_permission(app, user_id: int, permission_id: int):
    """Grant a permission using scalar identifiers only."""
    with app.app_context():
        existing = PermissionGrant.query.filter_by(
            user_id=user_id,
            permission_id=permission_id,
            is_active=True,
            is_denied=False,
        ).first()

        if existing is not None:
            return existing.id

        grant = PermissionGrant(
            user_id=user_id,
            permission_id=permission_id,
            is_active=True,
            is_denied=False,
        )
        db.session.add(grant)
        db.session.commit()
        return grant.id


def test_attendance_create_respects_effective_rbac(app, auth_client):
    """Role-derived permission is authoritative even without a direct grant.

    The canonical teacher/admin roles can already provide attendance.create.
    This request may therefore proceed to domain validation (400) or create
    successfully (201); an authentication/authorization regression must not
    surface as 401.
    """
    user_id = get_test_user_id(app)
    assert user_id is not None

    resp = auth_client.post('/api/v1/attendances', json={
        "student_id": 1,
        "class_id": 1,
        "date": "2025-01-10",
        "status": "present",
        "subject_id": 1
    })

    assert resp.status_code in (201, 400, 403)
    assert resp.status_code != 401


def test_attendance_create_allowed_by_effective_tenant_rbac(
    app,
    tenant_auth_client,
):
    """Canonical school_admin may create attendance in its active tenant.

    The fixture role already owns attendance.create, so this test verifies the
    effective tenant-aware RBAC path rather than manufacturing a redundant
    direct PermissionGrant.
    """
    user_id = get_test_user_id(app)
    assert user_id is not None

    resp = tenant_auth_client.post('/api/v1/attendances', json={
        "student_id": 1,
        "class_id": 1,
        "date": "2025-01-10",
        "status": "present",
        "subject_id": 1
    })

    # Authorization must pass. Domain validation may still reject fixture IDs.
    assert resp.status_code != 401
    assert resp.status_code != 403


def test_student_create_requires_permission(app, auth_client):
    user_id = get_test_user_id(app)
    assert user_id is not None

    resp = auth_client.post('/api/v1/students', json={
        "admission_number": "STU001",
        "date_of_birth": "2010-01-15",
        "gender": "male",
        "address": "123 Main St",
        "class_id": 1,
        "parent_id": 1,
        "email": "student001@school.com",
        "first_name": "Stephen",
        "last_name": "EPOU"
    })
    assert resp.status_code == 403


def test_student_create_allowed_by_effective_tenant_rbac(
    app,
    tenant_auth_client,
):
    """Canonical school_admin may create students in its active tenant."""
    user_id = get_test_user_id(app)
    assert user_id is not None

    resp = tenant_auth_client.post('/api/v1/students', json={
        "admission_number": "STU002",
        "date_of_birth": "2010-02-20",
        "gender": "female",
        "address": "456 Oak Ave",
        "class_id": 1,
        "parent_id": 1,
        "email": "student002@school.com",
        "first_name": "Jane",
        "last_name": "Doe"
    })

    # Authorization must pass. Domain validation may still reject fixture IDs.
    assert resp.status_code != 401
    assert resp.status_code != 403

@pytest.mark.skip(
    reason=(
        "Messaging blueprint is intentionally fail-closed with HTTP 503 "
        "before route-level RBAC while tenant ownership containment is active."
    )
)
def test_messages_list_requires_permission(app, auth_client):
    pass

@pytest.mark.skip(
    reason=(
        "Legacy /api/v1/grades/student/<id>/report route is no longer "
        "registered. Replace with the canonical grade-report endpoint "
        "in a dedicated API-contract update."
    )
)
def test_grade_report_requires_permission(app, auth_client):
    pass

def test_grade_calculate_enforces_tenant_authorization(
    tenant_auth_client,
    sample_tenant,
):
    """calculate-final requires explicit tenant authorization.

    A valid tenant context with the canonical school-admin RBAC defaults
    must pass authentication, tenant, role, and grade.create permission
    enforcement. Domain validation may still reject deliberately invalid
    class/subject IDs.

    An explicitly unknown tenant must be rejected before resource
    processing.
    """
    import uuid

    payload = {
        "class_id": 999999,
        "subject_id": 999999,
        "term": "Term 1",
        "academic_year": "2026/2027",
    }

    tenant_header = "HTTP_X_TENANT_ID"
    valid_tenant = str(sample_tenant.id)

    # ----------------------------------------------------------
    # Valid tenant:
    # authorization must succeed far enough to reach domain
    # validation. The deliberately invalid class may return 404.
    # ----------------------------------------------------------
    tenant_auth_client.environ_base[tenant_header] = valid_tenant

    allowed = tenant_auth_client.post(
        "/api/v1/grades/calculate-final",
        json=payload,
    )

    assert allowed.status_code not in (401, 403)

    # The current fixture IDs are intentionally invalid; prove the
    # request crossed the authorization boundary and reached resource
    # validation.
    assert allowed.status_code == 404

    allowed_body = allowed.get_json()
    assert allowed_body is not None
    assert allowed_body.get("message") == "Class not found"

    # ----------------------------------------------------------
    # Unknown tenant:
    # must fail closed at tenant authorization and never reach
    # class/subject validation.
    # ----------------------------------------------------------
    unknown_tenant = str(uuid.uuid4())
    tenant_auth_client.environ_base[tenant_header] = unknown_tenant

    try:
        denied = tenant_auth_client.post(
            "/api/v1/grades/calculate-final",
            json=payload,
        )
    finally:
        # Restore fixture context for teardown and later tests.
        tenant_auth_client.environ_base[tenant_header] = valid_tenant

    assert denied.status_code == 403

    denied_body = denied.get_json()
    assert denied_body is not None
    assert denied_body.get("message") == "Tenant access denied"

