#!/usr/bin/env python3
"""
Inspect and fix assessment_frameworks table schema
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def inspect_assessment_frameworks():
    """Inspect the assessment_frameworks table schema"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import inspect
        
        app = create_app()
        with app.app_context():
            inspector = inspect(db.engine)
            
            # Check if table exists
            tables = inspector.get_table_names()
            if 'assessment_frameworks' not in tables:
                print("❌ assessment_frameworks table does not exist!")
                return False
                
            print("✅ assessment_frameworks table exists")
            print("\n=== Current Columns in assessment_frameworks table ===")
            
            columns = inspector.get_columns('assessment_frameworks')
            for i, col in enumerate(columns, 1):
                print(f"{i:2d}. {col['name']:30} | {str(col['type']):20} | Nullable: {col['nullable']}")
                
            print(f"\nTotal columns: {len(columns)}")
            
            # Check for expected columns from the model
            column_names = [col['name'] for col in columns]
            expected_columns = [
                'id', 'name', 'description', 'educational_level_id', 'subject_id',
                'formative_weight', 'summative_weight', 'school_based_weight', 'project_weight',
                'formative_frequency', 'summative_frequency', 'curriculum_standards', 
                'competency_indicators', 'created_at', 'updated_at'
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
    """Add missing columns to assessment_frameworks table"""
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            print("\n🔧 Adding missing columns to assessment_frameworks...")
            
            # Add missing columns with proper data types
            missing_columns_sql = [
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS formative_weight FLOAT DEFAULT 30.0;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS summative_weight FLOAT DEFAULT 40.0;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS school_based_weight FLOAT DEFAULT 20.0;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS project_weight FLOAT DEFAULT 10.0;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS formative_frequency VARCHAR(50) DEFAULT 'weekly';",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS summative_frequency VARCHAR(50) DEFAULT 'termly';",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS curriculum_standards TEXT;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS competency_indicators TEXT;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"
            ]
            
            for sql in missing_columns_sql:
                try:
                    db.session.execute(text(sql))
                    print(f"✅ Executed: {sql[:60]}...")
                except Exception as e:
                    print(f"⚠️  Warning: {sql[:60]}... - {str(e)[:50]}")
            
            # Commit changes
            db.session.commit()
            print("\n✅ Missing columns added successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error adding columns: {e}")
        return False

def main():
    print("🔍 Assessment Frameworks Table Inspector")
    print("=" * 50)
    
    # First inspect the current schema
    if not inspect_assessment_frameworks():
        print("\n🔧 Attempting to fix missing columns...")
        if fix_missing_columns():
            print("\n🔍 Re-inspecting after fixes...")
            inspect_assessment_frameworks()
    
    print("\n📋 Next steps:")
    print("1. Run this script to check the schema")
    print("2. If columns are missing, they will be added automatically")
    print("3. Then try deleting subject 7 again")

if __name__ == '__main__':
    main()