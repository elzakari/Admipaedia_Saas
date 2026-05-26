import uuid
from app.extensions import db
from app.models.tenant import Tenant
from app.models.academic_cycle import AcademicCycle
from app.models.grade_track import GradeTrack
from app.models.educational_system import GradeLevel
from app.models.polymorphic_grading_scale import PolymorphicGradingScale
from app.services.education_initializer import TenantEducationInitializer
from tests.test_api.test_saas import _create_user, _login, _create_school_registration_link, _complete_school_registration, STRONG_PASSWORD

def test_tenant_education_initializer_tg_standard(app_context):
    """Test Togo curriculum framework polymorphic seeding."""
    tenant_id = uuid.uuid4()
    
    # Run setup seeder
    TenantEducationInitializer.run_setup(tenant_id, "tg_standard")
    
    # Assert academic cycles
    cycles = AcademicCycle.query.filter_by(tenant_id=tenant_id).order_by(AcademicCycle.created_at.asc()).all()
    assert len(cycles) == 3
    assert cycles[0].name == "Premier Trimestre"
    assert cycles[0].cycle_type == "TRIMESTRE"
    
    # Assert tracks
    tracks = GradeTrack.query.filter_by(tenant_id=tenant_id).order_by(GradeTrack.numeric_level_rank.asc()).all()
    assert len(tracks) == 4
    assert tracks[0].name == "Maternelle"
    assert tracks[1].name == "Primaire"
    assert tracks[2].name == "Collège"
    assert tracks[3].name == "Lycée"
    
    # Assert levels in Maternelle
    maternelle_track = tracks[0]
    levels = GradeLevel.query.filter_by(track_id=maternelle_track.id).order_by(GradeLevel.order_index.asc()).all()
    assert len(levels) == 3
    assert levels[0].name == "Petite Section"
    assert levels[2].is_terminal is True
    
    # Assert polymorphic grading scale
    scale = PolymorphicGradingScale.query.filter_by(track_id=maternelle_track.id).first()
    assert scale is not None
    assert scale.evaluation_type == "NUMERICAL"
    assert float(scale.max_score) == 20.00
    assert float(scale.passing_boundary) == 10.00
    assert scale.exam_weight == 60
    assert scale.class_weight == 40
    assert len(scale.schemes) == 5
    assert scale.schemes[0]["name"] == "Très Bien"

def test_tenant_education_initializer_uk_cambridge(app_context):
    """Test British Cambridge framework polymorphic seeding."""
    tenant_id = uuid.uuid4()
    
    TenantEducationInitializer.run_setup(tenant_id, "uk_cambridge")
    
    cycles = AcademicCycle.query.filter_by(tenant_id=tenant_id).all()
    assert len(cycles) == 3
    assert cycles[0].cycle_type == "TERM"
    
    tracks = GradeTrack.query.filter_by(tenant_id=tenant_id).order_by(GradeTrack.numeric_level_rank.asc()).all()
    assert len(tracks) == 3
    assert tracks[0].name == "Key Stage 1-2 (Years 1-6)"
    assert tracks[1].name == "IGCSE (Y10-11)"
    assert tracks[2].name == "A-Levels (Y12-13)"
    
    igcse_track = tracks[1]
    levels = GradeLevel.query.filter_by(track_id=igcse_track.id).order_by(GradeLevel.order_index.asc()).all()
    assert len(levels) == 2
    assert levels[0].name == "Year 10"
    assert levels[1].is_terminal is True
    
    scale = PolymorphicGradingScale.query.filter_by(track_id=igcse_track.id).first()
    assert scale is not None
    assert scale.evaluation_type == "LETTER_GRADE"
    assert float(scale.max_score) == 100.00
    assert scale.schemes[0]["name"] == "A*"
    assert scale.schemes[0]["point"] == 5.00

def test_onboarding_wizard_api_endpoint_success(client):
    """Test complete-setup onboarding route succeeds with uk_cambridge."""
    _create_user('platformsuper_setup@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'platformsuper_setup@example.com', 'Password123!')
    
    reg_token = _create_school_registration_link(client, super_token, {
        'school_name': 'Cambridge Prep',
        'school_slug': f'cambridge-{uuid.uuid4().hex[:6]}',
        'country_code': 'GH',
        'currency': 'USD',
        'admin_email': 'cambridge_admin@example.com'
    })
    
    owner_token, tenant_id = _complete_school_registration(client, reg_token, password=STRONG_PASSWORD)
    
    # Call complete-setup onboarding endpoint
    payload = {
        'tenant_id': tenant_id,
        'school_name': 'Cambridge International Prep',
        'address': '12 Cambridge Road, Accra',
        'contact': '+233 24 000 0000',
        'currency': 'USD',
        'education_system': 'uk_cambridge',
        'educational_system': 'uk_cambridge',
        'main_branch_name': 'Secondary Campus',
        'academic_year': '2026',
        'academic_year_name': '2026/2027',
        'term_name': 'Term 1',
        'term_start_date': '2026-09-01',
        'term_end_date': '2026-12-18'
    }
    
    resp = client.post(
        '/api/v1/tenant/complete-setup',
        json=payload,
        headers={'Authorization': f'Bearer {owner_token}'}
    )
    assert resp.status_code == 200
    assert resp.json.get('success') is True
    
    # Assert polymorphic database entries are seeded for this tenant
    cycles = AcademicCycle.query.filter_by(tenant_id=uuid.UUID(tenant_id)).all()
    assert len(cycles) == 3
    
    tracks = GradeTrack.query.filter_by(tenant_id=uuid.UUID(tenant_id)).all()
    assert len(tracks) == 3
