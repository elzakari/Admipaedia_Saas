"""
Comprehensive unit tests for User model
Tests user authentication, password management, and role-based functionality
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from app.models.user import User, Role
from app.models.security import LoginAttempt
from app.extensions import db


class TestUserModel:
    """Test cases for User model."""

    @pytest.fixture
    def user_data(self):
        """Fixture for user test data."""
        return {
            'username': 'testuser',
            'email': 'test@example.com',
            'role': 'student',
            'status': 'active'
        }

    def test_user_creation(self, app, user_data):
        """Test user creation."""
        with app.app_context():
            user = User(**user_data)
            db.session.add(user)
            db.session.commit()
            
            assert user.id is not None
            assert user.username == user_data['username']
            assert user.email == user_data['email']
            assert user.role == user_data['role']
            assert user.status == user_data['status']
            assert user.created_at is not None

    def test_user_representation(self, app, user_data):
        """Test user string representation."""
        with app.app_context():
            user = User(**user_data)
            expected = f"<User {user_data['username']}>"
            assert repr(user) == expected

    def test_set_password_hash(self, app, user_data):
        """Test setting password hash."""
        with app.app_context():
            user = User(**user_data)
            password = "testpassword123"
            
            user.set_password_hash(password)
            
            assert user.password_hash is not None
            assert user.password_hash != password  # Should be hashed
            assert len(user.password_hash) > 50  # Bcrypt hashes are long

    def test_check_password_hash_correct(self, app, user_data):
        """Test password verification with correct password."""
        with app.app_context():
            user = User(**user_data)
            password = "testpassword123"
            
            user.set_password_hash(password)
            
            assert user.check_password_hash(password) is True

    def test_check_password_hash_incorrect(self, app, user_data):
        """Test password verification with incorrect password."""
        with app.app_context():
            user = User(**user_data)
            correct_password = "testpassword123"
            wrong_password = "wrongpassword"
            
            user.set_password_hash(correct_password)
            
            assert user.check_password_hash(wrong_password) is False

    def test_user_roles_relationship(self, app, user_data):
        """Test user-roles many-to-many relationship."""
        with app.app_context():
            user = User(**user_data)
            role = Role(name='student', description='Student role')
            
            user.roles.append(role)
            db.session.add(user)
            db.session.add(role)
            db.session.commit()
            
            assert len(user.roles) == 1
            assert user.roles[0].name == 'student'
            assert user in role.users

    def test_has_role_true(self, app, user_data):
        """Test has_role method when user has the role."""
        with app.app_context():
            user = User(**user_data)
            role = Role(name='student', description='Student role')
            user.roles.append(role)
            
            assert user.has_role('student') is True

    def test_has_role_false(self, app, user_data):
        """Test has_role method when user doesn't have the role."""
        with app.app_context():
            user = User(**user_data)
            
            assert user.has_role('admin') is False

    def test_has_any_role_true(self, app, user_data):
        """Test has_any_role method when user has one of the roles."""
        with app.app_context():
            user = User(**user_data)
            student_role = Role(name='student', description='Student role')
            user.roles.append(student_role)
            
            assert user.has_any_role(['admin', 'student', 'teacher']) is True

    def test_has_any_role_false(self, app, user_data):
        """Test has_any_role method when user has none of the roles."""
        with app.app_context():
            user = User(**user_data)
            
            assert user.has_any_role(['admin', 'teacher']) is False

    def test_is_active_true(self, app, user_data):
        """Test is_active property when user is active."""
        with app.app_context():
            user_data['status'] = 'active'
            user = User(**user_data)
            
            assert user.is_active is True

    def test_is_active_false(self, app, user_data):
        """Test is_active property when user is inactive."""
        with app.app_context():
            user_data['status'] = 'inactive'
            user = User(**user_data)
            
            assert user.is_active is False

    def test_update_last_login(self, app, user_data):
        """Test updating last login timestamp."""
        with app.app_context():
            user = User(**user_data)
            original_last_login = user.last_login
            
            user.update_last_login()
            
            assert user.last_login != original_last_login
            assert user.last_login is not None
            assert isinstance(user.last_login, datetime)

    def test_get_full_name_with_profile(self, app, user_data):
        """Test getting full name when user has profile."""
        with app.app_context():
            user = User(**user_data)
            
            # Mock profile relationship
            mock_profile = Mock()
            mock_profile.first_name = 'John'
            mock_profile.last_name = 'Doe'
            user.__dict__['profile'] = mock_profile
            
            assert user.get_full_name() == 'John Doe'

    def test_get_full_name_without_profile(self, app, user_data):
        """Test getting full name when user has no profile."""
        with app.app_context():
            user = User(**user_data)
            user.profile = None
            
            assert user.get_full_name() == user_data['username']

    def test_to_dict(self, app, user_data):
        """Test converting user to dictionary."""
        with app.app_context():
            user = User(**user_data)
            user_dict = user.to_dict()
            
            assert user_dict['username'] == user_data['username']
            assert user_dict['email'] == user_data['email']
            assert user_dict['role'] == user_data['role']
            assert user_dict['status'] == user_data['status']
            assert 'password_hash' not in user_dict  # Should not include sensitive data
            assert 'created_at' in user_dict

    def test_to_dict_include_sensitive(self, app, user_data):
        """Test converting user to dictionary including sensitive data."""
        with app.app_context():
            user = User(**user_data)
            user.set_password_hash('testpassword')
            user_dict = user.to_dict(include_sensitive=True)
            
            assert 'password_hash' in user_dict

    @patch('app.models.user.User.query')
    def test_find_by_email_found(self, mock_query, user_data):
        """Test finding user by email when user exists."""
        mock_user = User(**user_data)
        mock_query.filter_by.return_value.first.return_value = mock_user
        
        result = User.find_by_email('test@example.com')
        
        assert result == mock_user
        mock_query.filter_by.assert_called_once_with(email='test@example.com')

    @patch('app.models.user.User.query')
    def test_find_by_email_not_found(self, mock_query):
        """Test finding user by email when user doesn't exist."""
        mock_query.filter_by.return_value.first.return_value = None
        
        result = User.find_by_email('nonexistent@example.com')
        
        assert result is None

    @patch('app.models.user.User.query')
    def test_find_by_username_found(self, mock_query, user_data):
        """Test finding user by username when user exists."""
        mock_user = User(**user_data)
        mock_query.filter_by.return_value.first.return_value = mock_user
        
        result = User.find_by_username('testuser')
        
        assert result == mock_user
        mock_query.filter_by.assert_called_once_with(username='testuser')


