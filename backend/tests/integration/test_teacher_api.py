import json
import pytest
from app.models.teacher import Teacher
from app.models.user import User
from app.models.subject import Subject
from app.extensions import db



@pytest.fixture(autouse=True)
def _tenant_authenticated_teacher_api_client(
    client,
    admin_headers,
):
    """
    Bind teacher API integration tests to the canonical
    tenant-aware school-admin identity.

    Teacher CRUD endpoints are protected resources and should
    never be exercised through an anonymous client.
    """
    previous = {
        "HTTP_AUTHORIZATION": client.environ_base.get(
            "HTTP_AUTHORIZATION"
        ),
        "HTTP_X_TENANT_ID": client.environ_base.get(
            "HTTP_X_TENANT_ID"
        ),
    }

    authorization = admin_headers.get(
        "Authorization"
    )
    tenant_id = admin_headers.get(
        "X-Tenant-ID"
    )

    if not authorization:
        raise RuntimeError(
            "admin_headers did not provide Authorization"
        )

    if not tenant_id:
        raise RuntimeError(
            "admin_headers did not provide X-Tenant-ID"
        )

    client.environ_base[
        "HTTP_AUTHORIZATION"
    ] = authorization

    client.environ_base[
        "HTTP_X_TENANT_ID"
    ] = str(tenant_id)

    try:
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                client.environ_base.pop(
                    key,
                    None,
                )
            else:
                client.environ_base[key] = value


@pytest.fixture
def teacher_payload():
    return {
        'name': 'John Doe',
        'email': 'john@example.com',
        'phone': '+1234567890',
        'subject_id': 1,
        'hire_date': '2023-01-01',
        'status': 'active'
    }

@pytest.fixture
def subject_fixture(app, sample_tenant):
    """Create a tenant-scoped test subject."""
    with app.app_context():
        subject = Subject(
            name='Mathematics',
            code='MATH101',
            tenant_id=sample_tenant.id,
        )
        db.session.add(subject)
        db.session.commit()
        return subject

def test_create_teacher_api(client, teacher_payload, subject_fixture):
    """Test teacher creation API endpoint."""
    response = client.post(
        '/api/v1/teachers',
        data=json.dumps(teacher_payload),
        content_type='application/json'
    )
    
    data = json.loads(response.data)
    assert response.status_code == 201
    assert data['teacher']['name'] == teacher_payload['name']
    assert data['teacher']['email'] == teacher_payload['email']
    
    # Verify teacher was created in database
    with client.application.app_context():
        teacher = (
            Teacher.query
            .join(Teacher.user)
            .filter(User.email == teacher_payload['email'])
            .first()
        )
        assert teacher is not None
        assert teacher.full_name == teacher_payload['name']
        assert teacher.user.email == teacher_payload['email']

def test_get_teachers_api(client, teacher_payload, subject_fixture):
    """Test retrieving teachers API endpoint."""
    # Create a teacher first
    client.post(
        '/api/v1/teachers',
        data=json.dumps(teacher_payload),
        content_type='application/json'
    )
    
    # Test get teachers API
    response = client.get('/api/v1/teachers')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert len(data['teachers']) >= 1
    assert data['pagination']['total'] >= 1

def test_update_teacher_api(client, teacher_payload, subject_fixture):
    """Test updating teacher API endpoint."""
    # Create a teacher first
    create_response = client.post(
        '/api/v1/teachers',
        data=json.dumps(teacher_payload),
        content_type='application/json'
    )
    teacher_id = json.loads(create_response.data)['teacher']['id']
    
    # Update the teacher
    update_data = {'name': 'Jane Doe', 'phone': '+0987654321'}
    response = client.put(
        f'/api/v1/teachers/{teacher_id}',
        data=json.dumps(update_data),
        content_type='application/json'
    )
    
    data = json.loads(response.data)
    assert response.status_code == 200
    assert data['teacher']['name'] == update_data['name']
    assert data['teacher']['phone'] == update_data['phone']

def test_delete_teacher_api(client, teacher_payload, subject_fixture):
    """Test deleting teacher API endpoint."""
    # Create a teacher first
    create_response = client.post(
        '/api/v1/teachers',
        data=json.dumps(teacher_payload),
        content_type='application/json'
    )
    teacher_id = json.loads(create_response.data)['teacher']['id']
    
    # Delete the teacher
    response = client.delete(f'/api/v1/teachers/{teacher_id}')
    
    assert response.status_code == 200
    
    # Verify teacher was deleted
    get_response = client.get(f'/api/v1/teachers/{teacher_id}')
    assert get_response.status_code == 404