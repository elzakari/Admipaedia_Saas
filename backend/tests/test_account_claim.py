import pytest
import uuid
import hashlib
from datetime import datetime, timedelta, date
from app.models.user import User
from app.models.student import Student
from app.models.admission import AdmissionApplication
from app.models.class_ import Class
from app.models.tenant import Tenant
from app.models.parent import Parent
from app.extensions import db

def create_test_student(db_session, user_factory, tenant_id):
    user = user_factory('student')
    s = Student(
        tenant_id=tenant_id,
        user_id=user.id,
        admission_number=f"ADM-{datetime.now().year}-{uuid.uuid4().hex[:5].upper()}",
        first_name='Test',
        last_name=f"Student_{uuid.uuid4().hex[:6]}",
        date_of_birth=datetime(2010, 1, 1).date(),
        gender='male',
        email=user.email,
        status='active'
    )
    db_session.add(s)
    db_session.flush()
    return s

@pytest.mark.usefixtures('app_context', 'db_isolation')
def test_admissions_approval_pending_activation(app, db_session, client, auth_client, admin_auth_headers):
    """Test that approving an admission application creates a password-empty user with status 'pending_activation' and no spoofed email."""
    # 1. Create a Tenant
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        slug=f"slug-{tenant_id.hex[:8]}",
        name=f"Test Tenant {tenant_id.hex[:8]}",
        country_code="US",
        schema_name=f"schema_{tenant_id.hex[:8]}"
    )
    db_session.add(tenant)
    
    # 2. Create a Parent user and Parent record
    parent_user = User(
        username=f"parent_{uuid.uuid4().hex[:8]}",
        email=f"parent_{uuid.uuid4().hex[:8]}@example.com",
        role='parent'
    )
    parent_user.set_password('Password123!')
    db_session.add(parent_user)
    db_session.flush()
    
    parent = Parent(
        tenant_id=tenant.id,
        user_id=parent_user.id
    )
    db_session.add(parent)
    
    # 3. Create a Class record
    target_class = Class(
        tenant_id=tenant.id,
        name="Claim Test Class",
        grade_level="Primary 1",
        academic_year="2024/2025",
        capacity=30
    )
    db_session.add(target_class)
    db_session.flush()

    # Create an application without an email to test email-dropping/null email support
    app_data = {
        "gender": "male",
        "dob": "2015-05-18",
        "home_address": "123 Cherry Lane, Accra",
        "blood_group": "O+",
        "emergency_contact": "+233244123456",
        "middle_name": "Ray",
        "nationality": "Ghanaian"
    }

    application = AdmissionApplication(
        parent_id=parent.id,
        student_first_name="Bobby",
        student_last_name="Appleseed",
        status="submitted",
        form_data=app_data,
        target_class_id=target_class.id
    )
    db_session.add(application)
    db_session.commit()

    headers = {
        'X-Tenant-ID': str(tenant_id),
        'Authorization': admin_auth_headers['Authorization']
    }

    # Approve application
    response = auth_client.post(
        f"/api/v1/admissions/application/{application.id}/review",
        json={
            "status": "approved",
            "notes": "Approving for secure claim test"
        },
        headers=headers
    )
    assert response.status_code == 200
    assert response.json["success"] is True

    # Retrieve created student and user
    student = Student.query.filter_by(first_name="Bobby", last_name="Appleseed").first()
    assert student is not None
    assert student.status == "pending_activation"

    user = User.query.get(student.user_id)
    assert user is not None
    assert user.password_hash is None
    assert user.status == "pending_activation"
    assert user.email == "bobby.appleseed@admipaedia.local"  # Generates local routing alias!


