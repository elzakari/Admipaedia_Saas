"""
Comprehensive RBAC System Tests
"""
import pytest
from flask import Flask
from app import create_app
from app.extensions import db
from app.models.rbac import (
    PermissionGrant,
    PermissionType,
    RBACPermission,
    RBACRole,
    ResourceType,
    UserRoleAssignment,
)
from app.models.user import User
from app.services.rbac_service import RBACService
from app.utils.rbac_decorators import require_permission, require_role
from datetime import datetime, timedelta
import json


@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        # db.drop_all() removed to prevent destroying tables for subsequent tests in session


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def sample_user(app):
    """Create a sample user for testing"""
    with app.app_context():
        user = User(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def sample_role(app):
    """Create a sample role for testing"""
    with app.app_context():
        role = RBACRole(
            name='test_role',
            display_name='Test Role',
            description='A test role for unit testing',
            level=5
        )
        db.session.add(role)
        db.session.commit()
        return role


@pytest.fixture
def sample_permission(app):
    """Create a sample permission for testing"""
    with app.app_context():
        permission = RBACPermission(
            name='test_permission',
            display_name='Test Permission',
            description='A test permission for unit testing',
            resource_type=ResourceType.USER,
            permission_type=PermissionType.READ,
        )
        db.session.add(permission)
        db.session.commit()
        return permission


class TestRBACModels:
    """Test RBAC model functionality"""

    def test_rbac_role_creation(self, app):
        """Test creating an RBAC role"""
        with app.app_context():
            role = RBACRole(
                name='admin',
                display_name='Administrator',
                description='System administrator role',
                level=1
            )
            db.session.add(role)
            db.session.commit()

            assert role.id is not None
            assert role.name == 'admin'
            assert role.is_active is True
            assert role.created_at is not None

    def test_rbac_permission_creation(self, app):
        """Test creating an RBAC permission"""
        with app.app_context():
            permission = RBACPermission(
                name='user_read',
                display_name='Read Users',
                description='Permission to read user data',
                resource_type=ResourceType.USER,
                permission_type=PermissionType.READ,
            )
            db.session.add(permission)
            db.session.commit()

            assert permission.id is not None
            assert permission.name == 'user_read'
            assert permission.resource_type is ResourceType.USER
            assert permission.permission_type is PermissionType.READ

    def test_role_permission_assignment(self, app, sample_role, sample_permission):
        """Test assigning permissions to roles"""
        with app.app_context():
            sample_role = db.session.merge(sample_role)
            sample_permission = db.session.merge(sample_permission)
            sample_role.permissions.append(sample_permission)
            db.session.commit()

            assert sample_permission in sample_role.permissions
            assert sample_role in sample_permission.roles

    def test_user_role_assignment(self, app, sample_user, sample_role):
        """Test assigning roles to users"""
        with app.app_context():
            sample_user = db.session.merge(sample_user)
            sample_role = db.session.merge(sample_role)

            assignment = UserRoleAssignment(
                user_id=sample_user.id,
                role_id=sample_role.id,
                assigned_by=sample_user.id,
                expires_at=datetime.utcnow() + timedelta(days=30)
            )
            db.session.add(assignment)
            db.session.commit()

            assert assignment.id is not None
            assert assignment.is_active is True
            assert assignment.user_id == sample_user.id
            assert assignment.role_id == sample_role.id


class TestRBACService:
    """Test RBAC service functionality"""

    def test_initialize_default_permissions(self, app):
        """Test initializing default permissions"""
        with app.app_context():
            RBACService.initialize_default_permissions()
            
            permissions = RBACPermission.query.all()
            assert len(permissions) > 0
            
            # Check for specific permissions
            user_read = RBACPermission.query.filter_by(
                name='user.read'
            ).first()
            assert user_read is not None

    def test_initialize_default_roles(self, app):
        """Test initializing default roles"""
        with app.app_context():
            RBACService.initialize_default_permissions()
            RBACService.initialize_default_roles()
            
            roles = RBACRole.query.all()
            assert len(roles) > 0
            
            # Check for specific roles
            super_admin = RBACRole.query.filter_by(name='super_admin').first()
            assert super_admin is not None
            assert super_admin.hierarchy_level == 0

    def test_initialize_default_roles_reconciles_existing_system_role(self, app):
        """Existing system roles gain new defaults without losing extra grants."""
        with app.app_context():
            assert RBACService.initialize_default_permissions() is True
            assert RBACService.initialize_default_roles() is True

            admin_role = RBACRole.query.filter_by(name='admin').first()
            exam_manage = RBACPermission.query.filter_by(
                name='exam.manage'
            ).first()
            extra_permission = RBACPermission.query.filter_by(
                name='system.logs'
            ).first()

            grade_permission_names = {
                'grade.create',
                'grade.read',
                'grade.update',
                'grade.delete',
                'grade.approve',
            }
            grade_permissions = RBACPermission.query.filter(
                RBACPermission.name.in_(grade_permission_names)
            ).all()

            assert admin_role is not None
            assert admin_role.is_system is True
            assert exam_manage is not None
            assert extra_permission is not None
            assert {
                permission.name
                for permission in grade_permissions
            } == grade_permission_names

            # Simulate an already-deployed system role that predates
            # exam.manage while also carrying an additional valid grant.
            if exam_manage in admin_role.permissions:
                admin_role.permissions.remove(exam_manage)

            for permission in grade_permissions:
                if permission in admin_role.permissions:
                    admin_role.permissions.remove(permission)

            if extra_permission not in admin_role.permissions:
                admin_role.permissions.append(extra_permission)

            db.session.commit()

            permission_names = {
                permission.name
                for permission in admin_role.permissions
            }
            assert 'exam.manage' not in permission_names
            assert 'system.logs' in permission_names
            assert grade_permission_names.isdisjoint(permission_names)

            # Re-running default initialization must repair missing defaults
            # additively, without stripping additional permissions.
            assert RBACService.initialize_default_roles() is True

            db.session.expire_all()
            refreshed_admin = RBACRole.query.filter_by(name='admin').first()
            refreshed_names = {
                permission.name
                for permission in refreshed_admin.permissions
            }

            assert 'exam.manage' in refreshed_names
            assert 'system.logs' in refreshed_names
            assert grade_permission_names <= refreshed_names


    def test_assign_role_to_user(self, app, sample_user, sample_role):
        """Test assigning a role to a user"""
        with app.app_context():
            sample_user = db.session.merge(sample_user)
            sample_role = db.session.merge(sample_role)
            db.session.commit()
            success, _ = RBACService.assign_role_to_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                assigned_by=sample_user.id
            )
            
            assert success is True
            
            assignment = UserRoleAssignment.query.filter_by(
                user_id=sample_user.id,
                role_id=sample_role.id
            ).first()
            assert assignment is not None
            assert assignment.is_active is True

    def test_revoke_role_from_user(self, app, sample_user, sample_role):
        """Test revoking a role from a user"""
        with app.app_context():
            sample_user = db.session.merge(sample_user)
            sample_role = db.session.merge(sample_role)
            db.session.commit()
            # First assign the role
            RBACService.assign_role_to_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                assigned_by=sample_user.id
            )
            
            # Then revoke it
            success, _ = RBACService.revoke_role_from_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                revoked_by=sample_user.id
            )
            
            assert success is True
            
            assignment = UserRoleAssignment.query.filter_by(
                user_id=sample_user.id,
                role_id=sample_role.id,
                is_active=True
            ).first()
            assert assignment is None

    def test_get_user_roles(self, app, sample_user, sample_role):
        """Test getting user roles"""
        with app.app_context():
            sample_user = db.session.merge(sample_user)
            sample_role = db.session.merge(sample_role)
            db.session.commit()
            # Assign role
            RBACService.assign_role_to_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                assigned_by=sample_user.id
            )
            
            roles = RBACService.get_user_roles(sample_user.id)
            assert len(roles) == 1
            assert roles[0]['role']['name'] == sample_role.name


