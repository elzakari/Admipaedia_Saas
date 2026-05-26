import uuid
import datetime
import hashlib
from decimal import Decimal
from flask import g
from app.extensions import db
from app.models.tenant import Tenant, Branch, TenantMembership
from app.models.student import Student
from app.models.user import User
from app.models.parent import Parent
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.admission import AdmissionApplication
from app.models.attendance import Attendance
from app.services.admission_service import AdmissionService
from app.services.attendance_analytics import AttendanceAnalytics

def test_admissions_transition_and_provisioning(app):
    """
    Test that transitioning an application to accepted successfully provisions User,
    Student, and TenantMembership rows atomically, and generates valid secure hashes.
    """
    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    
    with app.app_context():
        # 1. Seed Tenant, Branch, User, Parent, Class
        tenant = Tenant(id=tenant_id, slug=f"test-academy-{uuid.uuid4().hex[:4]}", name="Test Academy", country_code="GH", schema_name=f"test_{uuid.uuid4().hex[:4]}", currency="GHS")
        db.session.add(tenant)
        
        branch = Branch(id=branch_id, tenant_id=tenant_id, name="Main Campus", is_active=True)
        db.session.add(branch)
        
        parent_user = User(username="parent_1", email="parent@example.com", role="parent")
        db.session.add(parent_user)
        db.session.flush()
        
        parent = Parent(id=1, tenant_id=tenant_id, user_id=parent_user.id)
        db.session.add(parent)
        
        class_obj = Class(id=10, tenant_id=tenant_id, branch_id=branch_id, name="Grade 1", grade_level="1", academic_year="2026")
        db.session.add(class_obj)
        db.session.flush()
        
        # 2. Seed AdmissionApplication
        application = AdmissionApplication(
            id=55,
            parent_id=parent.id,
            student_first_name="Jane",
            student_last_name="Doe",
            target_class_id=class_obj.id,
            status="under_review",
            form_data={
                "gender": "f",
                "date_of_birth": "2018-05-15",
                "student_email": "jane.doe@example.com"
            }
        )
        db.session.add(application)
        db.session.commit()
        
        # 3. Transition to accepted via AdmissionService
        app_record, student, raw_token, error = AdmissionService.change_application_status(
            application_id=55,
            new_status="ACCEPTED",
            tenant_id=tenant_id
        )
        
        # 4. Verify results
        assert error is None
        assert app_record is not None
        assert app_record.status == "accepted"
        
        # Check student provisioning
        assert student is not None
        assert student.first_name == "Jane"
        assert student.last_name == "Doe"
        assert student.class_id == 10
        assert student.tenant_id == tenant_id
        assert student.branch_id == branch_id
        assert student.parent_id == parent.id
        assert student.gender == "f"
        assert student.date_of_birth == datetime.date(2018, 5, 15)
        
        # Check user provisioning
        student_user = User.query.get(student.user_id)
        assert student_user is not None
        assert student_user.role == "student"
        assert student_user.email == "jane.doe@example.com"
        
        # Check TenantMembership
        membership = TenantMembership.query.filter_by(user_id=student_user.id, tenant_id=tenant_id).first()
        assert membership is not None
        assert membership.role == "student"
        assert membership.status == "active"
        
        # Verify SHA-256 account claim tokens
        assert raw_token is not None
        expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        assert student.invitation_token_hash == expected_hash
        assert student_user.invitation_token_hash == expected_hash
        assert student.invitation_expires_at is not None
        
        # Clean up
        db.session.delete(student)
        db.session.delete(student_user)
        db.session.delete(membership)
        db.session.delete(application)
        db.session.delete(class_obj)
        db.session.delete(parent)
        db.session.delete(parent_user)
        db.session.delete(branch)
        db.session.delete(tenant)
        db.session.commit()

