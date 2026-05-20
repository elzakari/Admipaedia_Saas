"""
Comprehensive unit tests for Password Security utilities
Tests password validation, breach checking, and account security features
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from app.utils.password_security import PasswordSecurity, AccountSecurity
from app.models.security import LoginAttempt
from app.extensions import db


class TestPasswordSecurity:
    """Test cases for PasswordSecurity class."""

    def test_validate_password_strength_valid_password(self):
        """Test password validation with a strong password."""
        password = "SecureP@ssw0rd123"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is True
        assert len(errors) == 0

    def test_validate_password_strength_too_short(self):
        """Test password validation with too short password."""
        password = "Short1!"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("at least 8 characters" in error for error in errors)

    def test_validate_password_strength_too_long(self):
        """Test password validation with too long password."""
        password = "A" * 130 + "1!"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("must not exceed 128 characters" in error for error in errors)

    def test_validate_password_strength_missing_uppercase(self):
        """Test password validation missing uppercase letter."""
        password = "lowercase123!"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("uppercase letter" in error for error in errors)

    def test_validate_password_strength_missing_lowercase(self):
        """Test password validation missing lowercase letter."""
        password = "UPPERCASE123!"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("lowercase letter" in error for error in errors)

    def test_validate_password_strength_missing_digits(self):
        """Test password validation missing digits."""
        password = "NoDigitsHere!"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("digit" in error for error in errors)

    def test_validate_password_strength_missing_special(self):
        """Test password validation missing special characters."""
        password = "NoSpecialChars123"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("special character" in error for error in errors)

    def test_validate_password_strength_common_password(self):
        """Test password validation with common password."""
        password = "password123"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("too common" in error for error in errors)

    def test_validate_password_strength_similar_to_username(self):
        """Test password validation similar to username."""
        password = "testuser123!"
        username = "testuser"
        is_valid, errors = PasswordSecurity.validate_password_strength(
            password, username=username
        )
        
        assert is_valid is False
        assert any("similar to username" in error for error in errors)

    def test_validate_password_strength_similar_to_email(self):
        """Test password validation similar to email."""
        password = "testuser123!"
        email = "testuser@example.com"
        is_valid, errors = PasswordSecurity.validate_password_strength(
            password, email=email
        )
        
        assert is_valid is False
        assert any("similar to email" in error for error in errors)

    def test_validate_password_strength_repeated_chars(self):
        """Test password validation with repeated characters."""
        password = "Aaaaaaa1!"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("repeated characters" in error for error in errors)

    def test_validate_password_strength_sequential_chars(self):
        """Test password validation with sequential characters."""
        password = "Abc123456!"
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        
        assert is_valid is False
        assert any("sequential characters" in error for error in errors)

    def test_is_similar_true(self):
        """Test similarity check returns True for similar strings."""
        result = PasswordSecurity._is_similar("testuser123", "testuser")
        assert result is True

    def test_is_similar_false(self):
        """Test similarity check returns False for different strings."""
        result = PasswordSecurity._is_similar("CompletelyDifferent123", "testuser")
        assert result is False

    def test_has_repeated_chars_true(self):
        """Test repeated characters detection returns True."""
        result = PasswordSecurity._has_repeated_chars("Aaaaaaa123")
        assert result is True

    def test_has_repeated_chars_false(self):
        """Test repeated characters detection returns False."""
        result = PasswordSecurity._has_repeated_chars("SecureP@ssw0rd")
        assert result is False

    def test_is_sequential_true(self):
        """Test sequential characters detection returns True."""
        result = PasswordSecurity._is_sequential("abc123456")
        assert result is True

    def test_is_sequential_false(self):
        """Test sequential characters detection returns False."""
        result = PasswordSecurity._is_sequential("SecureP@ssw0rd")
        assert result is False

    def test_generate_secure_password(self):
        """Test secure password generation."""
        password = PasswordSecurity.generate_secure_password(length=12)
        
        assert len(password) == 12
        # Test that generated password passes validation
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        assert is_valid is True

    def test_generate_secure_password_custom_length(self):
        """Test secure password generation with custom length."""
        password = PasswordSecurity.generate_secure_password(length=16)
        
        assert len(password) == 16
        is_valid, errors = PasswordSecurity.validate_password_strength(password)
        assert is_valid is True

    @patch('requests.get')
    def test_check_password_breach_found(self, mock_get):
        """Test password breach check when password is found."""
        # Mock response for breached password
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "A94A8FE5CCB19BA61C4C0873D391E987982FBBD3:3\nB1B3773A05C0ED0176787A4F1574FF0075F7521E:1"
        mock_get.return_value = mock_response
        
        # Test with password that hashes to the first entry
        result = PasswordSecurity.check_password_breach("test")
        
        assert result is True

    @patch('requests.get')
    def test_check_password_breach_not_found(self, mock_get):
        """Test password breach check when password is not found."""
        # Mock response without our password hash
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "DIFFERENT_HASH:3\nANOTHER_HASH:1"
        mock_get.return_value = mock_response
        
        result = PasswordSecurity.check_password_breach("uniquepassword123")
        
        assert result is False

    @patch('requests.get')
    def test_check_password_breach_api_error(self, mock_get):
        """Test password breach check when API returns error."""
        mock_get.side_effect = Exception("API Error")
        
        result = PasswordSecurity.check_password_breach("testpassword")
        
        assert result is False  # Should not block user on API error

    def test_calculate_entropy(self):
        """Test password entropy calculation."""
        entropy = PasswordSecurity.calculate_entropy("SecureP@ssw0rd123")
        
        assert entropy > 50  # Should have reasonable entropy
        assert isinstance(entropy, float)

    def test_calculate_entropy_weak_password(self):
        """Test entropy calculation for weak password."""
        entropy = PasswordSecurity.calculate_entropy("password")
        
        assert entropy < 30  # Weak password should have low entropy

    @patch('app.models.user.User')
    @patch('app.models.security.PasswordHistory')
    @patch('app.extensions.bcrypt')
    def test_is_password_reused_match_current(self, mock_bcrypt, mock_history_cls, mock_user_cls):
        """Test is_password_reused when new password matches the current password."""
        mock_user = MagicMock()
        mock_user.password_hash = "hashed_current"
        mock_user_cls.query.get.return_value = mock_user

        mock_bcrypt.check_password_hash.side_effect = lambda h, p: h == "hashed_current" and p == "new_password"

        mock_history_cls.query.filter_by.return_value.order_by.return_value.limit.return_value.all.return_value = []

        result = PasswordSecurity.is_password_reused(1, "new_password")
        assert result is True
        mock_bcrypt.check_password_hash.assert_called_with("hashed_current", "new_password")

    @patch('app.models.user.User')
    @patch('app.models.security.PasswordHistory')
    @patch('app.extensions.bcrypt')
    def test_is_password_reused_match_history(self, mock_bcrypt, mock_history_cls, mock_user_cls):
        """Test is_password_reused when new password matches a past password from history."""
        mock_user = MagicMock()
        mock_user.password_hash = "hashed_current"
        mock_user_cls.query.get.return_value = mock_user

        past1 = MagicMock()
        past1.password_hash = "hashed_past1"
        past2 = MagicMock()
        past2.password_hash = "hashed_past2"
        mock_history_cls.query.filter_by.return_value.order_by.return_value.limit.return_value.all.return_value = [past1, past2]

        mock_bcrypt.check_password_hash.side_effect = lambda h, p: h == "hashed_past2" and p == "new_password"

        result = PasswordSecurity.is_password_reused(1, "new_password")
        assert result is True

    @patch('app.models.user.User')
    @patch('app.models.security.PasswordHistory')
    @patch('app.extensions.bcrypt')
    def test_is_password_reused_no_match(self, mock_bcrypt, mock_history_cls, mock_user_cls):
        """Test is_password_reused when new password does not match any current or past passwords."""
        mock_user = MagicMock()
        mock_user.password_hash = "hashed_current"
        mock_user_cls.query.get.return_value = mock_user

        past1 = MagicMock()
        past1.password_hash = "hashed_past1"
        mock_history_cls.query.filter_by.return_value.order_by.return_value.limit.return_value.all.return_value = [past1]

        mock_bcrypt.check_password_hash.return_value = False

        result = PasswordSecurity.is_password_reused(1, "new_password")
        assert result is False



class TestAccountSecurity:
    """Test cases for AccountSecurity class."""

    @patch('app.utils.password_security.db')
    @patch('app.models.user.LoginAttempt')
    def test_record_failed_login(self, mock_login_attempt, mock_db):
        """Test recording failed login attempt."""
        mock_attempt = Mock()
        mock_login_attempt.return_value = mock_attempt
        mock_login_attempt.query.filter.return_value.count.return_value = 3
        
        result = AccountSecurity.record_failed_login('test@example.com')
        
        assert result['failed_attempts'] == 3
        assert result['is_locked'] is False
        mock_db.session.add.assert_called_once_with(mock_attempt)
        mock_db.session.commit.assert_called_once()

    @patch('app.utils.password_security.db')
    @patch('app.models.user.LoginAttempt')
    def test_record_failed_login_lockout(self, mock_login_attempt, mock_db):
        """Test recording failed login that triggers lockout."""
        mock_attempt = Mock()
        mock_login_attempt.return_value = mock_attempt
        mock_login_attempt.query.filter.return_value.count.return_value = 5
        
        result = AccountSecurity.record_failed_login('test@example.com')
        
        assert result['failed_attempts'] == 5
        assert result['is_locked'] is True
        assert result['retry_after'] > 0

    @patch('app.utils.password_security.db')
    @patch('app.models.user.LoginAttempt')
    def test_record_successful_login(self, mock_login_attempt, mock_db):
        """Test recording successful login attempt."""
        mock_attempt = Mock()
        mock_login_attempt.return_value = mock_attempt
        
        AccountSecurity.record_successful_login('test@example.com')
        
        mock_db.session.add.assert_called_once_with(mock_attempt)
        mock_db.session.commit.assert_called_once()

    @patch('app.models.user.LoginAttempt')
    def test_is_account_locked_true(self, mock_login_attempt):
        """Test account lockout check when account is locked."""
        # Mock failed attempts
        mock_attempts = [Mock() for _ in range(5)]
        mock_attempts[0].attempted_at = datetime.utcnow() - timedelta(minutes=5)
        
        mock_login_attempt.query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_attempts
        mock_login_attempt.query.filter.return_value.first.return_value = None
        
        is_locked, seconds_left = AccountSecurity.is_account_locked('test@example.com')
        
        assert is_locked is True
        assert seconds_left > 0

    @patch('app.models.user.LoginAttempt')
    def test_is_account_locked_false(self, mock_login_attempt):
        """Test account lockout check when account is not locked."""
        # Mock fewer than max failed attempts
        mock_attempts = [Mock() for _ in range(2)]
        
        mock_login_attempt.query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_attempts
        
        is_locked, seconds_left = AccountSecurity.is_account_locked('test@example.com')
        
        assert is_locked is False
        assert seconds_left == 0

    @patch('app.models.user.LoginAttempt')
    def test_is_account_locked_successful_login_after_failures(self, mock_login_attempt):
        """Test account lockout when there's successful login after failures."""
        # Mock failed attempts
        mock_attempts = [Mock() for _ in range(5)]
        mock_attempts[0].attempted_at = datetime.utcnow() - timedelta(minutes=5)
        
        # Mock successful login after failures
        mock_success = Mock()
        mock_success.attempted_at = datetime.utcnow() - timedelta(minutes=2)
        
        mock_login_attempt.query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_attempts
        mock_login_attempt.query.filter.return_value.first.return_value = mock_success
        
        is_locked, seconds_left = AccountSecurity.is_account_locked('test@example.com')
        
        assert is_locked is False
        assert seconds_left == 0

    def test_clear_failed_attempts(self):
        """Test clearing failed login attempts."""
        with patch.object(AccountSecurity, 'record_successful_login') as mock_record:
            AccountSecurity.clear_failed_attempts('test@example.com')
            mock_record.assert_called_once_with('test@example.com')

    @patch('app.models.user.LoginAttempt')
    def test_get_lockout_info(self, mock_login_attempt):
        """Test getting lockout information."""
        mock_attempts = [Mock() for _ in range(3)]
        mock_login_attempt.query.filter.return_value.count.return_value = 3
        
        info = AccountSecurity.get_lockout_info('test@example.com')
        
        assert info['failed_attempts'] == 3
        assert info['max_attempts'] == PasswordSecurity.MAX_FAILED_ATTEMPTS
        assert info['remaining_attempts'] == 2

    def test_password_strength_requirements(self):
        """Test getting password strength requirements."""
        requirements = PasswordSecurity.get_password_requirements()
        
        assert 'min_length' in requirements
        assert 'max_length' in requirements
        assert 'require_uppercase' in requirements
        assert 'require_lowercase' in requirements
        assert 'require_digits' in requirements
        assert 'require_special' in requirements
        assert 'special_chars' in requirements

    def test_password_strength_score(self):
        """Test password strength scoring."""
        weak_password = "password"
        medium_password = "Password123"
        strong_password = "SecureP@ssw0rd123"
        
        weak_score = PasswordSecurity.get_password_strength_score(weak_password)
        medium_score = PasswordSecurity.get_password_strength_score(medium_password)
        strong_score = PasswordSecurity.get_password_strength_score(strong_password)
        
        assert weak_score < medium_score < strong_score
        assert 0 <= weak_score <= 100
        assert 0 <= medium_score <= 100
        assert 0 <= strong_score <= 100


