"""
Comprehensive authentication system tests
Tests for login, logout, token management, security features, and RBAC
"""
import pytest
import json
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask_jwt_extended import decode_token

from app.models.user import User
from app.models.session_token import SessionToken
from app.extensions import db


class TestUserRegistration:
    """Test user registration functionality"""
    
    def test_successful_registration(self, client, db):
        """Test successful user registration"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['user']['username'] == 'newuser'
        assert data['user']['email'] == 'new@example.com'
        assert data['user']['role'] == 'teacher'
        assert 'password' not in data['user']  # Password should not be returned
        
        # Verify user was created in database
        user = User.query.filter_by(email='new@example.com').first()
        assert user is not None
        assert user.username == 'newuser'
        assert user.check_password('SecurePass123!')
    
    def test_registration_duplicate_email(self, client, db):
        """Test registration with duplicate email"""
        # Create first user
        client.post('/api/v1/auth/register', json={
            'username': 'user1',
            'email': 'duplicate@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        # Try to create second user with same email
        response = client.post('/api/v1/auth/register', json={
            'username': 'user2',
            'email': 'duplicate@example.com',
            'password': 'AnotherPass123!',
            'role': 'student'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'email' in data['message'].lower()
    
    def test_registration_invalid_email(self, client, db):
        """Test registration with invalid email format"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'testuser',
            'email': 'invalid-email',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
    
    def test_registration_weak_password(self, client, db):
        """Test registration with weak password"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': '123',  # Too weak
            'role': 'teacher'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'password' in data['message'].lower()
    
    def test_registration_missing_fields(self, client, db):
        """Test registration with missing required fields"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'testuser',
            'email': 'test@example.com'
            # Missing password and role
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False


