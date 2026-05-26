import uuid
import datetime
from flask import g
from app.extensions import db
from app.models.tenant import Tenant, Branch, TenantMembership
from app.models.user import User
from app.models.parent import Parent
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.attendance import Attendance
from app.models.notification_log import NotificationLog
from app.services.notification_service import NotificationService

def test_notification_service_bypass_and_logging(app):
    """
    Step 5: Verifies that when TESTING = True is active:
    - Sending SMS and Email skips network connection/sockets.
    - Successfully records entries in the database 'notification_logs' table.
    """
    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()

    with app.app_context():
        # Assert app.config['TESTING'] is active
        assert app.config.get('TESTING') is True

        # 1. Seed minimal supporting Tenant and Branch
        tenant = Tenant(
            id=tenant_id, 
            slug=f"notif-test-{uuid.uuid4().hex[:4]}", 
            name="Notification Test Tenant", 
            country_code="GH", 
            schema_name=f"notif_{uuid.uuid4().hex[:4]}", 
            currency="GHS"
        )
        db.session.add(tenant)
        
        branch = Branch(
            id=branch_id, 
            tenant_id=tenant_id, 
            name="Test Campus", 
            is_active=True
        )
        db.session.add(branch)
        db.session.commit()

        # 2. Test SMS Service Log Creation
        sms_recipient = "+233240000001"
        sms_content = "Hello Parent! This is a test SMS."
        sms_log = NotificationService.send_sms(
            tenant_id=tenant_id,
            branch_id=branch_id,
            phone_number=sms_recipient,
            message=sms_content
        )

        assert sms_log is not None
        assert sms_log.channel == 'sms'
        assert sms_log.recipient == sms_recipient
        assert sms_log.content == sms_content
        assert sms_log.status == 'sent'
        assert sms_log.error_message is None

        # 3. Test Email Service Log Creation
        email_recipient = "parent@example.com"
        email_subject = "Test Email Notification"
        email_content = "Dear Parent, this is a test Email notification."
        email_log = NotificationService.send_email(
            tenant_id=tenant_id,
            branch_id=branch_id,
            email_address=email_recipient,
            subject=email_subject,
            content=email_content
        )

        assert email_log is not None
        assert email_log.channel == 'email'
        assert email_log.recipient == email_recipient
        assert email_log.subject == email_subject
        assert email_log.content == email_content
        assert email_log.status == 'sent'
        assert email_log.error_message is None

        # Verify they are persisted in DB
        sms_db = NotificationLog.query.get(sms_log.id)
        email_db = NotificationLog.query.get(email_log.id)
        assert sms_db is not None
        assert email_db is not None

        # Clean up
        db.session.delete(sms_log)
        db.session.delete(email_log)
        db.session.delete(branch)
        db.session.delete(tenant)
        db.session.commit()


def test_notification_logs_isolation(app):
    """
    Step 5: Asserts that query_scoped() multi-branch RLS isolation contextually
    restricts visible dispatches between different campuses (Branch A vs Branch B).
    """
    tenant_id = uuid.uuid4()
    branch_a_id = uuid.uuid4()
    branch_b_id = uuid.uuid4()

    with app.app_context():
        tenant = Tenant(
            id=tenant_id, 
            slug=f"rls-test-{uuid.uuid4().hex[:4]}", 
            name="RLS School", 
            country_code="GH", 
            schema_name=f"rls_{uuid.uuid4().hex[:4]}", 
            currency="GHS"
        )
        db.session.add(tenant)
        
        branch_a = Branch(id=branch_a_id, tenant_id=tenant_id, name="Campus A", is_active=True)
        branch_b = Branch(id=branch_b_id, tenant_id=tenant_id, name="Campus B", is_active=True)
        db.session.add(branch_a)
        db.session.add(branch_b)
        db.session.commit()

        # Dispatches in different branches
        log_a = NotificationLog(
            tenant_id=tenant_id,
            branch_id=branch_a_id,
            channel='sms',
            recipient="+23324000000A",
            content="Alert for Campus A",
            status="sent"
        )
        log_b = NotificationLog(
            tenant_id=tenant_id,
            branch_id=branch_b_id,
            channel='email',
            recipient="campus_b@example.com",
            content="Alert for Campus B",
            status="sent"
        )
        db.session.add(log_a)
        db.session.add(log_b)
        db.session.commit()

        # Set active branch context to Campus A
        g.branch_id = branch_a_id
        logs_a = NotificationLog.query_scoped().all()
        assert log_a in logs_a
        assert log_b not in logs_a

        # Set active branch context to Campus B
        g.branch_id = branch_b_id
        logs_b = NotificationLog.query_scoped().all()
        assert log_b in logs_b
        assert log_a not in logs_b

        # Unset branch context
        g.branch_id = None
        all_logs = NotificationLog.query_scoped().all()
        assert log_a in all_logs
        assert log_b in all_logs

        # Clean up
        db.session.delete(log_a)
        db.session.delete(log_b)
        db.session.delete(branch_a)
        db.session.delete(branch_b)
        db.session.delete(tenant)
        db.session.commit()


