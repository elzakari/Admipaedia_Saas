"""
Comprehensive Integration Tests for Authentication & Security System
Tests user authentication, authorization, security features, and access control
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask_jwt_extended import create_access_token, decode_token

from app.models.user import User
from app.models.security import LoginAttempt, SecurityEvent, PasswordHistory
from app.models.session_token import SessionToken
from app.extensions import db


class TestUserRegistration:
    """Test user registration functionality"""

    def test_register_user_success(self, client, db):
        """Test successful user registration"""
        user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'confirm_password': 'SecurePass123!',
            'role': 'student'
        }
        
        response = client.post('/api/v1/auth/register', 
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert data['user']['email'] == user_data['email']
        assert data['user']['username'] == user_data['username']
        assert data['user']['role'] == user_data['role']
        
        # Verify user was created in database
        user = User.query.filter_by(email=user_data['email']).first()
        assert user is not None
        assert user.check_password_hash(user_data['password'])

    def test_register_duplicate_email(self, client, db):
        """Test registration with duplicate email"""
        # Create existing user
        existing_user = User(
            username='existing',
            email='test@example.com',
            role='student'
        )
        existing_user.set_password_hash('password123')
        db.session.add(existing_user)
        db.session.commit()
        
        user_data = {
            'username': 'newuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'confirm_password': 'SecurePass123!'
        }
        
        response = client.post('/api/v1/auth/register',
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'already registered' in data['message'].lower()

    def test_register_weak_password(self, client, db):
        """Test registration with weak password"""
        user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': '123',  # Weak password
            'confirm_password': '123'
        }
        
        response = client.post('/api/v1/auth/register',
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'security requirements' in data['message'].lower()

    def test_register_password_mismatch(self, client, db):
        """Test registration with password mismatch"""
        user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'confirm_password': 'DifferentPass123!'
        }
        
        response = client.post('/api/v1/auth/register',
                             data=json.dumps(user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'do not match' in data['message'].lower()


class TestUserAuthentication:
    """Test user login and authentication"""

    def test_login_success(self, client, db):
        """Test successful user login"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'csrf_token' in data
        assert 'user' in data
        assert data['user']['email'] == login_data['email']

    def test_login_invalid_credentials(self, client, db):
        """Test login with invalid credentials"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'invalid credentials' in data['message'].lower()

    def test_login_nonexistent_user(self, client, db):
        """Test login with non-existent user"""
        login_data = {
            'email': 'nonexistent@example.com',
            'password': 'SecurePass123!'
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'invalid credentials' in data['message'].lower()

    def test_login_remember_me(self, client, db):
        """Test login with remember me option"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'remember_me': True
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # Should have longer expiration time
        assert data['expires_in'] > 3600  # More than 1 hour


