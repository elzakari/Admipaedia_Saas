import os
import sys
import psycopg2
from dotenv import load_dotenv
load_dotenv()

def run_migration():
    """Migrate orphaned parent and student rows to active tenant UUID"""
    active_uuid = '3b50c1ea-4e5a-4b61-9999-41a4206d99a3'
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
        
        # 1. Proactively ensure the target tenant UUID exists in the 'tenants' table
        print(f"Ensuring target tenant '{active_uuid}' exists in the 'tenants' table...")
        cursor.execute(
            "INSERT INTO tenants (id, slug, name, country_code, status, schema_name, created_at, updated_at) "
            "VALUES (%s, 'college-germinos-active', 'College Germinos Active', 'GH', 'active', 'tenant_college_germinos_active', NOW(), NOW()) "
            "ON CONFLICT (id) DO NOTHING;",
            (active_uuid,)
        )
        tenant_inserted = cursor.rowcount
        if tenant_inserted > 0:
            print("OK: Target tenant provisioned successfully.")
        else:
            print("OK: Target tenant already exists.")
        
        print(f"Targeting active system tenant UUID: '{active_uuid}'")
        
        # 2. Update parents table
        print("Updating 'parents' table...")
        cursor.execute(
            "UPDATE parents "
            "SET tenant_id = %s "
            "WHERE tenant_id IS NULL OR tenant_id != %s;",
            (active_uuid, active_uuid)
        )
        parents_updated = cursor.rowcount
        print(f"Success: Updated {parents_updated} parent rows.")
        
        # 3. Update students table
        print("Updating 'students' table...")
        cursor.execute(
            "UPDATE students "
            "SET tenant_id = %s "
            "WHERE tenant_id IS NULL OR tenant_id != %s;",
            (active_uuid, active_uuid)
        )
        students_updated = cursor.rowcount
        print(f"Success: Updated {students_updated} student rows.")
        
        # Commit transaction
        conn.commit()
        print("Database transaction committed successfully!")
        print(f"Total updates: {parents_updated + students_updated} rows mapped to tenant.")
        
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
