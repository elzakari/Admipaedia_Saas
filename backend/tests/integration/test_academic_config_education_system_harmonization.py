import uuid
from datetime import date

import pytest

from app.extensions import db
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User
from app.models.educational_system import EducationalSystemConfig, GradeLevel
from app.models.academic_term import AcademicTerm
from app.models.tenant_academic_settings import TenantAcademicSettings
from app.models.grading_system import GradingScheme, GradeBoundary
from app.models.class_ import Class
from app.models.student import Student
from app.models.system_setting import SystemSetting
from app.services.student_service import StudentService
from app.services.academic_configuration_service import AcademicConfigurationService


def _create_tenant_and_membership(auth_client, country_code: str = 'GH'):
    user = User.query.filter_by(email='test@example.com').first()
    assert user is not None

    tenant = Tenant(
        slug=f'test-{uuid.uuid4().hex[:8]}',
        name='Test Tenant',
        country_code=country_code,
        schema_name=f'test_{uuid.uuid4().hex[:8]}'
    )
    db.session.add(tenant)
    db.session.flush()

    membership = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role='school_admin',
        status='active'
    )
    db.session.add(membership)
    db.session.commit()

    auth_client.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)
    return tenant


@pytest.mark.academic_harmonization
def test_settings_academic_returns_harmonized_config(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    cfg = EducationalSystemConfig(
        tenant_id=tenant.id,
        template_key='GH_GES',
        name='Ghana (GES)',
        config={'phases': []},
        is_active=True
    )
    db.session.add(cfg)
    db.session.flush()

    db.session.add_all([
        GradeLevel(tenant_id=tenant.id, educational_system_id=cfg.id, name='Primary 1', order_index=1, is_terminal=False),
        GradeLevel(tenant_id=tenant.id, educational_system_id=cfg.id, name='Primary 2', order_index=2, is_terminal=False),
    ])

    db.session.add_all([
        AcademicTerm(tenant_id=tenant.id, name='First Term', start_date=date(2026, 1, 10), end_date=date(2026, 4, 10)),
        AcademicTerm(tenant_id=tenant.id, name='Second Term', start_date=date(2026, 5, 1), end_date=date(2026, 7, 15)),
    ])

    db.session.add(TenantAcademicSettings(tenant_id=tenant.id, settings={'academicYear': '2026/2027', 'gradeScale': []}))
    db.session.commit()

    resp = auth_client.get('/api/v1/settings/academic')
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, dict)
    assert data.get('academicYear') == '2026/2027'
    assert isinstance(data.get('gradeLevels'), list)
    assert len(data.get('gradeLevels')) == 2
    assert isinstance(data.get('academicTerms'), list)
    assert len(data.get('academicTerms')) == 2
    assert isinstance(data.get('educationSystem'), dict)
    assert data['educationSystem'].get('enabled') is True


@pytest.mark.academic_harmonization
def test_settings_academic_update_persists_and_syncs_grading_scheme(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    payload = {
        'academicYear': '2026/2027',
        'passingGrade': 50,
        'gradeScale': [
            {'id': 'a', 'grade': 'A', 'minScore': 80, 'maxScore': 100, 'description': 'Excellent', 'gradePoint': 4.0},
            {'id': 'b', 'grade': 'B', 'minScore': 70, 'maxScore': 79, 'description': 'Very Good', 'gradePoint': 3.5},
            {'id': 'f', 'grade': 'F', 'minScore': 0, 'maxScore': 39, 'description': 'Fail', 'gradePoint': 0.0},
        ]
    }

    resp = auth_client.put('/api/v1/settings/academic', json=payload)
    assert resp.status_code == 200
    assert resp.get_json().get('success') is True

    stored = TenantAcademicSettings.query.filter_by(tenant_id=tenant.id).first()
    assert stored is not None
    assert stored.settings.get('academicYear') == '2026/2027'
    assert isinstance(stored.settings.get('gradeScale'), list)

    scheme = GradingScheme.query.filter_by(tenant_id=tenant.id, is_default=True).first()
    assert scheme is not None
    boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).order_by(GradeBoundary.sequence_order.asc()).all()
    assert len(boundaries) == 3
    assert boundaries[0].grade_symbol == 'A'


