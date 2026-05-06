"""
Reset database connection and clear failed transaction state
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def reset_database_connection():
    """Reset the database connection and clear any failed transaction state"""
    try:
        # Get database connection parameters
        db_host = os.environ.get('DB_HOST', 'localhost')
        db_port = os.environ.get('DB_PORT', '5432')
        db_name = os.environ.get('DB_NAME', 'admipaedia_db')
        db_user = os.environ.get('DB_USER', 'postgres')
        db_password = os.environ.get('DB_PASSWORD', 'password')
        
        print("🔄 Connecting to database...")
        
        # Create direct psycopg2 connection with autocommit
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        try:
            print("📋 Checking current migration state...")
            
            # Check if alembic_version table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'alembic_version'
                );
            """)
            
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                print("⚠️  alembic_version table does not exist. Creating it...")
                cursor.execute("""
                    CREATE TABLE alembic_version (
                        version_num VARCHAR(32) NOT NULL,
                        CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                    );
                """)
                print("✅ alembic_version table created")
                return True
            
            # Get current versions
            cursor.execute("SELECT version_num FROM alembic_version ORDER BY version_num;")
            versions = [row[0] for row in cursor.fetchall()]
            
            print(f"Current migration versions: {versions}")
            
            # If there are multiple versions, clean them up
            if len(versions) > 1:
                print("⚠️  Multiple migration versions detected. Cleaning up...")
                
                # Clear all versions first
                cursor.execute("DELETE FROM alembic_version;")
                print("🗑️  Cleared all migration versions")
                
                # Insert a safe base version
                cursor.execute("INSERT INTO alembic_version (version_num) VALUES ('database_schema_optimization');")
                print("✅ Set migration to database_schema_optimization")
                
            elif len(versions) == 0:
                print("⚠️  No migration versions found. Setting base version...")
                cursor.execute("INSERT INTO alembic_version (version_num) VALUES ('database_schema_optimization');")
                print("✅ Set migration to database_schema_optimization")
            
            # Terminate any idle transactions
            print("🧹 Cleaning up idle transactions...")
            cursor.execute("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE state IN ('idle in transaction', 'idle in transaction (aborted)')
                AND pid != pg_backend_pid()
                AND datname = current_database();
            """)
            
            terminated_count = cursor.rowcount
            if terminated_count > 0:
                print(f"✅ Terminated {terminated_count} idle transactions")
            else:
                print("✅ No idle transactions to clean up")
            
            print("✅ Database connection reset completed successfully")
            return True
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"❌ Error resetting database connection: {str(e)}")
        return False

def create_clean_migration():
    """Create a clean migration to resolve conflicts"""
    try:
        print("🔧 Creating clean migration...")
        
        # Use Flask-Migrate to create a new migration
        os.system('flask db revision -m "resolve_migration_conflicts_clean"')
        
        print("✅ Clean migration created")
        return True
        
    except Exception as e:
        print(f"❌ Error creating clean migration: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting database connection reset...")
    
    # Reset the database connection and clean up versions
    if reset_database_connection():
        print("\n✅ Database reset completed successfully!")
        print("\nNow try running:")
        print("  flask db upgrade")
        print("\nIf that still fails, try:")
        print("  flask db stamp head")
        print("  flask db upgrade")
    else:
        print("\n❌ Database reset failed. Please check the error messages above.")