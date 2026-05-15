"""
Comprehensive unit tests for Session Token model
Tests JWT token management, revocation, and session tracking
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from app.models.session_token import SessionToken
from app.extensions import db


class TestSessionToken:
    """Test cases for SessionToken model."""

    @pytest.fixture
    def token_data(self, app):
        """Fixture for session token test data."""
        with app.app_context():
            from app.models.user import User
            from app.extensions import db, bcrypt
            import uuid
            
            user_email = f"token_{uuid.uuid4().hex[:8]}@example.com"
            user = User(username=f"token_{uuid.uuid4().hex[:8]}", email=user_email, role='user')
            user.password_hash = bcrypt.generate_password_hash('Password123!').decode('utf-8')
            db.session.add(user)
            db.session.commit()
            
            return {
                'jti': 'test-jwt-id-123',
                'user_id': user.id,
                'token_type': 'access',
                'ip_address': '192.168.1.1',
                'user_agent': 'Mozilla/5.0',
                'expires_at': datetime.utcnow() + timedelta(hours=1)
            }

    def test_session_token_creation(self, app, token_data):
        """Test session token creation."""
        with app.app_context():
            token = SessionToken(**token_data)
            db.session.add(token)
            db.session.commit()
            
            assert token.id is not None
            assert token.jti == token_data['jti']
            assert token.user_id == token_data['user_id']
            assert token.token_type == token_data['token_type']
            assert token.is_revoked is False
            assert token.issued_at is not None

    def test_session_token_representation(self, app, token_data):
        """Test session token string representation."""
        with app.app_context():
            token = SessionToken(**token_data)
            expected = f"<SessionToken {token_data['jti']} - User {token_data['user_id']} - {token_data['token_type']}>"
            assert repr(token) == expected

    def test_is_expired_true(self, app, token_data):
        """Test is_expired property when token is expired."""
        with app.app_context():
            token_data['expires_at'] = datetime.utcnow() - timedelta(hours=1)
            token = SessionToken(**token_data)
            
            assert token.is_expired is True

    def test_is_expired_false(self, app, token_data):
        """Test is_expired property when token is not expired."""
        with app.app_context():
            token_data['expires_at'] = datetime.utcnow() + timedelta(hours=1)
            token = SessionToken(**token_data)
            
            assert token.is_expired is False

    def test_is_valid_true(self, app, token_data):
        """Test is_valid property when token is valid."""
        with app.app_context():
            token = SessionToken(**token_data)
            
            assert token.is_valid is True

    def test_is_valid_false_revoked(self, app, token_data):
        """Test is_valid property when token is revoked."""
        with app.app_context():
            token = SessionToken(**token_data)
            token.is_revoked = True
            
            assert token.is_valid is False

    def test_is_valid_false_expired(self, app, token_data):
        """Test is_valid property when token is expired."""
        with app.app_context():
            token_data['expires_at'] = datetime.utcnow() - timedelta(hours=1)
            token = SessionToken(**token_data)
            
            assert token.is_valid is False

    def test_revoke_token(self, app, token_data):
        """Test token revocation."""
        with app.app_context():
            token = SessionToken(**token_data)
            reason = "User logout"
            
            token.revoke(reason)
            
            assert token.is_revoked is True
            assert token.revocation_reason == reason
            assert token.revoked_at is not None

    def test_update_last_used(self, app, token_data):
        """Test updating last used timestamp."""
        with app.app_context():
            token = SessionToken(**token_data)
            original_last_used = token.last_used_at
            
            token.update_last_used()
            
            assert token.last_used_at != original_last_used
            assert token.last_used_at is not None

    def test_generate_device_fingerprint(self, app, token_data):
        """Test device fingerprint generation."""
        with app.app_context():
            user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            ip_address = "192.168.1.1"
            
            fingerprint = SessionToken.generate_device_fingerprint(user_agent, ip_address)
            
            assert isinstance(fingerprint, str)
            assert len(fingerprint) == 64  # SHA256 hex digest length

    def test_generate_device_fingerprint_consistent(self, app):
        """Test device fingerprint generation is consistent."""
        with app.app_context():
            user_agent = "Mozilla/5.0"
            ip_address = "192.168.1.1"
            
            fingerprint1 = SessionToken.generate_device_fingerprint(user_agent, ip_address)
            fingerprint2 = SessionToken.generate_device_fingerprint(user_agent, ip_address)
            
            assert fingerprint1 == fingerprint2

    def test_to_dict(self, app, token_data):
        """Test converting session token to dictionary."""
        with app.app_context():
            token = SessionToken(**token_data)
            token.id = 1
            token.issued_at = datetime.utcnow()
            token_dict = token.to_dict()
            
            assert token_dict['token_type'] == token_data['token_type']
            assert token_dict['ip_address'] == token_data['ip_address']
            assert 'issued_at' in token_dict
            assert 'expires_at' in token_dict

    @patch('app.models.session_token.SessionToken.query')
    def test_find_by_jti_found(self, mock_query, token_data):
        """Test finding token by JTI when token exists."""
        mock_token = SessionToken(**token_data)
        mock_query.filter_by.return_value.first.return_value = mock_token
        
        result = SessionToken.find_by_jti('test-jwt-id-123')
        
        assert result == mock_token
        mock_query.filter_by.assert_called_once_with(jti='test-jwt-id-123')

    @patch('app.models.session_token.SessionToken.query')
    def test_find_by_jti_not_found(self, mock_query):
        """Test finding token by JTI when token doesn't exist."""
        mock_query.filter_by.return_value.first.return_value = None
        
        result = SessionToken.find_by_jti('nonexistent-jti')
        
        assert result is None

    @patch('app.models.session_token.SessionToken.query')
    @patch('app.models.session_token.db')
    def test_revoke_user_tokens(self, mock_db, mock_query, token_data):
        """Test revoking all tokens for a user."""
        # Create mock tokens
        mock_tokens = [SessionToken(**{**token_data, 'jti': f'jti-{i}'}) for i in range(3)]
        mock_query.filter_by.return_value.all.return_value = mock_tokens
        
        result = SessionToken.revoke_user_tokens(user_id=1, reason="User logout")
        
        assert result == 3
        for token in mock_tokens:
            assert token.is_revoked is True
            assert token.revocation_reason == "User logout"

    @patch('app.models.session_token.SessionToken.query')
    def test_get_user_sessions(self, mock_query, token_data):
        """Test getting active sessions for a user."""
        mock_tokens = [SessionToken(**{**token_data, 'jti': f'jti-{i}'}) for i in range(2)]
        mock_query.filter_by.return_value.filter.return_value.all.return_value = mock_tokens
        
        result = SessionToken.get_user_active_sessions(user_id=1)
        
        assert len(result) == 2
        mock_query.filter_by.assert_called_once_with(user_id=1, is_revoked=False, token_type='access')

    @patch('app.models.session_token.SessionToken.query')
    def test_cleanup_expired_tokens(self, mock_query):
        """Test cleanup of expired tokens."""
        mock_token = Mock()
        mock_query.filter.return_value.all.return_value = [mock_token] * 5
        
        result = SessionToken.cleanup_expired_tokens()
        
        assert result == 5
        assert mock_token.revoke.call_count == 5

    @patch('app.models.session_token.SessionToken.query')
    def test_get_session_stats(self, mock_query):
        """Test getting session statistics."""
        # Mock different query results
        mock_active_tokens = mock_query.filter_by.return_value.filter.return_value
        mock_active_tokens.filter_by.return_value.count.side_effect = [5, 3]  # Access tokens, Refresh tokens
        
        stats = SessionToken.get_session_stats(user_id=1)
        
        assert stats['total_active'] == 8
        assert stats['access_tokens'] == 5
        assert stats['refresh_tokens'] == 3

    def test_is_refresh_token_true(self, app, token_data):
        """Test is_refresh_token property when token is refresh token."""
        with app.app_context():
            token_data['token_type'] = 'refresh'
            token = SessionToken(**token_data)
            
            assert token.is_refresh_token is True

    def test_is_refresh_token_false(self, app, token_data):
        """Test is_refresh_token property when token is access token."""
        with app.app_context():
            token_data['token_type'] = 'access'
            token = SessionToken(**token_data)
            
            assert token.is_refresh_token is False

    def test_time_until_expiry(self, app, token_data):
        """Test calculating time until token expiry."""
        with app.app_context():
            # Set expiry to 1 hour from now
            token_data['expires_at'] = datetime.utcnow() + timedelta(hours=1)
            token = SessionToken(**token_data)
            
            time_left = token.time_until_expiry()
            
            assert isinstance(time_left, timedelta)
            assert time_left.total_seconds() > 3500  # Should be close to 1 hour

    def test_time_until_expiry_expired(self, app, token_data):
        """Test time until expiry for expired token."""
        with app.app_context():
            token_data['expires_at'] = datetime.utcnow() - timedelta(hours=1)
            token = SessionToken(**token_data)
            
            time_left = token.time_until_expiry()
            
            assert time_left.total_seconds() <= 0


