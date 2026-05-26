import uuid
import datetime
from decimal import Decimal
from flask import g, session
from app.extensions import db
from app.models.tenant import Tenant, Branch
from app.models.grade_track import GradeTrack
from app.models.educational_system import GradeLevel
from app.models.polymorphic_grading_scale import PolymorphicGradingScale
from app.models.class_ import Class
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.finance import StudentFee
from app.models.user import User
from app.services.grading_engine import PolymorphicGradingEngine
from app.saas.middleware import campus_isolation_middleware

def test_polymorphic_grading_calculation(app):
    """Test precise decimal grading calculations and matching."""
    tenant_id = uuid.uuid4()
    
    # 1. Seed GradeTrack & GradeLevel
    track = GradeTrack(tenant_id=tenant_id, name="Test Track", numeric_level_rank=1)
    db.session.add(track)
    db.session.flush()
    
    level = GradeLevel(tenant_id=tenant_id, track_id=track.id, name="Test Level")
    db.session.add(level)
    db.session.flush()
    
    # 2. Seed Class
    clazz = Class(
        tenant_id=tenant_id,
        name="Test Class A",
        grade_level="Test Level",
        academic_year="2026"
    )
    db.session.add(clazz)
    db.session.flush()
    
    # 3. Seed PolymorphicGradingScale
    scale = PolymorphicGradingScale(
        tenant_id=tenant_id,
        track_id=track.id,
        evaluation_type="LETTER_GRADE",
        max_score=Decimal("100.00"),
        passing_boundary=Decimal("50.00"),
        class_weight=40,
        exam_weight=60,
        schemes=[
            {"min": 85.00, "max": 100.00, "name": "A"},
            {"min": 70.00, "max": 84.99, "name": "B"},
            {"min": 50.00, "max": 69.99, "name": "C"},
            {"min": 0.00, "max": 49.99, "name": "F"}
        ]
    )
    db.session.add(scale)
    db.session.commit()
    
    # 4. Perform calculation
    # Weighted calculation: 80 * 0.4 + 90 * 0.6 = 32 + 54 = 86 (Should be A)
    res = PolymorphicGradingEngine.calculate_final_score(clazz.id, 80.0, 90.0)
    assert res["final_score"] == 86.0
    assert res["mark"] == "A"
    assert res["evaluation_type"] == "LETTER_GRADE"
    assert res["passing"] is True
    
    # Weighted calculation: 45 * 0.4 + 50 * 0.6 = 18 + 30 = 48 (Should be F)
    res2 = PolymorphicGradingEngine.calculate_final_score(clazz.id, 45.0, 50.0)
    assert res2["final_score"] == 48.0
    assert res2["mark"] == "F"
    assert res2["passing"] is False


def test_campus_isolation_middleware_headers(app):
    """Test that active branch middleware correctly extracts headers."""
    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    
    # Simulate active request context headers
    with app.test_request_context(
        headers={'X-Active-Branch-ID': str(branch_id), 'X-Tenant-ID': str(tenant_id)}
    ):
        g.tenant_id = tenant_id
        g.current_user = None
        campus_isolation_middleware()
        assert g.branch_id == branch_id


def test_campus_isolation_middleware_defaults(app):
    """Test active branch middleware defaults to Main Campus for tenant admins."""
    tenant_id = uuid.uuid4()
    
    # Seed a Tenant
    tenant = Tenant(id=tenant_id, slug=f"slug-{uuid.uuid4().hex[:6]}", name="School", country_code="TG", schema_name=f"sch_{uuid.uuid4().hex[:6]}")
    db.session.add(tenant)
    db.session.commit()
    
    # Mock Admin User
    admin = User(username=f"admin_{uuid.uuid4().hex[:4]}", email="admin@test.com", role="school_admin")
    db.session.add(admin)
    db.session.commit()
    
    with app.test_request_context():
        g.tenant_id = tenant_id
        g.current_user = admin
        
        campus_isolation_middleware()
        
        # Should have dynamically resolved or created "Main Campus"
        assert g.branch_id is not None
        branch = Branch.query.get(g.branch_id)
        assert branch is not None
        assert branch.name == "Main Campus"
        assert branch.tenant_id == tenant_id


def test_auto_populate_branch_id_before_flush(app):
    """Test that before_flush dynamically injects g.branch_id on scoped records."""
    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    
    # Mock the request state
    g.tenant_id = tenant_id
    g.branch_id = branch_id
    
    # 1. Student
    # Create required user relations
    user = User(username=f"student_{uuid.uuid4().hex[:4]}", email="stu@test.com", role="student")
    db.session.add(user)
    db.session.flush()
    
    student = Student(
        tenant_id=tenant_id,
        user_id=user.id,
        admission_number=f"ADM-{uuid.uuid4().hex[:4]}",
        first_name="First",
        last_name="Last",
        date_of_birth=datetime.date(2010, 1, 1),
        gender="Male"
    )
    db.session.add(student)
    
    # 2. Class
    clazz = Class(
        tenant_id=tenant_id,
        name="Dynamic Scoped Class",
        grade_level="1",
        academic_year="2026"
    )
    db.session.add(clazz)
    
    # 3. Attendance
    attendance = Attendance(
        student_id=1,
        class_id=1,
        subject_id=1,
        date=datetime.date(2026, 5, 26),
        status="present"
    )
    db.session.add(attendance)
    
    # Flush to database
    db.session.flush()
    
    # Assert branch_id was automatically populated before flush
    assert student.branch_id == branch_id
    assert clazz.branch_id == branch_id
    assert attendance.branch_id == branch_id


def test_query_scoped_helper(app):
    """Test that Model.query_scoped() successfully scopes database queries."""
    tenant_id = uuid.uuid4()
    branch1 = uuid.uuid4()
    branch2 = uuid.uuid4()
    
    # Create two classes in separate branches
    class1 = Class(tenant_id=tenant_id, branch_id=branch1, name="Branch 1 Class", grade_level="1", academic_year="2026")
    class2 = Class(tenant_id=tenant_id, branch_id=branch2, name="Branch 2 Class", grade_level="1", academic_year="2026")
    
    db.session.add_all([class1, class2])
    db.session.commit()
    
    # Set context to branch1
    g.branch_id = branch1
    scoped_classes = Class.query_scoped().all()
    assert len(scoped_classes) == 1
    assert scoped_classes[0].name == "Branch 1 Class"
    
    # Set context to branch2
    g.branch_id = branch2
    scoped_classes_2 = Class.query_scoped().all()
    assert len(scoped_classes_2) == 1
    assert scoped_classes_2[0].name == "Branch 2 Class"
