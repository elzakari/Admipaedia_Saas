import uuid
import pytest
from datetime import datetime
from app.extensions import db
from app.models.user import User
from app.models.class_ import Class, ClassTeacherMapping
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.subject import Subject
from app.models.dashboard import Notification
from app.models.tenant import Tenant, TenantMembership
from app.services.class_service import ClassService
from app.services.teacher_provisioning_service import TeacherProvisioningService
from app.models.rbac import RBACRole, RBACPermission
from sqlalchemy import inspect

def create_test_tenant(db_session):
    tenant = Tenant(
        name="Test School",
        slug=f"test-school-{uuid.uuid4().hex[:6]}",
        country_code="GH",
        currency="GHS",
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}"
    )
    db_session.add(tenant)
    db_session.flush()
    return tenant

def create_test_user(db_session, email, role='user', tenant_id=None):
    username = email.split('@')[0] + "_" + uuid.uuid4().hex[:4]
    user = User(
        username=username,
        email=email,
        role=role,
        tenant_id=tenant_id
    )
    user.set_password('Password123!')
    db_session.add(user)
    db_session.flush()
    return user

def create_test_teacher(db_session, user, tenant_id):
    teacher = Teacher(
        user_id=user.id,
        tenant_id=tenant_id,
        employee_id=f"EMP-{datetime.now().year}-{uuid.uuid4().hex[:5].upper()}",
        first_name='Teacher',
        last_name=f"Name_{uuid.uuid4().hex[:6]}",
        status='active'
    )
    db_session.add(teacher)
    db_session.flush()
    return teacher

def create_test_student(db_session, user, tenant_id, class_id=None):
    student = Student(
        user_id=user.id,
        tenant_id=tenant_id,
        admission_number=f"ADM-{datetime.now().year}-{uuid.uuid4().hex[:5].upper()}",
        first_name='Test',
        last_name=f"Student_{uuid.uuid4().hex[:6]}",
        date_of_birth=datetime(2010, 1, 1).date(),
        gender='male',
        email=user.email,
        class_id=class_id,
        status='active'
    )
    db_session.add(student)
    db_session.flush()
    return student

def create_test_membership(db_session, tenant_id, user_id, role='teacher'):
    membership = TenantMembership(
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        status='active'
    )
    db_session.add(membership)
    db_session.flush()
    return membership


def test_schema_classes_code_exists(app):
    """Verify classes.code column exists in the schema."""
    with app.app_context():
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('classes')]
        assert 'code' in columns

def test_schema_class_teacher_mappings_exists_and_configured(app):
    """Verify class_teacher_mappings table exists and has correct columns and indexes/constraints."""
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        assert 'class_teacher_mappings' in tables
        
        columns = {col['name']: col for col in inspector.get_columns('class_teacher_mappings')}
        assert 'id' in columns
        assert 'class_id' in columns
        assert 'teacher_id' in columns
        
        # Verify Unique constraint
        unique_constraints = inspector.get_unique_constraints('class_teacher_mappings')
        has_uc = False
        for uc in unique_constraints:
            if set(uc['column_names']) == {'class_id', 'teacher_id'}:
                has_uc = True
                break
        # SQLite might hold it as index or unique constraint, depending on creation
        if not has_uc:
            indexes = inspector.get_indexes('class_teacher_mappings')
            for idx in indexes:
                if idx['unique'] and set(idx['column_names']) == {'class_id', 'teacher_id'}:
                    has_uc = True
                    break
        assert has_uc is True

def test_schema_class_subjects_has_surrogate_id_key(app):
    """Verify class_subjects table has a primary key surrogate id column."""
    with app.app_context():
        inspector = inspect(db.engine)
        columns = {col['name']: col for col in inspector.get_columns('class_subjects')}
        assert 'id' in columns

def test_schema_notifications_recipient_id_is_integer(app):
    """Verify notifications.recipient_id is an integer foreign key referencing users."""
    with app.app_context():
        inspector = inspect(db.engine)
        columns = {col['name']: col for col in inspector.get_columns('notifications')}
        assert 'recipient_id' in columns
        assert 'INTEGER' in str(columns['recipient_id']['type']).upper() or 'INT' in str(columns['recipient_id']['type']).upper()

def test_twin_write_assign_and_unassign_teacher(app, db_session):
    """Verify ClassService.assign_teacher and unassign_teacher perform twin-writes properly."""
    with app.app_context():
        # Setup tenant
        tenant = create_test_tenant(db_session)

        # Create teacher and class
        user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, user, tenant.id)

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

        # Assign: Verify legacy pointer and mapping table write
        class_obj, error = ClassService.assign_teacher(c.id, teacher.id)
        assert error is None
        assert class_obj.teacher_id == teacher.id

        mapping = ClassTeacherMapping.query.filter_by(
            class_id=c.id,
            teacher_id=teacher.user_id
        ).first()
        assert mapping is not None

        # Unassign: Verify legacy pointer is cleared and mapping is deleted
        success, error = ClassService.unassign_teacher(c.id, teacher.id)
        assert success is True
        assert error is None
        assert c.teacher_id is None

        mapping = ClassTeacherMapping.query.filter_by(
            class_id=c.id,
            teacher_id=teacher.user_id
        ).first()
        assert mapping is None

def test_teacher_provisioning_baseline_access(app, db_session):
    """Verify TeacherProvisioningService baseline access is assigned idempotently."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        user = create_test_user(db_session, f"u_{uuid.uuid4().hex[:6]}@example.com", 'user', tenant.id)
        assert user.role == 'user'

        success = TeacherProvisioningService.ensure_teacher_baseline_access(user.id)
        assert success is True

        db_session.refresh(user)
        assert user.role == 'teacher'

        role_names = [assignment.role.name for assignment in user.detailed_role_assignments if assignment.is_valid()]
        assert 'teacher' in role_names

        teacher_role = RBACRole.query.filter_by(name='teacher').first()
        assert teacher_role is not None
        permissions = [perm.name for perm in teacher_role.permissions]
        assert 'student.read' in permissions
        assert 'teacher.read' in permissions
        assert 'teacher_analytics.read' in permissions

def test_unauthorized_teacher_classes_access_returns_403(app, client, db_session):
    """Verify that an unauthorized user (like a student) gets blocked with a 403 status."""
    with app.app_context():
        # Setup tenant
        tenant = create_test_tenant(db_session)

        # Create teacher
        t_user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        teacher = create_test_teacher(db_session, t_user, tenant.id)
        create_test_membership(db_session, tenant.id, t_user.id, 'teacher')

        # Create student
        s_user = create_test_user(db_session, f"s_{uuid.uuid4().hex[:6]}@example.com", 'student', tenant.id)
        student = create_test_student(db_session, s_user, tenant.id)
        create_test_membership(db_session, tenant.id, s_user.id, 'student')
        db_session.commit()

        # Log in as student
        login_resp = client.post('/api/v1/auth/login', json={
            'email': s_user.email,
            'password': 'Password123!'
        })
        assert login_resp.status_code == 200
        token = login_resp.json['access_token']
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(tenant.id)
        }

        # Attempt to access teacher's classes (should return 403 Forbidden)
        resp = client.get(f'/api/v1/teachers/{teacher.id}/classes', headers=headers)
        assert resp.status_code == 403
