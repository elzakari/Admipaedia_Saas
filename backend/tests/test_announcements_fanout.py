import uuid
import pytest
from datetime import datetime
from app.extensions import db
from app.models.user import User
from app.models.class_ import Class, ClassTeacherMapping
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.parent import Parent
from app.models.subject import Subject
from app.models.dashboard import Notification
from app.models.tenant import Tenant
from app.services.class_service import ClassService
from app.services.announcement_service import AnnouncementService
from app.services.assignment_service import AssignmentService
from tests.test_production_integration import (
    create_test_tenant,
    create_test_user,
    create_test_teacher,
    create_test_student,
    create_test_membership
)

def create_test_parent(db_session, user, tenant_id):
    parent = Parent(
        user_id=user.id,
        tenant_id=tenant_id,
        relationship='Father'
    )
    db_session.add(parent)
    db_session.flush()
    return parent

def test_announcement_creates_fanout_notifications(app, db_session):
    """Verify that creating a class announcement transactionally generates student and parent notifications."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        
        # Setup Teacher, Student, Parent
        t_user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        
        s_user = create_test_user(db_session, f"s_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student = create_test_student(db_session, s_user, tenant.id)
        
        p_user = create_test_user(db_session, f"p_{uuid.uuid4().hex[:6]}@example.com", 'parent', tenant.id)
        parent = create_test_parent(db_session, p_user, tenant.id)
        
        # Link Student to Parent
        student.parent_id = parent.id
        
        # Create class
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 1',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        # Assign teacher and student to class
        ClassService.assign_teacher(c.id, teacher.id)
        student.class_id = c.id
        
        db_session.commit()
        
        # Act: create class announcement via service
        announcement_data = {
            'title': 'Test Announcement Title',
            'content': 'This is a test announcement message body.',
            'class_id': c.id,
            'teacher_id': teacher.id,
            'recipients': 'all',
            'is_published': True
        }
        
        announcement, error = AnnouncementService.create_announcement(announcement_data, broadcast=False)
        
        assert error is None
        assert announcement is not None
        
        # Assert database notifications were populated via fanout
        student_notif = Notification.query.filter_by(user_id=s_user.id, scope='student').first()
        assert student_notif is not None
        assert student_notif.title == 'Test Announcement Title'
        assert student_notif.message == 'This is a test announcement message body.'
        
        parent_notif = Notification.query.filter_by(user_id=p_user.id, scope='parent').first()
        assert parent_notif is not None
        assert parent_notif.title == 'Test Announcement Title'
        assert parent_notif.message == 'This is a test announcement message body.'


def test_assignment_creates_fanout_notifications(app, db_session):
    """Verify that creating a new assignment transactionally generates student and parent notifications."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        
        # Setup Teacher, Student, Parent
        t_user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        
        s_user = create_test_user(db_session, f"s_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student = create_test_student(db_session, s_user, tenant.id)
        
        p_user = create_test_user(db_session, f"p_{uuid.uuid4().hex[:6]}@example.com", 'parent', tenant.id)
        parent = create_test_parent(db_session, p_user, tenant.id)
        
        # Link Student to Parent
        student.parent_id = parent.id
        
        # Create class
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 1',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        # Assign teacher and student to class
        ClassService.assign_teacher(c.id, teacher.id)
        student.class_id = c.id
        
        # Create Subject
        sub = Subject(
            name='Mathematics',
            code='MATH101',
            tenant_id=tenant.id
        )
        db_session.add(sub)
        db_session.flush()
        
        db_session.commit()
        
        # Act: create assignment via service
        assignment_data = {
            'title': 'Math Homework 1',
            'description': 'Solve problems 1-10 on page 42.',
            'class_id': c.id,
            'subject_id': sub.id,
            'teacher_id': teacher.id,
            'due_date': datetime(2026, 12, 31, 23, 59),
            'total_points': 100.0,
            'assignment_type': 'homework'
        }
        
        assignment, error = AssignmentService.create_assignment(assignment_data)
        
        assert error is None
        assert assignment is not None
        
        # Assert database notifications were populated via fanout
        student_notif = Notification.query.filter_by(user_id=s_user.id, scope='student').first()
        assert student_notif is not None
        assert student_notif.title == 'New Assignment: Math Homework 1'
        assert student_notif.message == 'Solve problems 1-10 on page 42.'
        
        parent_notif = Notification.query.filter_by(user_id=p_user.id, scope='parent').first()
        assert parent_notif is not None
        assert parent_notif.title == 'New Assignment: Math Homework 1'
        assert parent_notif.message == 'Solve problems 1-10 on page 42.'


def test_class_announcement_route_authorization(app, client, db_session):
    """Verify routing security and ClassTeacherMapping checks for class announcement routes."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        
        # 1. Create a mapped teacher
        t_user = create_test_user(db_session, f"t1_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        create_test_membership(db_session, tenant.id, t_user.id, 'teacher')
        
        # 2. Create an unmapped teacher
        t2_user = create_test_user(db_session, f"t2_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher2 = create_test_teacher(db_session, t2_user, tenant.id)
        create_test_membership(db_session, tenant.id, t2_user.id, 'teacher')
        
        # 3. Create a student
        s_user = create_test_user(db_session, f"s_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        create_test_membership(db_session, tenant.id, s_user.id, 'student')
        
        # Create Class
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 1',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        # Assign only teacher 1 to the class
        ClassService.assign_teacher(c.id, teacher.id)
        db_session.commit()
        
        # Log in as Student -> Expect 403 when posting to class announcements
        login_resp = client.post('/api/v1/auth/login', json={
            'email': s_user.email,
            'password': 'Password123!'
        })
        s_token = login_resp.json['access_token']
        headers_student = {
            'Authorization': f'Bearer {s_token}',
            'X-Tenant-ID': str(tenant.id)
        }
        
        resp = client.post(f'/api/v1/classes/{c.id}/announcements', json={
            'title': 'Student Post',
            'content': 'Student body'
        }, headers=headers_student)
        assert resp.status_code == 403
        
        # Log in as Teacher 2 (unmapped) -> Expect 403 when posting
        login_resp = client.post('/api/v1/auth/login', json={
            'email': t2_user.email,
            'password': 'Password123!'
        })
        t2_token = login_resp.json['access_token']
        headers_teacher2 = {
            'Authorization': f'Bearer {t2_token}',
            'X-Tenant-ID': str(tenant.id)
        }
        
        resp = client.post(f'/api/v1/classes/{c.id}/announcements', json={
            'title': 'Unmapped Teacher Post',
            'content': 'Unmapped teacher body'
        }, headers=headers_teacher2)
        assert resp.status_code == 403
        
        # Log in as Teacher 1 (mapped) -> Expect 201 when posting
        login_resp = client.post('/api/v1/auth/login', json={
            'email': t_user.email,
            'password': 'Password123!'
        })
        t1_token = login_resp.json['access_token']
        headers_teacher1 = {
            'Authorization': f'Bearer {t1_token}',
            'X-Tenant-ID': str(tenant.id)
        }
        
        resp = client.post(f'/api/v1/classes/{c.id}/announcements', json={
            'title': 'Mapped Teacher Post',
            'content': 'Mapped teacher body'
        }, headers=headers_teacher1)
        assert resp.status_code == 201


def test_class_4_override_fanout(app, db_session):
    """Verify that creating an announcement for Class 4 transactionally maps to student users 3075, 3077, 3078 and parent users 3012, 3076."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        t_user = create_test_user(db_session, f"t_4_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        
        c = Class(
            id=4,
            name="Class 4 Override Test",
            grade_level='Primary 4',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        # Link teacher to class
        ClassService.assign_teacher(c.id, teacher.id)
        
        # Seed student users with specific IDs
        for s_uid in [3075, 3077, 3078]:
            u = User(id=s_uid, username=f"student_{s_uid}_{uuid.uuid4().hex[:4]}", email=f"student_{s_uid}@example.com", role='student', tenant_id=tenant.id)
            u.set_password('Password123!')
            db_session.add(u)
        db_session.flush()
        
        # Seed parent users with specific IDs
        for p_uid in [3012, 3076]:
            u = User(id=p_uid, username=f"parent_{p_uid}_{uuid.uuid4().hex[:4]}", email=f"parent_{p_uid}@example.com", role='parent', tenant_id=tenant.id)
            u.set_password('Password123!')
            db_session.add(u)
        db_session.flush()
        
        # Create Parents
        p_obj_3012 = Parent(user_id=3012, tenant_id=tenant.id, relationship='Father')
        p_obj_3076 = Parent(user_id=3076, tenant_id=tenant.id, relationship='Mother')
        db_session.add(p_obj_3012)
        db_session.add(p_obj_3076)
        db_session.flush()
        
        # Create Students associated with Class 4 and parents
        s_obj_3075 = Student(user_id=3075, tenant_id=tenant.id, admission_number="ADM-3075", first_name='S3075', last_name='S', date_of_birth=datetime(2010, 1, 1).date(), gender='male', email='student_3075@example.com', class_id=4, parent_id=p_obj_3012.id, status='active')
        s_obj_3077 = Student(user_id=3077, tenant_id=tenant.id, admission_number="ADM-3077", first_name='S3077', last_name='S', date_of_birth=datetime(2010, 1, 1).date(), gender='male', email='student_3077@example.com', class_id=4, parent_id=p_obj_3076.id, status='active')
        s_obj_3078 = Student(user_id=3078, tenant_id=tenant.id, admission_number="ADM-3078", first_name='S3078', last_name='S', date_of_birth=datetime(2010, 1, 1).date(), gender='male', email='student_3078@example.com', class_id=4, parent_id=p_obj_3076.id, status='active')
        db_session.add(s_obj_3075)
        db_session.add(s_obj_3077)
        db_session.add(s_obj_3078)
        db_session.flush()
        
        db_session.commit()
        
        announcement_data = {
            'title': 'Class 4 Notice',
            'content': 'This is a test notice for class 4 overrides.',
            'class_id': 4,
            'teacher_id': teacher.id,
            'recipients': 'all',
            'is_published': True
        }
        
        announcement, error = AnnouncementService.create_announcement(announcement_data, broadcast=False)
        
        assert error is None
        assert announcement is not None
        
        # Verify the notification entries created in DB:
        # student user IDs: 3075, 3077, 3078
        for user_id in [3075, 3077, 3078]:
            notif = Notification.query.filter_by(user_id=user_id, scope='student', title='Class 4 Notice').first()
            assert notif is not None
            assert notif.message == 'This is a test notice for class 4 overrides.'
            
        # parent user IDs: 3012, 3076
        for user_id in [3012, 3076]:
            notif = Notification.query.filter_by(user_id=user_id, scope='parent', title='Class 4 Notice').first()
            assert notif is not None
            assert notif.message == 'This is a test notice for class 4 overrides.'


def test_insert_notification_without_explicit_id_succeeds(app, db_session):
    """Verify that inserting a Notification without an explicit id succeeds (primary key autoincrement)."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        u = create_test_user(db_session, f"u_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        
        notif = Notification(
            title="Implicit ID Test",
            message="This notification should get an autoincremented ID.",
            type="info",
            user_id=u.id,
            recipient_id=u.id,
            scope="student"
        )
        db_session.add(notif)
        db_session.commit()
        
        assert notif.id is not None
        assert isinstance(notif.id, int)


def test_parent_multiple_children_deduplication(app, db_session):
    """Verify that a parent with multiple students in the same class receives only one notification (deduplication)."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        t_user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 2',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        # Link teacher to class
        ClassService.assign_teacher(c.id, teacher.id)
        
        # Create one parent
        p_user = create_test_user(db_session, f"p_multi_{uuid.uuid4().hex[:6]}@example.com", 'parent', tenant.id)
        parent = create_test_parent(db_session, p_user, tenant.id)
        
        # Create student 1
        s1_user = create_test_user(db_session, f"s1_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student1 = create_test_student(db_session, s1_user, tenant.id, class_id=c.id)
        student1.parent_id = parent.id
        
        # Create student 2
        s2_user = create_test_user(db_session, f"s2_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student2 = create_test_student(db_session, s2_user, tenant.id, class_id=c.id)
        student2.parent_id = parent.id
        
        db_session.commit()
        
        # Post announcement
        announcement_data = {
            'title': 'Deduplication Announcement',
            'content': 'Check if parent gets only one notification.',
            'class_id': c.id,
            'teacher_id': teacher.id,
            'recipients': 'all',
            'is_published': True
        }
        
        announcement, error = AnnouncementService.create_announcement(announcement_data, broadcast=False)
        assert error is None
        assert announcement is not None
        
        # Parent notifications count
        parent_notifs = Notification.query.filter_by(user_id=p_user.id, title='Deduplication Announcement', scope='parent').all()
        assert len(parent_notifs) == 1


def test_fanout_failure_logged_and_propagated(app, db_session):
    """Verify that a failure in the fanout service is logged clearly and propagated, rolling back the transaction."""
    from unittest.mock import patch
    from app.models.announcement import Announcement
    
    with app.app_context():
        tenant = create_test_tenant(db_session)
        t_user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 3',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        ClassService.assign_teacher(c.id, teacher.id)
        db_session.commit()
        
        announcement_data = {
            'title': 'Failure Test Announcement',
            'content': 'This announcement creation should fail due to fanout error.',
            'class_id': c.id,
            'teacher_id': teacher.id,
            'recipients': 'all',
            'is_published': True
        }
        
        from app.services.fanout import NotificationFanoutService
        
        with patch.object(NotificationFanoutService, 'enqueue_class_fanout', side_effect=RuntimeError("Database connection lost during fanout")):
            announcement, error = AnnouncementService.create_announcement(announcement_data, broadcast=False)
            
            assert announcement is None
            assert "Database connection lost during fanout" in error
            
            # Verify that the announcement was rolled back and does not exist in DB
            db_announcement = Announcement.query.filter_by(title='Failure Test Announcement').first()
            assert db_announcement is None


def test_class_announcement_get_authorization(app, client, db_session):
    """Verify read permissions for class announcements."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        
        # 1. Create a class
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 1',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        # 2. Mapped teacher
        t_user = create_test_user(db_session, f"t1_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        create_test_membership(db_session, tenant.id, t_user.id, 'teacher')
        ClassService.assign_teacher(c.id, teacher.id)
        
        # 3. Unmapped teacher
        t2_user = create_test_user(db_session, f"t2_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher2 = create_test_teacher(db_session, t2_user, tenant.id)
        create_test_membership(db_session, tenant.id, t2_user.id, 'teacher')
        
        # 4. Student in class
        s_user = create_test_user(db_session, f"s_in_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student_in = create_test_student(db_session, s_user, tenant.id, class_id=c.id)
        create_test_membership(db_session, tenant.id, s_user.id, 'student')
        
        # 5. Student out of class
        s2_user = create_test_user(db_session, f"s_out_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student_out = create_test_student(db_session, s2_user, tenant.id)
        create_test_membership(db_session, tenant.id, s2_user.id, 'student')
        
        # 6. Parent of student in class
        p_user = create_test_user(db_session, f"p_in_{uuid.uuid4().hex[:6]}@example.com", 'parent', tenant.id)
        parent_in = create_test_parent(db_session, p_user, tenant.id)
        student_in.parent_id = parent_in.id
        create_test_membership(db_session, tenant.id, p_user.id, 'parent')
        
        # 7. Parent of student out of class
        p2_user = create_test_user(db_session, f"p_out_{uuid.uuid4().hex[:6]}@example.com", 'parent', tenant.id)
        parent_out = create_test_parent(db_session, p2_user, tenant.id)
        student_out.parent_id = parent_out.id
        create_test_membership(db_session, tenant.id, p2_user.id, 'parent')
        
        # 8. Admin user
        admin_user = create_test_user(db_session, f"admin_{uuid.uuid4().hex[:6]}@example.com", 'admin', tenant.id)
        create_test_membership(db_session, tenant.id, admin_user.id, 'admin')
        
        db_session.commit()
        
        # Helper function to get token and headers
        def get_headers(user):
            login_resp = client.post('/api/v1/auth/login', json={
                'email': user.email,
                'password': 'Password123!'
            })
            token = login_resp.json['access_token']
            return {
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': str(tenant.id)
            }
            
        # Verify GET status codes:
        # Assigned teacher: 200
        resp = client.get(f'/api/v1/classes/{c.id}/announcements', headers=get_headers(t_user))
        assert resp.status_code == 200
        
        # Student in class: 200
        resp = client.get(f'/api/v1/classes/{c.id}/announcements', headers=get_headers(s_user))
        assert resp.status_code == 200
        
        # Parent of student in class: 200
        resp = client.get(f'/api/v1/classes/{c.id}/announcements', headers=get_headers(p_user))
        assert resp.status_code == 200
        
        # Unrelated student: 403
        resp = client.get(f'/api/v1/classes/{c.id}/announcements', headers=get_headers(s2_user))
        assert resp.status_code == 403
        
        # Unrelated parent: 403
        resp = client.get(f'/api/v1/classes/{c.id}/announcements', headers=get_headers(p2_user))
        assert resp.status_code == 403
        
        # Unassigned teacher: 403
        resp = client.get(f'/api/v1/classes/{c.id}/announcements', headers=get_headers(t2_user))
        assert resp.status_code == 403
        
        # Admin: 200
        resp = client.get(f'/api/v1/classes/{c.id}/announcements', headers=get_headers(admin_user))
        assert resp.status_code == 200


def test_class_assignment_routes_flow(app, client, db_session):
    """Verify class assignment POST and GET routes including authorization, persistence, and fanout."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        
        # Setup Teacher, Student, Parent
        t_user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        create_test_membership(db_session, tenant.id, t_user.id, 'teacher')
        
        s_user = create_test_user(db_session, f"s_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student = create_test_student(db_session, s_user, tenant.id)
        create_test_membership(db_session, tenant.id, s_user.id, 'student')
        
        p_user = create_test_user(db_session, f"p_{uuid.uuid4().hex[:6]}@example.com", 'parent', tenant.id)
        parent = create_test_parent(db_session, p_user, tenant.id)
        create_test_membership(db_session, tenant.id, p_user.id, 'parent')
        
        # Link Student to Parent
        student.parent_id = parent.id
        
        # Create class
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 1',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        
        # Assign teacher and student to class
        ClassService.assign_teacher(c.id, teacher.id)
        student.class_id = c.id
        
        # Create Subject
        sub = Subject(
            name='Science',
            code='SCI101',
            tenant_id=tenant.id
        )
        db_session.add(sub)
        db_session.flush()
        db_session.commit()
        
        # Helper to generate authorization headers
        from flask_jwt_extended import create_access_token
        def get_headers(user):
            token = create_access_token(identity=user.id)
            return {
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': str(tenant.id)
            }
            
        # Post a new assignment as the assigned teacher
        payload = {
            'title': 'Science Project 1',
            'instructions': 'Build a simple water filter.',
            'due_date': '2026-12-31T23:59:00',
            'subject_id': sub.id,
            'total_points': 50.0,
            'assignment_type': 'project',
            'status': 'published'
        }
        
        resp = client.post(f'/api/v1/classes/{c.id}/assignments', json=payload, headers=get_headers(t_user))
        assert resp.status_code == 201
        data = resp.json
        assert data['success'] is True
        assert data['assignment']['title'] == 'Science Project 1'
        
        # Verify it was persisted to assignments table
        from app.models.assignment import Assignment
        assignment = Assignment.query.filter_by(title='Science Project 1').first()
        assert assignment is not None
        assert assignment.class_id == c.id
        
        # Assert database notifications were populated via fanout
        student_notif = Notification.query.filter_by(user_id=s_user.id, scope='student').first()
        assert student_notif is not None
        assert student_notif.title == 'New Assignment: Science Project 1'
        
        parent_notif = Notification.query.filter_by(user_id=p_user.id, scope='parent').first()
        assert parent_notif is not None
        assert parent_notif.title == 'New Assignment: Science Project 1'
        
        # Get class assignments
        resp = client.get(f'/api/v1/classes/{c.id}/assignments', headers=get_headers(t_user))
        assert resp.status_code == 200
        assert len(resp.json['assignments']) > 0



