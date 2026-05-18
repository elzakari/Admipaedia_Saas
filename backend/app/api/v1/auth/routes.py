from flask import request, jsonify, Blueprint, session, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from app.models.user import User
from app.models.parent import Parent
from app.models.security import LoginAttempt, SecurityEvent, PasswordHistory
from app.models.session_token import SessionToken
from app.extensions import db, bcrypt, jwt
from app.middleware.security_middleware import (
    rate_limit, sanitize_request_data, security_headers, 
    log_security_event, CSRFProtection
)
from app.utils.password_security import PasswordSecurity, AccountSecurity
from app.models.system_setting import SystemSetting
from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime, timedelta
import secrets
import structlog

logger = structlog.get_logger()

# Create blueprint
auth_bp = Blueprint('auth', __name__)
auth_bp.strict_slashes = False

# Enhanced schemas for request validation
class RegisterSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    role = fields.String(required=False, validate=validate.OneOf(
        ['admin', 'teacher', 'student', 'parent', 'user']
    ))
    confirm_password = fields.String(required=True)

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)
    remember_me = fields.Boolean(load_default=False)

class ChangePasswordSchema(Schema):
    current_password = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=8))
    confirm_password = fields.String(required=True)

@auth_bp.route('/register', methods=['POST'])
@rate_limit(limit=5, window=3600)  # 5 registrations per hour
@sanitize_request_data({'email': 'email', 'username': 'text', 'password': 'text'})
@security_headers()
def register():
    """Register a new user with enhanced security validation."""
    try:
        allow_public = bool(current_app.config.get('ALLOW_PUBLIC_REGISTRATION', False))
        if not allow_public:
            try:
                v = SystemSetting.get_value('platform_allow_public_registration', None)
                if v is not None:
                    allow_public = str(v).lower() in ('true', '1', 't', 'y', 'yes')
            except Exception:
                allow_public = False

        if not allow_public:
            log_security_event('blocked_public_registration', {
                'ip': request.remote_addr,
                'user_agent': request.headers.get('User-Agent')
            })
            return jsonify({
                "success": False,
                "message": "Registration is invitation-only. Please use a registration link from your school admin."
            }), 403

        schema = RegisterSchema()
        data = schema.load(request.json)
        
        # Validate password confirmation
        if data['password'] != data['confirm_password']:
            return jsonify({"success": False, "message": "Passwords do not match"}), 400
        
        # Check password strength
        is_strong, password_errors = PasswordSecurity.validate_password_strength(
            data['password'], 
            data['username'], 
            data['email']
        )
        
        if not is_strong:
            return jsonify({
                "success": False, 
                "message": "Password does not meet security requirements",
                "errors": password_errors
            }), 400
        
        # Check for password breaches
        if PasswordSecurity.check_password_breach(data['password']):
            return jsonify({
                "success": False, 
                "message": "This password has been found in data breaches. Please choose a different password."
            }), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            log_security_event('duplicate_registration_attempt', {'email': data['email']})
            return jsonify({"success": False, "message": "Email already registered"}), 400
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"success": False, "message": "Username already taken"}), 400
        
        # Create new user
        requested_role = (data.get('role') or 'user').strip()
        if requested_role not in ('user', 'parent'):
            log_security_event('blocked_role_registration_attempt', {
                'email': data['email'],
                'requested_role': requested_role
            })
            requested_role = 'user'

        user = User(
            username=data['username'],
            email=data['email'],
            role=requested_role
        )
        user.status = 'pending_email_verification'
        user.set_password_hash(data['password'])
        
        db.session.add(user)
        db.session.flush()  # Get user ID

        if user.role == 'parent':
            if not Parent.query.filter_by(user_id=user.id).first():
                db.session.add(Parent(user_id=user.id))
        
        # Store password in history
        password_history = PasswordHistory(
            user_id=user.id,
            password_hash=user.password_hash
        )
        db.session.add(password_history)
        
        db.session.commit()
        
        try:
            from app.services.email_verification_service import EmailVerificationService
            verification_service = EmailVerificationService()
            verification_service.send_verification_email(user)
        except Exception as err:
            logger.error("failed_to_send_initial_verification_email", error=str(err), user_id=user.id)
        
        log_security_event('user_registered', {'user_id': user.id, 'email': user.email})
        
        return jsonify({
            "success": True,
            "message": "User registered successfully. Please check your email to verify your account.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }), 201
        
    except ValidationError as err:
        return jsonify({"success": False, "error": err.messages}), 400
    except Exception as err:
        logger.error("registration_error", error=str(err))
        return jsonify({"success": False, "error": "Registration failed"}), 500

@auth_bp.route('/verify-email', methods=['GET', 'POST'])
@rate_limit(limit=10, window=900)  # 10 verify attempts per 15 mins
@security_headers()
def verify_email():
    """Verify user's email verification token and activate their account."""
    try:
        # Support token from either query parameter (GET) or JSON body (POST)
        if request.method == 'POST':
            data = request.get_json() or {}
            token = data.get('token')
        else:
            token = request.args.get('token')

        token = str(token or '').strip()
        if not token:
            return jsonify({"success": False, "message": "Verification token is required"}), 400

        from app.services.email_verification_service import EmailVerificationService
        verification_service = EmailVerificationService()
        success, message = verification_service.verify_token(token)

        if not success:
            log_security_event('email_verification_failed', {
                'ip': request.remote_addr,
                'message': message
            })
            return jsonify({"success": False, "message": message}), 400

        log_security_event('email_verification_success', {
            'ip': request.remote_addr
        })
        return jsonify({"success": True, "message": "Your account has been verified and activated successfully!"}), 200

    except Exception as err:
        logger.error("email_verification_error", error=str(err))
        return jsonify({"success": False, "error": "Email verification failed"}), 500


@auth_bp.route('/resend-verification', methods=['POST'])
@rate_limit(limit=3, window=3600)  # max 3 verification resends per hour
@sanitize_request_data({'email': 'email'})
@security_headers()
def resend_verification():
    """Resend verification email to a pending user."""
    try:
        data = request.get_json() or {}
        email = str(data.get('email') or '').strip().lower()

        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400

        user = User.query.filter_by(email=email).first()

        # Secure mitigation: always return 200 OK to prevent email enumeration
        if user:
            if user.email_verified:
                return jsonify({
                    "success": True,
                    "message": "If the email is unregistered or pending, a verification link has been sent."
                }), 200

            # Trigger email verification lifecycle loop
            from app.services.email_verification_service import EmailVerificationService
            verification_service = EmailVerificationService()
            verification_service.send_verification_email(user)

            log_security_event('email_verification_resent', {
                'user_id': user.id,
                'email': email
            })

        return jsonify({
            "success": True,
            "message": "If the email is unregistered or pending, a verification link has been sent."
        }), 200

    except Exception as err:
        logger.error("resend_verification_error", error=str(err))
        return jsonify({"success": False, "error": "Failed to resend verification link"}), 500


from app.services.enhanced_auth_service import EnhancedAuthService
from flask import current_app

@auth_bp.route('/test', methods=['GET'])
def test_auth():
    return jsonify({"success": True, "message": "Auth service is reachable"}), 200

@auth_bp.route('/login', methods=['POST'])
@auth_bp.route('/login/', methods=['POST'])
@rate_limit(limit=10, window=900, burst_limit=5)  # 10 attempts per 15 minutes, max 5 rapid attempts
@sanitize_request_data({'email': 'email', 'password': 'text'})
@security_headers()
def login():
    """Authenticate user with enhanced security measures (MFA support)."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password required"}), 400
            
        logger.info("login_attempt", email=email)
        
        result = EnhancedAuthService.authenticate_with_security(
            email=email,
            password=password,
            remember_me=data.get('remember_me', False),
            device_info=data.get('device_info')
        )
        
        logger.info("login_result", email=email, success=result.get('success', False))
        
        # Ensure status_code is a valid integer
        if result.get('success', False):
            status_code = 200
        elif result.get('error') == 'EMAIL_NOT_VERIFIED':
            status_code = 403
        elif result.get('error') == 'UNCLAIMED_PROFILE':
            status_code = 400
        else:
            status_code = 401
        
        # If MFA is required, we still return 200 OK so frontend can process the MFA flow
        if not result.get('success', False) and result.get('requires_mfa', False):
            status_code = 200
            
        return jsonify(result), status_code
        
    except Exception as err:
        logger.error("login_error", error=str(err))
        return jsonify({"success": False, "message": "Login failed"}), 500


@auth_bp.route('/bootstrap-dev', methods=['POST'])
def bootstrap_dev_accounts():
    if not current_app.config.get('DEBUG'):
        return jsonify({"success": False, "error": "Not available"}), 404

    if request.remote_addr not in ('127.0.0.1', '::1'):
        return jsonify({"success": False, "error": "Forbidden"}), 403

    try:
        from app.db_init import init_db
        init_db()
        return jsonify({
            "success": True,
            "seeded": {
                "admin_email": "admin@admipaedia.com",
                "super_admin_email": "superadmin@admipaedia.com"
            }
        }), 200
    except Exception as err:
        logger.error("bootstrap_dev_accounts_error", error=str(err))
        return jsonify({"success": False, "error": "Bootstrap failed"}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@rate_limit(limit=3, window=3600)  # 3 password changes per hour
@sanitize_request_data()
@security_headers()
def change_password():
    """Change user password with enhanced security validation."""
    try:
        schema = ChangePasswordSchema()
        data = schema.load(request.json)
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        # Verify current password
        if not user.check_password_hash(data['current_password']):
            log_security_event('password_change_wrong_current', {'user_id': user.id})
            return jsonify({"success": False, "message": "Current password is incorrect"}), 400
        
        # Validate password confirmation
        if data['new_password'] != data['confirm_password']:
            return jsonify({"success": False, "message": "New passwords do not match"}), 400
        
        # Check password strength
        is_strong, password_errors = PasswordSecurity.validate_password_strength(
            data['new_password'], 
            user.username, 
            user.email
        )
        
        if not is_strong:
            return jsonify({
                "success": False, 
                "message": "New password does not meet security requirements",
                "errors": password_errors
            }), 400
        
        # Check password history (prevent reuse of last 5 passwords)
        recent_passwords = PasswordHistory.query.filter_by(user_id=user.id)\
            .order_by(PasswordHistory.created_at.desc()).limit(5).all()
        
        new_password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
        
        for old_password in recent_passwords:
            if bcrypt.check_password_hash(old_password.password_hash, data['new_password']):
                return jsonify({
                    "success": False, 
                    "message": "Cannot reuse a recent password. Please choose a different password."
                }), 400
        
        # Check for password breaches
        if PasswordSecurity.check_password_breach(data['new_password']):
            return jsonify({
                "success": False, 
                "message": "This password has been found in data breaches. Please choose a different password."
            }), 400
        
        # Update password
        user.set_password_hash(data['new_password'])
        user.password_changed_at = datetime.utcnow()
        
        # Store in password history
        password_history = PasswordHistory(
            user_id=user.id,
            password_hash=user.password_hash
        )
        db.session.add(password_history)
        
        # Revoke all existing sessions except current one
        current_jti = get_jwt()['jti']
        SessionToken.query.filter(
            SessionToken.user_id == user.id,
            SessionToken.jti != current_jti,
            SessionToken.is_revoked == False
        ).update({
            'is_revoked': True,
            'revoked_at': datetime.utcnow(),
            'revocation_reason': 'password_changed'
        })
        
        db.session.commit()
        
        log_security_event('password_changed', {'user_id': user.id})
        
        return jsonify({"success": True, "message": "Password changed successfully"}), 200
        
    except ValidationError as err:
        return jsonify({"success": False, "error": err.messages}), 400
    except Exception as err:
        logger.error("password_change_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Password change failed"}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
@security_headers()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        current_jti = get_jwt()['jti']
        
        # Validate session is still active
        session_token = SessionToken.query.filter_by(
            jti=current_jti,
            is_revoked=False
        ).first()
        
        if not session_token:
            log_security_event('invalid_session_access', {'user_id': user_id, 'jti': current_jti})
            return jsonify({"success": False, "error": "Session invalid"}), 401
        
        # Update last activity
        session_token.last_activity = datetime.utcnow()
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "password_changed_at": user.password_changed_at.isoformat() if hasattr(user, 'password_changed_at') and user.password_changed_at else None
            }
        }), 200
        
    except Exception as err:
        logger.error("get_current_user_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Failed to get user information"}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@rate_limit(limit=20, window=3600)  # 20 refreshes per hour
@security_headers()
def refresh():
    """Refresh access token with session validation."""
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({
                "success": False,
                "error": "Invalid refresh token"
            }), 401
        
        # Create new access token
        access_token = create_access_token(identity=current_user_id)
        from flask_jwt_extended import decode_token
        decoded = decode_token(access_token)
        new_access_jti = decoded['jti']
        exp_ts = decoded['exp']  # Unix timestamp
        expires_at = datetime.utcfromtimestamp(exp_ts)
    
        new_session = SessionToken(
            jti=new_access_jti,
            user_id=int(current_user_id),
            token_type='access',
            expires_at=expires_at,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(new_session)
        db.session.commit()

        # Generate CSRF token for refreshed session
        csrf_token = CSRFProtection.generate_csrf_token()
        session['csrf_token'] = csrf_token

        return jsonify({
            "success": True,
            "access_token": access_token,
            "csrf_token": csrf_token
        }), 200
        
    except Exception as e:
        logger.error("token_refresh_error", error=str(e), user_id=get_jwt_identity())
        return jsonify({
            "success": False,
            "error": "Token refresh failed"
        }), 422

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
@security_headers()
def logout():
    try:
        user_id = get_jwt_identity()
        jti = get_jwt()["jti"]
        
        # Revoke the session
        session_token = SessionToken.query.filter_by(jti=jti).first()
        if session_token:
            session_token.is_revoked = True
            session_token.revoked_at = datetime.utcnow()
            session_token.revocation_reason = 'user_logout'
        
        # Clear session data
        session.clear()
        
        db.session.commit()
        
        log_security_event('user_logout', {'user_id': user_id})
        
        return jsonify({"success": True, "message": "Successfully logged out"}), 200
        
    except Exception as err:
        logger.error("logout_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Logout failed"}), 500

@auth_bp.route('/logout-all', methods=['POST'])
@jwt_required()
@security_headers()
def logout_all_sessions():
    """Logout from all sessions."""
    try:
        user_id = get_jwt_identity()
        
        # Revoke all active sessions for the user
        SessionToken.query.filter_by(user_id=user_id, is_revoked=False).update({
            'is_revoked': True,
            'revoked_at': datetime.utcnow(),
            'revocation_reason': 'logout_all_sessions'
        })
        
        db.session.commit()
        
        log_security_event('logout_all_sessions', {'user_id': user_id})
        
        return jsonify({"success": True, "message": "Logged out from all sessions"}), 200
        
    except Exception as err:
        logger.error("logout_all_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Logout all failed"}), 500

@auth_bp.route('/sessions', methods=['GET'])
@jwt_required()
@security_headers()
def get_active_sessions():
    try:
        user_id = get_jwt_identity()
        current_jti = get_jwt()['jti']
        
        sessions = SessionToken.query.filter_by(
            user_id=user_id,
            is_revoked=False
        ).order_by(SessionToken.issued_at.desc()).all()
        
        session_list = []
        for session in sessions:
            session_list.append({
                'id': session.id,
                'ip_address': session.ip_address,
                'user_agent': session.user_agent,
                'created_at': session.created_at.isoformat(),
                'last_activity': session.last_used_at.isoformat() if session.last_used_at else None,
                'is_current': session.jti == current_jti  # Changed from token_jti to jti
            })
        
        return jsonify({
            "success": True,
            "sessions": session_list
        }), 200
        
    except Exception as err:
        logger.error("get_sessions_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Failed to get sessions"}), 500

@auth_bp.route('/revoke-session/<int:session_id>', methods=['POST'])
@jwt_required()
@security_headers()
def revoke_session(session_id):
    """Revoke a specific session."""
    try:
        user_id = get_jwt_identity()
        
        session_token = SessionToken.query.filter_by(
            id=session_id,
            user_id=user_id,
            is_revoked=False
        ).first()
        
        if not session_token:
            return jsonify({"success": False, "error": "Session not found"}), 404
        
        session_token.is_revoked = True
        session_token.revoked_at = datetime.utcnow()
        session_token.revocation_reason = 'user_revoked'
        
        db.session.commit()
        
        log_security_event('session_revoked', {
            'user_id': user_id,
            'session_id': session_id
        })
        
        return jsonify({"success": True, "message": "Session revoked successfully"}), 200
        
    except Exception as err:
        logger.error("revoke_session_error", error=str(err), user_id=get_jwt_identity())
        return jsonify({"success": False, "error": "Failed to revoke session"}), 500

# Password reset functionality (placeholder - implement with email service)
@auth_bp.route('/request-password-reset', methods=['POST'])
@rate_limit(limit=3, window=3600)  # 3 requests per hour
@sanitize_request_data({'email': 'email'})
@security_headers()
def request_password_reset():
    """Request password reset with email verification."""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({"success": False, "error": "Email is required"}), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Generate reset token
            from app.models.security import PasswordResetToken
            token = PasswordResetToken.generate_token(
                user_id=user.id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            # Send password reset email
            from app.services.email_service import send_password_reset_email
            frontend_url = (current_app.config.get('FRONTEND_URL') or '').strip().rstrip('/')
            host = (request.headers.get('X-Forwarded-Host') or request.host or '').strip()
            proto = (request.headers.get('X-Forwarded-Proto') or request.scheme or '').strip()
            if not frontend_url and host:
                frontend_url = f"{proto}://{host}".rstrip('/')
            if not frontend_url:
                frontend_url = 'http://localhost:3000'
            if 'localhost:5173' in frontend_url:
                frontend_url = frontend_url.replace('localhost:5173', 'localhost:3000')
            email_sent = send_password_reset_email(user.email, token, frontend_url=frontend_url)
            
            if email_sent:
                log_security_event('password_reset_email_sent', {
                    'user_id': user.id,
                    'email': email
                })
            else:
                logger.error("Failed to send password reset email", user_id=user.id, email=email)
        
        # Always return success to prevent email enumeration
        log_security_event('password_reset_requested', {
            'email': email,
            'user_exists': user is not None
        })
        
        return jsonify({
            "success": True, 
            "message": "If the email exists, a password reset link has been sent"
        }), 200
        
    except Exception as err:
        logger.error("password_reset_request_error", error=str(err))
        return jsonify({"success": False, "error": "Password reset request failed"}), 500

@auth_bp.route('/reset-password', methods=['POST'])
@rate_limit(limit=5, window=3600)  # 5 resets per hour
@sanitize_request_data()
@security_headers()
def reset_password():
    """Reset password with token validation."""
    try:
        data = request.json
        token = data.get('token', '').strip()
        new_password = data.get('new_password', '').strip()
        confirm_password = data.get('confirm_password', '').strip()
        
        # Validate input
        if not token:
            return jsonify({"success": False, "error": "Reset token is required"}), 400
        
        if not new_password:
            return jsonify({"success": False, "error": "New password is required"}), 400
        
        if new_password != confirm_password:
            return jsonify({"success": False, "error": "Passwords do not match"}), 400
        
        # Validate password strength
        password_validation = PasswordSecurity.validate_password_strength(new_password)
        if not password_validation['is_valid']:
            return jsonify({
                "success": False, 
                "error": "Password does not meet security requirements",
                "requirements": password_validation['requirements']
            }), 400
        
        # Validate reset token
        from app.models.security import PasswordResetToken
        reset_token, error = PasswordResetToken.validate_token(token)
        
        if error:
            log_security_event('invalid_password_reset_token', {
                'token': token[:8] + '...',  # Log partial token for debugging
                'error': error,
                'ip_address': request.remote_addr
            })
            return jsonify({"success": False, "error": error}), 400
        
        # Get user and validate
        user = User.query.get(reset_token.user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        # Check password history to prevent reuse
        if PasswordSecurity.is_password_reused(user.id, new_password):
            return jsonify({
                "success": False, 
                "error": "Cannot reuse a recent password. Please choose a different password."
            }), 400
        
        # Update password
        user.set_password_hash(new_password)
        user.password_changed_at = datetime.utcnow()
        
        # Store new password in history
        password_history = PasswordHistory(
            user_id=user.id,
            password_hash=user.password_hash
        )
        db.session.add(password_history)
        
        # Mark token as used
        reset_token.mark_as_used()
        
        # Revoke all existing sessions for security
        SessionToken.query.filter_by(user_id=user.id, is_revoked=False).update({'is_revoked': True})
        
        db.session.commit()
        
        log_security_event('password_reset_completed', {
            'user_id': user.id,
            'email': user.email
        })
        
        return jsonify({
            "success": True, 
            "message": "Password has been reset successfully. Please log in with your new password."
        }), 200
        
    except Exception as err:
        logger.error("password_reset_error", error=str(err))
        return jsonify({"success": False, "error": "Password reset failed"}), 500


@auth_bp.route('/claim-account', methods=['POST'])
@rate_limit(limit=5, window=3600)  # 5 claim attempts per hour
@sanitize_request_data()
@security_headers()
def claim_account():
    """Claim a student account by establishing password credentials."""
    import hashlib
    from datetime import datetime
    from app.models.student import Student
    
    try:
        data = request.json or {}
        token = data.get('token', '').strip()
        new_password = data.get('new_password', '').strip()
        confirm_password = data.get('confirm_password', '').strip()
        
        if not token:
            return jsonify({"success": False, "error": "Activation token is required"}), 400
            
        if not new_password:
            return jsonify({"success": False, "error": "New password is required"}), 400
            
        if new_password != confirm_password:
            return jsonify({"success": False, "error": "Passwords do not match"}), 400
            
        # Validate password strength
        is_valid, password_errors = PasswordSecurity.validate_password_strength(new_password)
        if not is_valid:
            return jsonify({
                "success": False,
                "error": "Password does not meet security requirements",
                "requirements": password_errors
            }), 400
            
        # Hash token using SHA-256
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        
        # Look up matching user
        user = User.query.filter_by(invitation_token_hash=token_hash).first()
        if not user or (user.invitation_expires_at and user.invitation_expires_at < datetime.utcnow()):
            log_security_event('invalid_account_claim_token', {
                'token': token[:8] + '...',
                'ip_address': request.remote_addr
            })
            return jsonify({"success": False, "error": "Invalid or expired activation link"}), 400
            
        # Overwrite default null password credentials
        user.set_password(new_password)
        user.password_changed_at = datetime.utcnow()
        
        # Transition profiles active status flags
        user.status = 'active'
        user.is_active = True
        user.email_verified = True
        
        # Nullify token hashes
        user.invitation_token_hash = None
        user.invitation_expires_at = None
        
        # Look up matching student
        student = Student.query.filter_by(user_id=user.id).first()
        if student:
            student.status = 'active'
            student.invitation_token_hash = None
            student.invitation_expires_at = None
            
        db.session.commit()
        
        log_security_event('account_claim_completed', {
            'user_id': user.id,
            'email': user.email
        })
        
        return jsonify({
            "success": True,
            "message": "Account activated successfully. You can now log in with your new password."
        }), 200
        
    except Exception as err:
        db.session.rollback()
        logger.error("account_claim_error", error=str(err))
        return jsonify({"success": False, "error": "Account activation failed"}), 500

