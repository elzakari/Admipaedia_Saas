#!/usr/bin/env python3
"""
Direct SQL fix for curricula table schema
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def fix_curricula_schema():
    """Apply direct SQL fixes to curricula table"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            print("🔧 Applying direct SQL fixes to curricula table...")
            
            # Direct SQL commands
            sql_commands = [
                "ALTER TABLE curricula ADD COLUMN educational_level_id INTEGER;",
                "ALTER TABLE curricula ADD COLUMN curriculum_standard VARCHAR(50) DEFAULT 'standards_based';",
                "ALTER TABLE curricula ADD COLUMN term VARCHAR(20) DEFAULT 'Term 1';",
                "ALTER TABLE curricula ADD COLUMN duration_weeks INTEGER DEFAULT 13;",
                "ALTER TABLE curricula ADD COLUMN critical_thinking_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN creativity_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN communication_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN collaboration_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN sba_percentage FLOAT DEFAULT 40.0;",
                "ALTER TABLE curricula ADD COLUMN external_exam_percentage FLOAT DEFAULT 60.0;"
            ]
            
            for sql in sql_commands:
                try:
                    result = db.session.execute(text(sql))
                    print(f"✅ {sql[:50]}...")
                except Exception as e:
                    if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                        print(f"⚠️  Column already exists: {sql[:50]}...")
                    else:
                        print(f"❌ Error: {sql[:50]}... - {str(e)[:100]}")
            
            # Add foreign key constraint
            try:
                fk_sql = "ALTER TABLE curricula ADD CONSTRAINT fk_curricula_educational_level FOREIGN KEY (educational_level_id) REFERENCES educational_levels(id);"
                db.session.execute(text(fk_sql))
                print("✅ Added foreign key constraint")
            except Exception as e:
                print(f"⚠️  Foreign key constraint: {str(e)[:100]}")
            
            # Commit all changes
            db.session.commit()
            print("\n✅ All changes committed successfully!")
            
            # Verify the changes
            print("\n🔍 Verifying changes...")
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = inspector.get_columns('curricula')
            
            print(f"\nCurricula table now has {len(columns)} columns:")
            for i, col in enumerate(columns, 1):
                print(f"{i:2d}. {col['name']}")
                
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    print("🔧 Direct SQL Fix for Curricula Table")
    print("=" * 40)
    fix_curricula_schema()