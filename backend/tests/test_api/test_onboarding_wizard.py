import uuid
from datetime import datetime, date
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User
from app.models.educational_system import EducationalSystemTemplate, EducationalSystemConfig, GradeLevel
from app.models.academic_calendar import AcademicYear, Term

def _login_and_headers(client, email: str, password: str):
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    token = resp.json.get('access_token')
    return {'Authorization': f'Bearer {token}'}

def test_complete_setup_success(db_session, client, user_factory):
    # 1. Seed Educational Curriculum System Template
    template = EducationalSystemTemplate(
        country_code='GH',
        system_key='gh_ges_standard',
        name='Ghana Education Service (Standard)',
        config={
            "phases": [
                {"name": "Primary", "levels": ["Basic 1", "Basic 2"]}
            ]
        }
    )
    db_session.add(template)
    
    # 2. Create Tenant with is_setup_completed = False
    tenant = Tenant(
        slug='newly-created-school',
        name='Pending Onboarding School',
        country_code='GH',
        currency='GHS',
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        is_setup_completed=False
    )
    db_session.add(tenant)
    db_session.flush()

    # Create admin user
    school_admin = user_factory('admin')
    db_session.add(TenantMembership(tenant_id=tenant.id, user_id=school_admin.id, role='school_admin', status='active'))
    db_session.commit()

    headers = _login_and_headers(client, school_admin.email, 'Password123!')
    headers['X-Tenant-ID'] = str(tenant.id)

    payload = {
        'school_name': 'Germinos International School',
        'address': '456 Hilltop Ave, Kumasi',
        'contact': 'info@germinos.edu.gh',
        'currency': 'XOF',
        'education_system': 'gh_ges_standard',
        'academic_year_name': '2026/2027',
        'term_name': 'First Term',
        'term_start_date': '2026-09-01',
        'term_end_date': '2026-12-15'
    }

    # 3. Post setup completion request
    resp = client.post('/api/v1/tenant/complete-setup', json=payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json.get('success') is True
    assert resp.json.get('tenant')['is_setup_completed'] is True
    assert resp.json.get('tenant')['name'] == 'Germinos International School'
    assert resp.json.get('tenant')['currency'] == 'XOF'

    # Verify Database state changes
    updated_tenant = Tenant.query.get(tenant.id)
    assert updated_tenant.is_setup_completed is True
    assert updated_tenant.name == 'Germinos International School'
    assert updated_tenant.currency == 'XOF'
    assert updated_tenant.settings.get('address') == '456 Hilltop Ave, Kumasi'
    assert updated_tenant.settings.get('contact') == 'info@germinos.edu.gh'

    # Verify Educational Config and Grade Levels applied successfully
    config = EducationalSystemConfig.query.filter_by(tenant_id=tenant.id, is_active=True).first()
    assert config is not None
    assert config.template_key == 'gh_ges_standard'

    grade_levels = GradeLevel.query.filter_by(tenant_id=tenant.id).all()
    assert len(grade_levels) == 2
    assert grade_levels[0].name == 'Basic 1'
    assert grade_levels[1].name == 'Basic 2'

    # Verify Academic Year & Term creation
    academic_year = AcademicYear.query.filter_by(is_current=True).first()
    assert academic_year is not None
    assert academic_year.name == '2026/2027'
    assert academic_year.start_date.isoformat() == '2026-09-01'

    term = Term.query.filter_by(is_current=True).first()
    assert term is not None
    assert term.name == 'First Term'
    assert term.academic_year_id == academic_year.id
    assert term.start_date.isoformat() == '2026-09-01'
    assert term.end_date.isoformat() == '2026-12-15'

def test_complete_setup_validation_failure(db_session, client, user_factory):
    tenant = Tenant(
        slug='invalid-setup-school',
        name='Invalid School',
        country_code='GH',
        currency='GHS',
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        is_setup_completed=False
    )
    db_session.add(tenant)
    db_session.flush()

    school_admin = user_factory('admin')
    db_session.add(TenantMembership(tenant_id=tenant.id, user_id=school_admin.id, role='school_admin', status='active'))
    db_session.commit()

    headers = _login_and_headers(client, school_admin.email, 'Password123!')
    headers['X-Tenant-ID'] = str(tenant.id)

    # Payload missing school name
    payload = {
        'school_name': '',
        'currency': 'XOF',
        'education_system': 'gh_ges_standard',
        'academic_year_name': '2026/2027',
        'term_name': 'First Term',
        'term_start_date': '2026-09-01',
        'term_end_date': '2026-12-15'
    }

    resp = client.post('/api/v1/tenant/complete-setup', json=payload, headers=headers)
    assert resp.status_code == 400
    assert resp.json.get('success') is False
    assert 'School name is required' in resp.json.get('message')

def test_complete_setup_unauthorized_role(db_session, client, user_factory):
    tenant = Tenant(
        slug='unauthorized-setup-school',
        name='Unauthorized School',
        country_code='GH',
        currency='GHS',
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        is_setup_completed=False
    )
    db_session.add(tenant)
    db_session.flush()

    # Create normal student user (which should be blocked)
    student_user = user_factory('student')
    db_session.add(TenantMembership(tenant_id=tenant.id, user_id=student_user.id, role='student', status='active'))
    db_session.commit()

    headers = _login_and_headers(client, student_user.email, 'Password123!')
    headers['X-Tenant-ID'] = str(tenant.id)

    payload = {
        'school_name': 'Germinos International School',
        'currency': 'XOF',
        'education_system': 'gh_ges_standard',
        'academic_year_name': '2026/2027',
        'term_name': 'First Term',
        'term_start_date': '2026-09-01',
        'term_end_date': '2026-12-15'
    }

    resp = client.post('/api/v1/tenant/complete-setup', json=payload, headers=headers)
    assert resp.status_code == 403
    assert resp.json.get('success') is False
    assert 'Unauthorized' in resp.json.get('message')
