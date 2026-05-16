"""
Enhanced authentication routes with MFA, device tracking, and advanced security
"""

from flask import request, jsonify, Blueprint, session, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt, decode_token
)
from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime, timedelta
import secrets
import structlog

from app.models.user import User
from app.models.enhanced_auth import (
    MFADevice, TrustedDevice, AuthenticationAttempt, 
    UserSecuritySettings
)
from app.models.security import PasswordResetToken
from app.models.session_token import SessionToken
from app.extensions import db, bcrypt
from app.services.enhanced_auth_service import EnhancedAuthService
from app.middleware.security_middleware import (
    rate_limit, sanitize_request_data, security_headers, 
    log_security_event, CSRFProtection
)
from app.utils.security_enhancements import ThreatDetection, DeviceFingerprinting

logger = structlog.get_logger()

# Create blueprint
enhanced_auth_bp = Blueprint('enhanced_auth', __name__)
enhanced_auth_bp.strict_slashes = False

# Validation schemas
class EnhancedLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)
    remember_me = fields.Bool(load_default=False)
    device_info = fields.Dict(load_default={})
    mfa_code = fields.Str(load_default=None)
    trust_device = fields.Bool(load_default=False)

class MFASetupSchema(Schema):
    method = fields.Str(required=True, validate=validate.OneOf(['totp', 'sms', 'email']))
    phone_number = fields.Str(load_default=None)
    email_address = fields.Email(load_default=None)

class MFAVerifySchema(Schema):
    code = fields.Str(required=True)
    is_backup_code = fields.Bool(load_default=False)
    trust_device = fields.Bool(load_default=False)

@enhanced_auth_bp.route('/login-enhanced', methods=['POST'])
@enhanced_auth_bp.route('/login-enhanced/', methods=['POST'])
@rate_limit(limit=5, window=300)  # 5 attempts per 5 minutes
@sanitize_request_data()
@security_headers()
def enhanced_login():
    """Enhanced login with MFA and device tracking"""
    try:
        schema = EnhancedLoginSchema()
        data = schema.load(request.json)
        
        # Get device information
        device_info = {
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'fingerprint': DeviceFingerprinting.generate_fingerprint(request),
            **data.get('device_info', {})
        }
        
        # Perform enhanced authentication
        result = EnhancedAuthService.authenticate_with_security(
            email=data['email'],
            password=data['password'],
            remember_me=data['remember_me'],
            device_info=device_info
        )
        
        if not result['success']:
            return jsonify(result), 401
        
        # Check if MFA is required
        if result.get('mfa_required'):
            # If MFA code provided, verify it
            if data.get('mfa_code'):
                mfa_result = EnhancedAuthService.verify_mfa(
                    mfa_token=result['mfa_token'],
                    code=data['mfa_code']
                )
                
                if not mfa_result['success']:
                    return jsonify(mfa_result), 401
                
                # Complete authentication
                result = mfa_result
            else:
                # Return MFA challenge
                return jsonify({
                    'success': False,
                    'mfa_required': True,
                    'mfa_token': result['mfa_token'],
                    'available_methods': result.get('available_methods', [])
                }), 200
        
        # Handle device trust
        if data.get('trust_device') and result.get('user'):
            user = User.query.get(result['user']['id'])
            if user and user.security_settings and user.security_settings.trust_new_devices:
                # Mark device as trusted
                trusted_device = TrustedDevice.query.filter_by(
                    user_id=user.id,
                    device_fingerprint=device_info['fingerprint']
                ).first()
                
                if not trusted_device:
                    trusted_device = TrustedDevice(
                        user_id=user.id,
                        device_fingerprint=device_info['fingerprint'],
                        device_name=device_info.get('name', 'Unknown Device'),
                        user_agent=device_info['user_agent'],
                        ip_address=device_info['ip_address'],
                        is_trusted=True,
                        trust_expires_at=datetime.utcnow() + timedelta(
                            days=user.security_settings.device_trust_duration_days
                        )
                    )
                    db.session.add(trusted_device)
                    db.session.commit()
        
        return jsonify(result), 200
        
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as err:
        logger.error('enhanced_login_error', error=str(err))
        return jsonify({'success': False, 'error': 'Authentication failed'}), 500

@enhanced_auth_bp.route('/mfa/setup', methods=['POST'])
@jwt_required()
@rate_limit(limit=3, window=3600)  # 3 setups per hour
@sanitize_request_data()
@security_headers()
def setup_mfa():
    """Setup multi-factor authentication"""
    try:
        schema = MFASetupSchema()
        data = schema.load(request.json)
        
        user_id = get_jwt_identity()
        result = EnhancedAuthService.setup_mfa(user_id)
        
        if result['success']:
            # Create MFA device record
            mfa_device = MFADevice(
                user_id=user_id,
                device_name=data['device_name'],
                device_type=data['device_type'],
                secret_key=result.get('secret_key'),
                phone_number=data.get('phone_number'),
                email_address=data.get('email_address')
            )
            
            db.session.add(mfa_device)
            db.session.commit()
            
            log_security_event('mfa_setup_initiated', {
                'user_id': user_id,
                'device_type': data['device_type']
            })
        
        return jsonify(result), 200 if result['success'] else 400
        
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as err:
        logger.error('mfa_setup_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'MFA setup failed'}), 500

@enhanced_auth_bp.route('/mfa/verify', methods=['POST'])
@rate_limit(limit=10, window=300)  # 10 attempts per 5 minutes
@sanitize_request_data()
@security_headers()
def verify_mfa():
    """Verify MFA code during authentication"""
    try:
        schema = MFAVerifySchema()
        data = schema.load(request.json)
        
        result = EnhancedAuthService.verify_mfa(
            mfa_token=data['mfa_token'],
            code=data['code'],
            is_backup_code=data['is_backup_code']
        )
        
        return jsonify(result), 200 if result['success'] else 401
        
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as err:
        logger.error('mfa_verify_error', error=str(err))
        return jsonify({'success': False, 'error': 'MFA verification failed'}), 500

@enhanced_auth_bp.route('/devices/trusted', methods=['GET'])
@jwt_required()
@security_headers()
def get_trusted_devices():
    """Get user's trusted devices"""
    try:
        user_id = get_jwt_identity()
        
        devices = TrustedDevice.query.filter_by(
            user_id=user_id,
            is_trusted=True
        ).filter(
            TrustedDevice.trust_expires_at > datetime.utcnow()
        ).all()
        
        return jsonify({
            'success': True,
            'devices': [{
                'id': device.id,
                'device_name': device.device_name,
                'last_seen': device.last_seen.isoformat(),
                'location': device.location,
                'trust_expires_at': device.trust_expires_at.isoformat() if device.trust_expires_at else None,
                'created_at': device.created_at.isoformat()
            } for device in devices]
        }), 200
        
    except Exception as err:
        logger.error('get_trusted_devices_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to retrieve trusted devices'}), 500

