import pytest
import uuid
from datetime import datetime, date
from app.models.admission import AdmissionApplication
from app.models.parent import Parent
from app.models.class_ import Class
from app.models.tenant import Tenant
from app.models.user import User
from app.models.student import Student
from app.extensions import db

def test_admission_approval_success(auth_client, app):
    """Test that approving an admission application successfully creates a Student and User."""
    with app.app_context():
        # 1. Create a Tenant
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"Test Tenant {tenant_id.hex[:8]}",
            country_code="US",
            schema_name=f"schema_{tenant_id.hex[:8]}"
        )
        db.session.add(tenant)
        
        # 2. Create a Parent user and Parent record
        parent_user = User(
            username=f"parent_{uuid.uuid4().hex[:8]}",
            email=f"parent_{uuid.uuid4().hex[:8]}@example.com",
            role='parent'
        )
        parent_user.set_password('Password123!')
        db.session.add(parent_user)
        db.session.flush()
        
        parent = Parent(
            tenant_id=tenant.id,
            user_id=parent_user.id
        )
        db.session.add(parent)
        
        # 3. Create a Class record
        target_class = Class(
            tenant_id=tenant.id,
            name="Class 1A",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30
        )
        db.session.add(target_class)
        db.session.flush()
        
        # 4. Create an AdmissionApplication record
        application = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="Bobby",
            student_last_name="Appleseed",
            target_class_id=target_class.id,
            status="submitted",
            form_data={
                "gender": "male",
                "dob": "2015-05-15",
                "home_address": "123 Cherry Lane, Accra",
                "blood_group": "O+",
                "emergency_contact": "+233244123456",
                "middle_name": "Ray",
                "nationality": "Ghanaian"
            }
        )
        db.session.add(application)
        db.session.commit()
        
        app_id = application.id
        target_class_id = target_class.id
        parent_id = parent.id

    # Now make the approval review request using auth_client
    # Set the X-Tenant-ID header to target our tenant
    headers = {
        'X-Tenant-ID': str(tenant_id)
    }
    
    response = auth_client.post(
        f'/api/v1/admissions/application/{app_id}/review',
        json={
            'status': 'approved',
            'notes': 'Welcome to the school!'
        },
        headers=headers
    )
    
    assert response.status_code == 200
    assert response.json['success'] is True
    assert response.json['data']['status'] == 'approved'
    
    # Verify that the student and student user accounts were auto-provisioned
    with app.app_context():
        # Get the application
        app_rec = AdmissionApplication.query.get(app_id)
        assert app_rec.status == 'approved'
        
        # Get student
        student = Student.query.filter_by(first_name="Bobby", last_name="Appleseed").first()
        assert student is not None
        assert student.parent_id == parent_id
        assert student.class_id == target_class_id
        assert student.gender == "male"
        assert student.date_of_birth == date(2015, 5, 15)
        assert student.middle_name == "Ray"
        assert student.nationality == "Ghanaian"
        assert student.address == "123 Cherry Lane, Accra"
        assert student.residential_address == "123 Cherry Lane, Accra"
        assert student.blood_group == "O+"
        assert student.phone == "+233244123456"
        
        # Verify parent-student relationship collection is populated and not empty!
        parent_obj = Parent.query.get(parent_id)
        assert parent_obj is not None
        assert student in parent_obj.children
        
        # Verify user exists
        student_user = User.query.get(student.user_id)
        assert student_user is not None
        assert student_user.role == 'student'
        assert student_user.email == "bobby.appleseed@admipaedia.local"
        assert student_user.password_hash is not None
        assert student_user.status == 'pending_activation'
        assert student.status == 'pending_activation'

