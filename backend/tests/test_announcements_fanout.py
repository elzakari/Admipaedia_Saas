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
