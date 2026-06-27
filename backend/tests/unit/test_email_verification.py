import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask import current_app
from app.extensions import db
from app.models.user import User
from app.models.email_verification import EmailVerificationToken
from app.services.email_verification_service import EmailVerificationRepository, EmailVerificationService

@pytest.fixture
def test_user(app):
    """Create test user for verification tests"""
    # Ensure no duplicate exists from previous tests or hooks
    existing = User.query.filter_by(email='verify@example.com').first()
    if existing:
        db.session.delete(existing)
        db.session.flush()

    user = User(
        username='verifyme',
        email='verify@example.com',
        status='pending_verification'
    )
    user.set_password_hash('SecurePassword123!')
    db.session.add(user)
    db.session.flush()
    return user

class TestEmailVerificationRepository:
    """Test Suite for isolated EmailVerificationRepository"""

    def test_create_and_get_token(self, app, test_user):
        repo = EmailVerificationRepository()
        user = db.session.merge(test_user)
        plain_token, record = repo.create_token(user_id=user.id, email=user.email)

        assert plain_token is not None
        assert len(plain_token) >= 32
        assert record.user_id == user.id
        assert record.email == 'verify@example.com'
        assert record.is_used is False
        assert record.expires_at > datetime.utcnow()

        # Retrieve token by plain token
        retrieved = repo.get_by_token(plain_token)
        assert retrieved is not None
        assert retrieved.id == record.id
        assert retrieved.email == 'verify@example.com'

    def test_expired_token(self, app, test_user):
        repo = EmailVerificationRepository()
        user = db.session.merge(test_user)
        plain_token, record = repo.create_token(user_id=user.id, email=user.email, expires_in_hours=-1)

        assert record.expires_at < datetime.utcnow()
        active = repo.get_active_by_user(user.id)
        assert active is None


class TestEmailVerificationService:
    """Test Suite for EmailVerificationService layer"""

    @patch('app.services.email_service._send_email_background')
    def test_send_verification_email(self, mock_send, app, test_user):
        service = EmailVerificationService()
        user = db.session.merge(test_user)
        success = service.send_verification_email(user=user, base_url='https://example.com')

        assert success is True
        assert mock_send.called
        args, kwargs = mock_send.call_args
        assert 'Verify Your Email Address' in kwargs.get('subject', '')
        assert 'verify@example.com' in kwargs.get('recipients', [])
        assert 'https://example.com/auth/verify-email' in kwargs.get('html_body', '')

    def test_get_request_base_url_defaults(self, app):
        with app.test_request_context():
            app.config['TESTING'] = False
            app.config['DEBUG'] = False
            app.config['FRONTEND_URL'] = ''
            service = EmailVerificationService()
            url = service.get_request_base_url()
            assert url == 'https://admipaedia.easymsdigit.com'

    def test_get_request_base_url_proxies(self, app):
        # Mock request with custom proxy headers
        with app.test_request_context(headers={
            'X-Forwarded-Proto': 'https',
            'X-Forwarded-Host': 'admipaedia.com'
        }):
            service = EmailVerificationService()
            url = service.get_request_base_url()
            assert url == 'https://admipaedia.com'

        # Mock request with Origin header
        with app.test_request_context(headers={
            'Origin': 'https://saas.admipaedia.com/'
        }):
            service = EmailVerificationService()
            url = service.get_request_base_url()
            assert url == 'https://saas.admipaedia.com'

    def test_verify_token_success(self, app, test_user):
        user = db.session.merge(test_user)
        service = EmailVerificationService()
        plain_token, record = service.repo.create_token(user_id=user.id, email=user.email)

        success, message = service.verify_token(plain_token)
        assert success is True
        assert message == "Email verified successfully"

        # Check that user is activated
        activated_user = User.query.get(user.id)
        assert activated_user.email_verified is True
        assert activated_user.status == 'active'

        # Verify duplicate verification check fails
        success2, message2 = service.verify_token(plain_token)
        assert success2 is False
        assert "already been used" in message2


class TestEmailVerificationRoutes:
    """Integration Test Suite for email verification endpoints"""

    @patch('app.services.email_service._send_email_background')
    def test_register_flow_triggers_verification(self, mock_send, client, app):
        # Allow public registration for this test
        current_app.config['ALLOW_PUBLIC_REGISTRATION'] = True

        # Ensure unique username and email to prevent conflict
        username = 'newverifuser_unique'
        email = 'newverif_unique@example.com'
        existing = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing:
            db.session.delete(existing)
            db.session.flush()

        # Register a new user
        response = client.post('/api/v1/auth/register', json={
            'username': username,
            'email': email,
            'password': 'SecureP4ssword!@#',
            'confirm_password': 'SecureP4ssword!@#',
            'role': 'user'
        })
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert "Please check your email" in data['message']

        # Check user status in db is pending_verification
        user = User.query.filter_by(email=email).first()
        assert user is not None
        assert user.status == 'pending_email_verification'
        assert user.email_verified is False

        # Check that a verification token was generated
        token_record = EmailVerificationToken.query.filter_by(user_id=user.id).first()
        assert token_record is not None
        assert token_record.email == email

    def test_verify_email_endpoint(self, client, app, test_user):
        user = db.session.merge(test_user)
        repo = EmailVerificationRepository()
        plain_token, _ = repo.create_token(user_id=user.id, email=user.email)

        # 1. GET request verification
        response = client.get(f'/api/v1/auth/verify-email?token={plain_token}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert "successfully" in data['message']

        # 2. Duplicate validation failure
        response2 = client.post('/api/v1/auth/verify-email', json={'token': plain_token})
        assert response2.status_code == 400
        data2 = json.loads(response2.data)
        assert data2['success'] is False

    @patch('app.services.email_service._send_email_background')
    def test_resend_verification_endpoint(self, mock_send, client, app, test_user):
        user = db.session.merge(test_user)
        
        # Resend for pending user
        response = client.post('/api/v1/auth/resend-verification', json={
            'email': user.email
        })
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert "verification link has been sent" in data['message']
        assert mock_send.called

        # Enumeration check: resend for non-existent user should still return 200 OK
        mock_send.reset_mock()
        response2 = client.post('/api/v1/auth/resend-verification', json={
            'email': 'nonexistent@example.com'
        })
        assert response2.status_code == 200
        data2 = json.loads(response2.data)
        assert data2['success'] is True
        assert not mock_send.called

    def test_login_blocks_unverified_user(self, client, app, test_user):
        user = db.session.merge(test_user)
        user.email_verified = False
        user.status = 'pending_email_verification'
        db.session.add(user)
        db.session.commit()

        response = client.post('/api/v1/auth/login', json={
            'email': user.email,
            'password': 'SecurePassword123!'
        })
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['success'] is False
        assert data['error'] == 'EMAIL_NOT_VERIFIED'
