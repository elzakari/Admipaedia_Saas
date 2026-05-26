import uuid
import datetime
from app.extensions import db
from app.models.tenant import Tenant, Branch, TenantMembership
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.models.timetable import Period, TimetableSlot
from tests.test_api.test_saas import _create_user, _login

def test_timetable_conflict_engine_and_isolation(client):
    """
    Test 3-way conflict timetable scheduling logic:
      - Teacher clashes must be checked tenant-wide (cross-campus).
      - Room and Class Group clashes must remain isolated by branch.
      - Overlapping period bounds trigger clashes perfectly.
    """
    # 1. Create proprietor login and Tenant context
    _create_user('timetableprop@example.com', role='school_admin', password='Password123!')
    prop_token = _login(client, 'timetableprop@example.com', 'Password123!')
    
    tenant = Tenant(
        slug=f"timetable-sch-{uuid.uuid4().hex[:6]}",
        name="Timetable Board School",
        country_code="GH",
        schema_name=f"sch_{uuid.uuid4().hex[:6]}"
    )
    db.session.add(tenant)
    db.session.flush()
    
    u_prop = User.query.filter_by(email='timetableprop@example.com').first()
    db.session.add(TenantMembership(tenant_id=tenant.id, user_id=u_prop.id, role='school_admin', status='active'))
    
    # 2. Seed Campus Alpha and Campus Beta
    branch_alpha = Branch(tenant_id=tenant.id, name="Campus Alpha", is_active=True)
    branch_beta = Branch(tenant_id=tenant.id, name="Campus Beta", is_active=True)
    db.session.add_all([branch_alpha, branch_beta])
    db.session.flush()
    
    # 3. Seed Classes on different campuses
    class_alpha = Class(tenant_id=tenant.id, branch_id=branch_alpha.id, name="Class 10A", grade_level="10", academic_year="2026")
    class_beta = Class(tenant_id=tenant.id, branch_id=branch_beta.id, name="Class 10A", grade_level="10", academic_year="2026")
    db.session.add_all([class_alpha, class_beta])
    db.session.flush()
    
    # 4. Seed Subjects
    maths = Subject(tenant_id=tenant.id, name="Mathematics", code="MATH10")
    english = Subject(tenant_id=tenant.id, name="English Language", code="ENG10")
    db.session.add_all([maths, english])
    db.session.flush()
    
    # 5. Seed Teacher (Travelling educator splitting time between Alpha and Beta)
    u_teach = User(username=f"teacher_{uuid.uuid4().hex[:4]}", email="teacher@test.com", role="teacher")
    db.session.add(u_teach)
    db.session.flush()
    
    teacher = Teacher(
        tenant_id=tenant.id,
        branch_id=branch_alpha.id,
        user_id=u_teach.id,
        employee_id=f"EMP-{uuid.uuid4().hex[:4]}",
        first_name="John",
        last_name="Doe"
    )
    db.session.add(teacher)
    db.session.flush()
    
    # 6. Seed Periods with different and overlapping time boundaries
    # Standard Period 1 (08:00 - 09:00)
    p1 = Period(name="Period 1", start_time=datetime.time(8, 0), end_time=datetime.time(9, 0), order_index=1, is_break=False)
    # Standard Period 2 (09:00 - 10:00)
    p2 = Period(name="Period 2", start_time=datetime.time(9, 0), end_time=datetime.time(10, 0), order_index=2, is_break=False)
    # Overlapping Period (08:30 - 09:30) - Clashes with both Period 1 and Period 2!
    p_overlap = Period(name="Period Overlap", start_time=datetime.time(8, 30), end_time=datetime.time(9, 30), order_index=3, is_break=False)
    db.session.add_all([p1, p2, p_overlap])
    db.session.commit()

    headers = {
        'Authorization': f'Bearer {prop_token}',
        'X-Tenant-ID': str(tenant.id),
        'X-Active-Branch-ID': str(branch_alpha.id),
        'X-Branch-ID': str(branch_alpha.id)
    }

    # A. Seed clean non-overlapping slot on Campus Alpha (Monday, Period 1)
    slot1_payload = {
        "class_id": class_alpha.id,
        "subject_id": maths.id,
        "teacher_id": teacher.id,
        "period_id": p1.id,
        "day_of_week": "Monday",
        "term": "Term 1",
        "academic_year": "2026",
        "room_id": 101
    }
    resp1 = client.post('/api/v1/saas/timetable/slots', json=slot1_payload, headers=headers)
    assert resp1.status_code == 201

    # B. Test Teacher Cross-Campus Clash (Monday, Overlapping Period)
    # Attempt to schedule the travelling teacher on Campus Beta (using branch_beta active context) at Monday, Period Overlap
    headers_beta = {
        'Authorization': f'Bearer {prop_token}',
        'X-Tenant-ID': str(tenant.id),
        'X-Active-Branch-ID': str(branch_beta.id),
        'X-Branch-ID': str(branch_beta.id)
    }
    
    clash_teacher_payload = {
        "class_id": class_beta.id,
        "subject_id": english.id,
        "teacher_id": teacher.id,
        "period_id": p_overlap.id, # Overlaps with Monday Period 1 (08:30 < 09:00 AND 09:30 > 08:00)
        "day_of_week": "Monday",
        "term": "Term 1",
        "academic_year": "2026",
        "room_id": 202
    }
    resp_clash_teacher = client.post('/api/v1/saas/timetable/slots', json=clash_teacher_payload, headers=headers_beta)
    # MUST fail with 400 Bad Request due to travelling teacher clash cross-campus!
    assert resp_clash_teacher.status_code == 400
    assert "Teacher" in resp_clash_teacher.json["conflicts"][0]
    assert "is already scheduled" in resp_clash_teacher.json["conflicts"][0]

    # C. Test Room Campus Isolation (Monday, Period 1)
    # Room 101 is already booked on Campus Alpha. Book Room 101 on Campus Beta.
    # Should succeed because Room bookings are isolated to the active branch context!
    room_beta_payload = {
        "class_id": class_beta.id,
        "subject_id": english.id,
        "teacher_id": teacher.id, # Needs another teacher to avoid teacher clash! But wait, let's create teacher2 first
        "period_id": p1.id,
        "day_of_week": "Monday",
        "term": "Term 1",
        "academic_year": "2026",
        "room_id": 101 # Same room id, different branch
    }
    
    # Seed teacher 2 on Beta
    u_teach2 = User(username=f"teacher_{uuid.uuid4().hex[:4]}", email="teacher2@test.com", role="teacher")
    db.session.add(u_teach2)
    db.session.flush()
    teacher2 = Teacher(tenant_id=tenant.id, branch_id=branch_beta.id, user_id=u_teach2.id, first_name="Mary", last_name="Jane")
    db.session.add(teacher2)
    db.session.commit()
    
    room_beta_payload["teacher_id"] = teacher2.id
    resp_room_ok = client.post('/api/v1/saas/timetable/slots', json=room_beta_payload, headers=headers_beta)
    # SHOULD succeed seamlessly!
    assert resp_room_ok.status_code == 201

    # D. Test Class Group Campus Isolation (Monday, Period 1)
    # Attempt to schedule Class 10A on Campus Beta during Monday Period 1 (already booked on Alpha).
    # Since Class 10A on Beta is isolated by branch, this should succeed perfectly.
    
    # Seed teacher 3 on Beta to avoid teacher conflicts
    u_teach3 = User(username=f"teacher_{uuid.uuid4().hex[:4]}", email="teacher3@test.com", role="teacher")
    db.session.add(u_teach3)
    db.session.flush()
    teacher3 = Teacher(tenant_id=tenant.id, branch_id=branch_beta.id, user_id=u_teach3.id, first_name="Paul", last_name="Walker")
    db.session.add(teacher3)
    db.session.commit()
    
    class_beta_payload = {
        "class_id": class_beta.id,
        "subject_id": maths.id,
        "teacher_id": teacher3.id,
        "period_id": p1.id,
        "day_of_week": "Monday",
        "term": "Term 1",
        "academic_year": "2026",
        "room_id": 102
    }
    # (Since room_beta_payload already booked class_beta on Monday P1 with teacher2, booking it again should CLASH on Beta!)
    resp_class_clash_beta = client.post('/api/v1/saas/timetable/slots', json=class_beta_payload, headers=headers_beta)
    assert resp_class_clash_beta.status_code == 400
    assert "Class Group" in resp_class_clash_beta.json["conflicts"][0]

    # E. Test safe non-overlapping schedules (Monday, Period 2)
    # Schedule Campus Alpha class on Monday, Period 2
    slot_safe_payload = {
        "class_id": class_alpha.id,
        "subject_id": english.id,
        "teacher_id": teacher.id,
        "period_id": p2.id, # Period 2 (09:00 - 10:00) does not overlap Period 1 (08:00 - 09:00)
        "day_of_week": "Monday",
        "term": "Term 1",
        "academic_year": "2026",
        "room_id": 101
    }
    resp_safe = client.post('/api/v1/saas/timetable/slots', json=slot_safe_payload, headers=headers)
    assert resp_safe.status_code == 201
