#!/usr/bin/env python3
"""
Add missing approved_by column to curricula table
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def add_approved_by_column():
    """Add the missing approved_by column to curricula table"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            print("🔧 Adding approved_by column to curricula table...")
            
            # Add the missing approved_by column
            sql_commands = [
                "ALTER TABLE curricula ADD COLUMN approved_by INTEGER;",
                "ALTER TABLE curricula ADD COLUMN status VARCHAR(20) DEFAULT 'draft';"
            ]
            
            for sql in sql_commands:
                try:
                    result = db.session.execute(text(sql))
                    print(f"✅ {sql}")
                except Exception as e:
                    if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                        print(f"⚠️  Column already exists: {sql}")
                    else:
                        print(f"❌ Error: {sql} - {str(e)}")
            
            # Add foreign key constraint for approved_by
            try:
                fk_sql = "ALTER TABLE curricula ADD CONSTRAINT fk_curricula_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);"
                db.session.execute(text(fk_sql))
                print(f"✅ {fk_sql}")
            except Exception as e:
                if "already exists" in str(e).lower() or "constraint" in str(e).lower():
                    print(f"⚠️  Foreign key constraint already exists")
                else:
                    print(f"❌ Error adding foreign key: {str(e)}")
            
            # Commit changes
            db.session.commit()
            print("\n✅ Successfully added approved_by column to curricula table!")
            
            # Verify the column was added
            print("\n🔍 Verifying curricula table structure...")
            result = db.session.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'curricula' ORDER BY ordinal_position;"))
            columns = result.fetchall()
            
            print("\nCurricula table columns:")
            for col in columns:
                print(f"  - {col[0]} ({col[1]}) - Nullable: {col[2]}")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    return True

if __name__ == '__main__':
    print("🔧 Adding Missing approved_by Column to Curricula Table")
    print("=" * 55)
    add_approved_by_column()