@enhanced_auth_bp.route('/devices/trusted/<int:device_id>', methods=['DELETE'])
@jwt_required()
@security_headers()
def revoke_trusted_device(device_id):
    """Revoke trust for a specific device"""
    try:
        user_id = get_jwt_identity()
        
        device = TrustedDevice.query.filter_by(
            id=device_id,
            user_id=user_id
        ).first()
        
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        device.is_trusted = False
        device.trust_expires_at = datetime.utcnow()
        db.session.commit()
        
        log_security_event('trusted_device_revoked', {
            'user_id': user_id,
            'device_id': device_id
        })
        
        return jsonify({'success': True, 'message': 'Device trust revoked'}), 200
        
    except Exception as err:
        logger.error('revoke_trusted_device_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to revoke device trust'}), 500

@enhanced_auth_bp.route('/security/settings', methods=['GET'])
@jwt_required()
@security_headers()
def get_security_settings():
    """Get user's security settings"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Get or create security settings
        settings = user.security_settings
        if not settings:
            settings = UserSecuritySettings(user_id=user_id)
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'settings': {
                'mfa_enabled': settings.mfa_enabled,
                'mfa_required': settings.mfa_required,
                'session_timeout_minutes': settings.session_timeout_minutes,
                'max_concurrent_sessions': settings.max_concurrent_sessions,
                'login_notifications': settings.login_notifications,
                'suspicious_activity_alerts': settings.suspicious_activity_alerts,
                'trust_new_devices': settings.trust_new_devices,
                'device_trust_duration_days': settings.device_trust_duration_days,
                'last_password_change': settings.last_password_change.isoformat() if settings.last_password_change else None
            }
        }), 200
        
    except Exception as err:
        logger.error('get_security_settings_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to retrieve security settings'}), 500

@enhanced_auth_bp.route('/security/settings', methods=['PUT'])
@jwt_required()
@rate_limit(limit=10, window=3600)  # 10 updates per hour
@sanitize_request_data()
@security_headers()
def update_security_settings():
    """Update user's security settings"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Get or create security settings
        settings = user.security_settings
        if not settings:
            settings = UserSecuritySettings(user_id=user_id)
            db.session.add(settings)
        
        data = request.json
        
        # Update allowed settings
        if 'session_timeout_minutes' in data:
            settings.session_timeout_minutes = min(max(data['session_timeout_minutes'], 30), 1440)  # 30 min to 24 hours
        
        if 'login_notifications' in data:
            settings.login_notifications = bool(data['login_notifications'])
        
        if 'suspicious_activity_alerts' in data:
            settings.suspicious_activity_alerts = bool(data['suspicious_activity_alerts'])
        
        if 'trust_new_devices' in data:
            settings.trust_new_devices = bool(data['trust_new_devices'])
        
        if 'device_trust_duration_days' in data:
            settings.device_trust_duration_days = min(max(data['device_trust_duration_days'], 1), 90)  # 1 to 90 days
        
        db.session.commit()
        
        log_security_event('security_settings_updated', {
            'user_id': user_id,
            'updated_fields': list(data.keys())
        })
        
        return jsonify({'success': True, 'message': 'Security settings updated'}), 200
        
    except Exception as err:
        logger.error('update_security_settings_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to update security settings'}), 500

@enhanced_auth_bp.route('/sessions', methods=['GET'])
@jwt_required()
@security_headers()
def get_user_sessions():
    """Get user's active sessions"""
    try:
        user_id = get_jwt_identity()
        sessions = EnhancedAuthService.get_user_sessions(user_id)
        
        return jsonify({
            'success': True,
            'sessions': sessions
        }), 200
        
    except Exception as err:
        logger.error('get_user_sessions_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to retrieve sessions'}), 500

@enhanced_auth_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
@security_headers()
def revoke_session(session_id):
    """Revoke a specific session"""
    try:
        user_id = get_jwt_identity()
        current_jti = get_jwt()['jti']
        
        # Get the session to revoke
        session_token = SessionToken.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()
        
        if not session_token:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        # Don't allow revoking current session
        if session_token.jti == current_jti:
            return jsonify({'success': False, 'error': 'Cannot revoke current session'}), 400
        
        success = EnhancedAuthService.revoke_session(session_id, 'user_revoked')
        
        if success:
            return jsonify({'success': True, 'message': 'Session revoked'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to revoke session'}), 500
        
    except Exception as err:
        logger.error('revoke_session_error', error=str(err), user_id=get_jwt_identity())
        return jsonify({'success': False, 'error': 'Failed to revoke session'}), 500