class TestRoleModel:
    """Test cases for Role model."""

    @pytest.fixture
    def role_data(self):
        """Fixture for role test data."""
        return {
            'name': 'student',
            'description': 'Student role with basic permissions'
        }

    def test_role_creation(self, app, role_data):
        """Test role creation."""
        with app.app_context():
            role = Role(**role_data)
            db.session.add(role)
            db.session.commit()
            
            assert role.id is not None
            assert role.name == role_data['name']
            assert role.description == role_data['description']

    def test_role_representation(self, app, role_data):
        """Test role string representation."""
        with app.app_context():
            role = Role(**role_data)
            expected = f"<Role {role_data['name']}>"
            assert repr(role) == expected

    @patch('app.models.user.Role.query')
    def test_find_by_name_found(self, mock_query, role_data):
        """Test finding role by name when role exists."""
        mock_role = Role(**role_data)
        mock_query.filter_by.return_value.first.return_value = mock_role
        
        result = Role.find_by_name('student')
        
        assert result == mock_role
        mock_query.filter_by.assert_called_once_with(name='student')

    @patch('app.models.user.Role.query')
    def test_find_by_name_not_found(self, mock_query):
        """Test finding role by name when role doesn't exist."""
        mock_query.filter_by.return_value.first.return_value = None
        
        result = Role.find_by_name('nonexistent')
        
        assert result is None


class TestLoginAttemptModel:
    """Test cases for LoginAttempt model."""

    @pytest.fixture
    def login_attempt_data(self):
        """Fixture for login attempt test data."""
        return {
            'identifier': 'test@example.com',
            'ip_address': '192.168.1.1',
            'success': True,
            'attempted_at': datetime.utcnow()
        }

    def test_login_attempt_creation(self, app, login_attempt_data):
        """Test login attempt creation."""
        with app.app_context():
            attempt = LoginAttempt(**login_attempt_data)
            db.session.add(attempt)
            db.session.commit()
            
            assert attempt.id is not None
            assert attempt.identifier == login_attempt_data['identifier']
            assert attempt.ip_address == login_attempt_data['ip_address']
            assert attempt.success == login_attempt_data['success']

    def test_login_attempt_representation(self, app, login_attempt_data):
        """Test login attempt string representation."""
        with app.app_context():
            attempt = LoginAttempt(**login_attempt_data)
            status = "Success" if attempt.success else "Failed"
            expected = f"<LoginAttempt {attempt.identifier} - {status}>"
            assert repr(attempt) == expected

    @patch('app.models.user.LoginAttempt.query')
    def test_get_recent_attempts(self, mock_query, login_attempt_data):
        """Test getting recent login attempts."""
        mock_attempts = [LoginAttempt(**login_attempt_data) for _ in range(3)]
        mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_attempts
        
        result = LoginAttempt.get_recent_attempts('test@example.com', minutes=30)
        
        assert len(result) == 3
        assert all(isinstance(attempt, LoginAttempt) for attempt in result)

    @patch('app.models.user.LoginAttempt.query')
    def test_count_failed_attempts(self, mock_query):
        """Test counting failed login attempts."""
        mock_query.filter.return_value.count.return_value = 5
        
        result = LoginAttempt.count_failed_attempts('test@example.com', minutes=30)
        
        assert result == 5

    @patch('app.models.user.LoginAttempt.query')
    def test_has_recent_success(self, mock_query, login_attempt_data):
        """Test checking for recent successful login."""
        successful_attempt = LoginAttempt(**{**login_attempt_data, 'success': True})
        mock_query.filter.return_value.first.return_value = successful_attempt
        
        result = LoginAttempt.has_recent_success('test@example.com', minutes=30)
        
        assert result is True

    @patch('app.models.user.LoginAttempt.query')
    def test_cleanup_old_attempts(self, mock_query):
        """Test cleanup of old login attempts."""
        mock_query.filter.return_value.delete.return_value = 10
        
        with patch('app.models.user.db') as mock_db:
            result = LoginAttempt.cleanup_old_attempts(days=30)
            
            assert result == 10
            mock_db.session.commit.assert_called_once()


