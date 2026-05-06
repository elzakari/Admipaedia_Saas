"""
Tests for Enhanced Authentication System
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app import create_app, db
from app.models.user import User, Role
from app.models.enhanced_auth import MFADevice, TrustedDevice, AuthenticationAttempt
from app.services.enhanced_auth_service import EnhancedAuthService
from app.config import TestingConfig

@pytest.fixture
def app():
    """Create test app"""
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def test_user(app):
    """Create test user"""
    with app.app_context():
        # Create admin role
        admin_role = Role(name='admin', description='Administrator')
        db.session.add(admin_role)
        db.session.commit()
        
        # Create test user
        user = User(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )
        user.set_password('TestPassword123!')
        user.roles.append(admin_role)
        db.session.add(user)
        db.session.commit()
        
        return user

class TestEnhancedAuthService:
    """Test Enhanced Authentication Service"""
    
    def test_register_user_with_security(self, app):
        """Test secure user registration"""
        with app.app_context():
            result = EnhancedAuthService.register_user_with_security(
                username='newuser',
                email='newuser@example.com',
                password='SecurePassword123!',
                roles=['student']
            )
            
            assert result['success'] is True
            assert 'user' in result
            assert result['user']['email'] == 'newuser@example.com'
    
    def test_register_user_weak_password(self, app):
        """Test registration with weak password"""
        with app.app_context():
            result = EnhancedAuthService.register_user_with_security(
                username='newuser',
                email='newuser@example.com',
                password='weak',
                roles=['student']
            )
            
            assert result['success'] is False
            assert 'password_errors' in result
    
    def test_authenticate_with_security(self, app, test_user):
        """Test secure authentication"""
        with app.app_context():
            device_info = {
                'ip_address': '127.0.0.1',
                'user_agent': 'Test Browser',
                'fingerprint': 'test_fingerprint'
            }
            
            result = EnhancedAuthService.authenticate_with_security(
                email='test@example.com',
                password='TestPassword123!',
                device_info=device_info
            )
            
            assert result['success'] is True
            assert 'access_token' in result
            assert 'refresh_token' in result
    
    def test_authenticate_invalid_credentials(self, app, test_user):
        """Test authentication with invalid credentials"""
        with app.app_context():
            result = EnhancedAuthService.authenticate_with_security(
                email='test@example.com',
                password='wrongpassword'
            )
            
            assert result['success'] is False
            assert result['error'] == 'Invalid credentials'
    
    @patch('pyotp.random_base32')
    def test_setup_mfa(self, mock_random, app, test_user):
        """Test MFA setup"""
        mock_random.return_value = 'TESTSECRET123456'
        
        with app.app_context():
            result = EnhancedAuthService.setup_mfa(test_user.id)
            
            assert result['success'] is True
            assert 'qr_code' in result
            assert 'backup_codes' in result
            assert len(result['backup_codes']) == 10
    
    @patch('pyotp.TOTP.verify')
    def test_verify_mfa_success(self, mock_verify, app, test_user):
        """Test successful MFA verification"""
        mock_verify.return_value = True
        
        with app.app_context():
            # Setup MFA first
            EnhancedAuthService.setup_mfa(test_user.id)
            
            # Get MFA device
            mfa_device = MFADevice.query.filter_by(user_id=test_user.id).first()
            
            result = EnhancedAuthService.verify_mfa(
                mfa_token=mfa_device.mfa_token,
                code='123456'
            )
            
            assert result['success'] is True
    
    def test_verify_mfa_backup_code(self, app, test_user):
        """Test MFA verification with backup code"""
        with app.app_context():
            # Setup MFA
            setup_result = EnhancedAuthService.setup_mfa(test_user.id)
            backup_code = setup_result['backup_codes'][0]
            
            # Get MFA device
            mfa_device = MFADevice.query.filter_by(user_id=test_user.id).first()
            
            result = EnhancedAuthService.verify_mfa(
                mfa_token=mfa_device.mfa_token,
                code=backup_code,
                is_backup_code=True
            )
            
            assert result['success'] is True

class TestEnhancedAuthRoutes:
    """Test Enhanced Authentication Routes"""
    
    def test_enhanced_login_success(self, client, test_user):
        """Test enhanced login endpoint"""
        response = client.post('/api/v1/auth/enhanced/login-enhanced', 
            json={
                'email': 'test@example.com',
                'password': 'TestPassword123!',
                'device_info': {
                    'fingerprint': 'test_fingerprint'
                }
            }
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'access_token' in data
    
    def test_enhanced_login_invalid_credentials(self, client, test_user):
        """Test enhanced login with invalid credentials"""
        response = client.post('/api/v1/auth/enhanced/login-enhanced', 
            json={
                'email': 'test@example.com',
                'password': 'wrongpassword'
            }
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['success'] is False
    
    def test_mfa_setup_unauthorized(self, client):
        """Test MFA setup without authentication"""
        response = client.post('/api/v1/auth/enhanced/mfa/setup', 
            json={
                'device_name': 'Test Device',
                'device_type': 'totp'
            }
        )
        
        assert response.status_code == 401
    
    def test_get_trusted_devices_unauthorized(self, client):
        """Test getting trusted devices without authentication"""
        response = client.get('/api/v1/auth/enhanced/devices/trusted')
        
        assert response.status_code == 401

class TestSecurityFeatures:
    """Test security features"""
    
    def test_device_fingerprinting(self, app):
        """Test device fingerprinting"""
        from app.utils.security_enhancements import DeviceFingerprinting
        
        with app.test_request_context(
            headers={
                'User-Agent': 'Test Browser',
                'Accept-Language': 'en-US',
                'Accept-Encoding': 'gzip'
            }
        ):
            from flask import request
            fingerprint = DeviceFingerprinting.generate_fingerprint(request)
            
            assert isinstance(fingerprint, str)
            assert len(fingerprint) == 32
    
    def test_threat_detection(self, app, test_user):
        """Test threat detection"""
        from app.utils.security_enhancements import ThreatDetection
        
        with app.app_context():
            # Create some authentication attempts
            for i in range(3):
                attempt = AuthenticationAttempt(
                    user_id=test_user.id,
                    ip_address='192.168.1.1',
                    user_agent='Test Browser',
                    success=True,
                    created_at=datetime.utcnow() - timedelta(days=i)
                )
                db.session.add(attempt)
            db.session.commit()
            
            analysis = ThreatDetection.analyze_login_pattern(
                test_user.id, 
                '10.0.0.1'  # Different IP
            )
            
            assert 'risk_level' in analysis
            assert 'anomalies' in analysis
            assert 'new_ip_address' in analysis['anomalies']

if __name__ == '__main__':
    pytest.main([__file__])