class TestSessionTokenIntegration:
    """Integration tests for session token functionality."""

    def _create_user(self):
        from app.models.user import User
        from app.extensions import bcrypt, db
        import uuid
        u = User(username=f"u_{uuid.uuid4().hex[:8]}", email=f"u_{uuid.uuid4().hex[:8]}@example.com", role='user')
        u.password_hash = bcrypt.generate_password_hash('pw').decode('utf-8')
        db.session.add(u)
        db.session.commit()
        return u.id

    def test_complete_token_lifecycle(self, app):
        """Test complete token lifecycle from creation to cleanup."""
        with app.app_context():
            uid = self._create_user()
            # Create token
            token = SessionToken(
                jti='lifecycle-test-123',
                user_id=uid,
                token_type='access',
                ip_address='192.168.1.1',
                user_agent='Test Agent',
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )
            
            db.session.add(token)
            db.session.commit()
            
            # Verify creation
            assert token.id is not None
            assert token.is_valid is True
            
            # Update last used
            token.update_last_used()
            assert token.last_used_at is not None
            
            # Revoke token
            token.revoke("Test revocation")
            assert token.is_revoked is True
            assert token.is_valid is False

    def test_user_session_management(self, app):
        """Test managing multiple sessions for a user."""
        with app.app_context():
            user_id = self._create_user()
            
            # Create multiple tokens for user
            tokens = []
            for i in range(3):
                token = SessionToken(
                    jti=f'user-session-{i}',
                    user_id=user_id,
                    token_type='access' if i % 2 == 0 else 'refresh',
                    expires_at=datetime.utcnow() + timedelta(hours=1)
                )
                tokens.append(token)
                db.session.add(token)
            
            db.session.commit()
            
            # Test finding user sessions
            user_sessions = SessionToken.get_user_active_sessions(user_id)
            assert len(user_sessions) == 2
            
            # Test revoking all user tokens
            revoked_count = SessionToken.revoke_user_tokens(user_id, "User logout")
            assert revoked_count == 3
            
            # Verify all tokens are revoked
            for token in tokens:
                db.session.refresh(token)
                assert token.is_revoked is True

    def test_device_fingerprinting(self, app):
        """Test device fingerprinting functionality."""
        with app.app_context():
            uid = self._create_user()
            user_agent1 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            user_agent2 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
            ip_address = "192.168.1.1"
            
            # Create tokens with different user agents
            token1 = SessionToken(
                jti='device-test-1',
                user_id=uid,
                token_type='access',
                user_agent=user_agent1,
                ip_address=ip_address,
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )
            
            token2 = SessionToken(
                jti='device-test-2',
                user_id=uid,
                token_type='access',
                user_agent=user_agent2,
                ip_address=ip_address,
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )
            
            # Generate fingerprints
            fingerprint1 = SessionToken.generate_device_fingerprint(user_agent1, ip_address)
            fingerprint2 = SessionToken.generate_device_fingerprint(user_agent2, ip_address)
            
            token1.device_fingerprint = fingerprint1
            token2.device_fingerprint = fingerprint2
            
            # Fingerprints should be different
            assert fingerprint1 != fingerprint2
            
            # Same inputs should generate same fingerprint
            fingerprint1_again = SessionToken.generate_device_fingerprint(user_agent1, ip_address)
            assert fingerprint1 == fingerprint1_again

    def test_token_expiry_and_cleanup(self, app):
        """Test token expiry detection and cleanup."""
        with app.app_context():
            uid = self._create_user()
            # Create expired token
            expired_token = SessionToken(
                jti='expired-test',
                user_id=uid,
                token_type='access',
                expires_at=datetime.utcnow() - timedelta(hours=1)
            )
            
            # Create valid token
            valid_token = SessionToken(
                jti='valid-test',
                user_id=uid,
                token_type='access',
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )
            
            db.session.add_all([expired_token, valid_token])
            db.session.commit()
            
            # Test expiry detection
            assert expired_token.is_expired is True
            assert valid_token.is_expired is False
            
            # Test validity
            assert expired_token.is_valid is False
            assert valid_token.is_valid is True
            
            # Test cleanup
            cleaned_count = SessionToken.cleanup_expired_tokens()
            assert cleaned_count >= 1  # Should clean up at least the expired token

    def test_session_statistics(self, app):
        """Test session statistics functionality."""
        with app.app_context():
            user_id = self._create_user()
            
            # Create various types of tokens
            access_tokens = []
            refresh_tokens = []
            
            for i in range(3):
                access_token = SessionToken(
                    jti=f'access-stats-{i}',
                    user_id=user_id,
                    token_type='access',
                    expires_at=datetime.utcnow() + timedelta(hours=1)
                )
                access_tokens.append(access_token)
                
                refresh_token = SessionToken(
                    jti=f'refresh-stats-{i}',
                    user_id=user_id,
                    token_type='refresh',
                    expires_at=datetime.utcnow() + timedelta(days=7)
                )
                refresh_tokens.append(refresh_token)
            
            db.session.add_all(access_tokens + refresh_tokens)
            db.session.commit()
            
            # Get statistics
            stats = SessionToken.get_session_stats(user_id)
            
            assert stats['total_active'] >= 6
            assert stats['access_tokens'] >= 3
            assert stats['refresh_tokens'] >= 3