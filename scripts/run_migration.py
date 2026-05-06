#!/usr/bin/env python3
"""
Script to execute the subject deletion migration safely
"""

import os
import sys
import subprocess
from datetime import datetime

def create_database_backup():
    """Create a full database backup before migration"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f"db_backup_before_subject_migration_{timestamp}.sql"
    
    try:
        # Adjust these variables according to your database configuration
        db_name = os.getenv('DATABASE_NAME', 'admipaedia')
        db_user = os.getenv('DATABASE_USER', 'postgres')
        db_host = os.getenv('DATABASE_HOST', 'localhost')
        db_port = os.getenv('DATABASE_PORT', '5432')
        
        cmd = [
            'pg_dump',
            f'--host={db_host}',
            f'--port={db_port}',
            f'--username={db_user}',
            '--verbose',
            '--clean',
            '--no-owner',
            '--no-privileges',
            db_name
        ]
        
        with open(backup_file, 'w') as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
        
        if result.returncode == 0:
            print(f"✅ Database backup created: {backup_file}")
            return backup_file
        else:
            print(f"❌ Backup failed: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Backup error: {str(e)}")
        return None

def run_migration():
    """Execute the Alembic migration"""
    try:
        print("🔄 Running migration...")
        result = subprocess.run(['alembic', 'upgrade', 'head'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Migration completed successfully")
            print(result.stdout)
            return True
        else:
            print("❌ Migration failed:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Migration error: {str(e)}")
        return False

def verify_migration():
    """Verify that the migration was applied correctly"""
    try:
        from app import create_app, db
        from app.models.subject import Subject
        
        app = create_app()
        with app.app_context():
            # Test that we can query subjects
            subjects = Subject.query.limit(1).all()
            print(f"✅ Migration verification passed. Found {len(subjects)} test subjects.")
            return True
            
    except Exception as e:
        print(f"❌ Migration verification failed: {str(e)}")
        return False

def main():
    print("🚀 Starting Subject Deletion Migration")
    print("=" * 50)
    
    # Step 1: Create database backup
    print("\n📦 Step 1: Creating database backup...")
    backup_file = create_database_backup()
    if not backup_file:
        print("❌ Cannot proceed without backup. Exiting.")
        sys.exit(1)
    
    # Step 2: Run migration
    print("\n🔧 Step 2: Executing migration...")
    if not run_migration():
        print("❌ Migration failed. Database backup available at:", backup_file)
        sys.exit(1)
    
    # Step 3: Verify migration
    print("\n✅ Step 3: Verifying migration...")
    if not verify_migration():
        print("❌ Migration verification failed. Consider rollback.")
        sys.exit(1)
    
    print("\n🎉 Migration completed successfully!")
    print(f"📦 Database backup: {backup_file}")
    print("\n📋 Next steps:")
    print("1. Test subject deletion functionality")
    print("2. Monitor application logs for any issues")
    print("3. Keep the backup file for rollback if needed")

if __name__ == '__main__':
    main()