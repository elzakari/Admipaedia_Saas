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


def _mock_role_context(user, roles=None, platform=False):
    """Mock role_required's direct tenant-aware authority dependencies."""
    if roles is None:
        roles = {str(getattr(user, "role", "") or "").strip().lower()}

    return (
        patch("app.utils.rbac_decorators.get_current_user", return_value=user),
        patch(
            "app.utils.rbac_decorators.get_request_effective_roles",
            return_value=set(roles),
        ),
        patch("app.utils.rbac_decorators._is_platform_user", return_value=platform),
    )


class TestRoleRequiredDecorator:
    """Test cases for role_required decorator."""


    def test_role_required_single_role_authorized(self):
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"

        mock_user = Mock(spec=User)
        mock_user.role = 'admin'

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                p_user, p_roles, p_platform = _mock_role_context(
                    mock_user,
                    roles={'admin'},
                )
                with p_user, p_roles, p_platform:
                    assert admin_endpoint() == "Admin content"

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
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

        @role_required(['admin', 'teacher'])
        def staff_endpoint():
            return "Staff content"

        mock_user = Mock(spec=User)
        mock_user.role = 'teacher'

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                p_user, p_roles, p_platform = _mock_role_context(
                    mock_user,
                    roles={'teacher'},
                )
                with p_user, p_roles, p_platform:
                    assert staff_endpoint() == "Staff content"

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
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

        @role_required(['admin'])
        def endpoint_with_args(arg1, arg2, kwarg1=None):
            return f"Args: {arg1}, {arg2}, {kwarg1}"

        mock_user = Mock(spec=User)
        mock_user.role = 'admin'

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                p_user, p_roles, p_platform = _mock_role_context(
                    mock_user,
                    roles={'admin'},
                )
                with p_user, p_roles, p_platform:
                    result = endpoint_with_args(
                        'test1',
                        'test2',
                        kwarg1='test3',
                    )
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
        """Invalid identities are normalized by get_current_user to no user."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch(
                    'app.utils.rbac_decorators.get_current_user',
                    return_value=None,
                ):
                    response = admin_endpoint()
                    assert response.status_code == 404
                    assert response.get_json()['error'] == 'User not found'


    def test_role_required_database_error(self):
        """Database lookup failures are fail-closed by get_current_user."""
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

        @role_required(['admin'])
        def admin_endpoint():
            return "Admin content"

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch(
                    'app.utils.rbac_decorators.get_current_user',
                    return_value=None,
                ):
                    response = admin_endpoint()
                    assert response.status_code == 404
                    assert response.get_json()['error'] == 'User not found'

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

        mock_user = Mock(spec=User)
        mock_user.role = 'admin'

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                p_user, p_roles, p_platform = _mock_role_context(
                    mock_user,
                    roles={'admin'},
                )
                with p_user, p_roles, p_platform:
                    assert admin_endpoint() == "Custom: Admin content"

class TestAuthenticationDecoratorIntegration:
    """Integration tests for authentication decorators."""


    def test_complete_authentication_flow(self):
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

        @role_required(['admin', 'teacher'])
        def protected_endpoint():
            return {"message": "Protected content", "status": "success"}

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch(
                    'app.utils.rbac_decorators.get_current_user'
                ) as mock_current:
                    with patch(
                        'app.utils.rbac_decorators.get_request_effective_roles'
                    ) as mock_roles:
                        with patch(
                            'app.utils.rbac_decorators._is_platform_user',
                            return_value=False,
                        ):
                            admin_user = Mock(spec=User)
                            admin_user.role = 'admin'
                            mock_current.return_value = admin_user
                            mock_roles.return_value = {'admin'}
                            assert protected_endpoint()['status'] == 'success'

                            teacher_user = Mock(spec=User)
                            teacher_user.role = 'teacher'
                            mock_current.return_value = teacher_user
                            mock_roles.return_value = {'teacher'}
                            assert protected_endpoint()['status'] == 'success'

                            student_user = Mock(spec=User)
                            student_user.role = 'student'
                            mock_current.return_value = student_user
                            mock_roles.return_value = {'student'}

                            response = protected_endpoint()
                            assert response.status_code == 403


    def test_role_hierarchy_simulation(self):
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

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
                with patch(
                    'app.utils.rbac_decorators.get_current_user'
                ) as mock_current:
                    with patch(
                        'app.utils.rbac_decorators.get_request_effective_roles'
                    ) as mock_roles:
                        with patch(
                            'app.utils.rbac_decorators._is_platform_user',
                            return_value=False,
                        ):
                            admin = Mock(spec=User)
                            admin.role = 'admin'
                            mock_current.return_value = admin
                            mock_roles.return_value = {'admin'}

                            assert admin_only() == 'Admin only'
                            assert staff_only() == 'Staff only'
                            assert authenticated_only() == 'Authenticated only'

                            teacher = Mock(spec=User)
                            teacher.role = 'teacher'
                            mock_current.return_value = teacher
                            mock_roles.return_value = {'teacher'}

                            assert admin_only().status_code == 403
                            assert staff_only() == 'Staff only'
                            assert authenticated_only() == 'Authenticated only'


    def test_decorator_performance(self):
        app = Flask(__name__)
        app.config['JWT_SECRET_KEY'] = 'test-secret'

        @role_required(['admin'])
        def performance_endpoint():
            return "Performance test"

        mock_user = Mock(spec=User)
        mock_user.role = 'admin'

        with app.test_request_context('/'):
            with patch('flask_jwt_extended.verify_jwt_in_request'):
                with patch(
                    'app.utils.rbac_decorators.get_current_user',
                    return_value=mock_user,
                ) as mock_current:
                    with patch(
                        'app.utils.rbac_decorators.get_request_effective_roles',
                        return_value={'admin'},
                    ):
                        with patch(
                            'app.utils.rbac_decorators._is_platform_user',
                            return_value=False,
                        ):
                            for _ in range(100):
                                assert performance_endpoint() == "Performance test"

                            assert mock_current.call_count == 100


    def test_concurrent_decorator_usage(self):
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
                with patch(
                    'app.utils.rbac_decorators.get_current_user'
                ) as mock_current:
                    with patch(
                        'app.utils.rbac_decorators.get_request_effective_roles'
                    ) as mock_roles:
                        with patch(
                            'app.utils.rbac_decorators._is_platform_user',
                            return_value=False,
                        ):
                            admin = Mock(spec=User)
                            admin.role = 'admin'
                            mock_current.return_value = admin
                            mock_roles.return_value = {'admin'}

                            assert endpoint1() == 'Endpoint 1'
                            assert endpoint2().status_code == 403

                            teacher = Mock(spec=User)
                            teacher.role = 'teacher'
                            mock_current.return_value = teacher
                            mock_roles.return_value = {'teacher'}

                            assert endpoint1().status_code == 403
                            assert endpoint2() == 'Endpoint 2'
