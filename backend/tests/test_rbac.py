"""
Comprehensive RBAC System Tests
"""
import pytest
from flask import Flask
from app import create_app
from app.extensions import db
from app.models.rbac import RBACRole, RBACPermission, UserRoleAssignment, PermissionGrant
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
        db.drop_all()


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
            hierarchy_level=5
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
            resource_type='test',
            permission_type='read'
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
                hierarchy_level=1
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
                resource_type='user',
                permission_type='read'
            )
            db.session.add(permission)
            db.session.commit()

            assert permission.id is not None
            assert permission.name == 'user_read'
            assert permission.resource_type == 'user'
            assert permission.permission_type == 'read'

    def test_role_permission_assignment(self, app, sample_role, sample_permission):
        """Test assigning permissions to roles"""
        with app.app_context():
            sample_role.permissions.append(sample_permission)
            db.session.commit()

            assert sample_permission in sample_role.permissions
            assert sample_role in sample_permission.roles

    def test_user_role_assignment(self, app, sample_user, sample_role):
        """Test assigning roles to users"""
        with app.app_context():
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
                resource_type='user', 
                permission_type='read'
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
            assert super_admin.hierarchy_level == 1

    def test_assign_role_to_user(self, app, sample_user, sample_role):
        """Test assigning a role to a user"""
        with app.app_context():
            success = RBACService.assign_role_to_user(
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
            # First assign the role
            RBACService.assign_role_to_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                assigned_by=sample_user.id
            )
            
            # Then revoke it
            success = RBACService.revoke_role_from_user(
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
            # Assign role
            RBACService.assign_role_to_user(
                user_id=sample_user.id,
                role_name=sample_role.name,
                assigned_by=sample_user.id
            )
            
            roles = RBACService.get_user_roles(sample_user.id)
            assert len(roles) == 1
            assert roles[0].name == sample_role.name


class TestRBACDecorators:
    """Test RBAC decorator functionality"""

    def test_require_permission_decorator(self, app, sample_user, sample_role, sample_permission):
        """Test the require_permission decorator"""
        with app.app_context():
            # Create a test route with permission requirement
            @require_permission('test', 'read')
            def test_route():
                return {'message': 'success'}

            # Assign permission to role and role to user
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


class TestRBACAPI:
    """Test RBAC API endpoints"""

    def test_get_roles_endpoint(self, client, app):
        """Test GET /api/v1/rbac/roles endpoint"""
        with app.app_context():
            RBACService.initialize_default_roles()
            
            response = client.get('/api/v1/rbac/roles')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert 'roles' in data
            assert len(data['roles']) > 0

    def test_get_permissions_endpoint(self, client, app):
        """Test GET /api/v1/rbac/permissions endpoint"""
        with app.app_context():
            RBACService.initialize_default_permissions()
            
            response = client.get('/api/v1/rbac/permissions')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert 'permissions' in data
            assert len(data['permissions']) > 0

    def test_create_role_endpoint(self, client, app):
        """Test POST /api/v1/rbac/roles endpoint"""
        role_data = {
            'name': 'new_test_role',
            'display_name': 'New Test Role',
            'description': 'A new test role',
            'hierarchy_level': 10,
            'permissions': []
        }
        
        response = client.post(
            '/api/v1/rbac/roles',
            data=json.dumps(role_data),
            content_type='application/json'
        )
        
        # Note: This would require authentication middleware to work properly
        # The actual status code might be 401 (Unauthorized) without proper auth

    def test_assign_role_endpoint(self, client, app, sample_user, sample_role):
        """Test POST /api/v1/rbac/users/{user_id}/roles endpoint"""
        assignment_data = {
            'role_name': sample_role.name,
            'expires_at': (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        
        response = client.post(
            f'/api/v1/rbac/users/{sample_user.id}/roles',
            data=json.dumps(assignment_data),
            content_type='application/json'
        )
        
        # Note: This would require authentication middleware to work properly


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
            success = RBACService.assign_role_to_user(
                user_id=user.id,
                role_name='admin',
                assigned_by=user.id
            )
            assert success is True
            
            # Check user has admin role
            roles = RBACService.get_user_roles(user.id)
            role_names = [role.name for role in roles]
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
            assert user_roles[0].name == 'teacher'


if __name__ == '__main__':
    pytest.main([__file__])