class TestUserModelIntegration:
    """Integration tests for user model functionality."""

    def test_complete_user_lifecycle(self, app):
        """Test complete user lifecycle from creation to deletion."""
        with app.app_context():
            # Create user
            user = User(
                username='lifecycle_test',
                email='lifecycle@example.com',
                role='student',
                status='active'
            )
            user.set_password_hash('testpassword123')
            
            # Create role
            role = Role(name='student', description='Student role')
            user.roles.append(role)
            
            db.session.add(user)
            db.session.add(role)
            db.session.commit()
            
            # Verify user creation
            assert user.id is not None
            assert user.check_password_hash('testpassword123') is True
            assert user.has_role('student') is True
            
            # Update user
            user.update_last_login()
            assert user.last_login is not None
            
            # Test user methods
            user_dict = user.to_dict()
            assert user_dict['username'] == 'lifecycle_test'
            
            # Deactivate user
            user.status = 'inactive'
            assert user.is_active is False

    def test_user_authentication_workflow(self, app):
        """Test complete user authentication workflow."""
        with app.app_context():
            # Create user
            user = User(
                username='auth_test',
                email='auth@example.com',
                role='student'
            )
            password = 'SecureP@ssw0rd123'
            user.set_password_hash(password)
            
            db.session.add(user)
            db.session.commit()
            
            # Test authentication
            found_user = User.find_by_email('auth@example.com')
            assert found_user is not None
            assert found_user.check_password_hash(password) is True
            assert found_user.check_password_hash('wrongpassword') is False
            
            # Update login
            found_user.update_last_login()
            assert found_user.last_login is not None

    def test_role_based_access_control(self, app):
        """Test role-based access control functionality."""
        with app.app_context():
            # Create roles
            admin_role = Role(name='admin', description='Administrator')
            teacher_role = Role(name='teacher', description='Teacher')
            student_role = Role(name='student', description='Student')
            
            # Create user with multiple roles
            user = User(
                username='multi_role_user',
                email='multi@example.com'
            )
            user.roles.extend([teacher_role, student_role])
            
            db.session.add_all([admin_role, teacher_role, student_role, user])
            db.session.commit()
            
            # Test role checks
            assert user.has_role('teacher') is True
            assert user.has_role('student') is True
            assert user.has_role('admin') is False
            
            assert user.has_any_role(['admin', 'teacher']) is True
            assert user.has_any_role(['admin', 'parent']) is False

    def test_login_attempt_tracking(self, app):
        """Test login attempt tracking functionality."""
        with app.app_context():
            identifier = 'tracking@example.com'
            
            # Record failed attempts
            for i in range(3):
                attempt = LoginAttempt(
                    identifier=identifier,
                    ip_address='192.168.1.1',
                    success=False,
                    attempted_at=datetime.utcnow()
                )
                db.session.add(attempt)
            
            # Record successful attempt
            success_attempt = LoginAttempt(
                identifier=identifier,
                ip_address='192.168.1.1',
                success=True,
                attempted_at=datetime.utcnow()
            )
            db.session.add(success_attempt)
            db.session.commit()
            
            # Test queries
            recent_attempts = LoginAttempt.get_recent_attempts(identifier, minutes=30)
            assert len(recent_attempts) == 4
            
            failed_count = LoginAttempt.count_failed_attempts(identifier, minutes=30)
            assert failed_count == 3