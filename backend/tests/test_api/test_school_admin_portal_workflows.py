from datetime import date

from flask_jwt_extended import create_access_token

from app.models.class_ import Class
from app.models.parent import Parent
from app.models.student import Student
from app.models.tenant import TenantMembership
from app.models.user import User


def _headers(user_id: int, tenant_id) -> dict[str, str]:
    token = create_access_token(identity=user_id)
    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant_id),
    }


def test_school_admin_can_access_students_and_classes_lists(client, db_session, sample_tenant, user_factory):
    school_admin = user_factory('school_admin')
    student_user = user_factory('student')

    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=school_admin.id, role='school_admin', status='active'))
    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=student_user.id, role='student', status='active'))
    db_session.flush()

    class_obj = Class(
        tenant_id=sample_tenant.id,
        name='Workflow Class',
        grade_level='Primary 5',
        academic_year='2025/2026',
        status='active',
    )
    db_session.add(class_obj)
    db_session.flush()

    db_session.add(Student(
        tenant_id=sample_tenant.id,
        user_id=student_user.id,
        admission_number='SCH-ADMIN-001',
        first_name='Portal',
        last_name='Student',
        date_of_birth=date(2011, 1, 1),
        gender='male',
        email=student_user.email,
        class_id=class_obj.id,
        status='active',
    ))
    db_session.commit()

    students_response = client.get('/api/v1/students', headers=_headers(school_admin.id, sample_tenant.id))
    classes_response = client.get('/api/v1/classes', headers=_headers(school_admin.id, sample_tenant.id))

    assert students_response.status_code == 200
    assert students_response.get_json()['success'] is True
    assert len(students_response.get_json()['students']) >= 1

    assert classes_response.status_code == 200
    assert classes_response.get_json()['success'] is True
    assert len(classes_response.get_json()['classes']) >= 1


def test_school_admin_can_create_parent_from_frontend_payload(client, db_session, sample_tenant, user_factory):
    school_admin = user_factory('school_admin')
    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=school_admin.id, role='school_admin', status='active'))
    db_session.commit()

    response = client.post(
        '/api/v1/parents',
        headers=_headers(school_admin.id, sample_tenant.id),
        json={
            'firstName': 'Adwoa',
            'lastName': 'Owusu',
            'email': 'adwoa.owusu@example.com',
            'phone': '+233200000111',
            'address': 'Accra',
            'relationship': 'guardian',
            'status': 'inactive',
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload['success'] is True
    assert payload['data']['first_name'] == 'Adwoa'
    assert payload['data']['last_name'] == 'Owusu'
    assert payload['data']['email'] == 'adwoa.owusu@example.com'
    assert payload['data']['status'] == 'inactive'

    created_parent = Parent.query.filter_by(user_id=User.query.filter_by(email='adwoa.owusu@example.com').first().id).first()
    assert created_parent is not None
