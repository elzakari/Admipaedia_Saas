"""
Configuration Management Module for ADMIPAEDIA
Centralized configuration with environment-specific settings
"""

import os
from datetime import timedelta
from .enhanced_auth_config import EnhancedAuthConfig

class BaseConfig:
    """Base configuration with common settings"""
    
    # Core Flask Settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-me')
    STRICT_SLASHES = False
    
    # Database Configuration
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    DATABASE_QUERY_TIMEOUT = 30
    SLOW_QUERY_THRESHOLD = 1.0
    AUTO_CREATE_DB = os.environ.get('AUTO_CREATE_DB', 'False').lower() in ('true', 'yes', '1')
    INIT_DB_ON_START = os.environ.get('INIT_DB_ON_START', 'False').lower() in ('true', 'yes', '1')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-key-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ALGORITHM = 'HS256'
    
    # Redis Configuration
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    # Email Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() in ('true', 'yes', '1')
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() in ('true', 'yes', '1')
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', MAIL_USERNAME)
    
    # Provider-based Email Configuration
    EMAIL_PROVIDER = os.environ.get('EMAIL_PROVIDER', 'smtp')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    EMAIL_FROM_ADDRESS = os.environ.get('EMAIL_FROM_ADDRESS', 'support@admipaedia.easymsdigit.com')
    EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'Admipaedia Support')
    RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
    
    # Frontend Configuration
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    
    # Security Configuration
    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT', 'dev-salt-change-me')
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    
    # Celery Configuration
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    # Enhanced Authentication
    ENHANCED_AUTH = EnhancedAuthConfig()

    @staticmethod
    def init_app(app):
        pass



class DevelopmentConfig(BaseConfig):
    """Development environment configuration"""
    
    DEBUG = True
    TESTING = False
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'postgresql://postgres:postgres@localhost:5432/admipaedia'
    )
    
    # Security (relaxed for development)
    WTF_CSRF_ENABLED = False
    
    # Logging
    LOG_LEVEL = 'DEBUG'
    
    # Email (suppress in development if no credentials)
    MAIL_SUPPRESS_SEND = os.environ.get('MAIL_USERNAME') is None
    
    # CORS (permissive for development)
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',') if os.environ.get('CORS_ORIGINS') else [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    INIT_DB_ON_START = True
    AUTO_CREATE_DB = True


class ProductionConfig(BaseConfig):
    """Production environment configuration"""
    
    DEBUG = False
    TESTING = False
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    
    # Security (strict for production)
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Logging
    LOG_LEVEL = 'INFO'
    
    # CORS (restrictive for production)
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')
    
    # SSL/TLS
    PREFERRED_URL_SCHEME = 'https'

    @classmethod
    def init_app(cls, app):
        BaseConfig.init_app(app)
        # Verify critical production secrets
        required_keys = ['SECRET_KEY', 'JWT_SECRET_KEY', 'SQLALCHEMY_DATABASE_URI']
        for key in required_keys:
            if not app.config.get(key) and not getattr(cls, key, None):
                 # Check environment directly as fallback if config not fully loaded yet
                 if not os.environ.get(key):
                    raise ValueError(f"{key} must be set in production configuration")


class TestingConfig(BaseConfig):
    """Testing environment configuration"""
    
    TESTING = True
    DEBUG = True
    ALLOW_PUBLIC_REGISTRATION = True
    
    # Database (separate test database)
    url = os.environ.get('TEST_DB_URL') or os.environ.get('DATABASE_URL') or 'sqlite:///:memory:'
    if url.startswith('postgresql://'):
        url = url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    SQLALCHEMY_DATABASE_URI = url
    import sqlalchemy
    SQLALCHEMY_ENGINE_OPTIONS = {"poolclass": sqlalchemy.pool.NullPool}
    
    # Security (disabled for testing)
    WTF_CSRF_ENABLED = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=1)
    
    # Email (suppressed for testing)
    MAIL_SUPPRESS_SEND = True
    
    # Logging
    LOG_LEVEL = 'WARNING'


# Configuration mapping
config_mapping = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name=None):
    """Get configuration class based on environment"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    return config_mapping.get(config_name, DevelopmentConfig)


# Export commonly used configurations
Config = DevelopmentConfig  # For backward compatibility