class TestAccountSecurity:
    """Test account security features"""

    def test_account_lockout_after_failed_attempts(self, client, db):
        """Test account lockout after multiple failed login attempts"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        }
        
        # Make multiple failed attempts
        for i in range(6):  # Assuming 5 is the limit
            response = client.post('/api/v1/auth/login',
                                 data=json.dumps(login_data),
                                 content_type='application/json')
        
        # Last attempt should result in account lockout
        assert response.status_code == 423
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'locked' in data['message'].lower()
        assert 'retry_after' in data

    def test_successful_login_clears_failed_attempts(self, client, db):
        """Test that successful login clears failed attempts"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        # Make some failed attempts
        failed_login_data = {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        }
        
        for i in range(3):
            client.post('/api/v1/auth/login',
                       data=json.dumps(failed_login_data),
                       content_type='application/json')
        
        # Now login successfully
        correct_login_data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(correct_login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True


class TestJWTTokenManagement:
    """Test JWT token management and validation"""

    def test_access_protected_endpoint_with_valid_token(self, auth_client, db):
        """Test accessing protected endpoint with valid token"""
        response = auth_client.get('/api/v1/auth/me')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data

    def test_access_protected_endpoint_without_token(self, client, db):
        """Test accessing protected endpoint without token"""
        response = client.get('/api/v1/auth/me')
        
        assert response.status_code == 401

    def test_refresh_token_functionality(self, client, db):
        """Test token refresh functionality"""
        # Create and login user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }
        
        login_response = client.post('/api/v1/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        login_data = json.loads(login_response.data)
        refresh_token = login_data['refresh_token']
        
        # Use refresh token to get new access token
        response = client.post('/api/v1/auth/refresh',
                             headers={'Authorization': f'Bearer {refresh_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data

    def test_logout_invalidates_token(self, auth_client, db):
        """Test that logout invalidates the token"""
        # First, verify token works
        response = auth_client.get('/api/v1/auth/me')
        assert response.status_code == 200
        
        # Logout
        logout_response = auth_client.post('/api/v1/auth/logout')
        assert logout_response.status_code == 200
        
        # Try to use token after logout - should fail
        response = auth_client.get('/api/v1/auth/me')
        assert response.status_code == 401


class TestRoleBasedAccessControl:
    """Test role-based access control (RBAC)"""

    def test_admin_access_to_admin_endpoints(self, client, db):
        """Test admin user can access admin-only endpoints"""
        # Create admin user
        admin_user = User(username='admin', email='admin@example.com', role='admin')
        admin_user.set_password_hash('AdminPass123!')
        db.session.add(admin_user)
        db.session.commit()
        
        # Login as admin
        login_data = {
            'email': 'admin@example.com',
            'password': 'AdminPass123!'
        }
        
        login_response = client.post('/api/v1/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        login_data = json.loads(login_response.data)
        access_token = login_data['access_token']
        
        # Access admin endpoint
        response = client.get('/api/v1/administration/budgets',
                            headers={'Authorization': f'Bearer {access_token}'})
        
        assert response.status_code == 200

    def test_student_denied_admin_endpoints(self, client, db):
        """Test student user cannot access admin-only endpoints"""
        # Create student user
        student_user = User(username='student', email='student@example.com', role='student')
        student_user.set_password_hash('StudentPass123!')
        db.session.add(student_user)
        db.session.commit()
        
        # Login as student
        login_data = {
            'email': 'student@example.com',
            'password': 'StudentPass123!'
        }
        
        login_response = client.post('/api/v1/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        login_data = json.loads(login_response.data)
        access_token = login_data['access_token']
        
        # Try to access admin endpoint
        response = client.get('/api/v1/administration/budgets',
                            headers={'Authorization': f'Bearer {access_token}'})
        
        assert response.status_code == 403

    def test_teacher_access_to_teacher_endpoints(self, client, db):
        """Test teacher user can access teacher-specific endpoints"""
        # Create teacher user
        teacher_user = User(username='teacher', email='teacher@example.com', role='teacher')
        teacher_user.set_password_hash('TeacherPass123!')
        db.session.add(teacher_user)
        db.session.commit()
        
        # Login as teacher
        login_data = {
            'email': 'teacher@example.com',
            'password': 'TeacherPass123!'
        }
        
        login_response = client.post('/api/v1/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        login_data = json.loads(login_response.data)
        access_token = login_data['access_token']
        
        # Access teacher endpoint
        response = client.get('/api/v1/teachers/attendance',
                            headers={'Authorization': f'Bearer {access_token}'})
        
        # Should be accessible (200) or require additional data (400/404), but not forbidden
        assert response.status_code != 403


class TestPasswordSecurity:
    """Test password security features"""

    def test_change_password_success(self, auth_client, db):
        """Test successful password change"""
        password_data = {
            'current_password': 'TestPass123!',
            'new_password': 'NewSecurePass456!',
            'confirm_password': 'NewSecurePass456!'
        }
        
        response = auth_client.post('/api/v1/auth/change-password',
                                  data=json.dumps(password_data),
                                  content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

    def test_change_password_wrong_current(self, auth_client, db):
        """Test password change with wrong current password"""
        password_data = {
            'current_password': 'WrongPassword',
            'new_password': 'NewSecurePass456!',
            'confirm_password': 'NewSecurePass456!'
        }
        
        response = auth_client.post('/api/v1/auth/change-password',
                                  data=json.dumps(password_data),
                                  content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    def test_change_password_weak_new_password(self, auth_client, db):
        """Test password change with weak new password"""
        password_data = {
            'current_password': 'TestPass123!',
            'new_password': '123',  # Weak password
            'confirm_password': '123'
        }
        
        response = auth_client.post('/api/v1/auth/change-password',
                                  data=json.dumps(password_data),
                                  content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    def test_password_history_prevents_reuse(self, auth_client, db):
        """Test that password history prevents password reuse"""
        # Change password first time
        password_data = {
            'current_password': 'TestPass123!',
            'new_password': 'NewSecurePass456!',
            'confirm_password': 'NewSecurePass456!'
        }
        
        response = auth_client.post('/api/v1/auth/change-password',
                                  data=json.dumps(password_data),
                                  content_type='application/json')
        assert response.status_code == 200
        
        # Try to change back to original password
        revert_data = {
            'current_password': 'NewSecurePass456!',
            'new_password': 'TestPass123!',  # Original password
            'confirm_password': 'TestPass123!'
        }
        
        response = auth_client.post('/api/v1/auth/change-password',
                                  data=json.dumps(revert_data),
                                  content_type='application/json')
        
        # Should be rejected due to password history
        assert response.status_code == 400


class TestSessionManagement:
    """Test session management functionality"""

    def test_get_active_sessions(self, auth_client, db):
        """Test getting list of active sessions"""
        response = auth_client.get('/api/v1/auth/sessions')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'sessions' in data
        assert len(data['sessions']) >= 1  # At least current session

    def test_logout_all_sessions(self, auth_client, db):
        """Test logging out from all sessions"""
        response = auth_client.post('/api/v1/auth/logout-all')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        
        # Token should be invalidated
        me_response = auth_client.get('/api/v1/auth/me')
        assert me_response.status_code == 401

    def test_revoke_specific_session(self, client, db):
        """Test revoking a specific session"""
        # Create user and login twice to have multiple sessions
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }
        
        # First login
        response1 = client.post('/api/v1/auth/login',
                              data=json.dumps(login_data),
                              content_type='application/json')
        token1 = json.loads(response1.data)['access_token']
        
        # Second login
        response2 = client.post('/api/v1/auth/login',
                              data=json.dumps(login_data),
                              content_type='application/json')
        token2 = json.loads(response2.data)['access_token']
        
        # Get sessions with first token
        sessions_response = client.get('/api/v1/auth/sessions',
                                     headers={'Authorization': f'Bearer {token1}'})
        sessions_data = json.loads(sessions_response.data)
        
        # Find a session to revoke (not current one)
        session_to_revoke = None
        for session in sessions_data['sessions']:
            if not session['is_current']:
                session_to_revoke = session['id']
                break
        
        if session_to_revoke:
            # Revoke the session
            revoke_response = client.post(f'/api/v1/auth/revoke-session/{session_to_revoke}',
                                        headers={'Authorization': f'Bearer {token1}'})
            assert revoke_response.status_code == 200


class TestSecurityEventLogging:
    """Test security event logging and monitoring"""

    @patch('app.middleware.security_middleware.log_security_event')
    def test_failed_login_logs_security_event(self, mock_log_event, client, db):
        """Test that failed login attempts are logged"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        mock_log_event.assert_called()

    @patch('app.middleware.security_middleware.log_security_event')
    def test_successful_login_logs_security_event(self, mock_log_event, client, db):
        """Test that successful login is logged"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        mock_log_event.assert_called()


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_registration_rate_limiting(self, client, db):
        """Test rate limiting on registration endpoint"""
        user_data_template = {
            'username': 'testuser{}',
            'email': 'test{}@example.com',
            'password': 'SecurePass123!',
            'confirm_password': 'SecurePass123!'
        }
        
        # Make multiple registration attempts
        responses = []
        for i in range(7):  # Assuming limit is 5 per hour
            user_data = {
                'username': f'testuser{i}',
                'email': f'test{i}@example.com',
                'password': 'SecurePass123!',
                'confirm_password': 'SecurePass123!'
            }
            
            response = client.post('/api/v1/auth/register',
                                 data=json.dumps(user_data),
                                 content_type='application/json')
            responses.append(response)
        
        # Later requests should be rate limited
        assert any(r.status_code == 429 for r in responses[-2:])

    def test_login_rate_limiting(self, client, db):
        """Test rate limiting on login endpoint"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        }
        
        # Make multiple failed login attempts rapidly
        responses = []
        for i in range(12):  # Assuming burst limit is lower
            response = client.post('/api/v1/auth/login',
                                 data=json.dumps(login_data),
                                 content_type='application/json')
            responses.append(response)
        
        # Should hit rate limit
        assert any(r.status_code == 429 for r in responses[-3:])


class TestPasswordResetWorkflow:
    """Test password reset functionality"""

    def test_request_password_reset(self, client, db):
        """Test password reset request"""
        # Create test user
        user = User(username='testuser', email='test@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        reset_data = {
            'email': 'test@example.com'
        }
        
        response = client.post('/api/v1/auth/request-password-reset',
                             data=json.dumps(reset_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

    def test_request_password_reset_nonexistent_email(self, client, db):
        """Test password reset request for non-existent email"""
        reset_data = {
            'email': 'nonexistent@example.com'
        }
        
        response = client.post('/api/v1/auth/request-password-reset',
                             data=json.dumps(reset_data),
                             content_type='application/json')
        
        # Should still return success to prevent email enumeration
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True


class TestAuthenticationIntegrationWorkflow:
    """Test complete authentication workflows"""

    def test_complete_user_lifecycle(self, client, db):
        """Test complete user lifecycle from registration to logout"""
        # 1. Register user
        register_data = {
            'username': 'lifecycleuser',
            'email': 'lifecycle@example.com',
            'password': 'SecurePass123!',
            'confirm_password': 'SecurePass123!',
            'role': 'student'
        }
        
        register_response = client.post('/api/v1/auth/register',
                                      data=json.dumps(register_data),
                                      content_type='application/json')
        assert register_response.status_code == 201
        
        # 2. Login
        login_data = {
            'email': 'lifecycle@example.com',
            'password': 'SecurePass123!'
        }
        
        login_response = client.post('/api/v1/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        assert login_response.status_code == 200
        
        login_data = json.loads(login_response.data)
        access_token = login_data['access_token']
        
        # 3. Access protected resource
        me_response = client.get('/api/v1/auth/me',
                               headers={'Authorization': f'Bearer {access_token}'})
        assert me_response.status_code == 200
        
        # 4. Change password
        password_change_data = {
            'current_password': 'SecurePass123!',
            'new_password': 'NewSecurePass456!',
            'confirm_password': 'NewSecurePass456!'
        }
        
        change_response = client.post('/api/v1/auth/change-password',
                                    data=json.dumps(password_change_data),
                                    content_type='application/json',
                                    headers={'Authorization': f'Bearer {access_token}'})
        assert change_response.status_code == 200
        
        # 5. Logout
        logout_response = client.post('/api/v1/auth/logout',
                                    headers={'Authorization': f'Bearer {access_token}'})
        assert logout_response.status_code == 200
        
        # 6. Verify token is invalidated
        me_response_after_logout = client.get('/api/v1/auth/me',
                                            headers={'Authorization': f'Bearer {access_token}'})
        assert me_response_after_logout.status_code == 401

    def test_multi_session_management(self, client, db):
        """Test managing multiple concurrent sessions"""
        # Create test user
        user = User(username='multisession', email='multi@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'multi@example.com',
            'password': 'SecurePass123!'
        }
        
        # Create multiple sessions
        tokens = []
        for i in range(3):
            response = client.post('/api/v1/auth/login',
                                 data=json.dumps(login_data),
                                 content_type='application/json')
            assert response.status_code == 200
            token_data = json.loads(response.data)
            tokens.append(token_data['access_token'])
        
        # Verify all sessions are active
        for token in tokens:
            response = client.get('/api/v1/auth/me',
                                headers={'Authorization': f'Bearer {token}'})
            assert response.status_code == 200
        
        # Logout from all sessions using first token
        logout_all_response = client.post('/api/v1/auth/logout-all',
                                        headers={'Authorization': f'Bearer {tokens[0]}'})
        assert logout_all_response.status_code == 200
        
        # Verify all tokens are invalidated
        for token in tokens:
            response = client.get('/api/v1/auth/me',
                                headers={'Authorization': f'Bearer {token}'})
            assert response.status_code == 401


class TestAuthenticationErrorHandling:
    """Test error handling in authentication system"""

    def test_malformed_json_request(self, client, db):
        """Test handling of malformed JSON in requests"""
        response = client.post('/api/v1/auth/login',
                             data='{"invalid": json}',
                             content_type='application/json')
        
        assert response.status_code == 400

    def test_missing_required_fields(self, client, db):
        """Test handling of missing required fields"""
        incomplete_data = {
            'email': 'test@example.com'
            # Missing password
        }
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(incomplete_data),
                             content_type='application/json')
        
        assert response.status_code == 400

    def test_invalid_email_format(self, client, db):
        """Test handling of invalid email format"""
        invalid_data = {
            'username': 'testuser',
            'email': 'invalid-email',
            'password': 'SecurePass123!',
            'confirm_password': 'SecurePass123!'
        }
        
        response = client.post('/api/v1/auth/register',
                             data=json.dumps(invalid_data),
                             content_type='application/json')
        
        assert response.status_code == 400


class TestAuthenticationPerformance:
    """Test authentication system performance"""

    def test_login_performance(self, client, db):
        """Test login endpoint performance"""
        # Create test user
        user = User(username='perftest', email='perf@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'perf@example.com',
            'password': 'SecurePass123!'
        }
        
        import time
        start_time = time.time()
        
        response = client.post('/api/v1/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 2.0  # Should complete within 2 seconds

    def test_token_validation_performance(self, auth_client, db):
        """Test token validation performance"""
        import time
        start_time = time.time()
        
        response = auth_client.get('/api/v1/auth/me')
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 1.0  # Should complete within 1 second

    def test_concurrent_authentication_requests(self, client, db):
        """Test handling of concurrent authentication requests"""
        import threading
        import time
        
        # Create test user
        user = User(username='concurrent', email='concurrent@example.com', role='student')
        user.set_password_hash('SecurePass123!')
        db.session.add(user)
        db.session.commit()
        
        login_data = {
            'email': 'concurrent@example.com',
            'password': 'SecurePass123!'
        }
        
        results = []
        
        def make_login_request():
            response = client.post('/api/v1/auth/login',
                                 data=json.dumps(login_data),
                                 content_type='application/json')
            results.append(response.status_code)
        
        # Create multiple threads for concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_login_request)
            threads.append(thread)
        
        # Start all threads
        start_time = time.time()
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All requests should succeed
        assert all(status == 200 for status in results)
        assert total_time < 5.0  # Should complete within 5 seconds