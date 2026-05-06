#!/usr/bin/env python3
"""
Script to fix database schema issues by adding missing columns.
"""

from app import create_app
from app.extensions import db
from sqlalchemy import text

def fix_database():
    """Add missing columns to the database."""
    app = create_app()
    
    with app.app_context():
        try:
            # Add profile_picture column to students table if it doesn't exist
            with db.engine.connect() as conn:
                conn.execute(text("""
                    ALTER TABLE students 
                    ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);
                """))
                conn.commit()
            print("✓ Added profile_picture column to students table")
            
            # Check if notifications table exists and has message column
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications' AND column_name = 'message';
                """))
                
                if not result.fetchone():
                    print("✗ Notifications table missing message column")
                    # The notifications table should have been created by the migration
                    # Let's check if the table exists at all
                    table_exists_result = conn.execute(text("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'notifications'
                        );
                    """))
                    table_exists = table_exists_result.fetchone()[0]
                    
                    if not table_exists:
                        print("Creating notifications table...")
                        conn.execute(text("""
                            CREATE TABLE notifications (
                                id VARCHAR(36) PRIMARY KEY,
                                title VARCHAR(100) NOT NULL,
                                message TEXT NOT NULL,
                                time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                read BOOLEAN DEFAULT FALSE,
                                type VARCHAR(20) NOT NULL,
                                user_id INTEGER REFERENCES users(id),
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            );
                        """))
                        conn.commit()
                        print("✓ Created notifications table")
                else:
                    print("✓ Notifications table has message column")
                
            print("Database schema fixes completed successfully!")
            
        except Exception as e:
            print(f"Error fixing database: {e}")
            raise

if __name__ == "__main__":
    fix_database()