"""
Setup script for Enhanced Authentication System
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app, db
from app.models.enhanced_auth import MFADevice, TrustedDevice, AuthenticationAttempt, PasswordResetToken, UserSecuritySettings, SecurityAuditLog
from app.config.enhanced_auth_config import EnhancedAuthConfig
from flask_migrate import upgrade
import structlog

logger = structlog.get_logger()

def setup_enhanced_auth():
    """Setup enhanced authentication system"""
    
    print("🔐 Setting up Enhanced Authentication System for ADMIPAEDIA...")
    
    # Create Flask app
    app = create_app()
    
    with app.app_context():
        try:
            # Validate configuration
            print("📋 Validating configuration...")
            config_errors = EnhancedAuthConfig.validate_config()
            if config_errors:
                print("❌ Configuration errors found:")
                for error in config_errors:
                    print(f"   - {error}")
                return False
            
            print("✅ Configuration validated successfully")
            
            # Run database migrations
            print("🗄️  Running database migrations...")
            try:
                upgrade()
                print("✅ Database migrations completed")
            except Exception as e:
                print(f"⚠️  Migration warning: {e}")
                print("   This might be normal if migrations are already up to date")
            
            # Create tables if they don't exist
            print("🏗️  Creating database tables...")
            db.create_all()
            print("✅ Database tables created/verified")
            
            # Initialize default security settings
            print("⚙️  Initializing default security settings...")
            
            # Check if we need to create default settings for existing users
            from app.models.user import User
            users_without_settings = User.query.outerjoin(UserSecuritySettings).filter(
                UserSecuritySettings.id.is_(None)
            ).all()
            
            for user in users_without_settings:
                default_settings = UserSecuritySettings(
                    user_id=user.id,
                    mfa_enabled=False,
                    login_notifications=True,
                    security_alerts=True,
                    session_timeout=EnhancedAuthConfig.SESSION_TIMEOUT.total_seconds(),
                    max_concurrent_sessions=EnhancedAuthConfig.MAX_CONCURRENT_SESSIONS
                )
                db.session.add(default_settings)
            
            db.session.commit()
            print(f"✅ Created default security settings for {len(users_without_settings)} users")
            
            # Log setup completion
            audit_log = SecurityAuditLog(
                event_type='system_setup',
                description='Enhanced Authentication System setup completed',
                ip_address='127.0.0.1',
                user_agent='Setup Script',
                details={
                    'setup_time': str(datetime.utcnow()),
                    'features_enabled': {
                        'mfa': True,
                        'device_tracking': True,
                        'threat_detection': EnhancedAuthConfig.THREAT_DETECTION_ENABLED,
                        'ip_geolocation': EnhancedAuthConfig.IP_GEOLOCATION_ENABLED,
                        'security_audit': EnhancedAuthConfig.SECURITY_AUDIT_ENABLED
                    }
                }
            )
            db.session.add(audit_log)
            db.session.commit()
            
            print("\n🎉 Enhanced Authentication System setup completed successfully!")
            print("\n📊 System Features:")
            print(f"   ✅ Multi-Factor Authentication (MFA)")
            print(f"   ✅ Device Tracking & Trusted Devices")
            print(f"   ✅ Session Management")
            print(f"   ✅ Password Security")
            print(f"   {'✅' if EnhancedAuthConfig.THREAT_DETECTION_ENABLED else '❌'} Threat Detection")
            print(f"   {'✅' if EnhancedAuthConfig.IP_GEOLOCATION_ENABLED else '❌'} IP Geolocation")
            print(f"   {'✅' if EnhancedAuthConfig.SECURITY_AUDIT_ENABLED else '❌'} Security Audit Logging")
            print(f"   {'✅' if EnhancedAuthConfig.MFA_EMAIL_ENABLED else '❌'} Email MFA")
            print(f"   {'✅' if EnhancedAuthConfig.MFA_SMS_ENABLED else '❌'} SMS MFA")
            
            print("\n🔗 Available Endpoints:")
            print("   POST /api/v1/auth/enhanced/login-enhanced")
            print("   POST /api/v1/auth/enhanced/mfa/setup")
            print("   POST /api/v1/auth/enhanced/mfa/verify")
            print("   GET  /api/v1/auth/enhanced/devices/trusted")
            print("   DELETE /api/v1/auth/enhanced/devices/trusted/<id>")
            print("   GET  /api/v1/auth/enhanced/security/settings")
            print("   PUT  /api/v1/auth/enhanced/security/settings")
            print("   GET  /api/v1/auth/enhanced/sessions")
            print("   DELETE /api/v1/auth/enhanced/sessions/<id>")
            
            print("\n📝 Next Steps:")
            print("   1. Configure environment variables for external services")
            print("   2. Test the authentication endpoints")
            print("   3. Set up monitoring and alerting")
            print("   4. Review security policies")
            
            return True
            
        except Exception as e:
            logger.error("setup_failed", error=str(e))
            print(f"❌ Setup failed: {e}")
            return False

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'pyotp',
        'qrcode',
        'Pillow',
        'twilio',
        'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\nInstall missing packages with:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    return True

if __name__ == '__main__':
    from datetime import datetime
    
    print("🚀 ADMIPAEDIA Enhanced Authentication Setup")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Run setup
    if setup_enhanced_auth():
        print("\n✅ Setup completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Setup failed!")
        sys.exit(1)