class TestPasswordSecurityIntegration:
    """Integration tests for password security functionality."""

    def test_complete_password_validation_workflow(self):
        """Test complete password validation workflow."""
        # Test various password scenarios
        test_cases = [
            ("SecureP@ssw0rd123", True, "Strong password should pass"),
            ("weak", False, "Weak password should fail"),
            ("password123", False, "Common password should fail"),
            ("NoSpecialChars123", False, "Missing special chars should fail"),
            ("no-uppercase-123!", False, "Missing uppercase should fail"),
            ("NO-LOWERCASE-123!", False, "Missing lowercase should fail"),
            ("NoDigitsHere!", False, "Missing digits should fail"),
        ]
        
        for password, expected_valid, description in test_cases:
            is_valid, errors = PasswordSecurity.validate_password_strength(password)
            assert is_valid == expected_valid, f"{description}: {errors}"

    @patch('app.utils.password_security.db')
    @patch('app.models.user.LoginAttempt')
    def test_account_lockout_workflow(self, mock_login_attempt, mock_db):
        """Test complete account lockout workflow."""
        identifier = 'lockout@example.com'
        
        # Simulate multiple failed attempts
        for i in range(4):
            mock_login_attempt.query.filter.return_value.count.return_value = i + 1
            result = AccountSecurity.record_failed_login(identifier)
            assert result['is_locked'] is False
        
        # Fifth attempt should trigger lockout
        mock_login_attempt.query.filter.return_value.count.return_value = 5
        result = AccountSecurity.record_failed_login(identifier)
        assert result['is_locked'] is True
        
        # Clear attempts
        AccountSecurity.clear_failed_attempts(identifier)

    def test_password_generation_and_validation(self):
        """Test that generated passwords pass validation."""
        for length in [8, 12, 16, 20]:
            password = PasswordSecurity.generate_secure_password(length=length)
            is_valid, errors = PasswordSecurity.validate_password_strength(password)
            
            assert len(password) == length
            assert is_valid is True, f"Generated password failed validation: {errors}"

    @patch('requests.get')
    def test_breach_check_integration(self, mock_get):
        """Test password breach checking integration."""
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "A94A8FE5CCB19BA61C4C0873D391E987982FBBD3:3"
        mock_get.return_value = mock_response
        
        # Test breach detection
        is_breached = PasswordSecurity.check_password_breach("test")
        assert isinstance(is_breached, bool)
        
        # Verify API was called correctly
        mock_get.assert_called_once()
        call_args = mock_get.call_args[0][0]
        assert "api.pwnedpasswords.com" in call_args