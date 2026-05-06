"""
Force reset database connection and clear failed transaction state
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def force_reset_database():
    """Force reset the database connection and clear transaction state"""
    
    # Database connection parameters
    db_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'admipaedia_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'password')
    }
    
    print("🔄 Force resetting database connection...")
    
    try:
        # Create a direct psycopg2 connection with autocommit
        conn = psycopg2.connect(**db_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✅ Connected to database with autocommit")
        
        # Terminate any idle/aborted transactions
        print("🧹 Terminating idle and aborted transactions...")
        cursor.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = %s 
            AND state IN ('idle in transaction (aborted)', 'idle in transaction')
            AND pid != pg_backend_pid()
        """, (db_params['database'],))
        
        terminated_count = cursor.rowcount
        print(f"🔄 Terminated {terminated_count} idle/aborted transactions")
        
        # Check current alembic version state
        print("📋 Checking current migration state...")
        cursor.execute("SELECT version_num FROM alembic_version ORDER BY version_num")
        versions = cursor.fetchall()
        
        if versions:
            print(f"📊 Found {len(versions)} migration versions:")
            for version in versions:
                print(f"   - {version[0]}")
        else:
            print("⚠️  No migration versions found")
        
        # Clear all migration versions and set to a clean base
        print("🧹 Clearing migration state...")
        cursor.execute("DELETE FROM alembic_version")
        
        # Set to database_schema_optimization as the base
        cursor.execute("INSERT INTO alembic_version (version_num) VALUES (%s)", 
                      ('database_schema_optimization',))
        
        print("✅ Set migration base to: database_schema_optimization")
        
        # Verify the reset
        cursor.execute("SELECT version_num FROM alembic_version")
        current_version = cursor.fetchone()
        print(f"🎯 Current migration version: {current_version[0] if current_version else 'None'}")
        
        cursor.close()
        conn.close()
        
        print("✅ Database connection reset successfully!")
        print("\n🚀 Now run: flask db upgrade")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during database reset: {e}")
        return False

if __name__ == "__main__":
    success = force_reset_database()
    if success:
        print("\n✅ Database reset completed successfully!")
        print("You can now run 'flask db upgrade' to apply pending migrations.")
    else:
        print("\n❌ Database reset failed. Please check the error messages above.")