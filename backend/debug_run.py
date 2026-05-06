#!/usr/bin/env python3
"""
Enhanced debug startup script for ADMIPAEDIA backend
Provides comprehensive logging, error tracking, and debugging capabilities
"""

import sys
import os
import logging
from datetime import datetime
from pathlib import Path

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import and apply eventlet patch BEFORE other imports
import eventlet_patch
import eventlet
eventlet.monkey_patch()

# Configure logging before importing Flask app
def setup_debug_logging():
    """Setup comprehensive debug logging"""
    
    # Create logs directory if it doesn't exist
    logs_dir = Path(project_root) / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(logs_dir / f'debug_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
        ]
    )
    
    # Configure specific loggers
    loggers_config = {
        'werkzeug': logging.DEBUG,
        'flask': logging.DEBUG,
        'sqlalchemy.engine': logging.INFO,  # SQL queries
        'sqlalchemy.pool': logging.DEBUG,   # Connection pool
        'socketio': logging.DEBUG,
        'engineio': logging.DEBUG,
        'eventlet': logging.INFO,
        'app': logging.DEBUG,  # Our application logger
    }
    
    for logger_name, level in loggers_config.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
    
    print(f"🔧 Debug logging configured - logs saved to: {logs_dir}")

def setup_environment():
    """Setup debug environment variables"""
    debug_env = {
        'FLASK_ENV': 'development',
        'FLASK_DEBUG': '1',
        'WERKZEUG_DEBUG_PIN': 'off',  # Disable PIN for easier debugging
        'PYTHONUNBUFFERED': '1',      # Ensure immediate output
        'SQLALCHEMY_ECHO': '0',       # Disable SQL logging for performance
    }
    
    for key, value in debug_env.items():
        os.environ.setdefault(key, value)
    
    print("🔧 Debug environment variables configured")

def print_debug_info():
    """Print debug information"""
    print("\n" + "="*60)
    print("🚀 ADMIPAEDIA DEBUG MODE STARTUP")
    print("="*60)
    print(f"📁 Project Root: {project_root}")
    print(f"🐍 Python Version: {sys.version}")
    print(f"🌐 Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"🔍 Debug Mode: {os.environ.get('FLASK_DEBUG', 'True')}")
    print(f"📊 SQL Logging: {os.environ.get('SQLALCHEMY_ECHO', 'True')}")
    print(f"🔌 SocketIO Debug: Enabled")
    print("="*60)
    print("📋 Available Debug Endpoints:")
    print("   • Backend API: http://localhost:5000/api/v1/")
    print("   • Health Check: http://localhost:5000/api/v1/health")
    print("   • SocketIO: ws://localhost:5000")
    print("="*60)
    print("🛠️  Debug Features Enabled:")
    print("   • Real-time code reloading")
    print("   • Enhanced error messages")
    print("   • SQL query logging")
    print("   • Performance monitoring")
    print("   • WebSocket debugging")
    print("="*60 + "\n")

def main():
    """Main debug startup function"""
    try:
        # Setup debug environment
        setup_environment()
        setup_debug_logging()
        print_debug_info()
        
        # Import Flask app after environment setup
        from app import create_app, socketio
        
        # Create app with debug configuration
        app = create_app()
        
        # Enable additional debug features
        app.config['DEBUG'] = True
        app.config['TESTING'] = False
        app.config['SQLALCHEMY_ECHO'] = True
        app.config['SQLALCHEMY_RECORD_QUERIES'] = True
        
        # Add debug routes
        @app.route('/debug/info')
        def debug_info():
            """Debug information endpoint"""
            return {
                'status': 'debug_mode',
                'timestamp': datetime.now().isoformat(),
                'environment': os.environ.get('FLASK_ENV'),
                'debug': app.debug,
                'config': {k: str(v) for k, v in app.config.items() if not k.startswith('SECRET')}
            }
        
        @app.route('/debug/logs')
        def debug_logs():
            """Recent logs endpoint"""
            logs_dir = Path(project_root) / 'logs'
            if logs_dir.exists():
                log_files = list(logs_dir.glob('*.log'))
                return {
                    'log_files': [str(f.name) for f in log_files],
                    'logs_directory': str(logs_dir)
                }
            return {'message': 'No log files found'}
        
        print("🎯 Starting ADMIPAEDIA in DEBUG mode...")
        print("💡 Press Ctrl+C to stop the server")
        print("🔄 Auto-reload enabled - code changes will restart the server")
        
        # Start the application with enhanced debugging
        socketio.run(
            app,
            debug=True,
            host='0.0.0.0',
            port=5000,
            use_reloader=True,
            log_output=True
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Debug server stopped by user")
    except Exception as e:
        logging.error(f"Failed to start debug server: {e}", exc_info=True)
        print(f"❌ Error starting debug server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()