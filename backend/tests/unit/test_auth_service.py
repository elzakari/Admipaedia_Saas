import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from app.services.auth_service import AuthService
from app.models.user import User, Role
from flask_jwt_extended import create_access_token

class TestAuthService:
    """Test cases for AuthService class."""

    @pytest.fixture
    def mock_user(self):
        """Create a mock user for testing."""
        user = Mock(spec=User)
        user.id = 1
        user.username = 'testuser'
        user.email = 'test@example.com'
        user.role = 'student'
        user.check_password_hash.return_value = True
        user.last_login = None
        return user

    @pytest.fixture
    def mock_role(self):
        """Create a mock role for testing."""
        role = Mock(spec=Role)
        role.name = 'student'
        return role

    @patch('app.services.auth_service.db')
    @patch('app.services.auth_service.User')
    def test_register_user_success(self, mock_user_class, mock_db, mock_role):
        """Test successful user registration."""
        # Setup mocks
        mock_user_class.query.filter_by.return_value.first.return_value = None
        mock_new_user = Mock()
        mock_new_user.id = 1
        mock_user_class.return_value = mock_new_user
        
        with patch('app.services.auth_service.Role') as mock_role_class:
            mock_role_class.query.filter_by.return_value.first.return_value = mock_role
            
            # Call the method
            result = AuthService.register_user(
                username='newuser',
                email='newuser@example.com',
                password='password123',
                roles=['student']
            )
            
            # Assertions
            assert result == mock_new_user
            mock_db.session.add.assert_called_once_with(mock_new_user)
            mock_db.session.commit.assert_called_once()

    @patch('app.services.auth_service.User')
    def test_register_user_email_exists(self, mock_user_class):
        """Test registration with existing email."""
        # Setup mock to return existing user
        existing_user = Mock()
        mock_user_class.query.filter_by.return_value.first.return_value = existing_user
        
        # Test that ValueError is raised
        with pytest.raises(ValueError, match="Email .* is already registered"):
            AuthService.register_user(
                username='newuser',
                email='existing@example.com',
                password='password123'
            )

    @patch('app.services.auth_service.User')
    def test_register_user_username_exists(self, mock_user_class):
        """Test registration with existing username."""
        # Setup mock to return None for email check, existing user for username check
        mock_user_class.query.filter_by.side_effect = [
            Mock(first=Mock(return_value=None)),  # Email check
            Mock(first=Mock(return_value=Mock()))  # Username check
        ]
        
        # Test that ValueError is raised
        with pytest.raises(ValueError, match="Username .* is already taken"):
            AuthService.register_user(
                username='existinguser',
                email='new@example.com',
                password='password123'
            )

    @patch('app.services.auth_service.create_access_token')
    @patch('app.services.auth_service.create_refresh_token')
    @patch('app.services.auth_service.db')
    @patch('app.services.auth_service.User')
    def test_authenticate_user_success(self, mock_user_class, mock_db, 
                                     mock_refresh_token, mock_access_token, mock_user):
        """Test successful user authentication."""
        # Setup mocks
        mock_user_class.query.filter_by.return_value.first.return_value = mock_user
        mock_access_token.return_value = 'mock-access-token'
        mock_refresh_token.return_value = 'mock-refresh-token'
        
        # Call the method
        result = AuthService.authenticate_user('test@example.com', 'password123')
        
        # Assertions
        assert result is not None
        assert result['user'] == mock_user
        assert result['access_token'] == 'mock-access-token'
        assert result['refresh_token'] == 'mock-refresh-token'
        
        # Verify password was checked
        mock_user.check_password_hash.assert_called_once_with('password123')
        
        # Verify last login was updated
        assert isinstance(mock_user.last_login, datetime)
        mock_db.session.commit.assert_called_once()

    @patch('app.services.auth_service.User')
    def test_authenticate_user_invalid_email(self, mock_user_class):
        """Test authentication with invalid email."""
        # Setup mock to return None (user not found)
        mock_user_class.query.filter_by.return_value.first.return_value = None
        
        # Call the method
        result = AuthService.authenticate_user('invalid@example.com', 'password123')
        
        # Assertions
        assert result is None

    @patch('app.services.auth_service.User')
    def test_authenticate_user_invalid_password(self, mock_user_class, mock_user):
        """Test authentication with invalid password."""
        # Setup mocks
        mock_user.check_password_hash.return_value = False
        mock_user_class.query.filter_by.return_value.first.return_value = mock_user
        
        # Call the method
        result = AuthService.authenticate_user('test@example.com', 'wrongpassword')
        
        # Assertions
        assert result is None
        mock_user.check_password_hash.assert_called_once_with('wrongpassword')

    @patch('app.services.auth_service.request')
    @patch('app.services.auth_service.db')
    @patch('app.services.auth_service.LoginHistory')
    def test_record_login_attempt_success(self, mock_login_history, mock_db, mock_request):
        """Test recording successful login attempt."""
        # Setup mocks
        mock_request.remote_addr = '192.168.1.1'
        mock_request.headers.get.return_value = 'Mozilla/5.0'
        mock_login_entry = Mock()
        mock_login_history.return_value = mock_login_entry
        
        # Call the method
        AuthService.record_login_attempt(
            user_id=1,
            email='test@example.com',
            success=True,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0'
        )
        
        # Assertions
        mock_login_history.assert_called_once()
        mock_db.session.add.assert_called_once_with(mock_login_entry)
        mock_db.session.commit.assert_called_once()

    def test_get_portal_data_admin(self):
        """Test portal data for admin role."""
        result = AuthService.get_portal_data('admin')
        
        assert result['defaultRoute'] == '/admin/dashboard'
        assert 'users' in result['allowedPages']
        assert 'analytics' in result['allowedPages']

    def test_get_portal_data_teacher(self):
        """Test portal data for teacher role."""
        result = AuthService.get_portal_data('teacher')
        
        assert result['defaultRoute'] == '/teacher/dashboard'
        assert 'classes' in result['allowedPages']
        assert 'attendance' in result['allowedPages']

    def test_get_portal_data_student(self):
        """Test portal data for student role."""
        result = AuthService.get_portal_data('student')
        
        assert result['defaultRoute'] == '/student/dashboard'
        assert 'grades' in result['allowedPages']
        assert 'assignments' in result['allowedPages']

    def test_get_portal_data_parent(self):
        """Test portal data for parent role."""
        result = AuthService.get_portal_data('parent')
        
        assert result['defaultRoute'] == '/parent/dashboard'
        assert 'children' in result['allowedPages']
        assert 'reports' in result['allowedPages']

    def test_get_portal_data_default(self):
        """Test portal data for unknown role."""
        result = AuthService.get_portal_data('unknown')
        
        assert result['defaultRoute'] == '/dashboard'
        assert result['allowedPages'] == []

    @patch('app.services.auth_service.User')
    def test_get_user_by_id_success(self, mock_user_class, mock_user):
        """Test successful user retrieval by ID."""
        mock_user_class.query.get.return_value = mock_user
        
        result = AuthService.get_user_by_id(1)
        
        assert result == mock_user
        mock_user_class.query.get.assert_called_once_with(1)

    @patch('app.services.auth_service.User')
    def test_get_user_by_id_not_found(self, mock_user_class):
        """Test user retrieval by ID when user not found."""
        mock_user_class.query.get.return_value = None
        
        result = AuthService.get_user_by_id(999)
        
        assert result is None
        mock_user_class.query.get.assert_called_once_with(999)

    @patch('app.services.auth_service.request')
    def test_is_admin_creator_true(self, mock_request):
        """Test admin creator check returns True for admin request."""
        mock_request.headers.get.return_value = 'admin-secret-key'
        
        with patch.dict('os.environ', {'ADMIN_SECRET_KEY': 'admin-secret-key'}):
            result = AuthService.is_admin_creator(mock_request)
            assert result is True

    @patch('app.services.auth_service.request')
    def test_is_admin_creator_false(self, mock_request):
        """Test admin creator check returns False for non-admin request."""
        mock_request.headers.get.return_value = 'wrong-key'
        
        with patch.dict('os.environ', {'ADMIN_SECRET_KEY': 'admin-secret-key'}):
            result = AuthService.is_admin_creator(mock_request)
            assert result is False