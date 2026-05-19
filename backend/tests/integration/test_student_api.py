import json
import pytest
import uuid
from app.models.student import Student
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User

def _create_tenant(db):
    t = Tenant(
        id=uuid.uuid4(),
        slug=f"t-{uuid.uuid4().hex[:8]}",
        name="Test Tenant",
        country_code="US",
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        status="active",
    )
    db.session.add(t)
    db.session.flush()
    return t

def _create_membership(db, tenant_id, user_id):
    m = TenantMembership(tenant_id=tenant_id, user_id=user_id, role="school_admin", status="active")
    db.session.add(m)
    db.session.flush()
    return m

def test_create_student_api(app, db, client, auth_headers):
    # Get authenticated user to associate with tenant
    user = User.query.filter_by(email="test@example.com").first()
    assert user is not None

    tenant = _create_tenant(db)
    _create_membership(db, tenant.id, user.id)

    payload = {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': f'john_{uuid.uuid4().hex[:6]}@example.com',
        'admission_number': f'ADM_{uuid.uuid4().hex[:6]}'.upper(),
        'date_of_birth': '2000-01-01',
        'gender': 'male'
    }

    response = client.post(
        '/api/v1/students',
        data=json.dumps(payload),
        content_type='application/json',
        headers={**auth_headers, 'X-Tenant-ID': str(tenant.id)}
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['student']['first_name'] == 'John'

def test_get_students_api(app, db, client, auth_headers):
    user = User.query.filter_by(email="test@example.com").first()
    assert user is not None

    tenant = _create_tenant(db)
    _create_membership(db, tenant.id, user.id)

    payload = {
        'first_name': 'Jane',
        'last_name': 'Smith',
        'email': f'jane_{uuid.uuid4().hex[:6]}@example.com',
        'admission_number': f'ADM_{uuid.uuid4().hex[:6]}'.upper(),
        'date_of_birth': '2000-01-01',
        'gender': 'female'
    }

    # Create a student first
    res_create = client.post(
        '/api/v1/students',
        data=json.dumps(payload),
        content_type='application/json',
        headers={**auth_headers, 'X-Tenant-ID': str(tenant.id)}
    )
    assert res_create.status_code == 201
    
    # Test get students API
    response = client.get(
        '/api/v1/students',
        headers={**auth_headers, 'X-Tenant-ID': str(tenant.id)}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert len(data['students']) >= 1
    assert data['total'] >= 1