class TestRBACDecorators:
    """Test RBAC decorator functionality"""

    def test_require_permission_decorator(self, app, sample_user, sample_role, sample_permission):
        """Test the require_permission decorator"""
        with app.app_context():
            # Create a test route with permission requirement
            @require_permission('user', 'read')
            def test_route():
                return {'message': 'success'}

            # Assign permission to role and role to user
            sample_user = db.session.merge(sample_user)
            sample_role = db.session.merge(sample_role)
            sample_permission = db.session.merge(sample_permission)
            sample_role.permissions.append(sample_permission)
            RBACService.assign_role_to_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                assigned_by=sample_user.id
            )
            db.session.commit()

            # Test with authenticated user (would need to mock authentication)
            # This is a simplified test - in practice, you'd need to mock the authentication

    def test_require_role_decorator(self, app, sample_user, sample_role):
        """Test the require_role decorator"""
        with app.app_context():
            sample_user = db.session.merge(sample_user)
            sample_role = db.session.merge(sample_role)

            # Create a test route with role requirement
            @require_role('test_role')
            def test_route():
                return {'message': 'success'}

            # Assign role to user
            RBACService.assign_role_to_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                assigned_by=sample_user.id
            )

            # Test with authenticated user (would need to mock authentication)


@pytest.fixture
def platform_super_admin_headers(
    app,
    tracked_access_token_factory,
):
    """JWT headers for the platform-only legacy RBAC management surface."""
    with app.app_context():
        user = User.query.filter_by(
            email='platform-rbac-admin@example.com'
        ).first()

        if not user:
            user = User(
                username='platform_rbac_admin',
                email='platform-rbac-admin@example.com',
                first_name='Platform',
                last_name='RBAC Admin',
                role='super_admin',
                status='active',
            )
            user.set_password('Password123!')
            db.session.add(user)
        else:
            user.role = 'super_admin'
            user.status = 'active'
            user.set_password('Password123!')

        db.session.commit()
        token = tracked_access_token_factory(
            user.id
        )

        return {
            'Authorization': f'Bearer {token}'
        }


