#!/usr/bin/env python3
"""
Verify and fix approved_by column in curricula table
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def verify_and_fix_approved_by():
    """Verify if approved_by column exists and add it if missing"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            print("🔍 Checking if approved_by column exists...")
            
            # Check if approved_by column exists
            check_sql = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'curricula' AND column_name = 'approved_by';
            """
            
            result = db.session.execute(text(check_sql))
            column_exists = result.fetchone() is not None
            
            if column_exists:
                print("✅ approved_by column already exists!")
            else:
                print("❌ approved_by column is missing. Adding it now...")
                
                # Add the column with explicit transaction handling
                try:
                    # Start explicit transaction
                    db.session.begin()
                    
                    # Add approved_by column
                    add_column_sql = "ALTER TABLE curricula ADD COLUMN approved_by INTEGER;"
                    db.session.execute(text(add_column_sql))
                    print(f"✅ Added column: {add_column_sql}")
                    
                    # Add foreign key constraint
                    fk_sql = "ALTER TABLE curricula ADD CONSTRAINT fk_curricula_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);"
                    db.session.execute(text(fk_sql))
                    print(f"✅ Added foreign key: {fk_sql}")
                    
                    # Commit the transaction
                    db.session.commit()
                    print("✅ Transaction committed successfully!")
                    
                except Exception as e:
                    # Rollback on error
                    db.session.rollback()
                    print(f"❌ Error during column addition: {str(e)}")
                    
                    # Try without foreign key constraint
                    try:
                        db.session.begin()
                        add_column_sql = "ALTER TABLE curricula ADD COLUMN approved_by INTEGER;"
                        db.session.execute(text(add_column_sql))
                        db.session.commit()
                        print("✅ Added column without foreign key constraint")
                    except Exception as e2:
                        db.session.rollback()
                        print(f"❌ Failed to add column: {str(e2)}")
                        return False
            
            # Final verification
            print("\n🔍 Final verification - listing all curricula columns:")
            verify_sql = """
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'curricula' 
            ORDER BY ordinal_position;
            """
            
            result = db.session.execute(text(verify_sql))
            columns = result.fetchall()
            
            print(f"\nCurricula table has {len(columns)} columns:")
            approved_by_found = False
            for col in columns:
                if col[0] == 'approved_by':
                    approved_by_found = True
                    print(f"  ✅ {col[0]} ({col[1]}) - Nullable: {col[2]}")
                else:
                    print(f"  - {col[0]} ({col[1]}) - Nullable: {col[2]}")
            
            if approved_by_found:
                print("\n🎉 SUCCESS: approved_by column is now present!")
                return True
            else:
                print("\n❌ FAILED: approved_by column is still missing!")
                return False
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == '__main__':
    print("🔧 Verify and Fix approved_by Column")
    print("=" * 40)
    success = verify_and_fix_approved_by()
    
    if success:
        print("\n🚀 Ready to test subject deletion!")
        print("Run: python backend\\delete_subject_7.py")
    else:
        print("\n❌ Column fix failed. Manual intervention required.")