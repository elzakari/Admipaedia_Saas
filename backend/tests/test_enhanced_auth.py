"""
Tests for Enhanced Authentication System
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app import create_app, db
from app.models.user import User, Role
from app.models.enhanced_auth import MFADevice, TrustedDevice, AuthenticationAttempt
from app.models.security import LoginAttempt
from app.services.enhanced_auth_service import EnhancedAuthService
from app.config import TestingConfig



@pytest.fixture
def test_user(app):
    """Create test user"""
    from app.extensions import db as _db
    with app.app_context():
        suffix = uuid.uuid4().hex[:6]
        admin_role = Role.query.filter_by(name='admin').first()
        if not admin_role:
            admin_role = Role(name='admin', description='Administrator')
            _db.session.add(admin_role)
            _db.session.flush()
        
        user = User(
            username=f'user_{suffix}',
            email=f'user_{suffix}@example.com',
            first_name='Test',
            last_name='User',
            status='active'
        )
        user.set_password('TestPassword123!')
        if admin_role not in user.roles:
            user.roles.append(admin_role)
        _db.session.add(user)
        _db.session.flush()
        
        return user

class TestEnhancedAuthService:
    """Test Enhanced Authentication Service"""
    
    def test_register_user_with_security(self, app):
        """Test secure user registration"""
        with app.app_context():
            result = EnhancedAuthService.register_user_with_security(
                username='newuser',
                email='newuser@example.com',
                password='SecureP4ssword!@#',
                roles=['student']
            )
            
            if not result['success']:
                print(f"Registration failed: {result}")
            assert result['success'] is True
            assert 'user_id' in result
    
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
            assert 'details' in result
    
    @patch('requests.get')
    def test_authenticate_with_security(self, mock_get, app, test_user):
        """Test secure authentication"""
        # Mock geolocation
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'country_name': 'Local', 'city': 'Local', 'org': 'Internal'}
        )
        
        with app.app_context():
            # Refresh user session
            test_user = db.session.merge(test_user)
            db.session.commit()
            
            device_info = {
                'ip_address': '127.0.0.1',
                'user_agent': 'Test Browser',
                'fingerprint': 'test_fingerprint'
            }
            
            result = EnhancedAuthService.authenticate_with_security(
                email=test_user.email,
                password='TestPassword123!',
                device_info=device_info
            )
            
            assert result['success'] is True
            assert 'access_token' in result
            assert 'refresh_token' in result
    
    def test_authenticate_invalid_credentials(self, app, test_user):
        """Test authentication with invalid credentials"""
        with app.app_context():
            test_user = db.session.merge(test_user)
            db.session.commit()
            result = EnhancedAuthService.authenticate_with_security(
                email=test_user.email,
                password='wrongpassword'
            )
            
            assert result['success'] is False
            assert result['error'] == 'Invalid credentials'

    def test_authenticate_case_insensitive_and_polymorphic(self, app, test_user):
        """Test case-insensitive and polymorphic authentication"""
        with app.app_context():
            test_user = db.session.merge(test_user)
            db.session.commit()
            # 1. Test case-insensitive email login
            result = EnhancedAuthService.authenticate_with_security(
                email=test_user.email.upper(),
                password='TestPassword123!'
            )
            assert result['success'] is True

            # 2. Test case-insensitive username login (polymorphic matching)
            result_username = EnhancedAuthService.authenticate_with_security(
                email=test_user.username.upper(),
                password='TestPassword123!'
            )
            assert result_username['success'] is True

            # 3. Test dictionary input payload
            payload = {'email': test_user.email, 'password': 'TestPassword123!'}
            result_dict = EnhancedAuthService.authenticate_with_security(
                email=payload,
                password='TestPassword123!'
            )
            assert result_dict['success'] is True
    
    @patch('pyotp.TOTP.verify')
    def test_verify_mfa_success(self, mock_verify, app, test_user):
        """Test successful MFA verification"""
        mock_verify.return_value = True
        
        with app.app_context():
            test_user = db.session.merge(test_user)
            # Setup MFA first
            EnhancedAuthService.setup_mfa(test_user.id)
            test_user.mfa_enabled = True
            db.session.commit()
            
            # Let's do a full flow: authenticate -> get mfa_token -> verify
            auth_result = EnhancedAuthService.authenticate_with_security(
                email=test_user.email,
                password='TestPassword123!'
            )
            
            assert auth_result['requires_mfa'] is True
            mfa_token = auth_result['mfa_token']
            
            result = EnhancedAuthService.verify_mfa(
                mfa_token=mfa_token,
                code='123456'
            )
            
            assert result['success'] is True
    
    def test_verify_mfa_backup_code(self, app, test_user):
        """Test MFA verification with backup code"""
        with app.app_context():
            test_user = db.session.merge(test_user)
            # Setup MFA
            setup_result = EnhancedAuthService.setup_mfa(test_user.id)
            test_user.mfa_enabled = True
            db.session.commit()
            
            backup_code = setup_result['backup_codes'][0]
            
            # Authenticate to get mfa_token
            auth_result = EnhancedAuthService.authenticate_with_security(
                email=test_user.email,
                password='TestPassword123!'
            )
            mfa_token = auth_result['mfa_token']
            
            result = EnhancedAuthService.verify_mfa(
                mfa_token=mfa_token,
                code=backup_code,
                is_backup_code=True
            )
            
            assert result['success'] is True

class TestEnhancedAuthRoutes:
    """Test Enhanced Authentication Routes"""
    
    def test_enhanced_login_success(self, client, user_factory):
        """Test enhanced login endpoint"""
        user = user_factory(email='enhanced_login@example.com', password='TestPassword123!', role='admin')
        response = client.post('/api/v1/auth/enhanced/login-enhanced', 
            json={
                'email': 'enhanced_login@example.com',
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
                'email': test_user.email,
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
    
    @patch('requests.get')
    def test_device_fingerprinting(self, mock_get, app):
        """Test device fingerprinting"""
        from app.utils.security_enhancements import DeviceFingerprinting
        
        # Mock geolocation response
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                'country_name': 'Local',
                'city': 'Local',
                'org': 'Internal Network'
            }
        )
        
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
    
    @patch('requests.get')
    def test_threat_detection(self, mock_get, app, test_user):
        """Test threat detection"""
        from app.utils.security_enhancements import ThreatDetection
        
        # Mock geolocation response
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                'country_name': 'Local',
                'city': 'Local',
                'org': 'Internal Network'
            }
        )
        
        with app.app_context():
            test_user = db.session.merge(test_user)
            # Create some authentication attempts
            for i in range(3):
                attempt = LoginAttempt(
                    identifier=test_user.email,
                    ip_address='192.168.1.1',
                    user_agent='Test Browser',
                    success=True,
                    attempted_at=datetime.utcnow() - timedelta(days=i)
                )
                db.session.add(attempt)
            db.session.commit()
            
            analysis = ThreatDetection.analyze_login_pattern(
                test_user.email, 
                '10.0.0.1'  # Different IP
            )
            
            assert 'risk_level' in analysis
            assert 'anomalies' in analysis
            assert 'new_ip_address' in analysis['anomalies']

if __name__ == '__main__':
    pytest.main([__file__])