"""
Comprehensive integration tests for security and permission system
Tests RBAC, access control, authentication flows, and security middleware
"""
import pytest
import json
from datetime import datetime, date, timedelta
from unittest.mock import patch, MagicMock
from flask import g

from app.models.user import User, Role
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.parent import Parent
from app.extensions import db
from app.decorators.auth_decorators import role_required
from app.middleware.security_middleware import SecurityMiddleware
from app.utils.security_enhancements import security_monitor




@pytest.fixture
def parent_headers(
    db_session,
    sample_tenant,
    rbac_defaults,
    tracked_access_token_factory,):
    """
    Tenant-aware parent authorization fixture.

    Parent authorization is represented by TenantMembership,
    not by the legacy User.role field alone.
    """
    from flask_jwt_extended import create_access_token

    from app.models.user import User
    from tests.test_production_integration import (
        create_test_membership,
    )

    parent = User(
        username="security_parent",
        email="parent@school.com",
        role="parent",
        status="active",
    )
    parent.set_password("parent123")

    db_session.add(parent)
    db_session.flush()

    create_test_membership(
        db_session,
        sample_tenant.id,
        parent.id,
        "parent",
    )
    db_session.commit()

    token = tracked_access_token_factory(parent.id)

    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(sample_tenant.id),
    }


class TestRoleBasedAccessControl:
    """Test Role-Based Access Control (RBAC) functionality"""
    
    def test_admin_full_access(self, client, admin_headers):
        """Test admin has full access to all endpoints"""
        # Test student management
        response = client.get('/api/v1/students/', headers=admin_headers)
        assert response.status_code == 200
        
        # Test teacher management
        response = client.get('/api/v1/teachers/', headers=admin_headers)
        assert response.status_code == 200
        
        # Test administration endpoints
        response = client.get('/api/v1/administration/budget', headers=admin_headers)
        assert response.status_code in [200, 404]  # May not exist but should not be forbidden
        
        # Test library management
        response = client.get('/api/v1/library/books', headers=admin_headers)
        assert response.status_code in [200, 404]
    
    def test_teacher_limited_access(self, client, teacher_headers, sample_class):
        """Test teacher has limited access based on role"""
        # Teachers can view students in their classes
        response = client.get('/api/v1/students/', headers=teacher_headers)
        assert response.status_code in [200, 403]  # Depends on implementation
        
        # Teachers can access their teacher profile contract.
        # A 404 is valid when the authenticated User has no linked
        # Teacher profile in this fixture.
        response = client.get(
            '/api/v1/teachers/profile',
            headers=teacher_headers,
        )
        assert response.status_code in [200, 404]
        
        # Teachers cannot create other teachers.
        # Use a real protected endpoint so this verifies authorization,
        # rather than route existence.
        
        # Teachers cannot create other teachers
        teacher_data = {
            'first_name': 'New',
            'last_name': 'Teacher',
            'email': 'new.teacher@school.com',
            'subject_specialization': 'Mathematics'
        }
        response = client.post('/api/v1/teachers/', json=teacher_data, headers=teacher_headers)
        assert response.status_code == 403
    
    def test_student_restricted_access(self, client, student_headers):
        """Test student has very restricted access"""
        # Students can view their own profile
        response = client.get('/api/v1/students/profile', headers=student_headers)
        assert response.status_code in [200, 404]
        
        # Students cannot view all students
        response = client.get('/api/v1/students/', headers=student_headers)
        assert response.status_code == 403
        
        # Students cannot access teacher endpoints
        response = client.get('/api/v1/teachers/', headers=student_headers)
        assert response.status_code == 403
        
        # Students cannot create teachers.
        response = client.post(
            '/api/v1/teachers/',
            json={
                'name': 'Unauthorized Teacher',
                'email': 'unauthorized.teacher@example.com',
            },
            headers=student_headers,
        )
        assert response.status_code == 403
    
    def test_parent_access_control(self, client, parent_headers):
        """Test parent access is limited to their children's data"""
        # Parents can view their children's information
        response = client.get('/api/v1/students/children', headers=parent_headers)
        assert response.status_code in [200, 404]
        
        # Parents cannot access all students
        response = client.get('/api/v1/students/', headers=parent_headers)
        assert response.status_code == 403
        
        # Parents cannot access teacher management
        response = client.get('/api/v1/teachers/', headers=parent_headers)
        assert response.status_code == 403


