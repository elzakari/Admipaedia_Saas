"""
Fix migration state by directly manipulating alembic_version table
"""
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def fix_migration_state():
    """Fix the migration state using Flask app context"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        print("🚀 Starting migration state fix...")
        
        # Create Flask app
        app = create_app()
        
        with app.app_context():
            print("🔄 Connecting to database through Flask...")
            
            # Use raw SQL with explicit encoding handling
            try:
                # Check if alembic_version table exists
                result = db.engine.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'alembic_version'
                    );
                """))
                
                table_exists = result.scalar()
                
                if not table_exists:
                    print("⚠️  alembic_version table does not exist. Creating it...")
                    db.engine.execute(text("""
                        CREATE TABLE alembic_version (
                            version_num VARCHAR(32) NOT NULL,
                            CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                        );
                    """))
                    print("✅ alembic_version table created")
                
                # Clear all existing versions
                print("🗑️  Clearing existing migration versions...")
                db.engine.execute(text("DELETE FROM alembic_version;"))
                
                # Set a clean base version
                print("📝 Setting clean base migration version...")
                db.engine.execute(text("INSERT INTO alembic_version (version_num) VALUES ('database_schema_optimization');"))
                
                print("✅ Migration state fixed successfully!")
                return True
                
            except Exception as db_error:
                print(f"❌ Database operation failed: {str(db_error)}")
                return False
                
    except Exception as e:
        print(f"❌ Error fixing migration state: {str(e)}")
        return False

if __name__ == "__main__":
    if fix_migration_state():
        print("\n✅ Migration state fixed successfully!")
        print("\nNow try running:")
        print("  flask db stamp head")
        print("  flask db upgrade")
    else:
        print("\n❌ Migration state fix failed.")
        print("\nTry this alternative approach:")
        print("  flask db stamp database_schema_optimization")
        print("  flask db upgrade")