class TestRBACAPI:
    """Test RBAC API endpoints and platform containment."""

    def test_get_roles_endpoint(
        self,
        client,
        app,
        platform_super_admin_headers,
    ):
        """Platform super-admins may list global RBAC roles."""
        with app.app_context():
            RBACService.initialize_default_permissions()
            RBACService.initialize_default_roles()

        response = client.get(
            '/api/v1/rbac/roles',
            headers=platform_super_admin_headers,
        )

        assert response.status_code == 200, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert isinstance(data['data'], list)
        assert len(data['data']) > 0

    def test_get_permissions_endpoint(
        self,
        client,
        app,
        platform_super_admin_headers,
    ):
        """Platform super-admins may list global RBAC permissions."""
        with app.app_context():
            RBACService.initialize_default_permissions()

        response = client.get(
            '/api/v1/rbac/permissions',
            headers=platform_super_admin_headers,
        )

        assert response.status_code == 200, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert isinstance(data['data'], list)
        assert len(data['data']) > 0

    def test_tenant_admin_blocked_from_global_rbac(
        self,
        client,
        admin_headers,
    ):
        """Tenant school admins must not access global legacy RBAC."""
        response = client.get(
            '/api/v1/rbac/roles',
            headers=admin_headers,
        )

        assert response.status_code == 403, response.get_json()
        data = response.get_json()
        assert data['success'] is False
        assert data['code'] == 'TENANT_RBAC_UPGRADE_REQUIRED'

    def test_create_role_endpoint_requires_authentication(
        self,
        client,
    ):
        """Unauthenticated callers cannot create global RBAC roles."""
        response = client.post(
            '/api/v1/rbac/roles',
            json={
                'name': 'new_test_role',
                'display_name': 'New Test Role',
                'description': 'A new test role',
                'hierarchy_level': 10,
                'permissions': [],
            },
        )

        assert response.status_code == 401, response.get_json()

    def test_assign_role_endpoint_requires_authentication(
        self,
        client,
    ):
        """Unauthenticated callers cannot assign global RBAC roles."""
        response = client.post(
            '/api/v1/rbac/users/999999/roles',
            json={
                'role_name': 'test_role',
                'expires_at': (
                    datetime.utcnow() + timedelta(days=30)
                ).isoformat(),
            },
        )

        assert response.status_code == 401, response.get_json()


class TestRBACIntegration:
    """Test RBAC system integration"""

    def test_full_rbac_workflow(self, app):
        """Test complete RBAC workflow"""
        with app.app_context():
            # Initialize system
            RBACService.initialize_default_permissions()
            RBACService.initialize_default_roles()
            
            # Create a user
            user = User(
                username='integrationtest',
                email='integration@test.com',
                first_name='Integration',
                last_name='Test'
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            # Assign admin role
            success, _ = RBACService.assign_role_to_user(
                user_id=user.id,
                role_name='admin',
                assigned_by=user.id
            )
            assert success is True
            
            # Check user has admin role
            roles = RBACService.get_user_roles(user.id)
            role_names = [role['role']['name'] for role in roles]
            assert 'admin' in role_names
            
            # Check user has admin permissions (through role)
            admin_role = RBACRole.query.filter_by(name='admin').first()
            assert admin_role is not None
            assert len(admin_role.permissions) > 0

    def test_permission_inheritance(self, app):
        """Test that users inherit permissions from their roles"""
        with app.app_context():
            # Initialize system
            RBACService.initialize_default_permissions()
            RBACService.initialize_default_roles()
            
            # Get teacher role and its permissions
            teacher_role = RBACRole.query.filter_by(name='teacher').first()
            assert teacher_role is not None
            
            teacher_permissions = teacher_role.permissions
            assert len(teacher_permissions) > 0
            
            # Create and assign role to user
            user = User(
                username='teacher_test',
                email='teacher@test.com',
                first_name='Teacher',
                last_name='Test'
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            RBACService.assign_role_to_user(
                user_id=user.id,
                role_name='teacher',
                assigned_by=user.id
            )
            
            # Verify user has teacher permissions through role
            user_roles = RBACService.get_user_roles(user.id)
            assert len(user_roles) == 1
            assert user_roles[0]['role']['name'] == 'teacher'


if __name__ == '__main__':
    pytest.main([__file__])
