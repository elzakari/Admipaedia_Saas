#!/usr/bin/env python3
"""
Inspect and fix curricula table schema
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def inspect_curricula():
    """Inspect the curricula table schema"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import inspect
        
        app = create_app()
        with app.app_context():
            inspector = inspect(db.engine)
            
            # Check if table exists
            tables = inspector.get_table_names()
            if 'curricula' not in tables:
                print("❌ curricula table does not exist!")
                return False
                
            print("✅ curricula table exists")
            print("\n=== Current Columns in curricula table ===")
            
            columns = inspector.get_columns('curricula')
            for i, col in enumerate(columns, 1):
                print(f"{i:2d}. {col['name']:30} | {str(col['type']):20} | Nullable: {col['nullable']}")
                
            print(f"\nTotal columns: {len(columns)}")
            
            # Check for expected columns from the model
            column_names = [col['name'] for col in columns]
            expected_columns = [
                'id', 'title', 'description', 'educational_level_id', 'subject_id',
                'curriculum_standard', 'academic_year', 'term', 'duration_weeks',
                'critical_thinking_weight', 'creativity_weight', 'communication_weight', 
                'collaboration_weight', 'sba_percentage', 'external_exam_percentage',
                'created_by', 'created_at', 'updated_at'
            ]
            
            print("\n=== Expected vs Actual Columns ===")
            missing_columns = []
            for col in expected_columns:
                status = "✅" if col in column_names else "❌"
                print(f"{status} {col}")
                if col not in column_names:
                    missing_columns.append(col)
            
            if missing_columns:
                print(f"\n❌ Missing columns: {', '.join(missing_columns)}")
                return False
            else:
                print("\n✅ All expected columns are present")
                return True
                
    except Exception as e:
        print(f"❌ Error inspecting table: {e}")
        return False

def fix_missing_columns():
    """Add missing columns to curricula table"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            print("\n🔧 Adding missing columns to curricula...")
            
            # Add missing columns with proper data types
            missing_columns_sql = [
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS educational_level_id INTEGER;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS curriculum_standard VARCHAR(50) DEFAULT 'standards_based';",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'Term 1';",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 13;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS critical_thinking_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS creativity_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS communication_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS collaboration_weight FLOAT DEFAULT 25.0;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS sba_percentage FLOAT DEFAULT 40.0;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS external_exam_percentage FLOAT DEFAULT 60.0;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS created_by INTEGER;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE curricula ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"
            ]
            
            for sql in missing_columns_sql:
                try:
                    db.session.execute(text(sql))
                    print(f"✅ Executed: {sql[:60]}...")
                except Exception as e:
                    print(f"⚠️  Warning: {sql[:60]}... - {str(e)[:50]}")
            
            # Add foreign key constraints if missing
            fk_constraints_sql = [
                "ALTER TABLE curricula ADD CONSTRAINT IF NOT EXISTS fk_curricula_educational_level FOREIGN KEY (educational_level_id) REFERENCES educational_levels(id);",
                "ALTER TABLE curricula ADD CONSTRAINT IF NOT EXISTS fk_curricula_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                "ALTER TABLE curricula ADD CONSTRAINT IF NOT EXISTS fk_curricula_created_by FOREIGN KEY (created_by) REFERENCES users(id);"
            ]
            
            for sql in fk_constraints_sql:
                try:
                    db.session.execute(text(sql))
                    print(f"✅ Executed: {sql[:60]}...")
                except Exception as e:
                    print(f"⚠️  Warning: {sql[:60]}... - {str(e)[:50]}")
            
            # Commit changes
            db.session.commit()
            print("\n✅ Missing columns and constraints added successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error adding columns: {e}")
        return False

def main():
    print("🔍 Curricula Table Inspector")
    print("=" * 50)
    
    # First inspect the current schema
    if not inspect_curricula():
        print("\n🔧 Attempting to fix missing columns...")
        if fix_missing_columns():
            print("\n🔍 Re-inspecting after fixes...")
            inspect_curricula()
    
    print("\n📋 Next steps:")
    print("1. Run this script to check the curricula table schema")
    print("2. If columns are missing, they will be added automatically")
    print("3. Then try deleting subject 7 again")

if __name__ == '__main__':
    main()