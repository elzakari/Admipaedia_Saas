import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load env variables from root .env
load_dotenv()

def run_migration():
    """Migrate local PostgreSQL database to support branches configurations"""
    db_url = os.environ.get('DATABASE_URL')
    
    if not db_url:
        print("DATABASE_URL is not set in environment or .env!", file=sys.stderr)
        sys.exit(1)
        
    conn = None
    try:
        print("Connecting to database...")
        conn = psycopg2.connect(db_url)
        
        # Enforce strict atomic transaction block
        conn.autocommit = False
        cursor = conn.cursor()
        
        # 1. Add is_hq column on tenants table if not exists
        print("Adding 'is_hq' column to 'tenants' table...")
        cursor.execute(
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_hq BOOLEAN DEFAULT FALSE;"
        )
        
        # 2. Create the branches table if not exists
        print("Creating 'branches' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS branches (
                id UUID PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                address VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # 3. Add branch_id foreign keys to operational tables
        tables_to_migrate = [
            'students',
            'teachers',
            'classes',
            'billing_invoices',
            'student_fees'
        ]
        
        for table in tables_to_migrate:
            print(f"Adding 'branch_id' foreign key column to '{table}' table...")
            cursor.execute(f"""
                ALTER TABLE {table} 
                ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
            """)
        
        # Commit transaction
        conn.commit()
        print("Database schema migration for multi-branch hierarchy completed successfully!")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Migration aborted and rolled back due to error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
