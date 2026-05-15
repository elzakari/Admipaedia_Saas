import pytest
from app.models.student import Student
from app.extensions import db
import uuid
from datetime import date

@pytest.fixture
def student_data(app):
    with app.app_context():
        from app.models.tenant import Tenant
        from app.models.user import User
        
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"Test Tenant {tenant_id.hex[:8]}",
            country_code="US",
            schema_name=f"schema_{tenant_id.hex[:8]}"
        )
        db.session.add(tenant)
        
        user_email = f"john_{uuid.uuid4().hex[:8]}@example.com"
        user = User(username=f"johndoe_{uuid.uuid4().hex[:8]}", email=user_email, role='student')
        from app.extensions import bcrypt
        user.password_hash = bcrypt.generate_password_hash('Password123!').decode('utf-8')
        db.session.add(user)
        db.session.commit()

        return {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': user_email,
            'admission_number': f'A12345_{uuid.uuid4().hex[:4]}',
            'date_of_birth': date(2000, 1, 1),
            'gender': 'male',
            'status': 'active',
            'user_id': user.id,
            'tenant_id': tenant.id
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