class TestUserLogin:
    """Test user login functionality"""
    
    def test_successful_login(self, client, db):
        """Test successful user login"""
        # Register user first
        client.post('/api/v1/auth/register', json={
            'username': 'loginuser',
            'email': 'login@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        # Login
        response = client.post('/api/v1/auth/login', json={
            'email': 'login@example.com',
            'password': 'SecurePass123!'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['email'] == 'login@example.com'
        
        # Verify session token was created
        user = User.query.filter_by(email='login@example.com').first()
        session_tokens = SessionToken.query.filter_by(user_id=user.id).all()
        assert len(session_tokens) >= 1

    def test_login_seeds_access_session_last_used_at(self, client, db):
        """Ensure the first /auth/me request does not need to write session activity."""
        client.post('/api/v1/auth/register', json={
            'username': 'sessionuser',
            'email': 'session@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })

        response = client.post('/api/v1/auth/login', json={
            'email': 'session@example.com',
            'password': 'SecurePass123!'
        })

        assert response.status_code == 200
        user = User.query.filter_by(email='session@example.com').first()
        access_session = SessionToken.query.filter_by(user_id=user.id, token_type='access').order_by(SessionToken.id.desc()).first()

        assert access_session is not None
        assert access_session.last_used_at is not None
    
    def test_login_invalid_credentials(self, client, db):
        """Test login with invalid credentials"""
        # Register user first
        client.post('/api/v1/auth/register', json={
            'username': 'loginuser',
            'email': 'login@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        # Try login with wrong password
        response = client.post('/api/v1/auth/login', json={
            'email': 'login@example.com',
            'password': 'WrongPassword'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['success'] is False
        assert 'invalid' in data['message'].lower()
    
    def test_login_nonexistent_user(self, client, db):
        """Test login with non-existent user"""
        response = client.post('/api/v1/auth/login', json={
            'email': 'nonexistent@example.com',
            'password': 'SomePassword123!'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['success'] is False
    
    def test_login_missing_fields(self, client, db):
        """Test login with missing fields"""
        response = client.post('/api/v1/auth/login', json={
            'email': 'test@example.com'
            # Missing password
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False


class TestTokenManagement:
    """Test JWT token management and refresh"""
    
    def test_token_refresh(self, client, db):
        """Test token refresh functionality"""
        # Register and login user
        client.post('/api/v1/auth/register', json={
            'username': 'refreshuser',
            'email': 'refresh@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'refresh@example.com',
            'password': 'SecurePass123!'
        })
        
        refresh_token = login_response.get_json()['refresh_token']
        
        # Refresh token
        response = client.post('/api/v1/auth/refresh', 
                             headers={'Authorization': f'Bearer {refresh_token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'access_token' in data
    
    def test_token_revocation_on_logout(self, client, db):
        """Test that tokens are revoked on logout"""
        # Register and login user
        client.post('/api/v1/auth/register', json={
            'username': 'logoutuser',
            'email': 'logout@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'logout@example.com',
            'password': 'SecurePass123!'
        })
        
        access_token = login_response.get_json()['access_token']
        
        # Logout
        response = client.post('/api/v1/auth/logout',
                             headers={'Authorization': f'Bearer {access_token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify token is revoked
        decoded_token = decode_token(access_token)
        jti = decoded_token['jti']
        session_token = SessionToken.find_by_jti(jti)
        assert session_token.is_revoked is True
    
    def test_access_with_revoked_token(self, client, db):
        """Test that revoked tokens cannot access protected routes"""
        # Register and login user
        client.post('/api/v1/auth/register', json={
            'username': 'revokeduser',
            'email': 'revoked@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'revoked@example.com',
            'password': 'SecurePass123!'
        })
        
        access_token = login_response.get_json()['access_token']
        
        # Logout to revoke token
        client.post('/api/v1/auth/logout',
                   headers={'Authorization': f'Bearer {access_token}'})
        
        # Try to access protected route with revoked token
        response = client.get('/api/v1/auth/me',
                            headers={'Authorization': f'Bearer {access_token}'})
        
        assert response.status_code == 401


class TestRoleBasedAccessControl:
    """Test role-based access control (RBAC)"""
    
    def test_admin_access_to_admin_routes(self, client, db):
        """Test that admin users can access admin routes"""
        # Create admin user
        admin_user = User(
            username='admin',
            email='admin@example.com',
            role='admin'
        )
        admin_user.set_password_hash('AdminPass123!')
        db.session.add(admin_user)
        db.session.commit()
        
        # Login as admin
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'admin@example.com',
            'password': 'AdminPass123!'
        })
        
        access_token = login_response.get_json()['access_token']
        
        # Try to access admin route (assuming it exists)
        response = client.get('/api/v1/admin/users',
                            headers={'Authorization': f'Bearer {access_token}'})
        
        # Should not be 403 (Forbidden)
        assert response.status_code != 403
    
    def test_student_denied_admin_routes(self, client, db):
        """Test that student users cannot access admin routes"""
        # Create student user
        student_user = User(
            username='student',
            email='student@example.com',
            role='student'
        )
        student_user.set_password_hash('StudentPass123!')
        db.session.add(student_user)
        db.session.commit()
        
        # Login as student
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'student@example.com',
            'password': 'StudentPass123!'
        })
        
        access_token = login_response.get_json()['access_token']
        
        # Try to access admin route
        response = client.get('/api/v1/admin/users',
                            headers={'Authorization': f'Bearer {access_token}'})
        
        assert response.status_code == 403


class TestSecurityFeatures:
    """Test security features like rate limiting and input validation"""
    
    @patch('app.middleware.security_middleware.rate_limiter')
    def test_rate_limiting_on_login(self, mock_rate_limiter, client, db):
        """Test rate limiting on login attempts"""
        # Mock rate limiter to simulate rate limit exceeded
        mock_rate_limiter.is_allowed.return_value = (False, {'retry_after': 60})
        
        response = client.post('/api/v1/auth/login', json={
            'email': 'test@example.com',
            'password': 'password'
        })
        
        assert response.status_code == 429
        data = response.get_json()
        assert 'rate limit' in data['error'].lower()
    
    def test_sql_injection_protection(self, client, db):
        """Test protection against SQL injection in login"""
        response = client.post('/api/v1/auth/login', json={
            'email': "admin@example.com'; DROP TABLE users; --",
            'password': 'password'
        })
        
        # Should handle gracefully, not crash
        assert response.status_code in [400, 401]
        
        # Verify users table still exists by trying to query it
        users = User.query.all()
        # Should not raise an exception
    
    def test_xss_protection_in_registration(self, client, db):
        """Test XSS protection in user registration"""
        response = client.post('/api/v1/auth/register', json={
            'username': '<script>alert("xss")</script>',
            'email': 'xss@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        if response.status_code == 201:
            # If registration succeeds, verify XSS was sanitized
            user = User.query.filter_by(email='xss@example.com').first()
            assert '<script>' not in user.username
        else:
            # Registration should be rejected
            assert response.status_code == 400


class TestPasswordSecurity:
    """Test password security features"""
    
    def test_password_hashing(self, client, db):
        """Test that passwords are properly hashed"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'hashtest',
            'email': 'hash@example.com',
            'password': 'TestPassword123!',
            'role': 'teacher'
        })
        
        assert response.status_code == 201
        
        # Verify password is hashed in database
        user = User.query.filter_by(email='hash@example.com').first()
        assert user.password_hash != 'TestPassword123!'
        assert user.password_hash.startswith('$2b$')  # bcrypt hash format
        assert user.check_password('TestPassword123!')
    
    def test_password_change_requires_current_password(self, client, db):
        """Test that password change requires current password"""
        # Register user
        client.post('/api/v1/auth/register', json={
            'username': 'changepass',
            'email': 'change@example.com',
            'password': 'OldPassword123!',
            'role': 'teacher'
        })
        
        # Login
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'change@example.com',
            'password': 'OldPassword123!'
        })
        
        access_token = login_response.get_json()['access_token']
        
        # Try to change password without current password
        response = client.post('/api/v1/auth/change-password',
                             headers={'Authorization': f'Bearer {access_token}'},
                             json={
                                 'new_password': 'NewPassword123!'
                             })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'current_password' in data['message'].lower()


class TestSessionManagement:
    """Test session management features"""
    
    def test_multiple_sessions_tracking(self, client, db):
        """Test tracking of multiple user sessions"""
        # Register user
        client.post('/api/v1/auth/register', json={
            'username': 'multisession',
            'email': 'multi@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        # Login from multiple "devices" (different user agents)
        headers1 = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        headers2 = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)'}
        
        response1 = client.post('/api/v1/auth/login', 
                              json={'email': 'multi@example.com', 'password': 'SecurePass123!'},
                              headers=headers1)
        
        response2 = client.post('/api/v1/auth/login',
                              json={'email': 'multi@example.com', 'password': 'SecurePass123!'},
                              headers=headers2)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Verify multiple session tokens exist
        user = User.query.filter_by(email='multi@example.com').first()
        active_sessions = SessionToken.get_user_active_sessions(user.id)
        assert len(active_sessions) >= 2
    
    def test_session_cleanup_on_user_deletion(self, client, db):
        """Test that sessions are cleaned up when user is deleted"""
        # Register user
        client.post('/api/v1/auth/register', json={
            'username': 'deleteuser',
            'email': 'delete@example.com',
            'password': 'SecurePass123!',
            'role': 'teacher'
        })
        
        # Login to create session
        client.post('/api/v1/auth/login', json={
            'email': 'delete@example.com',
            'password': 'SecurePass123!'
        })
        
        user = User.query.filter_by(email='delete@example.com').first()
        user_id = user.id
        
        # Verify session exists
        sessions_before = SessionToken.query.filter_by(user_id=user_id).count()
        assert sessions_before > 0
        
        # Delete user
        db.session.delete(user)
        db.session.commit()
        
        # Verify sessions are cleaned up (due to cascade delete)
        sessions_after = SessionToken.query.filter_by(user_id=user_id).count()
        assert sessions_after == 0


class TestAuthenticationIntegration:
    """Integration tests for authentication system"""
    
    def test_complete_auth_workflow(self, client, db):
        """Test complete authentication workflow"""
        # 1. Register
        register_response = client.post('/api/v1/auth/register', json={
            'username': 'workflow',
            'email': 'workflow@example.com',
            'password': 'WorkflowPass123!',
            'role': 'teacher'
        })
        assert register_response.status_code == 201
        
        # 2. Login
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'workflow@example.com',
            'password': 'WorkflowPass123!'
        })
        assert login_response.status_code == 200
        
        access_token = login_response.get_json()['access_token']
        refresh_token = login_response.get_json()['refresh_token']
        
        # 3. Access protected route
        me_response = client.get('/api/v1/auth/me',
                               headers={'Authorization': f'Bearer {access_token}'})
        assert me_response.status_code == 200
        
        # 4. Refresh token
        refresh_response = client.post('/api/v1/auth/refresh',
                                     headers={'Authorization': f'Bearer {refresh_token}'})
        assert refresh_response.status_code == 200
        
        # 5. Logout
        logout_response = client.post('/api/v1/auth/logout',
                                    headers={'Authorization': f'Bearer {access_token}'})
        assert logout_response.status_code == 200
        
        # 6. Verify cannot access protected route after logout
        final_response = client.get('/api/v1/auth/me',
                                  headers={'Authorization': f'Bearer {access_token}'})
        assert final_response.status_code == 401

    def test_immediate_login_post_approval(self, client, db):
        """
        Verify that student accounts promoted directly to active immediately after approval
        can authenticate without waiting for any activation workflow.
        """
        # 1. Setup a student user mimicking direct activation on approval
        import uuid
        from werkzeug.security import generate_password_hash
        
        username = f"directstudent_{uuid.uuid4().hex[:6]}"
        email = f"{username}@admipaedia.local"
        password = "SecureStudentPass123!"
        
        student_user = User(
            username=username,
            email=email,
            role='student',
            status='active',
            email_verified=True
        )
        student_user.set_password(password)
        db.session.add(student_user)
        db.session.commit()

        # 2. Log in directly
        login_resp = client.post(
            "/api/v1/auth/login",
            json={
                "email": username,
                "password": password
            }
        )
        assert login_resp.status_code == 200
        data = login_resp.get_json()
        assert data["success"] is True
        assert "access_token" in data
        assert data["user"]["username"] == username