@pytest.mark.usefixtures('app_context', 'db_isolation')
def test_generate_activation_link(app, db_session, client, auth_client, admin_auth_headers, user_factory):
    """Test that the activation link generator sets high-entropy tokens and hashes them correctly."""
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        slug=f"slug-{tenant_id.hex[:8]}",
        name=f"Test Tenant {tenant_id.hex[:8]}",
        country_code="US",
        schema_name=f"schema_{tenant_id.hex[:8]}"
    )
    db_session.add(tenant)
    db_session.flush()

    student = create_test_student(db_session, user_factory, tenant.id)
    user = student.user
    
    # Ensure the logged-in admin has membership in this tenant
    from app.models.tenant import TenantMembership
    admin_user = User.query.filter_by(email='test@example.com').first()
    membership = TenantMembership(
        user_id=admin_user.id,
        tenant_id=tenant.id,
        role='admin',
        status='active'
    )
    db_session.add(membership)
    db_session.flush()

    # Set status to pending_activation
    student.status = "pending_activation"
    user.status = "pending_activation"
    user.password_hash = None
    db_session.commit()

    headers = {
        'X-Tenant-ID': str(tenant_id),
        'Authorization': admin_auth_headers['Authorization']
    }

    # Generate activation
    response = auth_client.post(
        f"/api/v1/students/{student.id}/generate-activation",
        headers=headers
    )
    assert response.status_code == 200
    data = response.json
    assert data["success"] is True
    assert "url" in data
    assert "auth/claim-account?token=" in data["url"]

    # Extract token
    raw_token = data["url"].split("token=")[1]
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    # Re-fetch and assert hashes match
    db_session.refresh(student)
    db_session.refresh(user)

    assert student.invitation_token_hash == token_hash
    assert user.invitation_token_hash == token_hash
    assert student.invitation_expires_at is not None
    assert user.invitation_expires_at is not None
    
    # Expiration is within 48 hours bounds
    delta = student.invitation_expires_at - datetime.utcnow()
    assert delta.total_seconds() > 47 * 3600
    assert delta.total_seconds() <= 48 * 3600


@pytest.mark.usefixtures('app_context', 'db_isolation')
def test_claim_account_handshake_success(app, db_session, client, user_factory):
    """Test that claiming an account overwrites password, transitions status to active, and nullifies tokens."""
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        slug=f"slug-{tenant_id.hex[:8]}",
        name=f"Test Tenant {tenant_id.hex[:8]}",
        country_code="US",
        schema_name=f"schema_{tenant_id.hex[:8]}"
    )
    db_session.add(tenant)
    db_session.flush()

    student = create_test_student(db_session, user_factory, tenant.id)
    user = student.user

    # Setup pending activation details
    raw_token = "secure_activation_token_urlsafe_claim_test_handshake_flow"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=48)

    student.status = "pending_activation"
    student.invitation_token_hash = token_hash
    student.invitation_expires_at = expires_at

    user.status = "pending_activation"
    user.password_hash = None
    user.invitation_token_hash = token_hash
    user.invitation_expires_at = expires_at
    db_session.commit()

    # Claim account
    response = client.post(
        "/api/v1/auth/claim-account",
        json={
            "token": raw_token,
            "new_password": "Xy&7mK9pQ!",
            "confirm_password": "Xy&7mK9pQ!"
        }
    )
    assert response.status_code == 200
    assert response.json["success"] is True

    # Re-fetch and check fields
    db_session.refresh(student)
    db_session.refresh(user)

    assert student.status == "active"
    assert user.status == "active"
    assert user.password_hash is not None
    assert user.check_password_hash("Xy&7mK9pQ!") is True

    # Tokens nullified
    assert student.invitation_token_hash is None
    assert student.invitation_expires_at is None
    assert user.invitation_token_hash is None
    assert user.invitation_expires_at is None


@pytest.mark.usefixtures('app_context', 'db_isolation')
def test_claim_account_expired_token(app, db_session, client, user_factory):
    """Test that claiming an account with an expired token is forbidden."""
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        slug=f"slug-{tenant_id.hex[:8]}",
        name=f"Test Tenant {tenant_id.hex[:8]}",
        country_code="US",
        schema_name=f"schema_{tenant_id.hex[:8]}"
    )
    db_session.add(tenant)
    db_session.flush()

    student = create_test_student(db_session, user_factory, tenant.id)
    user = student.user

    # Setup expired pending activation details
    raw_token = "expired_activation_token"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() - timedelta(hours=1)  # already expired

    student.status = "pending_activation"
    student.invitation_token_hash = token_hash
    student.invitation_expires_at = expires_at

    user.status = "pending_activation"
    user.password_hash = None
    user.invitation_token_hash = token_hash
    user.invitation_expires_at = expires_at
    db_session.commit()

    # Claim account
    response = client.post(
        "/api/v1/auth/claim-account",
        json={
            "token": raw_token,
            "new_password": "Xy&7mK9pQ!",
            "confirm_password": "Xy&7mK9pQ!"
        }
    )
    assert response.status_code == 400
    assert response.json["success"] is False
    assert "invalid" in response.json["error"].lower() or "expired" in response.json["error"].lower()
