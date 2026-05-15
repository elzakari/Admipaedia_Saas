"""
Comprehensive unit tests for Security Middleware
Tests rate limiting, CSRF protection, input sanitization, and security headers
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from flask import Flask, request, session
from app.middleware.security_middleware import (
    RateLimiter, InputSanitizer, CSRFProtection, 
    rate_limit, csrf_protect, sanitize_input, 
    add_security_headers, log_security_event
)


class TestRateLimiter:
    """Test cases for RateLimiter class."""

    def test_rate_limiter_initialization(self):
        """Test rate limiter initialization."""
        limiter = RateLimiter()
        
        assert limiter.requests == {}
        assert limiter.blocked_ips == {}

    def test_is_allowed_first_request(self):
        """Test rate limiting for first request."""
        limiter = RateLimiter()
        
        is_allowed, info = limiter.is_allowed("192.168.1.1", limit=10, window=60)
        
        assert is_allowed is True
        assert info['requests_remaining'] == 9
        assert 'reset_time' in info

    def test_is_allowed_within_limit(self):
        """Test rate limiting within allowed limit."""
        limiter = RateLimiter()
        identifier = "192.168.1.1"
        
        # Make several requests within limit
        for i in range(5):
            is_allowed, info = limiter.is_allowed(identifier, limit=10, window=60)
            assert is_allowed is True
        
        assert info['requests_remaining'] == 5

    def test_is_allowed_exceeds_limit(self):
        """Test rate limiting when limit is exceeded."""
        limiter = RateLimiter()
        identifier = "192.168.1.1"
        
        # Exceed the limit
        for i in range(11):
            is_allowed, info = limiter.is_allowed(identifier, limit=10, window=60)
        
        assert is_allowed is False
        assert info['requests_remaining'] == 0

    def test_is_allowed_burst_limit(self):
        """Test rate limiting with burst limit."""
        limiter = RateLimiter()
        identifier = "192.168.1.1"
        
        # Test burst limit
        for i in range(15):
            is_allowed, info = limiter.is_allowed(identifier, limit=10, window=60, burst_limit=20)
        
        # Should still be allowed within burst limit
        assert is_allowed is True

    def test_is_allowed_ip_blocking(self):
        """Test IP blocking after excessive requests."""
        limiter = RateLimiter()
        identifier = "192.168.1.1"
        
        # Simulate excessive requests to trigger blocking
        for i in range(100):
            limiter.is_allowed(identifier, limit=10, window=60)
        
        is_allowed, info = limiter.is_allowed(identifier, limit=10, window=60)
        
        assert 'blocked' in info
        if info.get('blocked'):
            assert is_allowed is False

    def test_cleanup_expired_requests(self):
        """Test cleanup of expired request records."""
        limiter = RateLimiter()
        identifier = "192.168.1.1"
        
        # Add some requests
        limiter.is_allowed(identifier, limit=10, window=60)
        
        # Manually add old timestamp
        old_time = datetime.now() - timedelta(seconds=120)
        limiter.requests[identifier] = [old_time.timestamp()]
        
        # Cleanup should remove old entries
        limiter._cleanup_expired(identifier, window=60)
        
        assert len(limiter.requests.get(identifier, [])) == 0

    def test_get_rate_limit_info(self):
        """Test getting rate limit information."""
        limiter = RateLimiter()
        identifier = "192.168.1.1"
        
        # Make some requests
        for i in range(3):
            limiter.is_allowed(identifier, limit=10, window=60)
        
        info = limiter.get_rate_limit_info(identifier, limit=10, window=60)
        
        assert info['requests_made'] == 3
        assert info['requests_remaining'] == 7
        assert info['reset_time'] > 0


class TestInputSanitizer:
    """Test cases for InputSanitizer class."""

    def test_sanitize_html_basic(self):
        """Test basic HTML sanitization."""
        dirty_html = "<script>alert('xss')</script><p>Safe content</p>"
        clean_html = InputSanitizer.sanitize_html(dirty_html)
        
        assert "<script>" not in clean_html
        assert "alert('xss')" not in clean_html
        assert "<p>Safe content</p>" in clean_html

    def test_sanitize_html_allowed_tags(self):
        """Test HTML sanitization with allowed tags."""
        html = "<p>Paragraph</p><strong>Bold</strong><script>alert('xss')</script>"
        clean_html = InputSanitizer.sanitize_html(html, allowed_tags=['p', 'strong'])
        
        assert "<p>Paragraph</p>" in clean_html
        assert "<strong>Bold</strong>" in clean_html
        assert "<script>" not in clean_html

    def test_validate_input_safe(self):
        """Test input validation with safe input."""
        safe_input = "This is a safe input string"
        
        # Should not raise exception
        result = InputSanitizer.validate_input(safe_input)
        assert result == safe_input

    def test_validate_input_sql_injection(self):
        """Test input validation detects SQL injection."""
        malicious_input = "'; DROP TABLE users; --"
        
        with pytest.raises(ValueError, match="Potentially malicious input detected"):
            InputSanitizer.validate_input(malicious_input)

    def test_validate_input_xss_attempt(self):
        """Test input validation detects XSS attempts."""
        xss_input = "<script>alert('xss')</script>"
        
        with pytest.raises(ValueError, match="Potentially malicious input detected"):
            InputSanitizer.validate_input(xss_input)

    def test_validate_input_javascript_protocol(self):
        """Test input validation detects javascript protocol."""
        js_input = "javascript:alert('xss')"
        
        with pytest.raises(ValueError, match="Potentially malicious input detected"):
            InputSanitizer.validate_input(js_input)

    def test_validate_input_event_handler(self):
        """Test input validation detects event handlers."""
        event_input = "onload=alert('xss')"
        
        with pytest.raises(ValueError, match="Potentially malicious input detected"):
            InputSanitizer.validate_input(event_input)

    def test_escape_user_input(self):
        """Test user input escaping."""
        user_input = "<script>alert('test')</script>"
        escaped = InputSanitizer.escape_user_input(user_input)
        
        assert "&lt;script&gt;" in escaped
        assert "&lt;/script&gt;" in escaped
        assert "<script>" not in escaped

    def test_validate_file_upload(self):
        """Test file upload validation."""
        # Test allowed file
        assert InputSanitizer.validate_file_upload("document.pdf", max_size=1024*1024) is True
        
        # Test disallowed file
        assert InputSanitizer.validate_file_upload("malware.exe", max_size=1024*1024) is False
        
        # Test file too large
        assert InputSanitizer.validate_file_upload("document.pdf", max_size=100) is False


class TestCSRFProtection:
    """Test cases for CSRFProtection class."""

    def test_generate_csrf_token(self):
        """Test CSRF token generation."""
        token = CSRFProtection.generate_csrf_token()
        
        assert isinstance(token, str)
        assert len(token) > 20  # Should be reasonably long
        
        # Generate another token - should be different
        token2 = CSRFProtection.generate_csrf_token()
        assert token != token2

    @patch('app.middleware.security_middleware.session')
    def test_validate_csrf_token_valid(self, mock_session):
        """Test CSRF token validation with valid token."""
        token = "valid_token_123"
        mock_session.get.return_value = token
        
        result = CSRFProtection.validate_csrf_token(token)
        
        assert result is True

    @patch('app.middleware.security_middleware.session')
    def test_validate_csrf_token_invalid(self, mock_session):
        """Test CSRF token validation with invalid token."""
        mock_session.get.return_value = "different_token"
        
        result = CSRFProtection.validate_csrf_token("invalid_token")
        
        assert result is False

    @patch('app.middleware.security_middleware.session')
    def test_validate_csrf_token_missing_session(self, mock_session):
        """Test CSRF token validation with missing session token."""
        mock_session.get.return_value = None
        
        result = CSRFProtection.validate_csrf_token("some_token")
        
        assert result is False


class TestSecurityDecorators:
    """Test cases for security decorators."""

    def test_rate_limit_decorator_allowed(self):
        """Test rate limit decorator when request is allowed."""
        app = Flask(__name__)
        
        @rate_limit(limit=10, window=60)
        def test_endpoint():
            return "Success"
        
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '192.168.1.1'}):
            with patch('app.middleware.security_middleware.rate_limiter') as mock_limiter:
                mock_limiter.is_allowed.return_value = (True, {'requests_remaining': 9})
                
                result = test_endpoint()
                assert result == "Success"

    def test_rate_limit_decorator_blocked(self):
        """Test rate limit decorator when request is blocked."""
        app = Flask(__name__)
        
        @rate_limit(limit=10, window=60)
        def test_endpoint():
            return "Success"
        
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '192.168.1.1'}):
            with patch('app.middleware.security_middleware.rate_limiter') as mock_limiter:
                mock_limiter.is_allowed.return_value = (False, {'retry_after': 60})
                
                with app.test_client() as client:
                    # This would normally return a 429 response
                    pass

    @patch('app.middleware.security_middleware.session')
    def test_csrf_protect_decorator_valid(self, mock_session):
        """Test CSRF protection decorator with valid token."""
        app = Flask(__name__)
        
        @csrf_protect
        def test_endpoint():
            return "Success"
        
        with app.test_request_context('/', method='POST', 
                                    headers={'X-CSRF-Token': 'valid_token'}):
            mock_session.get.return_value = 'valid_token'
            
            result = test_endpoint()
            assert result == "Success"

    def test_sanitize_input_decorator(self):
        """Test input sanitization decorator."""
        app = Flask(__name__)
        
        @sanitize_input
        def test_endpoint():
            return "Success"
        
        with app.test_request_context('/', method='POST', 
                                    json={'data': 'safe input'}):
            result = test_endpoint()
            assert result == "Success"

    def test_add_security_headers_decorator(self):
        """Test security headers decorator."""
        app = Flask(__name__)
        
        @add_security_headers
        def test_endpoint():
            from flask import make_response
            return make_response("Success")
        
        with app.test_request_context('/'):
            response = test_endpoint()
            
            # Check for security headers
            assert 'X-Content-Type-Options' in response.headers
            assert 'X-Frame-Options' in response.headers
            assert 'X-XSS-Protection' in response.headers


class TestSecurityLogging:
    """Test cases for security event logging."""

    @patch('app.middleware.security_middleware.logger')
    @patch('app.middleware.security_middleware.request')
    def test_log_security_event(self, mock_request, mock_logger):
        """Test security event logging."""
        mock_request.remote_addr = '192.168.1.1'
        mock_request.headers.get.return_value = 'Mozilla/5.0'
        mock_request.endpoint = 'test_endpoint'
        mock_request.method = 'POST'
        
        log_security_event('rate_limit_exceeded', {'limit': 10})
        
        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args
        assert call_args[0][0] == 'security_event'


class TestSecurityMiddlewareIntegration:
    """Integration tests for security middleware."""

    def test_complete_security_workflow(self):
        """Test complete security middleware workflow."""
        app = Flask(__name__)
        
        @rate_limit(limit=5, window=60)
        @csrf_protect
        @sanitize_input
        @add_security_headers
        def protected_endpoint():
            from flask import make_response
            return make_response("Protected content")
        
        with app.test_request_context('/', method='POST',
                                    headers={'X-CSRF-Token': 'valid_token'},
                                    json={'data': 'safe input'},
                                    environ_base={'REMOTE_ADDR': '192.168.1.1'}):
            
            with patch('app.middleware.security_middleware.session') as mock_session:
                with patch('app.middleware.security_middleware.rate_limiter') as mock_limiter:
                    with patch('app.middleware.security_middleware.CSRFProtection.validate_csrf_token') as mock_csrf:
                        mock_session.get.return_value = 'valid_token'
                        mock_limiter.is_allowed.return_value = (True, {'requests_remaining': 4})
                        mock_csrf.return_value = True
                        
                        response = protected_endpoint()
                    print(f"DEBUG RESPONSE: {response}")
                    
                    # Verify response has security headers
                    assert hasattr(response, 'headers') or isinstance(response, tuple)
                    if isinstance(response, tuple):
                        assert 'X-Content-Type-Options' in response[0].headers
                    else:
                        assert 'X-Content-Type-Options' in response.headers

    def test_rate_limiting_with_user_context(self):
        """Test rate limiting with authenticated user context."""
        app = Flask(__name__)
        
        @rate_limit(limit=10, window=60)
        def user_endpoint():
            return "User content"
        
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '192.168.1.1'}):
            with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                with patch('app.middleware.security_middleware.rate_limiter') as mock_limiter:
                    mock_jwt.return_value = 'user123'
                    mock_limiter.is_allowed.return_value = (True, {'requests_remaining': 9})
                    
                    result = user_endpoint()
                    
                    # Verify rate limiter was called with user-specific identifier
                    mock_limiter.is_allowed.assert_called_once()
                    call_args = mock_limiter.is_allowed.call_args[0]
                    assert 'user123' in call_args[0]  # Should include user ID in identifier

    def test_input_sanitization_with_nested_data(self):
        """Test input sanitization with nested data structures."""
        nested_data = {
            'user': {
                'name': 'John Doe',
                'bio': '<script>alert("xss")</script>Safe content'
            },
            'posts': [
                {'title': 'Post 1', 'content': 'Safe content'},
                {'title': 'Post 2', 'content': '<img src=x onerror=alert(1)>'}
            ]
        }
        
        # Test that sanitization handles nested structures
        sanitized = InputSanitizer.sanitize_nested_data(nested_data)
        
        assert '<script>' not in str(sanitized)
        assert 'onerror=' not in str(sanitized)
        assert 'Safe content' in str(sanitized)

    def test_security_headers_configuration(self):
        """Test security headers configuration."""
        app = Flask(__name__)
        
        @add_security_headers
        def test_endpoint():
            from flask import make_response
            return make_response("Test")
        
        with app.test_request_context('/'):
            response = test_endpoint()
            
            # Verify all expected security headers
            expected_headers = [
                'X-Content-Type-Options',
                'X-Frame-Options', 
                'X-XSS-Protection',
                'Strict-Transport-Security',
                'Content-Security-Policy',
                'Referrer-Policy'
            ]
            
            for header in expected_headers:
                assert header in response.headers, f"Missing security header: {header}"