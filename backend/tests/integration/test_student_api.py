import json
import pytest
from app.models.student import Student
from app.extensions import db

@pytest.fixture
def student_payload():
    return {
        'name': 'John Doe',
        'email': 'john@example.com',
        'admission_number': 'A12345',
        'date_of_birth': '2000-01-01',
        'gender': 'male',
        'status': 'active'
    }

def test_create_student_api(client, student_payload):
    # Test student creation API
    response = client.post(
        '/api/v1/students',
        data=json.dumps(student_payload),
        content_type='application/json'
    )
    
    data = json.loads(response.data)
    assert response.status_code == 201
    assert data['student']['name'] == student_payload['name']
    assert data['student']['email'] == student_payload['email']
    
    # Verify student was created in the database
    with client.application.app_context():
        student = Student.query.filter_by(email=student_payload['email']).first()
        assert student is not None
        assert student.name == student_payload['name']

def test_get_students_api(client, student_payload):
    # Create a student first
    client.post(
        '/api/v1/students',
        data=json.dumps(student_payload),
        content_type='application/json'
    )
    
    # Test get students API
    response = client.get('/api/v1/students')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert len(data['students']) >= 1
    assert data['pagination']['total'] >= 1