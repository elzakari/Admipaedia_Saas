"""
ADMIPAEDIA Application Runner
Development server with improved configuration management
"""

import os
from dotenv import load_dotenv
load_dotenv()

import eventlet
eventlet.monkey_patch()

from app import create_app
from app.extensions import socketio

# Get configuration from environment
config_name = os.environ.get('FLASK_ENV', 'development')

# Create application
app = create_app(config_name)

if __name__ == '__main__':
    # Development server configuration
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"Starting ADMIPAEDIA v2.0.0")
    print(f"Environment: {config_name}")
    print(f"Server: http://{host}:{port}")
    print(f"Debug Mode: {debug}")
    
    # Run with SocketIO support
    socketio.run(
        app,
        host=host,
        port=port,
        debug=debug,
        use_reloader=False,
        log_output=debug
    )