@pytest.mark.academic_harmonization
def test_class_capacity_enforced_by_student_service(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    cls = Class(
        tenant_id=tenant.id,
        name='Primary 1 A',
        grade_level='Primary 1',
        academic_year='2026/2027',
        capacity=1
    )
    db.session.add(cls)
    db.session.flush()

    u1 = User(username=f'u_{uuid.uuid4().hex[:6]}', email=f'u1_{uuid.uuid4().hex[:6]}@example.com', role='student')
    u1.set_password_hash('Password123!')
    u2 = User(username=f'u_{uuid.uuid4().hex[:6]}', email=f'u2_{uuid.uuid4().hex[:6]}@example.com', role='student')
    u2.set_password_hash('Password123!')
    db.session.add_all([u1, u2])
    db.session.flush()

    s1 = Student(
        tenant_id=tenant.id,
        admission_number=f'STU_{uuid.uuid4().hex[:6]}',
        first_name='A',
        last_name='One',
        gender='male',
        email=f's1_{uuid.uuid4().hex[:6]}@example.com',
        date_of_birth=date(2010, 1, 1),
        user_id=u1.id,
        status='active'
    )
    s2 = Student(
        tenant_id=tenant.id,
        admission_number=f'STU_{uuid.uuid4().hex[:6]}',
        first_name='B',
        last_name='Two',
        gender='male',
        email=f's2_{uuid.uuid4().hex[:6]}@example.com',
        date_of_birth=date(2010, 1, 1),
        user_id=u2.id,
        status='active'
    )
    db.session.add_all([s1, s2])
    db.session.commit()

    svc = StudentService(db.session)
    ok, err = svc.assign_class(s1.id, cls.id)
    assert err is None
    ok2, err2 = svc.assign_class(s2.id, cls.id)
    assert ok2 is None
    assert err2 == 'Class is at maximum capacity'


@pytest.mark.academic_harmonization
def test_harmonized_config_derives_defaults_from_education_system(auth_client):
    tenant = _create_tenant_and_membership(auth_client, country_code='TG')

    cfg = EducationalSystemConfig(
        tenant_id=tenant.id,
        template_key='tg_education_standard',
        name='Togo (Standard)',
        config={
            'grading': {
                'type': 'scale_20',
                'scale': '0-20',
                'pass_mark': 10,
                'bands': [
                    {'name': 'Excellent', 'min': 16, 'max': 20},
                    {'name': 'Assez bien', 'min': 10, 'max': 11.99},
                    {'name': 'Insuffisant', 'min': 0, 'max': 9.99},
                ],
            },
            'assessments': {
                'continuous_assessment_weight': 40,
                'exam_weight': 60,
            },
        },
        is_active=True,
    )
    db.session.add(cfg)
    db.session.commit()

    resp = auth_client.get('/api/v1/settings/academic')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('maxGrade') == 20
    assert data.get('passingGrade') == 10
    assert isinstance(data.get('gradeScale'), list)
    assert len(data.get('gradeScale')) == 3
    assert data.get('gradingSystem') == 'tg_education_standard'
    weights = data.get('finalGradeWeights')
    assert isinstance(weights, dict)
    assert weights.get('class_score_weight') == 40
    assert weights.get('external_exam_weight') == 60


@pytest.mark.academic_harmonization
def test_update_sanitizes_computed_fields(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    payload = {
        'academicYear': '2026/2027',
        'educationSystem': {'enabled': True},
        'gradeLevels': [{'id': 'x'}],
        'academicTerms': [{'id': 'y'}],
        'gradeScale': [],
    }
    resp = auth_client.put('/api/v1/settings/academic', json=payload)
    assert resp.status_code == 200

    stored = TenantAcademicSettings.query.filter_by(tenant_id=tenant.id).first()
    assert stored is not None
    assert 'educationSystem' not in stored.settings
    assert 'gradeLevels' not in stored.settings
    assert 'academicTerms' not in stored.settings


@pytest.mark.academic_harmonization
def test_sync_grading_scheme_sets_weights_and_passing_logic(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    payload = {
        'passingGrade': 50,
        'finalGradeWeights': {'class_score_weight': 30, 'external_exam_weight': 70},
        'gradeScale': [
            {'grade': 'A', 'minScore': 80, 'maxScore': 100},
            {'grade': 'D', 'minScore': 45, 'maxScore': 49},
            {'grade': 'F', 'minScore': 0, 'maxScore': 39},
        ],
    }
    resp = auth_client.put('/api/v1/settings/academic', json=payload)
    assert resp.status_code == 200

    scheme = GradingScheme.query.filter_by(tenant_id=tenant.id, is_default=True).first()
    assert scheme is not None
    assert scheme.class_score_weight == 30
    assert scheme.external_exam_weight == 70

    boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).order_by(GradeBoundary.sequence_order.asc()).all()
    assert [b.grade_symbol for b in boundaries] == ['A', 'D', 'F']
    assert boundaries[0].is_passing is True
    assert boundaries[1].is_passing is False
    assert boundaries[2].is_passing is False


@pytest.mark.academic_harmonization
def test_legacy_school_settings_fallback_used_when_no_tenant_settings(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    db.session.add_all([
        SystemSetting(key='school.academicYear', value='2025/2026', setting_type='string'),
        SystemSetting(key='school.currentTerm', value='Second Term', setting_type='string'),
        SystemSetting(key='school.passingGrade', value='55', setting_type='int'),
        SystemSetting(key='school.maxStudentsPerClass', value='45', setting_type='int'),
    ])
    db.session.commit()

    resp = auth_client.get('/api/v1/settings/academic')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('academicYear') == '2025/2026'
    assert data.get('currentTerm') == 'Second Term'
    assert data.get('passingGrade') == 55
    assert data.get('maxStudentsPerClass') == 45


@pytest.mark.academic_harmonization
def test_legacy_academic_settings_json_backfills_and_supports_snake_case_grade_scale(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    import json
    db.session.add(
        SystemSetting(
            key='academic.settings',
            value=json.dumps(
                {
                    'academicYear': '2023/2024',
                    'grade_scale': [
                        {'grade': 'A', 'minScore': 80, 'maxScore': 100},
                    ],
                }
            ),
            setting_type='json',
        )
    )
    db.session.commit()

    assert TenantAcademicSettings.query.filter_by(tenant_id=tenant.id).first() is None

    cfg = AcademicConfigurationService.build_harmonized_config(tenant.id)
    assert cfg.get('academicYear') == '2023/2024'
    assert isinstance(cfg.get('gradeScale'), list)
    assert cfg['gradeScale'][0]['grade'] == 'A'

    backfilled = TenantAcademicSettings.query.filter_by(tenant_id=tenant.id).first()
    assert backfilled is not None
    assert backfilled.settings.get('academicYear') == '2023/2024'


@pytest.mark.academic_harmonization
def test_invalid_legacy_academic_settings_json_does_not_crash(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    db.session.add(SystemSetting(key='academic.settings', value='{invalid', setting_type='json'))
    db.session.commit()

    cfg = AcademicConfigurationService.build_harmonized_config(tenant.id)
    assert isinstance(cfg, dict)


@pytest.mark.academic_harmonization
def test_education_system_meta_country_code_parse_fallback(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    cfg = EducationalSystemConfig(
        tenant_id=tenant.id,
        template_key=None,
        name='Weird Template',
        config={'grading': {'type': 'percentage', 'schemes': [{'name': 'A', 'min': 0, 'max': 100}]}},
        is_active=True,
    )
    db.session.add(cfg)
    db.session.commit()

    meta = AcademicConfigurationService._education_system_meta(tenant.id)
    assert meta.get('enabled') is True
    assert meta.get('country_code') is None


@pytest.mark.academic_harmonization
def test_education_system_defaults_cover_schemes_bands_levels_and_invalid_values(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    cfg = EducationalSystemConfig(
        tenant_id=tenant.id,
        template_key='gh_ges_standard',
        name='Ghana (Standard)',
        config={
            'grading': {
                'type': 'percentage',
                'schemes': [
                    'bad',
                    {'name': 'A1', 'min': 80, 'max': 100, 'point': 1},
                    {'name': 'B2', 'min': 'x', 'max': 79, 'point': 2},
                ],
            },
            'assessments': {
                'class_score_weight': 'abc',
                'external_exam_weight': 70,
            },
        },
        is_active=True,
    )
    db.session.add(cfg)
    db.session.commit()

    d1 = AcademicConfigurationService._education_system_defaults(tenant.id)
    assert d1.get('gradingSystem') == 'gh_ges_standard'
    assert isinstance(d1.get('gradeScale'), list)
    assert len(d1['gradeScale']) == 1

    cfg.config = {
        'grading': {
            'type': 'scale_20',
            'scale': 'bad',
            'pass_mark': 'bad',
            'bands': [
                {'name': 'Excellent', 'min': 16, 'max': 20},
                {'name': 'Broken', 'min': 'x', 'max': 10},
            ],
        }
    }
    db.session.commit()

    d2 = AcademicConfigurationService._education_system_defaults(tenant.id)
    assert d2.get('maxGrade') == 20
    assert 'passingGrade' not in d2
    assert isinstance(d2.get('gradeScale'), list)
    assert len(d2['gradeScale']) == 1

    cfg.config = {
        'grading': {
            'type': 'levels',
            'levels': [
                {'name': 'Exceeding', 'range': '80-100'},
                {'name': 'Broken', 'range': 'bad'},
            ],
        }
    }
    db.session.commit()

    d3 = AcademicConfigurationService._education_system_defaults(tenant.id)
    assert isinstance(d3.get('gradeScale'), list)
    assert len(d3['gradeScale']) == 1


@pytest.mark.academic_harmonization
def test_upsert_non_dict_and_sync_grading_scheme_skips_invalid_entries(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    AcademicConfigurationService.upsert_tenant_settings(tenant.id, 'bad')
    stored = TenantAcademicSettings.query.filter_by(tenant_id=tenant.id).first()
    assert stored is not None
    assert stored.settings == {}

    AcademicConfigurationService.sync_grading_scheme_from_config(tenant.id, {'gradeScale': []})
    assert GradingScheme.query.filter_by(tenant_id=tenant.id).first() is None

    AcademicConfigurationService.sync_grading_scheme_from_config(
        tenant.id,
        {
            'passingGrade': 50,
            'finalGradeWeights': {'class_score_weight': 'x', 'external_exam_weight': 60},
            'gradeScale': [
                'bad',
                {'minScore': 0, 'maxScore': 100},
                {'grade': 'A', 'minScore': 80, 'maxScore': 100},
                {'grade': 'B', 'minScore': 'x', 'maxScore': 79},
            ],
        },
    )

    scheme = GradingScheme.query.filter_by(tenant_id=tenant.id, is_default=True).first()
    assert scheme is not None
    boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).all()
    assert len(boundaries) == 1

    AcademicConfigurationService.sync_grading_scheme_from_config(
        tenant.id,
        {
            'passingGrade': 50,
            'finalGradeWeights': {'class_score_weight': 40, 'external_exam_weight': 60},
            'gradeScale': [{'grade': 'A', 'minScore': 80, 'maxScore': 100}],
        },
    )
    assert GradingScheme.query.filter_by(tenant_id=tenant.id, is_default=True).count() == 1


@pytest.mark.academic_harmonization
def test_standard_grade_levels_endpoint(auth_client):
    tenant = _create_tenant_and_membership(auth_client)

    # Let's request the endpoint first - it should return the default fallback levels (Grade 1 to 12)
    resp = auth_client.get('/api/v1/academics/standard-grade-levels')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('success') is True
    assert len(data.get('levels')) == 12
    assert data['levels'][0]['id'] == 'Grade 1'
    assert data['levels'][0]['name'] == 'Grade 1'

    # Now let's add custom GradeLevel records and make sure they are returned sequentially
    cfg = EducationalSystemConfig(
        tenant_id=tenant.id,
        template_key='GH_GES',
        name='Ghana (GES)',
        config={'phases': []},
        is_active=True
    )
    db.session.add(cfg)
    db.session.flush()

    db.session.add_all([
        GradeLevel(tenant_id=tenant.id, educational_system_id=cfg.id, name='Primary 2', order_index=2, is_terminal=False),
        GradeLevel(tenant_id=tenant.id, educational_system_id=cfg.id, name='Primary 1', order_index=1, is_terminal=False),
    ])
    db.session.commit()

    resp = auth_client.get('/api/v1/academics/standard-grade-levels')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('success') is True
    assert len(data.get('levels')) == 2
    # Should be sorted sequentially by order_index / numeric_value
    assert data['levels'][0]['id'] == 'Grade 1'
    assert data['levels'][0]['name'] == 'Grade 1'
    assert data['levels'][0]['order_index'] == 1
    assert data['levels'][1]['id'] == 'Grade 2'
    assert data['levels'][1]['name'] == 'Grade 2'
    assert data['levels'][1]['order_index'] == 2


@pytest.mark.academic_harmonization
def test_get_grading_scheme_auto_seeds_from_profile(auth_client):
    tenant = _create_tenant_and_membership(auth_client, country_code='GH')

    # Seed an EducationalSystemConfig for this tenant representing gh_ges_standard
    cfg = EducationalSystemConfig(
        tenant_id=tenant.id,
        template_key='gh_ges_standard',
        name='Ghana GES Standard',
        config={
            'grading': {
                'type': 'percentage',
                'schemes': [
                    {'name': 'A1', 'min': 80, 'max': 100, 'point': 4.0},
                    {'name': 'F9', 'min': 0, 'max': 44.99, 'point': 0.0}
                ]
            }
        },
        is_active=True
    )
    db.session.add(cfg)
    db.session.commit()

    # Confirm there are no grading schemes yet
    assert GradingScheme.query.filter_by(tenant_id=tenant.id).count() == 0

    # Call the legacy/aliased endpoint /api/v1/academic/grading-system
    resp = auth_client.get('/api/v1/academic/grading-system')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('success') is True
    assert len(data.get('gradingScheme')) > 0
    
    # Confirm it has seeded a scheme under this tenant ID
    scheme = GradingScheme.query.filter_by(tenant_id=tenant.id, is_default=True).first()
    assert scheme is not None
    boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).all()
    assert len(boundaries) == 2
    assert {b.grade_symbol for b in boundaries} == {'A1', 'F9'}


@pytest.mark.academic_harmonization
def test_get_grading_scheme_apc_togo_seeding_and_calculation(auth_client):
    tenant = _create_tenant_and_membership(auth_client, country_code='TG')
    tenant.settings = {'education_system': 'APC'}
    db.session.commit()

    # Call the endpoint to auto-seed APC
    resp = auth_client.get('/api/v1/academic/grading-system')
    assert resp.status_code == 200
    
    scheme = GradingScheme.query.filter_by(tenant_id=tenant.id, is_default=True).first()
    assert scheme is not None
    boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).all()
    assert len(boundaries) == 4
    
    symbols = {b.grade_symbol for b in boundaries}
    assert symbols == {'M', 'A', 'EA', 'NA'}

    names = {b.grade_name for b in boundaries}
    assert 'Maîtrisé' in names
    assert 'Non Acquis' in names

    # Verify APC bypasses category weights in calculate_final_grades
    # Create a Class, Student, and test calculation
    cls = Class(tenant_id=tenant.id, name='CP1 A', grade_level='CP1', academic_year='2026/2027')
    db.session.add(cls)
    db.session.flush()

    user = User(username='apc_stud', email='apc@example.com', role='student')
    db.session.add(user)
    db.session.flush()

    student = Student(
        tenant_id=tenant.id,
        admission_number='APC001',
        first_name='APC',
        last_name='Student',
        gender='male',
        date_of_birth=date(2018, 1, 1),
        user_id=user.id,
        class_id=cls.id,
        status='active'
    )
    db.session.add(student)
    db.session.commit()

    # Create grade records with specific scores (M=18, EA=12)
    from app.models.exam import Exam
    from app.models.grade import Grade
    
    from datetime import datetime
    exam1 = Exam(title='Math Competency 1', class_id=cls.id, subject_id=1, total_marks=20, passing_marks=10, duration=60, exam_date=datetime.utcnow(), created_by=user.id, assessment_type='Exams')
    exam2 = Exam(title='Math Competency 2', class_id=cls.id, subject_id=1, total_marks=20, passing_marks=10, duration=60, exam_date=datetime.utcnow(), created_by=user.id, assessment_type='Assignments')
    db.session.add_all([exam1, exam2])
    db.session.flush()

    g1 = Grade(student_id=student.id, class_id=cls.id, subject_id=1, exam_id=exam1.id, marks_obtained=18.0, percentage=18.0, graded_by=user.id, term='Premier Trimestre', academic_year='2026/2027')
    g2 = Grade(student_id=student.id, class_id=cls.id, subject_id=1, exam_id=exam2.id, marks_obtained=12.0, percentage=12.0, graded_by=user.id, term='Premier Trimestre', academic_year='2026/2027')
    db.session.add_all([g1, g2])
    db.session.commit()

    # Calculate final grades
    from app.services.grading.service import GradingService
    success, err = GradingService.calculate_final_grades(cls.id, 1, 'Premier Trimestre', '2026/2027')
    assert success is True

    from app.models.grading_system import FinalGrade
    fg = FinalGrade.query.filter_by(student_id=student.id, class_id=cls.id, subject_id=1).first()
    assert fg is not None
    print("\n--- DIAGNOSTICS ---")
    print("FG PERCENTAGE:", fg.final_percentage)
    print("FG SYMBOL:", fg.final_grade_symbol)
    print("FG SCHEME ID:", fg.grading_scheme_id)
    print("FG SCHEME:", fg.grading_scheme)
    if fg.grading_scheme:
        print("SCHEME BOUNDS:", [(b.grade_symbol, b.min_score, b.max_score) for b in fg.grading_scheme.grade_boundaries])
    print("--- END DIAGNOSTICS ---\n")
    # Simple average: (18 + 12) / 2 = 15.0
    assert fg.final_percentage == 15.0
    # 15.0 falls in 14.0 <= score < 16.0, which matches 'A' (Acquis)
    assert fg.final_grade_symbol == 'A'


