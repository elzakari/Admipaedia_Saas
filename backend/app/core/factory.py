"""
Application Factory Pattern Implementation
"""

import os
from flask import Flask
from app.config import get_config
from .extensions import init_extensions
from .blueprints import register_blueprints
from .middleware import register_middleware
from .error_handlers import register_error_handlers


def create_app(config_name=None):
    """
    Application factory function
    
    Args:
        config_name (str): Configuration environment name
        
    Returns:
        Flask: Configured Flask application instance
    """
    
    # Create Flask application
    app = Flask(__name__)
    app.url_map.strict_slashes = False  # Accept /path and /path/ without 308 redirects
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Initialize config (including production checks)
    config_class.init_app(app)
    
    # Initialize extensions
    init_extensions(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register middleware
    register_middleware(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Application context setup
    with app.app_context():
        # Import models to ensure they're registered
        from app import models
        
        from app.extensions import db
        if (app.config.get('AUTO_CREATE_DB') or app.config.get('INIT_DB_ON_START')) and not app.config.get('TESTING'):
            db.create_all()

        if app.config.get('INIT_DB_ON_START') and not app.config.get('TESTING'):
            try:
                from app.db_init import init_db
                init_db()
            except Exception:
                pass
    
    return app
