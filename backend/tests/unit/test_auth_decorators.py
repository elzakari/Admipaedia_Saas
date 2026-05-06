"""
Comprehensive unit tests for Authentication Decorators
Tests role-based access control and authentication decorators
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from flask import Flask, jsonify
from flask_jwt_extended import create_access_token
from app.utils.decorators import role_required
from app.models.user import User


class TestRoleRequiredDecorator:
    """Test cases for role_required decorator."""

    def test_role_required_single_role_authorized(self):
        """Test role_required decorator with single role - authorized."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock user with admin role
                        mock_user = Mock(spec=User)
                        mock_user.role = 'admin'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        result = admin_endpoint()
                        assert result == "Admin content"

    def test_role_required_single_role_unauthorized(self):
        """Test role_required decorator with single role - unauthorized."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock user with student role
                        mock_user = Mock(spec=User)
                        mock_user.role = 'student'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        with app.test_client():
                            response = admin_endpoint()
                            # Should return 403 response
                            assert hasattr(response, 'status_code') or response == ("Unauthorized access", 403)

    def test_role_required_multiple_roles_authorized(self):
        """Test role_required decorator with multiple roles - authorized."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin', 'teacher'])
        def staff_endpoint():
            return "Staff content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock user with teacher role
                        mock_user = Mock(spec=User)
                        mock_user.role = 'teacher'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        result = staff_endpoint()
                        assert result == "Staff content"

    def test_role_required_multiple_roles_unauthorized(self):
        """Test role_required decorator with multiple roles - unauthorized."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin', 'teacher'])
        def staff_endpoint():
            return "Staff content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock user with student role
                        mock_user = Mock(spec=User)
                        mock_user.role = 'student'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        with app.test_client():
                            response = staff_endpoint()
                            # Should return 403 response
                            assert hasattr(response, 'status_code') or "Unauthorized" in str(response)

    def test_role_required_user_not_found(self):
        """Test role_required decorator when user is not found."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock user not found
                        mock_query.get.return_value = None
                        mock_jwt.return_value = '999'
                        
                        with app.test_client():
                            response = admin_endpoint()
                            # Should return 404 response
                            assert hasattr(response, 'status_code') or "not found" in str(response).lower()

    def test_role_required_jwt_verification_fails(self):
        """Test role_required decorator when JWT verification fails."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request') as mock_verify:
                mock_verify.side_effect = Exception("Invalid token")
                
                with pytest.raises(Exception):
                    admin_endpoint()

    def test_role_required_preserves_function_metadata(self):
        """Test that role_required decorator preserves function metadata."""
        @role_required(['admin'])
        def test_function():
            """Test function docstring."""
            return "test"
        
        assert test_function.__name__ == 'test_function'
        assert test_function.__doc__ == "Test function docstring."

    def test_role_required_with_args_and_kwargs(self):
        """Test role_required decorator with function arguments."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def endpoint_with_args(arg1, arg2, kwarg1=None):
            return f"Args: {arg1}, {arg2}, {kwarg1}"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock admin user
                        mock_user = Mock(spec=User)
                        mock_user.role = 'admin'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        result = endpoint_with_args('test1', 'test2', kwarg1='test3')
                        assert result == "Args: test1, test2, test3"

    def test_role_required_case_sensitivity(self):
        """Test role_required decorator role case sensitivity."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['Admin'])  # Capital A
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock user with lowercase admin role
                        mock_user = Mock(spec=User)
                        mock_user.role = 'admin'  # lowercase
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        with app.test_client():
                            response = admin_endpoint()
                            # Should be unauthorized due to case mismatch
                            assert hasattr(response, 'status_code') or "Unauthorized" in str(response)

    def test_role_required_empty_roles_list(self):
        """Test role_required decorator with empty roles list."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required([])
        def open_endpoint():
            return "Open content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock any user
                        mock_user = Mock(spec=User)
                        mock_user.role = 'student'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        with app.test_client():
                            response = open_endpoint()
                            # Should be unauthorized since no role matches empty list
                            assert hasattr(response, 'status_code') or "Unauthorized" in str(response)

    def test_role_required_invalid_user_id(self):
        """Test role_required decorator with invalid user ID."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock invalid user ID
                        mock_jwt.return_value = 'invalid_id'
                        mock_query.get.side_effect = ValueError("Invalid user ID")
                        
                        with pytest.raises(ValueError):
                            admin_endpoint()

    def test_role_required_database_error(self):
        """Test role_required decorator when database query fails."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock database error
                        mock_jwt.return_value = '1'
                        mock_query.get.side_effect = Exception("Database connection error")
                        
                        with pytest.raises(Exception):
                            admin_endpoint()

    def test_role_required_logging(self):
        """Test that role_required decorator logs security events."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        with patch('app.utils.decorators.logger') as mock_logger:
                            # Mock unauthorized user
                            mock_user = Mock(spec=User)
                            mock_user.role = 'student'
                            mock_query.get.return_value = mock_user
                            mock_jwt.return_value = '1'
                            
                            with app.test_client():
                                try:
                                    admin_endpoint()
                                except:
                                    pass
                                
                                # Verify logging was called
                                mock_logger.warning.assert_called()

    def test_role_required_with_flask_response(self):
        """Test role_required decorator with Flask response object."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def admin_endpoint():
            return jsonify({"message": "Admin content"})
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock admin user
                        mock_user = Mock(spec=User)
                        mock_user.role = 'admin'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        with app.app_context():
                            result = admin_endpoint()
                            assert result is not None

    def test_role_required_nested_decorators(self):
        """Test role_required decorator with other decorators."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        def custom_decorator(f):
            def wrapper(*args, **kwargs):
                return f"Custom: {f(*args, **kwargs)}"
            return wrapper
        
        @custom_decorator
        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock admin user
                        mock_user = Mock(spec=User)
                        mock_user.role = 'admin'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        result = admin_endpoint()
                        assert result == "Custom: Admin content"


class TestAuthenticationDecoratorIntegration:
    """Integration tests for authentication decorators."""

    def test_complete_authentication_flow(self):
        """Test complete authentication flow with role checking."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin', 'teacher'])
        def protected_endpoint():
            return {"message": "Protected content", "status": "success"}
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Test with admin user
                        admin_user = Mock(spec=User)
                        admin_user.role = 'admin'
                        mock_query.get.return_value = admin_user
                        mock_jwt.return_value = '1'
                        
                        result = protected_endpoint()
                        assert result["status"] == "success"
                        
                        # Test with teacher user
                        teacher_user = Mock(spec=User)
                        teacher_user.role = 'teacher'
                        mock_query.get.return_value = teacher_user
                        
                        result = protected_endpoint()
                        assert result["status"] == "success"
                        
                        # Test with unauthorized user
                        student_user = Mock(spec=User)
                        student_user.role = 'student'
                        mock_query.get.return_value = student_user
                        
                        with app.test_client():
                            response = protected_endpoint()
                            assert hasattr(response, 'status_code') or "Unauthorized" in str(response)

    def test_role_hierarchy_simulation(self):
        """Test simulated role hierarchy with decorators."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        # Simulate different access levels
        @role_required(['admin'])
        def admin_only():
            return "Admin only"
        
        @role_required(['admin', 'teacher'])
        def staff_only():
            return "Staff only"
        
        @role_required(['admin', 'teacher', 'student'])
        def authenticated_only():
            return "Authenticated only"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        mock_jwt.return_value = '1'
                        
                        # Test admin access
                        admin_user = Mock(spec=User)
                        admin_user.role = 'admin'
                        mock_query.get.return_value = admin_user
                        
                        assert admin_only() == "Admin only"
                        assert staff_only() == "Staff only"
                        assert authenticated_only() == "Authenticated only"
                        
                        # Test teacher access
                        teacher_user = Mock(spec=User)
                        teacher_user.role = 'teacher'
                        mock_query.get.return_value = teacher_user
                        
                        with app.test_client():
                            # Should fail admin only
                            admin_response = admin_only()
                            assert hasattr(admin_response, 'status_code') or "Unauthorized" in str(admin_response)
                            
                            # Should pass staff and authenticated
                            assert staff_only() == "Staff only"
                            assert authenticated_only() == "Authenticated only"

    def test_decorator_performance(self):
        """Test decorator performance with multiple calls."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def performance_endpoint():
            return "Performance test"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Mock admin user
                        mock_user = Mock(spec=User)
                        mock_user.role = 'admin'
                        mock_query.get.return_value = mock_user
                        mock_jwt.return_value = '1'
                        
                        # Call multiple times to test performance
                        for _ in range(100):
                            result = performance_endpoint()
                            assert result == "Performance test"
                        
                        # Verify query was called for each request
                        assert mock_query.get.call_count == 100

    def test_concurrent_decorator_usage(self):
        """Test decorator behavior with concurrent-like usage."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        @role_required(['admin'])
        def endpoint1():
            return "Endpoint 1"
        
        @role_required(['teacher'])
        def endpoint2():
            return "Endpoint 2"
        
        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                    with patch('app.models.user.User.query') as mock_query:
                        # Test with admin user
                        admin_user = Mock(spec=User)
                        admin_user.role = 'admin'
                        mock_query.get.return_value = admin_user
                        mock_jwt.return_value = '1'
                        
                        assert endpoint1() == "Endpoint 1"
                        
                        with app.test_client():
                            response = endpoint2()
                            assert hasattr(response, 'status_code') or "Unauthorized" in str(response)
                        
                        # Test with teacher user
                        teacher_user = Mock(spec=User)
                        teacher_user.role = 'teacher'
                        mock_query.get.return_value = teacher_user
                        
                        with app.test_client():
                            response = endpoint1()
                            assert hasattr(response, 'status_code') or "Unauthorized" in str(response)
                        
                        assert endpoint2() == "Endpoint 2"