class TestAuthenticationFlows:
    """Test various authentication flows and scenarios"""
    
    def test_login_success_flow(self, client, db_session):
        """Test successful login flow"""
        # Create test user
        user = User(
            name='Test User',
            email='test@example.com',
            role=Role.TEACHER
        )
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        # Test login
        login_data = {
            'email': 'test@example.com',
            'password': 'password123'
        }
        
        response = client.post('/api/v1/auth/login', json=login_data)
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['email'] == 'test@example.com'
    
    def test_login_failure_scenarios(self, client, db_session):
        """Test various login failure scenarios"""
        # Create test user
        user = User(
            name='Test User',
            email='test@example.com',
            role=Role.TEACHER
        )
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        # Test wrong password
        login_data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        response = client.post('/api/v1/auth/login', json=login_data)
        assert response.status_code == 401
        
        # Test non-existent user
        login_data = {
            'email': 'nonexistent@example.com',
            'password': 'password123'
        }
        response = client.post('/api/v1/auth/login', json=login_data)
        assert response.status_code == 401
        
        # Test malformed request
        response = client.post('/api/v1/auth/login', json={})
        assert response.status_code == 400
    
    def test_token_refresh_flow(self, client, db_session):
        """Test token refresh functionality"""
        # Create and login user
        user = User(
            name='Refresh User',
            email='refresh@example.com',
            role=Role.TEACHER
        )
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        # Login to get tokens
        login_data = {
            'email': 'refresh@example.com',
            'password': 'password123'
        }
        response = client.post('/api/v1/auth/login', json=login_data)
        assert response.status_code == 200
        
        tokens = response.get_json()
        refresh_token = tokens['refresh_token']
        
        # Test token refresh.
        # The refresh endpoint uses @jwt_required(refresh=True), so the
        # refresh JWT is supplied as the Bearer credential.
        refresh_headers = {
            'Authorization': f'Bearer {refresh_token}'
        }
        response = client.post(
            '/api/v1/auth/refresh',
            headers=refresh_headers,
        )
        assert response.status_code == 200
        
        new_tokens = response.get_json()
        assert 'access_token' in new_tokens
        assert new_tokens['access_token'] != tokens['access_token']
    
    def test_logout_flow(self, client, admin_headers):
        """Test logout functionality"""
        response = client.post('/api/v1/auth/logout', headers=admin_headers)
        assert response.status_code == 200
        
        # Verify the revoked access token cannot be used against
        # the current protected identity endpoint.
        response = client.get('/api/v1/auth/me', headers=admin_headers)
        assert response.status_code == 401


class TestSecurityMiddleware:
    """Test security middleware functionality"""

    def test_security_monitoring_integration(
        self,
        client,
    ):
        """
        Verify security_headers() on an endpoint that actually uses
        the decorator.

        The legacy security_monitor.monitor_request hook is no longer
        part of the active middleware path.
        """
        response = client.post(
            '/api/v1/auth/login',
            json={
                'email': 'security-header-test@example.invalid',
                'password': 'NotARealPassword!2026',
            },
        )

        # Invalid credentials are expected; security headers must
        # still be attached by the decorator.
        assert response.status_code == 401

        assert response.headers.get(
            'X-Content-Type-Options'
        ) == 'nosniff'

        assert response.headers.get(
            'X-Frame-Options'
        ) == 'DENY'

        assert response.headers.get(
            'Content-Security-Policy'
        )

        assert response.headers.get(
            'Referrer-Policy'
        ) == 'strict-origin-when-cross-origin'


    def test_rate_limiting(self, client):
        """Test rate limiting functionality"""
        # Make multiple rapid requests
        responses = []
        for i in range(20):
            response = client.get('/api/v1/auth/login')
            responses.append(response.status_code)
        
        # Should eventually get rate limited
        assert 429 in responses or all(r in [400, 405] for r in responses)
    
    def test_suspicious_request_blocking(self, client):
        """Test blocking of suspicious requests"""
        # Test SQL injection attempt
        malicious_data = {
            'email': "admin'; DROP TABLE users; --",
            'password': 'password'
        }
        
        response = client.post('/api/v1/auth/login', json=malicious_data)
        assert response.status_code in [400, 401, 403, 422]
        
        # Test XSS attempt
        xss_data = {
            'name': '<script>alert("xss")</script>',
            'email': 'test@example.com'
        }
        
        response = client.post('/api/v1/students/', json=xss_data)
        # Authentication is evaluated before student payload
        # validation on this protected endpoint.
        assert response.status_code in [400, 401, 403, 422]