def test_admission_approval_failure_rollback(auth_client, app):
    """Test that missing required fields like date_of_birth cause a 500 error and roll back transaction."""
    with app.app_context():
        # 1. Create a Tenant
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"Test Tenant {tenant_id.hex[:8]}",
            country_code="US",
            schema_name=f"schema_{tenant_id.hex[:8]}"
        )
        db.session.add(tenant)
        
        # 2. Create a Parent user and Parent record
        parent_user = User(
            username=f"parent_{uuid.uuid4().hex[:8]}",
            email=f"parent_{uuid.uuid4().hex[:8]}@example.com",
            role='parent'
        )
        parent_user.set_password('Password123!')
        db.session.add(parent_user)
        db.session.flush()
        
        parent = Parent(
            tenant_id=tenant.id,
            user_id=parent_user.id
        )
        db.session.add(parent)
        
        # 3. Create a Class record
        target_class = Class(
            tenant_id=tenant.id,
            name="Class 1A",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30
        )
        db.session.add(target_class)
        db.session.flush()
        
        # 4. Create an AdmissionApplication record (WITHOUT date_of_birth in form_data)
        application = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="Failed",
            student_last_name="Rollback",
            target_class_id=target_class.id,
            status="submitted",
            form_data={
                "gender": "female"
                # Missing date_of_birth
            }
        )
        db.session.add(application)
        db.session.commit()
        
        app_id = application.id

    # Make the approval review request using auth_client
    headers = {
        'X-Tenant-ID': str(tenant_id)
    }
    
    from unittest.mock import patch
    with patch.object(db.session, 'rollback', wraps=db.session.rollback) as mock_rollback:
        response = auth_client.post(
            f'/api/v1/admissions/application/{app_id}/review',
            json={
                'status': 'approved',
                'notes': 'This should fail'
            },
            headers=headers
        )
    
    assert response.status_code == 500
    assert response.json['success'] is False
    assert "Student record generation failed" in response.json['message']
    assert mock_rollback.called
    
    # Verify that everything rolled back and no student or user records were generated
    with app.app_context():
        # No student record exists
        student = Student.query.filter_by(first_name="Failed", last_name="Rollback").first()
        assert student is None
        
        # No user account exists for this student
        student_email = f"failed.rollback.{app_id}@admipaedia.com"
        student_user = User.query.filter_by(email=student_email).first()
        assert student_user is None

from unittest.mock import patch

@patch('app.services.email_service.send_password_reset_email')
def test_admission_approval_with_email_and_token(mock_send_email, auth_client, app):
    """Test that approving an admission application with a student email triggers password token generation and email dispatch."""
    mock_send_email.return_value = True
    with app.app_context():
        # 1. Create a Tenant
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"Test Tenant {tenant_id.hex[:8]}",
            country_code="US",
            schema_name=f"schema_{tenant_id.hex[:8]}"
        )
        db.session.add(tenant)
        
        # 2. Create a Parent user and Parent record
        parent_user = User(
            username=f"parent_{uuid.uuid4().hex[:8]}",
            email=f"parent_{uuid.uuid4().hex[:8]}@example.com",
            role='parent'
        )
        parent_user.set_password('Password123!')
        db.session.add(parent_user)
        db.session.flush()
        
        parent = Parent(
            tenant_id=tenant.id,
            user_id=parent_user.id
        )
        db.session.add(parent)
        
        # 3. Create a Class record
        target_class = Class(
            tenant_id=tenant.id,
            name="Class 1A",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30
        )
        db.session.add(target_class)
        db.session.flush()
        
        # 4. Create an AdmissionApplication record
        application = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="Bobby",
            student_last_name="Appleseed",
            target_class_id=target_class.id,
            status="submitted",
            form_data={
                "gender": "male",
                "dob": "2015-05-15",
                "home_address": "123 Cherry Lane, Accra",
                "blood_group": "O+",
                "emergency_contact": "+233244123456",
                "middle_name": "Ray",
                "nationality": "Ghanaian",
                "student_email": "bobby_student@example.com"
            }
        )
        db.session.add(application)
        db.session.commit()
        
        app_id = application.id
        target_class_id = target_class.id
        parent_id = parent.id

    # Now make the approval review request using auth_client
    headers = {
        'X-Tenant-ID': str(tenant_id)
    }
    
    response = auth_client.post(
        f'/api/v1/admissions/application/{app_id}/review',
        json={
            'status': 'approved',
            'notes': 'Welcome to the school!'
        },
        headers=headers
    )
    
    assert response.status_code == 200
    assert response.json['success'] is True
    assert response.json['data']['status'] == 'approved'
    
    # Verify that the student and student user accounts were auto-provisioned
    with app.app_context():
        # Get the student
        student = Student.query.filter_by(first_name="Bobby", last_name="Appleseed").first()
        assert student is not None
        
        # Verify user exists and has a generated password reset token
        student_user = User.query.get(student.user_id)
        assert student_user is not None
        assert student_user.role == 'student'
        assert student_user.email == "bobby_student@example.com"
        assert student_user.password_hash is not None
        assert student_user.status == 'pending_activation'
        
        # Verify password token and expiration are generated straight into the database row!
        assert student_user.password_reset_token is not None
        assert len(student_user.password_reset_token) > 0
        assert student_user.password_reset_expires is not None
        
        # Verify mocked email dispatch was triggered successfully with correct arguments
        assert mock_send_email.called
        args, kwargs = mock_send_email.call_args
        assert args[0] == "bobby_student@example.com"
        # The second arg should be the raw token
        raw_token = args[1]
        assert len(raw_token) > 0
        
        # Verify database token matches the SHA-256 hash of raw_token
        import hashlib
        expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        assert student_user.password_reset_token == expected_hash

