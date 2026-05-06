#!/usr/bin/env python3
"""
Backend startup script for ADMIPAEDIA
This script initializes the database if needed and starts the backend server.
"""

import os
import sys
from app import create_app
from app.extensions import db
from sqlalchemy import text

def check_database_initialized():
    """Check if the database is properly initialized."""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if critical tables exist
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'users'
                    );
                """))
                users_table_exists = result.fetchone()[0]
                
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'login_attempts'
                    );
                """))
                login_attempts_exists = result.fetchone()[0]
                
                return users_table_exists and login_attempts_exists
        except Exception as e:
            print(f"Database check failed: {e}")
            return False

def initialize_if_needed():
    """Initialize database if it's not already initialized."""
    if not check_database_initialized():
        print("Database not initialized. Initializing now...")
        os.system("python initialize_complete_db.py")
    else:
        print("Database already initialized.")

def start_server():
    """Start the backend server."""
    print("Starting ADMIPAEDIA backend server...")
    print("Server will be available at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    
    # Import and start the server
    import eventlet_patch
    import eventlet
    eventlet.monkey_patch()
    
    from app import socketio
    app = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)

if __name__ == "__main__":
    try:
        # Step 1: Check and initialize database if needed
        initialize_if_needed()
        
        # Step 2: Start the server
        start_server()
        
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
        sys.exit(0)
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)