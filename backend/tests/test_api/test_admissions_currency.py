import uuid
from datetime import datetime
from app.models.tenant import Tenant, TenantMembership
from app.models.class_ import Class
from app.models.student import Student
from app.models.user import User
from app.models.parent import Parent
from app.models.admission import AdmissionApplication
from app.services.portal.service import ParentPortalService

def _login_and_headers(client, email: str, password: str):
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    token = resp.json.get('access_token')
    return {'Authorization': f'Bearer {token}'}

def test_get_admission_price_dynamic_currency(db_session, client, user_factory):
    # 1. Create a school/tenant with dynamic currency 'XOF' and dynamic price '125.50'
    tenant = Tenant(
        slug='dynamic-school',
        name='Dynamic Currency School',
        country_code='BJ',
        currency='XOF',
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        settings={'admission_form_price': '125.50'}
    )
    db_session.add(tenant)
    db_session.flush()

    # Create admin user
    school_admin = user_factory('admin')
    db_session.add(TenantMembership(tenant_id=tenant.id, user_id=school_admin.id, role='school_admin', status='active'))
    db_session.commit()

    headers = _login_and_headers(client, school_admin.email, 'Password123!')
    headers['X-Tenant-ID'] = str(tenant.id)

    # 2. Get the admission price and verify it returns price and XOF currency
    resp = client.get('/api/v1/settings/admission-price', headers=headers)
    assert resp.status_code == 200
    assert resp.json.get('success') is True
    assert resp.json.get('price') == 125.50
    assert resp.json.get('currency') == 'XOF'

def test_buy_admission_form_dynamic_currency(db_session, client, user_factory):
    # 1. Create a tenant with dynamic currency 'XOF' and dynamic price '125.50'
    tenant = Tenant(
        slug='dynamic-buy-school',
        name='Dynamic Buy School',
        country_code='BJ',
        currency='XOF',
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        settings={'admission_form_price': '125.50'}
    )
    db_session.add(tenant)
    db_session.flush()

    # Create class
    cls = Class(
        name='Class XOF',
        grade_level='Primary 1',
        academic_year='2024/2025',
        tenant_id=tenant.id
    )
    db_session.add(cls)
    db_session.flush()

    # Create a parent user and parent profile
    parent_user = user_factory('parent')
    db_session.add(TenantMembership(tenant_id=tenant.id, user_id=parent_user.id, role='parent', status='active'))
    parent = Parent(user_id=parent_user.id, tenant_id=tenant.id)
    db_session.add(parent)
    db_session.commit()

    headers = _login_and_headers(client, parent_user.email, 'Password123!')
    headers['X-Tenant-ID'] = str(tenant.id)

    # 2. Simulate form buying
    payload = {
        'student_first_name': 'Kojo',
        'student_last_name': 'Mensah',
        'target_class_id': cls.id
    }
    resp = client.post('/api/v1/admissions/buy-form', json=payload, headers=headers)
    assert resp.status_code == 201
    assert resp.json.get('success') is True

    # 3. Verify admission application is created successfully
    applications = AdmissionApplication.query.filter_by(parent_id=parent.id).all()
    assert len(applications) > 0
    assert applications[0].student_first_name == 'Kojo'
    assert applications[0].student_last_name == 'Mensah'
    assert applications[0].target_class_id == cls.id

def test_parent_portal_dashboard_dynamic_currency(db_session, user_factory):
    # 1. Create a tenant with dynamic currency 'EUR'
    tenant = Tenant(
        slug='eur-school',
        name='European Currency School',
        country_code='FR',
        currency='EUR',
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}"
    )
    db_session.add(tenant)
    db_session.flush()

    # Create a parent and student
    parent_user = user_factory('parent')
    parent = Parent(user_id=parent_user.id, tenant_id=tenant.id)
    db_session.add(parent)
    db_session.flush()

    student_user = user_factory('student')
    student = Student(
        user_id=student_user.id,
        admission_number=f"ADM-EUR-{uuid.uuid4().hex[:5].upper()}",
        first_name='Jean',
        last_name='Dupont',
        date_of_birth=datetime(2010, 1, 1).date(),
        gender='male',
        email=student_user.email,
        parent_id=parent.id,
        tenant_id=tenant.id,
        status='active'
    )
    db_session.add(student)
    db_session.commit()

    # 2. Retrieve child dashboard and check currency
    dashboard_data, err = ParentPortalService.get_child_dashboard(student.id)
    assert err is None
    assert dashboard_data is not None
    assert dashboard_data['finance']['currency'] == 'EUR'
