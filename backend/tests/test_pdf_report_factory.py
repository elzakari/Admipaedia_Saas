import uuid
import datetime
from decimal import Decimal
from flask import g
from app.extensions import db
from app.models.tenant import Tenant, Branch
from app.models.grade_track import GradeTrack
from app.models.educational_system import GradeLevel
from app.models.polymorphic_grading_scale import PolymorphicGradingScale
from app.models.class_ import Class
from app.models.student import Student
from app.models.subject import Subject
from app.models.grade import Grade
from app.models.academic_cycle import AcademicCycle
from app.models.user import User
from app.services.report_card_generator import ReportCardGenerator
from tests.test_api.test_saas import _create_user, _login, _create_school_registration_link, _complete_school_registration, STRONG_PASSWORD

def test_polymorphic_pdf_compilation(app):
    """Test that the ReportCardGenerator compiles a valid PDF stream with dynamic scales and custom weights."""
    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    
    # Set context
    g.tenant_id = tenant_id
    g.branch_id = branch_id
    
    # 1. Seed GradeTrack, GradeLevel, and dynamic scale
    track = GradeTrack(tenant_id=tenant_id, name="Secondary", numeric_level_rank=2)
    db.session.add(track)
    db.session.flush()
    
    level = GradeLevel(tenant_id=tenant_id, track_id=track.id, name="Year 10")
    db.session.add(level)
    db.session.flush()
    
    scale = PolymorphicGradingScale(
        tenant_id=tenant_id,
        track_id=track.id,
        evaluation_type="LETTER_GRADE",
        max_score=Decimal("100.00"),
        passing_boundary=Decimal("50.00"),
        class_weight=40,
        exam_weight=60,
        schemes=[
            {"min": 80.00, "max": 100.00, "name": "A*"},
            {"min": 50.00, "max": 79.99, "name": "C"},
            {"min": 0.00, "max": 49.99, "name": "U"}
        ]
    )
    db.session.add(scale)
    
    # 2. Seed AcademicCycle, Classroom, Student, Subject, and Grades
    cycle = AcademicCycle(tenant_id=tenant_id, cycle_type="TERM", name="Term 1")
    db.session.add(cycle)
    db.session.flush()
    
    clazz = Class(tenant_id=tenant_id, branch_id=branch_id, name="Class 10A", grade_level="Year 10", academic_year="2026")
    db.session.add(clazz)
    db.session.flush()
    
    user = User(username=f"student_{uuid.uuid4().hex[:4]}", email="student@test.com", role="student")
    db.session.add(user)
    db.session.flush()
    
    student = Student(
        tenant_id=tenant_id,
        branch_id=branch_id,
        user_id=user.id,
        admission_number="ADM-1002",
        first_name="Jane",
        last_name="Doe",
        date_of_birth=datetime.date(2011, 6, 15),
        gender="Female",
        class_id=clazz.id
    )
    db.session.add(student)
    db.session.flush()
    
    subject = Subject(tenant_id=tenant_id, name="Mathematics", code="MATH101")
    db.session.add(subject)
    db.session.flush()
    
    # Class Work Grades (Weight 40%)
    g1 = Grade(student_id=student.id, exam_id=1, marks_obtained=90.0, percentage=90.0, graded_by=1, subject_id=subject.id, class_id=clazz.id, term="Term 1", academic_year="2026", assessment_type="quiz")
    # Exam Work Grades (Weight 60%)
    g2 = Grade(student_id=student.id, exam_id=2, marks_obtained=85.0, percentage=85.0, graded_by=1, subject_id=subject.id, class_id=clazz.id, term="Term 1", academic_year="2026", assessment_type="exam")
    db.session.add_all([g1, g2])
    db.session.commit()
    
    # 3. Generate PDF
    pdf_stream = ReportCardGenerator.generate_report_card_pdf(student.id, str(cycle.id))
    assert pdf_stream is not None
    pdf_bytes = pdf_stream.getvalue()
    assert b"%PDF" in pdf_bytes  # Confirm valid PDF header signature
    
    # Clean up g
    g.tenant_id = None
    g.branch_id = None


