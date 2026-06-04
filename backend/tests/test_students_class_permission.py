import pytest
import json
import uuid
from app.extensions import db
from app.models.user import User
from app.models.student import Student
from app.models.class_ import Class, ClassTeacherMapping
from app.models.tenant import Tenant, TenantMembership
from app.models.rbac import RBACRole, RBACPermission, UserRoleAssignment
from app.services.rbac_service import RBACService
from flask_jwt_extended import create_access_token

@pytest.fixture
def app_with_db():
    from app import create_app
    app = create_app('testing')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret'
    
    with app.app_context():
        db.create_all()
        # Initialize default roles and permissions
        RBACService.initialize_default_permissions()
        RBACService.initialize_default_roles()
        yield app
        db.session.remove()

@pytest.fixture
def test_client(app_with_db):
    return app_with_db.test_client()

def test_teacher_class_roster_permission(test_client, app_with_db):
    with app_with_db.app_context():
        # 1. Create Tenant
        tenant = Tenant(
            slug='test-school',
            name='Test School',
            country_code='GH',
            schema_name='test_school'
        )
        db.session.add(tenant)
        db.session.commit()
        
        # 2. Create Teacher User
        teacher_user = User(
            username='teacher1',
            email='teacher1@test.com',
            first_name='Teacher',
            last_name='One',
            role='teacher',
            tenant_id=tenant.id
        )
        teacher_user.set_password('password123')
        db.session.add(teacher_user)
        db.session.commit()
        
        # 3. Create Tenant Membership for Teacher
        membership = TenantMembership(
            tenant_id=tenant.id,
            user_id=teacher_user.id,
            role='teacher',
            status='active'
        )
        db.session.add(membership)
        db.session.commit()
        
        # Assign teacher role
        RBACService.assign_role_to_user(
            user_id=teacher_user.id,
            role_name='teacher',
            assigned_by=teacher_user.id
        )
        db.session.commit()
        
        # 4. Create Class (pre-existing, not assigned to teacher yet)
        test_class = Class(
            tenant_id=tenant.id,
            name='Class Alpha',
            grade_level='Grade 1',
            academic_year='2024/2025'
        )
        db.session.add(test_class)
        db.session.commit()
        
        # 5. Generate token
        token = create_access_token(identity=str(teacher_user.id))
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(tenant.id)
        }
        
        # Act 1: GET student roster without assignment should result in 403 Forbidden
        response = test_client.get(
            f'/api/v1/students?class_id={test_class.id}&per_page=100',
            headers=headers
        )
        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'Forbidden' in data.get('error', '') or 'permission' in data.get('message', '').lower() or 'forbidden' in data.get('message', '').lower()
        
        # Act 2: Map class to teacher dynamically via ClassTeacherMapping
        mapping = ClassTeacherMapping(
            class_id=test_class.id,
            teacher_id=teacher_user.id
        )
        db.session.add(mapping)
        db.session.commit()
        
        # GET student roster now should succeed (200 OK)
        response2 = test_client.get(
            f'/api/v1/students?class_id={test_class.id}&per_page=100',
            headers=headers
        )
        assert response2.status_code == 200
        data2 = json.loads(response2.data)
        assert data2.get('success') is True
