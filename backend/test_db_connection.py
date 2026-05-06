#!/usr/bin/env python3
"""
Database connection test script to diagnose login issues.
"""

from app import create_app
from app.extensions import db
from app.models.user import User
from sqlalchemy import text
import sys

def test_database_connection():
    """Test database connection and basic operations."""
    app = create_app()
    
    with app.app_context():
        try:
            # Test 1: Basic database connection
            print("Testing database connection...")
            with db.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                print("✓ Database connection successful")
            
            # Test 2: Check if users table exists
            print("\nChecking if users table exists...")
            with db.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'users'
                    );
                """))
                table_exists = result.fetchone()[0]
            
            if table_exists:
                print("✓ Users table exists")
                
                # Test 3: Try to query users table
                print("\nTesting users table query...")
                users = User.query.limit(5).all()
                print(f"✓ Successfully queried users table. Found {len(users)} users")
                
                # Test 4: Check if admin user exists
                admin_user = User.query.filter_by(username='admin').first()
                if admin_user:
                    print("✓ Admin user exists")
                    print(f"  - Username: {admin_user.username}")
                    print(f"  - Email: {admin_user.email}")
                    print(f"  - Role: {admin_user.role}")
                    
                    # Test 5: Test password verification
                    print("\nTesting password verification...")
                    if admin_user.check_password_hash('admin123'):
                        print("✓ Admin password verification works")
                    else:
                        print("⚠ Admin password verification failed - this might be the login issue")
                else:
                    print("⚠ Admin user not found")
                    
            else:
                print("✗ Users table does not exist")
                print("\nRunning database initialization...")
                
                # Try to create tables
                db.create_all()
                print("✓ Database tables created")
                
                # Run initialization script
                from app.db_init import init_db
                init_db()
                print("✓ Database initialized with default data")
                
        except Exception as e:
            print(f"✗ Database error: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return False
            
    return True

if __name__ == '__main__':
    print("=== Database Connection Test ===")
    success = test_database_connection()
    
    if success:
        print("\n✓ All database tests passed")
        sys.exit(0)
    else:
        print("\n✗ Database tests failed")
        sys.exit(1)