def test_pdf_report_row_level_security_enforcement(app):
    """Test that query_scoped() blocks generating reports for students in a different branch context."""
    tenant_id = uuid.uuid4()
    branch1 = uuid.uuid4()
    branch2 = uuid.uuid4()
    
    # Set context to branch1
    g.tenant_id = tenant_id
    g.branch_id = branch1
    
    # Student in branch2
    user = User(username=f"student_{uuid.uuid4().hex[:4]}", email="stu2@test.com", role="student")
    db.session.add(user)
    db.session.flush()
    
    student = Student(
        tenant_id=tenant_id,
        branch_id=branch2,
        user_id=user.id,
        admission_number="ADM-RLS",
        first_name="Secret",
        last_name="Student",
        date_of_birth=datetime.date(2011, 1, 1),
        gender="Male"
    )
    db.session.add(student)
    db.session.commit()
    
    # Query student in active branch context (branch1)
    db_student = Student.query_scoped().filter_by(id=student.id).first()
    assert db_student is None  # Should be hidden!
    
    # Generating PDF card must raise ValueError for unauthorized access
    try:
        ReportCardGenerator.generate_report_card_pdf(student.id, str(uuid.uuid4()))
        assert False, "Should have raised ValueError due to RLS branch scoping isolation."
    except ValueError as e:
        assert "Student not found or unauthorized access" in str(e)
        
    g.tenant_id = None
    g.branch_id = None


def test_pdf_report_card_streaming_endpoint(client):
    """Test backend HTTP endpoint downloading a branch-isolated PDF stream under JWT auth."""
    # Setup Tenant/Owner
    _create_user('reportsuper@example.com', role='super_admin', password='Password123!')
    super_token = _login(client, 'reportsuper@example.com', 'Password123!')
    
    reg_token = _create_school_registration_link(client, super_token, {
        'school_name': 'PDF Academy',
        'school_slug': f'pdf-sch-{uuid.uuid4().hex[:6]}',
        'country_code': 'GH',
        'currency': 'GHS',
        'admin_email': 'pdf_admin@example.com'
    })
    owner_token, tenant_id_str = _complete_school_registration(client, reg_token, password=STRONG_PASSWORD)
    tenant_id = uuid.UUID(tenant_id_str)
    
    # Register/Complete setup onboarding to provision tracks and scales
    payload = {
        'tenant_id': tenant_id_str,
        'school_name': 'PDF International Academy',
        'address': 'Accra',
        'contact': '+233 24 111 2222',
        'currency': 'GHS',
        'education_system': 'uk_cambridge',
        'educational_system': 'uk_cambridge',
        'main_branch_name': 'Main Campus',
        'academic_year': '2026',
        'academic_year_name': '2026/2027',
        'term_name': 'Term 1',
        'term_start_date': '2026-09-01',
        'term_end_date': '2026-12-18'
    }
    
    client.post('/api/v1/tenant/complete-setup', json=payload, headers={'Authorization': f'Bearer {owner_token}'})
    
    # Manually seed branch in test DB context to ensure clean resolution
    branch = Branch(tenant_id=tenant_id, name="Main Campus", is_active=True)
    db.session.add(branch)
    db.session.commit()
    
    cycle = AcademicCycle.query.filter_by(tenant_id=tenant_id, name="Term 1").first()
    assert cycle is not None
    
    clazz = Class(tenant_id=tenant_id, branch_id=branch.id, name="Class A", grade_level="Year 10", academic_year="2026")
    db.session.add(clazz)
    db.session.flush()
    
    user = User(username=f"student_{uuid.uuid4().hex[:4]}", email="pdfstudent@test.com", role="student")
    db.session.add(user)
    db.session.flush()
    
    student = Student(
        tenant_id=tenant_id,
        branch_id=branch.id,
        user_id=user.id,
        admission_number="ADM-PDF",
        first_name="Bob",
        last_name="Builder",
        date_of_birth=datetime.date(2012, 1, 1),
        gender="Male",
        class_id=clazz.id
    )
    db.session.add(student)
    db.session.flush()
    
    subject = Subject(tenant_id=tenant_id, name="English", code="ENG101")
    db.session.add(subject)
    db.session.flush()
    
    g1 = Grade(student_id=student.id, exam_id=1, marks_obtained=80.0, percentage=80.0, graded_by=1, subject_id=subject.id, class_id=clazz.id, term="Term 1", academic_year="2026", assessment_type="quiz")
    db.session.add(g1)
    db.session.commit()
    
    # Fetch PDF stream from Flask endpoint route
    resp = client.get(
        f'/api/v1/saas/report-card/pdf?student_id={student.id}&academic_cycle_id={cycle.id}',
        headers={
            'Authorization': f'Bearer {owner_token}',
            'X-Tenant-ID': str(tenant_id),
            'X-Active-Branch-ID': str(branch.id)
        }
    )
    
    assert resp.status_code == 200
    assert resp.mimetype == 'application/pdf'
    assert b"%PDF" in resp.data