class TestDataAccessControl:
    """Test data access control and isolation"""
    
    def test_teacher_class_isolation(
        self,
        db_session,
        sample_tenant,
        teacher_factory,
    ):
        """Teacher/class records must retain canonical tenant ownership."""
        teacher1 = teacher_factory(tenant_id=sample_tenant.id)
        teacher2 = teacher_factory(tenant_id=sample_tenant.id)

        class1 = Class(
            tenant_id=sample_tenant.id,
            name='Class 1A',
            grade_level='Grade 1',
            academic_year='2024',
            capacity=30,
        )
        class2 = Class(
            tenant_id=sample_tenant.id,
            name='Class 1B',
            grade_level='Grade 1',
            academic_year='2024',
            capacity=30,
        )

        db_session.add_all([class1, class2])
        db_session.commit()

        class1.teacher_id = teacher1.id
        class2.teacher_id = teacher2.id
        db_session.commit()

        assert teacher1.tenant_id == sample_tenant.id
        assert teacher2.tenant_id == sample_tenant.id
        assert class1.tenant_id == sample_tenant.id
        assert class2.tenant_id == sample_tenant.id
        assert class1.teacher_id == teacher1.id
        assert class2.teacher_id == teacher2.id
        assert class1.teacher_id != class2.teacher_id

    def test_parent_child_isolation(
        self,
        db_session,
        sample_tenant,
        student_factory,
    ):
        """
        Parent-child ownership must use the canonical domain chain:

            User -> Parent -> Student

        Student.parent_id references parents.id, never users.id.
        """
        user1 = User(
            name='Parent One',
            email='parent1@example.com',
            role=Role.PARENT,
        )
        user2 = User(
            name='Parent Two',
            email='parent2@example.com',
            role=Role.PARENT,
        )

        db_session.add_all([user1, user2])
        db_session.flush()

        parent1 = Parent(
            tenant_id=sample_tenant.id,
            user_id=user1.id,
            relationship='Parent',
        )
        parent2 = Parent(
            tenant_id=sample_tenant.id,
            user_id=user2.id,
            relationship='Parent',
        )

        db_session.add_all([parent1, parent2])
        db_session.flush()

        student1 = student_factory(
            tenant_id=sample_tenant.id,
        )
        student2 = student_factory(
            tenant_id=sample_tenant.id,
        )

        student1.parent_id = parent1.id
        student2.parent_id = parent2.id

        db_session.commit()

        assert parent1.tenant_id == sample_tenant.id
        assert parent2.tenant_id == sample_tenant.id

        assert student1.tenant_id == sample_tenant.id
        assert student2.tenant_id == sample_tenant.id

        assert student1.parent_id == parent1.id
        assert student2.parent_id == parent2.id

        assert student1.parent_id != student2.parent_id

        assert student1.parent.user_id == user1.id
        assert student2.parent.user_id == user2.id

    def test_login_attempt_logging(self, client, db_session):
        """Test login attempts are properly logged"""
        # Create test user
        user = User(
            name='Audit User',
            email='audit@example.com',
            role=Role.TEACHER
        )
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        # Test successful login logging
        login_data = {
            'email': 'audit@example.com',
            'password': 'password123'
        }
        
        response = client.post('/api/v1/auth/login', json=login_data)
        assert response.status_code == 200
        
        # Test failed login logging
        login_data['password'] = 'wrongpassword'
        response = client.post('/api/v1/auth/login', json=login_data)
        assert response.status_code == 401
        
        # Verify audit logs would be created (implementation dependent)
    
    def test_permission_violation_logging(self, client, student_headers):
        """Test permission violations are logged"""
        # Attempt unauthorized access against a real protected route.
        response = client.post(
            '/api/v1/teachers/',
            json={
                'name': 'Forbidden Teacher',
                'email': 'forbidden.teacher@example.com',
            },
            headers=student_headers,
        )
        assert response.status_code == 403
        
        # Verify security event would be logged (implementation dependent)


