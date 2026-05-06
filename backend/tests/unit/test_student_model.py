import pytest
from app.models.student import Student
from app.extensions import db

@pytest.fixture
def student_data():
    return {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john@example.com',
        'admission_number': 'A12345',
        'date_of_birth': '2000-01-01',
        'gender': 'male',
        'status': 'active',
        'user_id': 1  # Required field
    }

def test_create_student(app, student_data):
    # Test student creation
    with app.app_context():
        student = Student(**student_data)
        db.session.add(student)
        db.session.commit()
        
        assert student.id is not None
        assert student.first_name == student_data['first_name']
        assert student.last_name == student_data['last_name']
        assert student.email == student_data['email']
        assert student.admission_number == student_data['admission_number']

def test_student_representation(app, student_data):
    # Test string representation
    with app.app_context():
        student = Student(**student_data)
        expected = f"<Student {student_data['admission_number']}: {student.display_name}>"
        assert repr(student) == expected
