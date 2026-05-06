#!/usr/bin/env python3
"""
Debug startup script for ADMIPAEDIA backend with enhanced logging and monitoring.
"""

import sys
import os
import logging
from datetime import datetime

# Add the project root to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

# Import and apply the patch BEFORE any other imports
import eventlet_patch
import eventlet
eventlet.monkey_patch()

# Configure enhanced logging for debug mode
def setup_debug_logging():
    """Setup comprehensive logging for debug mode."""
    
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Configure root logger with UTF-8 encoding
    log_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
    )
    
    # File handler with UTF-8 encoding
    file_handler = logging.FileHandler(
        os.path.join(logs_dir, f'debug_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        mode='w',
        encoding='utf-8'
    )
    file_handler.setFormatter(log_formatter)
    
    # Console handler with UTF-8 encoding
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Set specific logger levels for detailed debugging
    loggers_config = {
        'werkzeug': logging.DEBUG,
        'sqlalchemy.engine': logging.INFO,  # SQL queries
        'sqlalchemy.pool': logging.DEBUG,   # Connection pool
        'flask': logging.DEBUG,
        'socketio': logging.DEBUG,
        'eventlet': logging.INFO,
        'app': logging.DEBUG,  # Our application logger
    }
    
    for logger_name, level in loggers_config.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
    
    print(f"Debug logging configured. Logs will be saved to: {logs_dir}")

def setup_environment():
    """Setup debug environment variables."""
    debug_env = {
        'FLASK_ENV': 'development',
        'FLASK_DEBUG': 'True',
        'DEBUG': 'True',
        'LOG_LEVEL': 'DEBUG',
        'PYTHONUNBUFFERED': '1',  # Ensure immediate output
        'WERKZEUG_DEBUG_PIN': 'off',  # Disable PIN for easier debugging
        'PYTHONIOENCODING': 'utf-8',  # Set Python IO encoding to UTF-8
    }
    
    for key, value in debug_env.items():
        os.environ[key] = value
    
    print("Debug environment variables configured")

def main():
    """Main function to start the debug backend server."""
    print("Starting ADMIPAEDIA Backend in Debug Mode")
    print("=" * 50)
    
    # Setup environment and logging
    setup_environment()
    setup_debug_logging()
    
    # Add backend directory to Python path
    backend_path = os.path.join(os.path.dirname(__file__), 'backend')
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    
    try:
        # Import application after environment setup
        from app import create_app, socketio
        
        # Create app with debug configuration
        app = create_app()
        
        # Enable additional debug features
        app.config['DEBUG'] = True
        app.config['TESTING'] = False
        app.config['PROPAGATE_EXCEPTIONS'] = True
        
        # Log startup information
        logger = logging.getLogger(__name__)
        logger.info("Debug mode enabled")
        logger.info(f"Flask Debug: {app.debug}")
        logger.info(f"Database URL: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not configured')}")
        logger.info(f"Redis URL: {app.config.get('REDIS_URL', 'Not configured')}")
        logger.info("CORS Origins configured for development")
        
        print("\nDebug Features Enabled:")
        print("   - Detailed logging to console and file")
        print("   - SQL query logging")
        print("   - Real-time error tracking")
        print("   - Performance monitoring")
        print("   - Auto-reload on code changes")
        print("   - Enhanced error messages")
        print("   - WebSocket debugging")
        
        print(f"\nServer will start on: http://localhost:5000")
        print("API endpoints available at: http://localhost:5000/api/v1/")
        print("Press Ctrl+C to stop the server")
        print("=" * 50)
        
        try:
            # Start the server with debug configuration
            socketio.run(
                app,
                debug=True,
                host='0.0.0.0',
                port=5000,
                use_reloader=True,  # Auto-reload on code changes
                log_output=True     # Enable request logging
            )
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
            print("\nDebug server stopped")
        except Exception as e:
            logger.error(f"Server startup failed: {e}", exc_info=True)
            print(f"\nServer startup failed: {e}")
            sys.exit(1)
    except ImportError as e:
        print(f"Import Error: {e}")
        print("This might be due to missing dependencies.")
        print("Please run: pip install -r backend/requirements.txt")
        print("   Or use the install_backend_deps.bat script")
        return
    except Exception as e:
        print(f"Error starting backend: {e}")
        return

if __name__ == '__main__':
    main()