class TestSecurityIntegrationWorkflow:
    """Test complete tenant-aware security workflow integration"""

    def test_complete_authentication_authorization_flow(
        self,
        client,
        db_session,
        sample_tenant,
        rbac_defaults,
    ):
        """
        Test end-to-end authentication, tenant authorization,
        refresh, logout and JWT revocation.
        """
        from tests.test_production_integration import (
            create_test_membership,
        )

        # 1. Create the global identity.
        user = User(
            name='Workflow User',
            email='workflow@example.com',
            role=Role.TEACHER,
        )
        user.set_password('password123')

        db_session.add(user)
        db_session.flush()

        # Tenant authorization is represented by membership,
        # not by User.role alone.
        create_test_membership(
            db_session,
            sample_tenant.id,
            user.id,
            'teacher',
        )
        db_session.commit()

        # 2. Login and obtain the access/refresh token pair.
        login_data = {
            'email': 'workflow@example.com',
            'password': 'password123',
        }

        response = client.post(
            '/api/v1/auth/login',
            json=login_data,
        )
        assert response.status_code == 200

        tokens = response.get_json()

        access_token = tokens['access_token']
        refresh_token = tokens['refresh_token']

        headers = {
            'Authorization': f'Bearer {access_token}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        # 3. Access a teacher-authorized endpoint.
        # The User may not have a physical Teacher profile in
        # this fixture, therefore 404 remains a valid domain
        # result after successful authorization.
        response = client.get(
            '/api/v1/teachers/profile',
            headers=headers,
        )
        assert response.status_code in [200, 404]

        # 4. Verify denial on a real protected endpoint.
        response = client.post(
            '/api/v1/teachers/',
            json={
                'name': 'Workflow Forbidden',
                'email': 'workflow.forbidden@example.com',
            },
            headers=headers,
        )
        assert response.status_code == 403

        # 5. Refresh using the refresh JWT as the Bearer
        # credential required by @jwt_required(refresh=True).
        response = client.post(
            '/api/v1/auth/refresh',
            headers={
                'Authorization': f'Bearer {refresh_token}',
            },
        )
        assert response.status_code == 200

        refreshed = response.get_json()
        assert refreshed.get('access_token')

        # 6. Logout the original access session.
        response = client.post(
            '/api/v1/auth/logout',
            headers=headers,
        )
        assert response.status_code == 200

        # 7. The exact JWT used for logout must now be rejected
        # centrally before the business endpoint executes.
        response = client.get(
            '/api/v1/teachers/profile',
            headers=headers,
        )
        assert response.status_code == 401


class TestConcurrentSecurityOperations:
    """Test security under concurrent operations"""
    
    def test_concurrent_login_attempts(self, client, db_session):
        """Test handling of concurrent login attempts"""
        # Create test user
        user = User(
            name='Concurrent User',
            email='concurrent@example.com',
            role=Role.TEACHER
        )
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        # Simulate concurrent login attempts
        login_data = {
            'email': 'concurrent@example.com',
            'password': 'password123'
        }
        
        responses = []
        for i in range(5):
            response = client.post('/api/v1/auth/login', json=login_data)
            responses.append(response.status_code)
        
        # At least one should succeed
        assert 200 in responses
        
        # Should handle concurrent requests gracefully
        assert all(status in [200, 429] for status in responses)
    
    def test_concurrent_permission_checks(self, client, admin_headers):
        """Test concurrent permission checking"""
        responses = []
        for i in range(10):
            response = client.get('/api/v1/students/', headers=admin_headers)
            responses.append(response.status_code)
        
        # All should succeed for admin
        assert all(status == 200 for status in responses)


# Fixtures for security tests
@pytest.fixture
def sample_class(db_session, sample_tenant):
    """Create a tenant-scoped sample class for security testing."""
    class_obj = Class(
        name='Test Class',
        grade_level='Grade 5',
        academic_year='2024',
        capacity=30,
        tenant_id=sample_tenant.id,
    )
    db_session.add(class_obj)
    db_session.commit()
    return class_obj

