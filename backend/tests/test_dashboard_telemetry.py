import pytest
import uuid
from unittest.mock import patch, MagicMock
from app.extensions import db
from app.models.tenant import Tenant, Branch
from app.models.user import User
from app.models.student import Student
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.subject import Subject
from app.models.teacher import Teacher

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

@pytest.fixture
def telemetry_setup(db):
    """Sets up a complete multi-branch and academic schema for testing scoping."""
    user = _make_user(db, 'school_admin', 'telemetry-admin@example.com')
    tenant = _make_tenant(db, 'telemetry-school', 'enterprise')
    _link_membership(db, tenant.id, user.id)

    # Create Branches
    branch1 = Branch(name="North Campus", tenant_id=tenant.id)
    branch2 = Branch(name="South Campus", tenant_id=tenant.id)
    db.session.add_all([branch1, branch2])
    db.session.commit()

    # Create Classes
    class1 = Class(name="Grade 10A", grade_level="Grade 10", academic_year="2024", branch_id=branch1.id, tenant_id=tenant.id)
    class2 = Class(name="Grade 11B", grade_level="Grade 11", academic_year="2024", branch_id=branch2.id, tenant_id=tenant.id)
    db.session.add_all([class1, class2])
    db.session.commit()

    # Create Student Users
    from datetime import date
    u_alice = User(username="alice_student", email="alice@student.com", role="student")
    u_alice.set_password_hash("password")
    u_bob = User(username="bob_student", email="bob@student.com", role="student")
    u_bob.set_password_hash("password")
    db.session.add_all([u_alice, u_bob])
    db.session.flush()

    # Create Students
    student1 = Student(
        first_name="Alice",
        last_name="Smith",
        admission_number="STU_ALICE",
        gender="Female",
        date_of_birth=date(2010, 1, 1),
        user_id=u_alice.id,
        branch_id=branch1.id,
        class_id=class1.id,
        tenant_id=tenant.id,
        status="active"
    )
    student2 = Student(
        first_name="Bob",
        last_name="Jones",
        admission_number="STU_BOB",
        gender="Male",
        date_of_birth=date(2010, 1, 1),
        user_id=u_bob.id,
        branch_id=branch2.id,
        class_id=class2.id,
        tenant_id=tenant.id,
        status="active"
    )
    db.session.add_all([student1, student2])
    db.session.commit()

    # Create Subject & Exam
    from app.models.exam import Exam
    from datetime import datetime
    subject = Subject(name="Mathematics", code="MATH101", tenant_id=tenant.id)
    db.session.add(subject)
    db.session.commit()

    exam = Exam(
        title="Mock Math Midterm",
        subject_id=subject.id,
        class_id=class1.id,
        exam_date=datetime(2024, 5, 20),
        duration=120,
        total_marks=100.0,
        passing_marks=50.0,
        created_by=user.id
    )
    db.session.add(exam)
    db.session.commit()

    # Create Grades
    grade1 = Grade(
        student_id=student1.id,
        subject_id=subject.id,
        exam_id=exam.id,
        marks_obtained=95.0,
        percentage=95.0,
        graded_by=user.id,
        class_id=class1.id
    )
    grade2 = Grade(
        student_id=student2.id,
        subject_id=subject.id,
        exam_id=exam.id,
        marks_obtained=75.0,
        percentage=75.0,
        graded_by=user.id,
        class_id=class2.id
    )
    db.session.add_all([grade1, grade2])
    db.session.commit()

    return {
        "user": user,
        "tenant": tenant,
        "branch1": branch1,
        "branch2": branch2,
        "student1": student1,
        "student2": student2,
        "subject": subject,
        "grade1": grade1,
        "grade2": grade2
    }

