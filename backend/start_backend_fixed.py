#!/usr/bin/env python3
"""
Fixed backend startup script that ensures database is properly initialized.
"""

import os
import sys
from app import create_app
from app.extensions import db
from sqlalchemy import text

def check_and_fix_database():
    """Check if database is properly initialized and fix if needed."""
    app = create_app()
    
    with app.app_context():
        try:
            # Import all models to ensure they're registered
            from app.models.security import LoginAttempt, SecurityEvent, PasswordHistory, APIKey
            from app.models.session_token import SessionToken
            from app.models.user import User
            
            # Create all tables
            print("Creating/updating database tables...")
            db.create_all()
            
            # Initialize default data
            from app.db_init import init_db
            init_db()
            
            # Verify critical tables exist
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'login_attempts'
                    );
                """))
                login_attempts_exists = result.fetchone()[0]
                
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'users'
                    );
                """))
                users_exists = result.fetchone()[0]
                
                if login_attempts_exists and users_exists:
                    print("✓ Database is properly initialized")
                    return True
                else:
                    print("✗ Database initialization failed")
                    return False
                    
        except Exception as e:
            print(f"Database initialization error: {e}")
            return False

def start_server():
    """Start the backend server."""
    print("Starting ADMIPAEDIA backend server...")
    print("Server will be available at: http://localhost:5000")
    print("API endpoints available at: http://localhost:5000/api/v1/")
    print("Press Ctrl+C to stop the server")
    
    # Import and start the server
    try:
        import eventlet_patch
        import eventlet
        eventlet.monkey_patch()
        
        from app import socketio
        app = create_app()
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    except ImportError:
        # Fallback if eventlet is not available
        app = create_app()
        app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == "__main__":
    try:
        # Step 1: Check and fix database
        if check_and_fix_database():
            # Step 2: Start the server
            start_server()
        else:
            print("Failed to initialize database. Please check your database connection.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
        sys.exit(0)
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)