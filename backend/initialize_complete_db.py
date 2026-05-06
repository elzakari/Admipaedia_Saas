#!/usr/bin/env python3
"""
Complete database initialization script for ADMIPAEDIA
This script creates all tables and initializes the database with default data.
"""

from app import create_app
from app.extensions import db
from app.db_init import init_db
import structlog

logger = structlog.get_logger()

def initialize_complete_database():
    """Initialize the complete database with all tables and default data."""
    app = create_app()
    
    with app.app_context():
        try:
            print("=== ADMIPAEDIA Database Initialization ===")
            
            # Step 1: Create all tables
            print("Creating all database tables...")
            db.create_all()
            print("✓ All database tables created successfully")
            
            # Step 2: Initialize with default data
            print("Initializing database with default data...")
            init_db()
            print("✓ Database initialized with default data")
            
            # Step 3: Verify critical tables exist
            print("Verifying critical tables...")
            
            # Check if security tables exist
            from sqlalchemy import text
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
                    print("✗ login_attempts table missing")
                
                # Check users table
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'users'
                    );
                """))
                if result.fetchone()[0]:
                    print("✓ users table exists")
                else:
                    print("✗ users table missing")
                
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
                    print("✗ session_tokens table missing")
            
            print("\n=== Database Initialization Complete ===")
            print("You can now start the backend server with: python run.py")
            
        except Exception as e:
            print(f"✗ Database initialization failed: {str(e)}")
            logger.error("Database initialization failed", error=str(e))
            raise

if __name__ == "__main__":
    initialize_complete_database()