def test_attendance_analytics_decimal_precision(app):
    """
    Test that the AttendanceAnalytics engine computes rates using precise Decimal math,
    avoiding standard binary floating-point drifts.
    """
    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    
    with app.app_context():
        # 1. Seed support structure
        tenant = Tenant(id=tenant_id, slug=f"precision-academy-{uuid.uuid4().hex[:4]}", name="Precision Academy", country_code="GH", schema_name=f"test_{uuid.uuid4().hex[:4]}", currency="GHS")
        db.session.add(tenant)
        
        branch = Branch(id=branch_id, tenant_id=tenant_id, name="Math Branch", is_active=True)
        db.session.add(branch)
        
        user = User(username="std_math", email="math@example.com", role="student")
        db.session.add(user)
        db.session.flush()
        
        student = Student(
            id=123,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user.id,
            admission_number="ADM-MATH",
            first_name="Max",
            last_name="Precision",
            date_of_birth=datetime.date(2012, 1, 1),
            gender="m"
        )
        db.session.add(student)
        
        class_obj = Class(id=20, tenant_id=tenant_id, branch_id=branch_id, name="Grade 5 Math", grade_level="5", academic_year="2026")
        db.session.add(class_obj)
        
        subject = Subject(id=30, tenant_id=tenant_id, name="Maths", code="M1")
        db.session.add(subject)
        db.session.flush()
        
        # 2. Seed 9 attendance records (5 present, 2 absent, 1 late, 1 excused)
        # Expected presence rate: (5 + 1) / 9 = 6 / 9 = 66.67% (precise Decimal)
        statuses = ['present', 'present', 'present', 'present', 'present', 'absent', 'absent', 'late', 'excused']
        
        for i, status in enumerate(statuses):
            att = Attendance(
                student_id=student.id,
                class_id=class_obj.id,
                subject_id=subject.id,
                branch_id=branch_id,
                date=datetime.date(2026, 5, 1 + i),
                status=status
            )
            db.session.add(att)
            
        db.session.commit()
        
        # Set active branch context manually in g
        g.branch_id = branch_id
        
        # 3. Calculate statistics via Analytics Service
        stats = AttendanceAnalytics.get_monthly_branch_stats(
            branch_id=str(branch_id),
            year=2026,
            month=5,
            class_id=class_obj.id
        )
        
        assert stats["present_count"] == 5
        assert stats["late_count"] == 1
        assert stats["absent_count"] == 2
        assert stats["excused_count"] == 1
        assert stats["total_records"] == 9
        
        # Assert precise Decimal rate matches exactly
        expected_decimal = Decimal('66.67')
        assert stats["presence_rate"] == expected_decimal
        
        # Ensure daily trends mapped correctly
        assert len(stats["daily_trends"]) == 9
        assert stats["daily_trends"][0]["presence_rate"] == Decimal('100.00')
        
        # Clean up
        Attendance.query.filter_by(class_id=class_obj.id).delete()
        db.session.delete(student)
        db.session.delete(user)
        db.session.delete(class_obj)
        db.session.delete(subject)
        db.session.delete(branch)
        db.session.delete(tenant)
        db.session.commit()

def test_admissions_and_attendance_branch_isolation(app):
    """
    Test that multi-branch data isolation rules hold:
    A user or analytical query scoped to Branch A can never see or cross-pollinate with Branch B records.
    """
    tenant_id = uuid.uuid4()
    branch1_id = uuid.uuid4()
    branch2_id = uuid.uuid4()
    
    with app.app_context():
        # 1. Seed Tenant, Branches, parent and student profiles
        tenant = Tenant(id=tenant_id, slug=f"dual-academy-{uuid.uuid4().hex[:4]}", name="Dual Academy", country_code="GH", schema_name=f"test_{uuid.uuid4().hex[:4]}", currency="GHS")
        db.session.add(tenant)
        
        b1 = Branch(id=branch1_id, tenant_id=tenant_id, name="Campus Alpha", is_active=True)
        b2 = Branch(id=branch2_id, tenant_id=tenant_id, name="Campus Beta", is_active=True)
        db.session.add_all([b1, b2])
        
        parent_user = User(username="parent_dual", email="parent_dual@example.com", role="parent")
        db.session.add(parent_user)
        db.session.flush()
        
        parent = Parent(id=2, tenant_id=tenant_id, user_id=parent_user.id)
        db.session.add(parent)
        
        # Class 1 is in Branch 1
        c1 = Class(id=101, tenant_id=tenant_id, branch_id=branch1_id, name="Class A1", grade_level="1", academic_year="2026")
        # Class 2 is in Branch 2
        c2 = Class(id=102, tenant_id=tenant_id, branch_id=branch2_id, name="Class B2", grade_level="2", academic_year="2026")
        db.session.add_all([c1, c2])
        db.session.flush()
        
        # 2. Seed AdmissionApplication in Branch 1 (via c1) and Branch 2 (via c2)
        app1 = AdmissionApplication(
            id=1001,
            parent_id=parent.id,
            student_first_name="Alpha",
            student_last_name="Student",
            target_class_id=c1.id,
            status="submitted"
        )
        app2 = AdmissionApplication(
            id=1002,
            parent_id=parent.id,
            student_first_name="Beta",
            student_last_name="Student",
            target_class_id=c2.id,
            status="submitted"
        )
        db.session.add_all([app1, app2])
        db.session.commit()
        
        # Set active branch context to Branch 1
        g.branch_id = branch1_id
        g.tenant_id = tenant_id
        
        # 3. Query Admission Applications
        # Using the same join query as in routes.py
        query = AdmissionApplication.query.join(Parent, AdmissionApplication.parent_id == Parent.id).filter(Parent.tenant_id == tenant_id)
        query = query.join(Class, AdmissionApplication.target_class_id == Class.id).filter(Class.branch_id == branch1_id)
        
        results = query.all()
        # Verify only Branch 1 application is fetched
        assert len(results) == 1
        assert results[0].id == 1001
        
        # Verify Branch 2 application is isolated
        assert 1002 not in [r.id for r in results]
        
        # Clean up
        db.session.delete(app1)
        db.session.delete(app2)
        db.session.delete(c1)
        db.session.delete(c2)
        db.session.delete(parent)
        db.session.delete(parent_user)
        db.session.delete(b1)
        db.session.delete(b2)
        db.session.delete(tenant)
        db.session.commit()
