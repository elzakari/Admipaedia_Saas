"""
Simple migration reset using Flask context
"""
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db

def reset_migration_state():
    """Reset migration state using Flask context"""
    
    print("🔄 Resetting migration state using Flask context...")
    
    app = create_app()
    
    with app.app_context():
        try:
            # Execute raw SQL to clear and reset migration state
            print("🧹 Clearing migration versions...")
            
            # Clear all existing migration versions
            db.session.execute(db.text("DELETE FROM alembic_version"))
            
            # Set to database_schema_optimization as base
            db.session.execute(
                db.text("INSERT INTO alembic_version (version_num) VALUES (:version)"),
                {"version": "database_schema_optimization"}
            )
            
            # Commit the changes
            db.session.commit()
            
            print("✅ Migration state reset to: database_schema_optimization")
            
            # Verify the reset
            result = db.session.execute(db.text("SELECT version_num FROM alembic_version")).fetchone()
            if result:
                print(f"🎯 Current migration version: {result[0]}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during migration reset: {e}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    success = reset_migration_state()
    if success:
        print("\n✅ Migration reset completed successfully!")
        print("You can now run 'flask db upgrade' to apply pending migrations.")
    else:
        print("\n❌ Migration reset failed. Please check the error messages above.")