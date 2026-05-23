import pytest
import uuid
from datetime import datetime
from app.extensions import db
from app.models.tenant import Tenant, Branch
from app.models.student import Student
from app.models.user import User

def _login(client, email: str, password: str):
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200
    token = resp.json.get('access_token')
    assert token
    return token

def _make_user(db, role: str, email: str):
    user = User(username=email.split('@')[0], email=email, role=role)
    user.set_password_hash('password')
    db.session.add(user)
    db.session.commit()
    return user

def _make_tenant(db, slug: str, plan: str):
    t = Tenant(
        slug=slug,
        name=f'{slug} School',
        country_code='GH',
        schema_name=f'{slug}_schema',
        status='active',
        plan=plan
    )
    db.session.add(t)
    db.session.commit()
    return t

def _link_membership(db, tenant_id, user_id, role='school_admin'):
    from app.models.tenant import TenantMembership
    membership = TenantMembership(tenant_id=tenant_id, user_id=user_id, role=role, status='active')
    db.session.add(membership)
    db.session.commit()
    return membership

def test_branches_requires_tenant_header(client, db):
    _make_user(db, 'school_admin', 'admin1@example.com')
    token = _login(client, 'admin1@example.com', 'password')
    
    headers = {'Authorization': f'Bearer {token}'}
    r = client.get('/api/v1/school/branches', headers=headers)
    assert r.status_code in (400, 403)

def test_branches_unauthorized_for_basic_plan(client, db):
    user = _make_user(db, 'school_admin', 'admin2@example.com')
    tenant = _make_tenant(db, 'basic-school', 'basic')
    _link_membership(db, tenant.id, user.id)
    token = _login(client, 'admin2@example.com', 'password')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id)
    }
    
    # Attempting to fetch branches should fail with 403 Forbidden
    r = client.get('/api/v1/school/branches', headers=headers)
    assert r.status_code == 403
    assert r.json['success'] is False
    assert "exclusive to the Enterprise tier" in r.json['message']

    # Attempting to create branch should fail with 403 Forbidden
    r = client.post('/api/v1/school/branches', json={'name': 'Accra Branch'}, headers=headers)
    assert r.status_code == 403

def test_branches_crud_enterprise_plan(client, db):
    user = _make_user(db, 'school_admin', 'admin3@example.com')
    tenant = _make_tenant(db, 'enterprise-school', 'enterprise')
    _link_membership(db, tenant.id, user.id)
    token = _login(client, 'admin3@example.com', 'password')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id)
    }
    
    # 1. Create a branch (POST)
    payload = {
        'name': 'Accra North Campus',
        'code': 'ACC-N',
        'address': '12 Ring Road, Accra'
    }
    r = client.post('/api/v1/school/branches', json=payload, headers=headers)
    assert r.status_code == 201
    assert r.json['success'] is True
    branch_id = r.json['branch']['id']
    assert r.json['branch']['name'] == 'Accra North Campus'
    assert r.json['branch']['code'] == 'ACC-N'
    
    # 2. List branches (GET)
    r = client.get('/api/v1/school/branches', headers=headers)
    assert r.status_code == 200
    assert r.json['success'] is True
    assert len(r.json['branches']) == 1
    assert r.json['branches'][0]['id'] == branch_id
    
    # 3. Update branch details (PUT)
    update_payload = {
        'name': 'Accra North Campus (Refurbished)',
        'code': 'ACC-N-R'
    }
    r = client.put(f'/api/v1/school/branches/{branch_id}', json=update_payload, headers=headers)
    assert r.status_code == 200
    assert r.json['success'] is True
    assert r.json['branch']['name'] == 'Accra North Campus (Refurbished)'
    assert r.json['branch']['code'] == 'ACC-N-R'
    
    # 4. Delete / Deactivate branch (DELETE)
    r = client.delete(f'/api/v1/school/branches/{branch_id}', headers=headers)
    assert r.status_code == 200
    assert r.json['success'] is True

    # 5. List branches again to see if deactivated
    r = client.get('/api/v1/school/branches', headers=headers)
    assert r.status_code == 200
    assert r.json['branches'][0]['is_active'] is False

def test_branches_query_compilation_scoping(client, db):
    user = _make_user(db, 'admin', 'admin4@example.com')
    tenant = _make_tenant(db, 'scoping-school', 'enterprise')
    _link_membership(db, tenant.id, user.id)
    token = _login(client, 'admin4@example.com', 'password')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id)
    }
    
    # Create two branches via endpoints or DB model directly
    b1 = Branch(tenant_id=tenant.id, name='Branch One', code='B1')
    b2 = Branch(tenant_id=tenant.id, name='Branch Two', code='B2')
    db.session.add_all([b1, b2])
    db.session.commit()
    
    # Create students associated with these branches
    # We create Student user accounts first to bypass constraints
    u1 = User(username='student1', email='student1@example.com', role='student')
    u1.set_password_hash('password')
    u2 = User(username='student2', email='student2@example.com', role='student')
    u2.set_password_hash('password')
    u3 = User(username='student3', email='student3@example.com', role='student')
    u3.set_password_hash('password')
    db.session.add_all([u1, u2, u3])
    db.session.flush()

    s1 = Student(
        user_id=u1.id,
        admission_number='STU-1',
        first_name='John',
        last_name='Doe',
        date_of_birth=datetime(2010, 1, 1).date(),
        gender='male',
        email=u1.email,
        status='active',
        tenant_id=tenant.id,
        branch_id=b1.id
    )
    s2 = Student(
        user_id=u2.id,
        admission_number='STU-2',
        first_name='Jane',
        last_name='Smith',
        date_of_birth=datetime(2011, 1, 1).date(),
        gender='female',
        email=u2.email,
        status='active',
        tenant_id=tenant.id,
        branch_id=b2.id
    )
    s3 = Student(
        user_id=u3.id,
        admission_number='STU-3',
        first_name='Unlinked',
        last_name='HQ Student',
        date_of_birth=datetime(2012, 1, 1).date(),
        gender='male',
        email=u3.email,
        status='active',
        tenant_id=tenant.id,
        branch_id=None # Headquarters / unlinked
    )
    db.session.add_all([s1, s2, s3])
    db.session.commit()
    
    # Query with branch 1 header
    h_b1 = {**headers, 'X-Branch-ID': str(b1.id)}
    r = client.get('/api/v1/students', headers=h_b1)
    assert r.status_code == 200
    assert r.json['success'] is True
    assert len(r.json['students']) == 1
    assert r.json['students'][0]['admission_number'] == 'STU-1'
    
    # Query with branch 2 header
    h_b2 = {**headers, 'X-Branch-ID': str(b2.id)}
    r = client.get('/api/v1/students', headers=h_b2)
    assert r.status_code == 200
    assert r.json['success'] is True
    assert len(r.json['students']) == 1
    assert r.json['students'][0]['admission_number'] == 'STU-2'
    
    # Query with no branch header (Headquarters context)
    r = client.get('/api/v1/students', headers=headers)
    assert r.status_code == 200
    assert r.json['success'] is True
    assert len(r.json['students']) == 3
    admission_numbers = [s['admission_number'] for s in r.json['students']]
    assert 'STU-1' in admission_numbers
    assert 'STU-2' in admission_numbers
    assert 'STU-3' in admission_numbers
