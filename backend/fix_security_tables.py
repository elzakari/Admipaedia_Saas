#!/usr/bin/env python3
"""
Script to create missing security tables that are causing the 500 error.
"""

from app import create_app
from app.extensions import db
from sqlalchemy import text
import structlog

logger = structlog.get_logger()

def create_security_tables():
    """Create missing security tables."""
    app = create_app()
    
    with app.app_context():
        try:
            print("=== Creating Missing Security Tables ===")
            
            # Import all models to ensure they're registered
            from app.models.security import LoginAttempt, SecurityEvent, PasswordHistory, APIKey
            from app.models.session_token import SessionToken
            
            # Create all tables
            db.create_all()
            print("✓ All tables created successfully")
            
            # Verify security tables exist
            with db.engine.connect() as conn:
                # Check login_attempts table
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'login_attempts'
                    );
                """))
                if result.fetchone()[0]:
                    print("✓ login_attempts table exists")
                else:
                    print("✗ login_attempts table still missing")
                
                # Check security_events table
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'security_events'
                    );
                """))
                if result.fetchone()[0]:
                    print("✓ security_events table exists")
                else:
                    print("✗ security_events table still missing")
                
                # Check session_tokens table
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'session_tokens'
                    );
                """))
                if result.fetchone()[0]:
                    print("✓ session_tokens table exists")
                else:
                    print("✗ session_tokens table still missing")
            
            print("\n=== Security Tables Creation Complete ===")
            print("You can now start the backend server.")
            
        except Exception as e:
            print(f"✗ Error creating security tables: {str(e)}")
            logger.error("Security tables creation failed", error=str(e))
            raise

if __name__ == "__main__":
    create_security_tables()