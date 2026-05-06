"""
Enhanced Authentication Configuration for ADMIPAEDIA
"""

import os
from datetime import timedelta

class EnhancedAuthConfig:
    """Configuration for enhanced authentication features"""
    
    # JWT Configuration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ALGORITHM = 'HS256'
    
    # MFA Configuration
    MFA_ISSUER_NAME = os.environ.get('MFA_ISSUER_NAME', 'ADMIPAEDIA')
    MFA_BACKUP_CODES_COUNT = int(os.environ.get('MFA_BACKUP_CODES_COUNT', '10'))
    MFA_CODE_VALIDITY_WINDOW = int(os.environ.get('MFA_CODE_VALIDITY_WINDOW', '30'))  # seconds
    
    # Session Management
    MAX_CONCURRENT_SESSIONS = int(os.environ.get('MAX_CONCURRENT_SESSIONS', '5'))
    SESSION_TIMEOUT = timedelta(hours=int(os.environ.get('SESSION_TIMEOUT_HOURS', '8')))
    REMEMBER_ME_DURATION = timedelta(days=int(os.environ.get('REMEMBER_ME_DAYS', '30')))
    
    # Device Management
    TRUSTED_DEVICE_DURATION = timedelta(days=int(os.environ.get('TRUSTED_DEVICE_DAYS', '90')))
    MAX_TRUSTED_DEVICES = int(os.environ.get('MAX_TRUSTED_DEVICES', '10'))
    
    # Security Settings
    PASSWORD_RESET_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get('PASSWORD_RESET_HOURS', '24')))
    MAX_LOGIN_ATTEMPTS = int(os.environ.get('MAX_LOGIN_ATTEMPTS', '5'))
    LOCKOUT_DURATION = timedelta(minutes=int(os.environ.get('LOCKOUT_MINUTES', '30')))
    
    # Rate Limiting
    LOGIN_RATE_LIMIT = int(os.environ.get('LOGIN_RATE_LIMIT', '5'))  # attempts per window
    LOGIN_RATE_WINDOW = int(os.environ.get('LOGIN_RATE_WINDOW', '300'))  # seconds
    
    MFA_RATE_LIMIT = int(os.environ.get('MFA_RATE_LIMIT', '10'))
    MFA_RATE_WINDOW = int(os.environ.get('MFA_RATE_WINDOW', '300'))
    
    # Security Monitoring
    THREAT_DETECTION_ENABLED = os.environ.get('THREAT_DETECTION_ENABLED', 'true').lower() == 'true'
    IP_GEOLOCATION_ENABLED = os.environ.get('IP_GEOLOCATION_ENABLED', 'true').lower() == 'true'
    SECURITY_AUDIT_ENABLED = os.environ.get('SECURITY_AUDIT_ENABLED', 'true').lower() == 'true'
    
    # Email Configuration for MFA
    MFA_EMAIL_ENABLED = os.environ.get('MFA_EMAIL_ENABLED', 'false').lower() == 'true'
    MFA_SMS_ENABLED = os.environ.get('MFA_SMS_ENABLED', 'false').lower() == 'true'
    
    # Twilio Configuration (for SMS MFA)
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')
    
    # IP Geolocation API
    IPGEOLOCATION_API_KEY = os.environ.get('IPGEOLOCATION_API_KEY')
    
    @classmethod
    def validate_config(cls):
        """Validate configuration settings"""
        errors = []
        
        if cls.MFA_SMS_ENABLED and not all([cls.TWILIO_ACCOUNT_SID, cls.TWILIO_AUTH_TOKEN, cls.TWILIO_PHONE_NUMBER]):
            errors.append("SMS MFA is enabled but Twilio configuration is incomplete")
        
        if cls.IP_GEOLOCATION_ENABLED and not cls.IPGEOLOCATION_API_KEY:
            errors.append("IP Geolocation is enabled but API key is missing")
        
        if cls.MAX_CONCURRENT_SESSIONS < 1:
            errors.append("MAX_CONCURRENT_SESSIONS must be at least 1")
        
        if cls.MFA_BACKUP_CODES_COUNT < 5:
            errors.append("MFA_BACKUP_CODES_COUNT should be at least 5")
        
        return errors