@patch('psutil.cpu_percent')
@patch('psutil.virtual_memory')
@patch('psutil.disk_usage')
def test_dashboard_telemetry_access_and_scoping(mock_disk, mock_mem, mock_cpu, client, db, telemetry_setup):
    """
    Verifies that GET /api/v1/saas/dashboard/telemetry is protected by tenant wrappers,
    properly integrates psutil, and scopes academic aggregates correctly to the active branch.
    """
    # 1. Mock psutil hardware metrics
    mock_cpu.return_value = 45.6
    
    mock_mem_value = MagicMock()
    mock_mem_value.percent = 55.2
    mock_mem.return_value = mock_mem_value

    mock_disk_value = MagicMock()
    mock_disk_value.percent = 68.4
    mock_disk.return_value = mock_disk_value

    user = telemetry_setup["user"]
    tenant = telemetry_setup["tenant"]
    branch1 = telemetry_setup["branch1"]
    branch2 = telemetry_setup["branch2"]

    # Generate auth token
    token = _login(client, 'telemetry-admin@example.com', 'password')

    # 2. Test Request without headers (Should be rejected or fail tenant resolution)
    res_no_headers = client.get('/api/v1/saas/dashboard/telemetry')
    assert res_no_headers.status_code in (401, 403, 400)

    # 3. Test Request scoped to Branch 1
    headers_branch1 = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id),
        'X-Branch-ID': str(branch1.id)
    }

    res_branch1 = client.get('/api/v1/saas/dashboard/telemetry', headers=headers_branch1)
    assert res_branch1.status_code == 200
    payload1 = res_branch1.get_json()
    assert payload1["success"] is True

    # Validate academic scoping for Branch 1
    # Students count: Alice is in Branch 1, Bob in Branch 2. alice count should be 1.
    metrics1 = payload1["data"]["academic_metrics"]
    assert metrics1["students_count"] == 1
    assert metrics1["classes_count"] == 1
    # Alice's grade is 95.0, so overall average_grade for Branch 1 is 95.0
    assert metrics1["average_grade"] == 95.0

    # Validate system telemetry mocks
    sys1 = payload1["data"]["system_monitor"]
    assert sys1["cpu_usage"] == 45.6
    assert sys1["memory_usage"] == 55.2
    assert sys1["disk_usage"] == 68.4

    # Validate subject performance scoping
    sub1 = payload1["data"]["subject_performance"]
    math_perf1 = next((s for s in sub1 if s["subject"] == "Mathematics"), None)
    assert math_perf1 is not None
    assert math_perf1["average_score"] == 95.0
    assert math_perf1["student_count"] == 1

    # 4. Test Request scoped to Branch 2
    headers_branch2 = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id),
        'X-Branch-ID': str(branch2.id)
    }

    res_branch2 = client.get('/api/v1/saas/dashboard/telemetry', headers=headers_branch2)
    assert res_branch2.status_code == 200
    payload2 = res_branch2.get_json()
    
    # Validate academic scoping for Branch 2
    metrics2 = payload2["data"]["academic_metrics"]
    assert metrics2["students_count"] == 1
    assert metrics2["classes_count"] == 1
    # Bob's grade is 75.0, so overall average_grade for Branch 2 is 75.0
    assert metrics2["average_grade"] == 75.0

    # Validate subject performance scoping for Branch 2
    sub2 = payload2["data"]["subject_performance"]
    math_perf2 = next((s for s in sub2 if s["subject"] == "Mathematics"), None)
    assert math_perf2 is not None
    assert math_perf2["average_score"] == 75.0
    assert math_perf2["student_count"] == 1


@patch('psutil.cpu_percent')
@patch('psutil.virtual_memory')
@patch('psutil.disk_usage')
def test_dashboard_telemetry_defaults_to_active_tenant_branch_when_header_missing(mock_disk, mock_mem, mock_cpu, client, db, telemetry_setup):
    mock_cpu.return_value = 21.5

    mock_mem_value = MagicMock()
    mock_mem_value.percent = 48.0
    mock_mem.return_value = mock_mem_value

    mock_disk_value = MagicMock()
    mock_disk_value.percent = 63.3
    mock_disk.return_value = mock_disk_value

    tenant = telemetry_setup["tenant"]
    token = _login(client, 'telemetry-admin@example.com', 'password')

    response = client.get(
        '/api/v1/saas/dashboard/telemetry',
        headers={
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(tenant.id),
        }
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True

    metrics = payload["data"]["academic_metrics"]
    assert metrics["students_count"] == 1
    assert metrics["classes_count"] == 1
    assert metrics["average_grade"] == 95.0


@patch('psutil.cpu_percent')
@patch('psutil.virtual_memory')
@patch('psutil.disk_usage')
def test_dashboard_telemetry_falls_back_to_tenant_scope_without_branch(mock_disk, mock_mem, mock_cpu, client, db):
    mock_cpu.return_value = 19.2

    mock_mem_value = MagicMock()
    mock_mem_value.percent = 44.1
    mock_mem.return_value = mock_mem_value

    mock_disk_value = MagicMock()
    mock_disk_value.percent = 58.7
    mock_disk.return_value = mock_disk_value

    user = _make_user(db, 'school_admin', 'telemetry-nobranch@example.com')
    tenant = _make_tenant(db, 'telemetry-no-branch', 'enterprise')
    _link_membership(db, tenant.id, user.id)

    token = _login(client, 'telemetry-nobranch@example.com', 'password')
    response = client.get(
        '/api/v1/saas/dashboard/telemetry',
        headers={
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(tenant.id),
        }
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True

    metrics = payload["data"]["academic_metrics"]
    assert metrics["students_count"] == 0
    assert metrics["classes_count"] == 0

    system_monitor = payload["data"]["system_monitor"]
    assert system_monitor["cpu_usage"] == 19.2
    assert system_monitor["memory_usage"] == 44.1
    assert system_monitor["disk_usage"] == 58.7
