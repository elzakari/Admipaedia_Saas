import json
import pytest
from app.extensions import db
from app.models.user import User
from app.models.rbac import RBACPermission, PermissionGrant
from app.services.rbac_service import RBACService


def get_test_user(app):
    with app.app_context():
        return User.query.filter_by(email='test@example.com').first()


def ensure_permission(app, name: str):
    with app.app_context():
        perm = RBACPermission.query.filter_by(name=name).first()
        if not perm:
            # Create permission if it does not exist
            parts = name.split('.')
            resource = parts[0] if len(parts) > 0 else 'system'
            ptype = parts[1] if len(parts) > 1 else 'read'
            perm = RBACPermission(
                name=name,
                display_name=f"{resource.title()} {ptype.title()}",
                description=f"Auto-created permission for {name}",
                resource_type=resource,
                permission_type=ptype
            )
            db.session.add(perm)
            db.session.commit()
        return perm


def grant_permission(app, user: User, permission: RBACPermission):
    with app.app_context():
        grant = PermissionGrant(
            user_id=user.id,
            permission_id=permission.id,
            is_active=True,
            is_denied=False
        )
        db.session.add(grant)
        db.session.commit()
        return grant


def test_attendance_create_requires_permission(app, auth_client):
    user = get_test_user(app)
    assert user is not None

    # No grant: should be forbidden by RBAC decorator
    resp = auth_client.post('/api/v1/attendances', json={
        "student_id": 1,
        "class_id": 1,
        "date": "2025-01-10",
        "status": "present",
        "subject_id": 1
    })
    assert resp.status_code == 403
    data = resp.get_json()
    assert 'error' in data


def test_attendance_create_with_grant(app, auth_client):
    user = get_test_user(app)
    perm = ensure_permission(app, 'attendance.create')
    assert perm is not None
    grant_permission(app, user, perm)

    resp = auth_client.post('/api/v1/attendances', json={
        "student_id": 1,
        "class_id": 1,
        "date": "2025-01-10",
        "status": "present",
        "subject_id": 1
    })
    # RBAC should allow; response may be 201 or 400 due to domain validation
    assert resp.status_code != 403


def test_student_create_requires_permission(app, auth_client):
    user = get_test_user(app)
    assert user is not None

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


def test_student_create_with_grant(app, auth_client):
    user = get_test_user(app)
    perm = ensure_permission(app, 'student.create')
    assert perm is not None
    grant_permission(app, user, perm)

    resp = auth_client.post('/api/v1/students', json={
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
    # RBAC should allow; response may be 201 or 400 depending on domain constraints
    assert resp.status_code != 403

def test_messages_list_requires_permission(app, auth_client):
    user = get_test_user(app)
    resp = auth_client.get('/api/v1/messages')
    assert resp.status_code == 403
    perm = ensure_permission(app, 'message.read')
    grant_permission(app, user, perm)
    resp2 = auth_client.get('/api/v1/messages')
    assert resp2.status_code != 403

def test_grade_report_requires_permission(app, auth_client):
    user = get_test_user(app)
    resp = auth_client.get('/api/v1/grades/student/1/report')
    assert resp.status_code == 403
    perm = ensure_permission(app, 'grade.read')
    grant_permission(app, user, perm)
    resp2 = auth_client.get('/api/v1/grades/student/1/report')
    assert resp2.status_code != 403

def test_grade_calculate_requires_permission(app, auth_client):
    user = get_test_user(app)
    payload = {"student_id": 1, "class_id": 1, "subject_id": 1, "term": "Term 1", "academic_year": "2024/2025"}
    resp = auth_client.post('/api/v1/grades/calculate-final', json=payload)
    assert resp.status_code == 403
    perm = ensure_permission(app, 'grade.create')
    grant_permission(app, user, perm)
    resp2 = auth_client.post('/api/v1/grades/calculate-final', json=payload)
    assert resp2.status_code != 403
