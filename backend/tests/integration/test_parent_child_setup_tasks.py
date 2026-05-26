import pytest
import uuid
from datetime import datetime
from app.models.user import User
from app.models.student import Student
from app.models.admission import AdmissionApplication
from app.models.class_ import Class
from app.models.tenant import Tenant
from app.models.parent import Parent, ParentChildSetupTask
from app.extensions import db

@pytest.mark.usefixtures('app_context', 'db_isolation')
def test_parent_child_setup_tasks_workflow(app, db_session, client, auth_client, admin_auth_headers):
    """Test the end-to-end integration workflow for parent child setup tasks."""
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
    db_session.flush()

    # 2. Create a Parent user and Parent record
    parent_email = f"parent_{uuid.uuid4().hex[:8]}@example.com"
    parent_password = "Password123!"
    parent_user = User(
        username=f"parent_{uuid.uuid4().hex[:8]}",
        email=parent_email,
        role='parent'
    )
    parent_user.set_password(parent_password)
    db_session.add(parent_user)
    db_session.flush()
    
    parent = Parent(
        tenant_id=tenant.id,
        user_id=parent_user.id
    )
    db_session.add(parent)
    db_session.flush()
    
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

    # 4. Create an Admission Application
    app_data = {
        "gender": "male",
        "dob": "2015-05-18",
        "home_address": "123 Cherry Lane",
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

    # 5. Approve application to trigger task generation
    headers = {
        'X-Tenant-ID': str(tenant_id),
        'Authorization': admin_auth_headers['Authorization']
    }

    response = auth_client.post(
        f"/api/v1/admissions/application/{application.id}/review",
        json={
            "status": "approved",
            "notes": "Approving application"
        },
        headers=headers
    )
    assert response.status_code == 200
    assert response.json["success"] is True

    # 6. Verify setup task was created in DB
    student = Student.query.filter_by(first_name="Bobby", last_name="Appleseed").first()
    assert student is not None

    setup_task = ParentChildSetupTask.query.filter_by(
        parent_id=parent.id,
        student_id=student.id
    ).first()
    assert setup_task is not None
    assert setup_task.status == 'pending'
    assert setup_task.task_type == 'child_setup'
    assert setup_task.tenant_id == tenant.id

    # 7. Authenticate as the Parent user
    login_resp = client.post('/api/v1/auth/login', json={
        'email': parent_email,
        'password': parent_password
    })
    assert login_resp.status_code == 200
    parent_token = login_resp.json['access_token']
    parent_headers = {
        'Authorization': f'Bearer {parent_token}',
        'X-Tenant-ID': str(tenant_id)
    }

    # 8. Query GET /setup-tasks as parent
    tasks_resp = client.get('/api/v1/portal/setup-tasks', headers=parent_headers)
    assert tasks_resp.status_code == 200
    assert tasks_resp.json['success'] is True
    assert len(tasks_resp.json['tasks']) == 1
    
    task_data = tasks_resp.json['tasks'][0]
    assert task_data['id'] == setup_task.id
    assert task_data['student_id'] == student.id
    assert task_data['status'] == 'pending'
    assert task_data['task_type'] == 'child_setup'

    # 9. Complete task using POST /complete-child-setup
    complete_resp = client.post('/api/v1/portal/complete-child-setup', json={
        'task_id': setup_task.id
    }, headers=parent_headers)
    
    assert complete_resp.status_code == 200
    assert complete_resp.json['success'] is True
    assert complete_resp.json['task']['status'] == 'completed'
    assert complete_resp.json['task']['completed_at'] is not None

    # 10. Re-fetch from DB and verify status is 'completed'
    db_session.refresh(setup_task)
    assert setup_task.status == 'completed'
    assert setup_task.completed_at is not None
