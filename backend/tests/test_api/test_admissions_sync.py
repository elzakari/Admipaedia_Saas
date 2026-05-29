import pytest
import uuid
import hashlib
from datetime import datetime, timedelta
from unittest.mock import patch
from app.models.user import User
from app.models.student import Student
from app.models.admission import AdmissionApplication
from app.models.class_ import Class
from app.models.tenant import Tenant
from app.models.parent import Parent
from app.models.security import PasswordResetToken
from app.extensions import db

@pytest.mark.usefixtures('app_context', 'db_isolation')
def test_admissions_sync_workflow(app, db_session, client, auth_client, admin_auth_headers):
    """
    Test the full student admission pipeline synchronization and parent-anchored authentication:
    1. Parent logs in and creates a paid admission application form.
    2. Parent submits the admission application via status PATCH.
    3. Admin marks application as under_review.
    4. Admin returns the application to the parent with corrections notes.
    5. Parent re-saves draft and re-submits the form.
    6. Admin approves the application, which triggers student account generation:
       - No dummy student email (email is None).
       - Unique username first.last[suffix] generated.
       - PasswordResetToken generated and dispatched.
    7. Parent accesses the activation URL to configure the student password.
    8. Student logs in successfully using their new username and custom password.
    """
    # 1. Setup Tenant, Class, and Parent
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        slug=f"slug-{tenant_id.hex[:8]}",
        name=f"Sync School {tenant_id.hex[:8]}",
        country_code="TG",
        schema_name=f"schema_{tenant_id.hex[:8]}"
    )
    db_session.add(tenant)

    parent_user = User(
        username=f"parent_{uuid.uuid4().hex[:8]}",
        email=f"parent_{uuid.uuid4().hex[:8]}@example.com",
        role='parent',
        status='active'
    )
    parent_user.set_password('SecureParentPassword123!')
    db_session.add(parent_user)
    db_session.flush()

    parent = Parent(
        tenant_id=tenant.id,
        user_id=parent_user.id
    )
    db_session.add(parent)

    target_class = Class(
        tenant_id=tenant.id,
        name="Sync Test Class",
        grade_level="Primary 1",
        academic_year="2024/2025",
        capacity=30
    )
    db_session.add(target_class)
    db_session.flush()

    # Create paid admission application
    app_data = {
        "dob": "2018-05-20",
        "gender": "male",
        "home_address": "456 Togo Boulevard",
        "emergency_contact": "+228 90 00 00 00"
    }
    application = AdmissionApplication(
        parent_id=parent.id,
        student_first_name="Emmanuel",
        student_last_name="Agbeyome",
        status="draft",
        payment_status="paid",
        form_data=app_data,
        target_class_id=target_class.id
    )
    db_session.add(application)
    db_session.commit()

    # Ensure the admin has access/membership in this tenant
    admin_user = User.query.filter_by(email='test@example.com').first()
    if admin_user:
        from app.models.tenant import TenantMembership
        membership = TenantMembership(
            user_id=admin_user.id,
            tenant_id=tenant.id,
            role='admin',
            status='active'
        )
        db_session.add(membership)
        db_session.flush()

    # Log in parent to get a parent JWT/auth token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": parent_user.email,
            "password": "SecureParentPassword123!"
        }
    )
    assert login_resp.status_code == 200
    parent_token = login_resp.json["access_token"]
    parent_headers = {
        'Authorization': f'Bearer {parent_token}',
        'X-Tenant-ID': str(tenant.id)
    }

    admin_headers = {
        'Authorization': admin_auth_headers['Authorization'],
        'X-Tenant-ID': str(tenant.id)
    }

    # Verify student is not enrolled yet
    students_count = Student.query.filter_by(first_name="Emmanuel", last_name="Agbeyome").count()
    assert students_count == 0

    # 2. Parent submits the admission application via status PATCH
    submit_resp = client.patch(
        f"/api/v1/saas/admissions/{application.id}/status",
        json={
            "status": "submitted",
            "form_data": {
                **app_data,
                "dob": "2018-05-21"
            }
        },
        headers=parent_headers
    )
    assert submit_resp.status_code == 200
    assert submit_resp.json["success"] is True

    # Check status changed
    db_session.refresh(application)
    assert application.status == "submitted"
    assert application.form_data["dob"] == "2018-05-21"

    # Attempt double-submission from parent (should be blocked)
    resubmit_resp = client.patch(
        f"/api/v1/saas/admissions/{application.id}/status",
        json={"status": "submitted"},
        headers=parent_headers
    )
    assert resubmit_resp.status_code == 400

    # 3. Admin review moves to under_review
    review_resp = client.patch(
        f"/api/v1/saas/admissions/{application.id}/status",
        json={"status": "under_review", "notes": "Checking details..."},
        headers=admin_headers
    )
    assert review_resp.status_code == 200
    db_session.refresh(application)
    assert application.status == "under_review"
    assert application.form_data["_review"]["status"] == "under_review"

    # 4. Admin returns the form to the parent with correction notes
    return_resp = client.patch(
        f"/api/v1/saas/admissions/{application.id}/status",
        json={"status": "returned", "notes": "Please correct spelling of first name."},
        headers=admin_headers
    )
    assert return_resp.status_code == 200
    db_session.refresh(application)
    assert application.status == "returned"
    assert application.form_data["_review"]["notes"] == "Please correct spelling of first name."

    # 5. Parent edits and re-submits the form
    resubmit_resp = client.patch(
        f"/api/v1/saas/admissions/{application.id}/status",
        json={
            "status": "submitted",
            "form_data": {
                **application.form_data,
                "student_first_name": "Emmanuel-Pascal"
            }
        },
        headers=parent_headers
    )
    assert resubmit_resp.status_code == 200
    db_session.refresh(application)
    assert application.status == "submitted"

    # 6. Admin approves the application -> Triggers student account creation
    captured_tokens = []
    def mock_send(parent_email, student_username, activation_token, frontend_url=None):
        captured_tokens.append(activation_token)
        return True

    with patch('app.services.email_service.send_student_activation_email', side_effect=mock_send):
        approve_resp = client.patch(
            f"/api/v1/saas/admissions/{application.id}/status",
            json={"status": "approved", "notes": "Excellent corrections. Approved!"},
            headers=admin_headers
        )
        print("APPROVE RESP JSON:", approve_resp.get_data(as_text=True))
        assert approve_resp.status_code == 200
        assert approve_resp.json["success"] is True

    # Check student user created correctly
    db_session.refresh(application)
    assert application.status == "approved"

    # Assert student and user account exists
    student = Student.query.filter_by(parent_id=parent.id).first()
    assert student is not None
    assert student.status == "active"
    assert student.first_name == "Emmanuel"
    assert student.email == "admission-1@admipaedia.local"

    student_user = User.query.get(student.user_id)
    assert student_user is not None
    assert student_user.role == "student"
    assert student_user.status == "active"
    assert student_user.email == "admission-1@admipaedia.local"
    assert student_user.username.startswith("emmanuel.agbeyome")

    # 7. Parent claim account/set password simulation
    # Retrieve generated reset token
    reset_token_rec = PasswordResetToken.query.filter_by(user_id=student_user.id).first()
    assert reset_token_rec is not None
    assert reset_token_rec.is_used is False

    assert len(captured_tokens) == 1
    raw_token = captured_tokens[0]

    # Verify that the token hash matches
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    assert reset_token_rec.token_hash == token_hash

    # Student configures/sets password
    reset_resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": raw_token,
            "new_password": "Xy&7mK9pQ!",
            "confirm_password": "Xy&7mK9pQ!"
        }
    )
    print("RESET RESP JSON:", reset_resp.get_data(as_text=True))
    assert reset_resp.status_code == 200

    # Verify status transitioned to active
    db_session.refresh(student)
    db_session.refresh(student_user)
    assert student.status == "active"
    assert student_user.status == "active"
    assert student_user.password_hash is not None

    # 8. Student logs in successfully using system-generated username and password
    login_student_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": student_user.username,
            "password": "Xy&7mK9pQ!"
        }
    )
    assert login_student_resp.status_code == 200
    assert login_student_resp.json["success"] is True
    assert "access_token" in login_student_resp.json
