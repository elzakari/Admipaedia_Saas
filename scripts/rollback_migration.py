#!/usr/bin/env python3
"""
Rollback script for subject deletion migration
"""

import os
import sys
import subprocess
from datetime import datetime

def rollback_migration():
    """Rollback the migration using Alembic"""
    try:
        print("🔄 Rolling back migration...")
        result = subprocess.run(['alembic', 'downgrade', '-1'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Migration rollback completed")
            print(result.stdout)
            return True
        else:
            print("❌ Rollback failed:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Rollback error: {str(e)}")
        return False

def restore_from_backup(backup_file):
    """Restore database from backup file"""
    try:
        db_name = os.getenv('DATABASE_NAME', 'admipaedia')
        db_user = os.getenv('DATABASE_USER', 'postgres')
        db_host = os.getenv('DATABASE_HOST', 'localhost')
        db_port = os.getenv('DATABASE_PORT', '5432')
        
        cmd = [
            'psql',
            f'--host={db_host}',
            f'--port={db_port}',
            f'--username={db_user}',
            '--dbname=' + db_name,
            '--file=' + backup_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Database restored from: {backup_file}")
            return True
        else:
            print(f"❌ Restore failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Restore error: {str(e)}")
        return False

def main():
    print("🔙 Subject Deletion Migration Rollback")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        backup_file = sys.argv[1]
        print(f"\n📦 Restoring from backup: {backup_file}")
        if restore_from_backup(backup_file):
            print("✅ Rollback completed successfully")
        else:
            print("❌ Rollback failed")
    else:
        print("\n🔧 Rolling back migration...")
        if rollback_migration():
            print("✅ Migration rollback completed")
        else:
            print("❌ Migration rollback failed")

if __name__ == '__main__':
    main()