def test_attendance_absence_trigger_flow(app, client, auth_headers):
    """
    Step 5: Verifies that posting an 'absent' status via POST /saas/attendance/log:
    - Registers/updates attendance record correctly.
    - Automatically resolves parent SMS and Email preferences.
    - Dispatches dual outbound message logs to parent records.
    """
    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    class_id = 111
    subject_id = 222
    student_id = 333

    with app.app_context():
        # Setup tenant, branch, parent user, parent, student, class, subject
        tenant = Tenant(
            id=tenant_id, 
            slug=f"abs-test-{uuid.uuid4().hex[:4]}", 
            name="Absence Test Academy", 
            country_code="GH", 
            schema_name=f"abs_{uuid.uuid4().hex[:4]}", 
            currency="GHS"
        )
        db.session.add(tenant)
        
        branch = Branch(id=branch_id, tenant_id=tenant_id, name="Absence Campus", is_active=True)
        db.session.add(branch)
        
        # Link auth user 'test@example.com' to this tenant for @tenant_required
        auth_user = User.query.filter_by(email='test@example.com').first()
        membership = TenantMembership(tenant_id=tenant_id, user_id=auth_user.id, role='school_admin', status='active')
        db.session.add(membership)
        
        # Seed Parent with emergency_contact and user email
        parent_user = User(username=f"p_user_{uuid.uuid4().hex[:4]}", email="parent_abs@example.com", role="parent")
        db.session.add(parent_user)
        db.session.flush()
        
        parent = Parent(id=99, tenant_id=tenant_id, user_id=parent_user.id, emergency_contact="+233240000999")
        db.session.add(parent)
        
        class_obj = Class(id=class_id, tenant_id=tenant_id, branch_id=branch_id, name="Test Class Absence", grade_level="1", academic_year="2026")
        db.session.add(class_obj)
        
        subject = Subject(id=subject_id, tenant_id=tenant_id, name="Absence Course", code="ABS-101")
        db.session.add(subject)
        
        student = Student(
            id=student_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=auth_user.id,  # Link to a user
            admission_number="ADM-ABS-1",
            first_name="Absent",
            last_name="Child",
            parent_id=parent.id,
            gender="f",
            date_of_birth=datetime.date(2017, 12, 12)
        )
        db.session.add(student)
        db.session.commit()

    # Hit the POST /saas/attendance/log API
    headers = {
        **auth_headers,
        'X-Tenant-ID': str(tenant_id),
        'X-Branch-ID': str(branch_id)
    }

    payload = {
        "student_id": student_id,
        "class_id": class_id,
        "subject_id": subject_id,
        "date": "2026-05-26",
        "status": "absent",
        "remarks": "Missed class without excuse."
    }

    resp = client.post('/api/v1/saas/attendance/log', json=payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json.get('success') is True
    assert resp.json.get('notification_sent') is True

    with app.app_context():
        # Check Attendance is logged in DB
        attendance = Attendance.query.filter_by(student_id=student_id, class_id=class_id, status='absent').first()
        assert attendance is not None
        assert attendance.remarks == "Missed class without excuse."

        # Check Notification Logs are populated
        logs = NotificationLog.query.filter_by(tenant_id=tenant_id, branch_id=branch_id).all()
        assert len(logs) == 2  # 1 SMS + 1 Email
        
        sms_log = next((l for l in logs if l.channel == 'sms'), None)
        email_log = next((l for l in logs if l.channel == 'email'), None)
        
        assert sms_log is not None
        assert sms_log.recipient == "+233240000999"
        assert "ABSENT" in sms_log.content
        assert sms_log.status == "sent"

        assert email_log is not None
        assert email_log.recipient == "parent_abs@example.com"
        assert "Absence Notification" in email_log.subject
        assert email_log.status == "sent"

        # Cleanup
        db.session.delete(attendance)
        for l in logs:
            db.session.delete(l)
        db.session.delete(student)
        db.session.delete(subject)
        db.session.delete(class_obj)
        db.session.delete(parent)
        db.session.delete(parent_user)
        db.session.delete(membership)
        db.session.delete(branch)
        db.session.delete(tenant)
        db.session.commit()
