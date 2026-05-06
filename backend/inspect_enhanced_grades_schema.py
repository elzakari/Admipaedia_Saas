#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from sqlalchemy import inspect

def inspect_enhanced_grades_schema():
    """Inspect the current enhanced_grades table schema."""
    app = create_app()
    
    with app.app_context():
        print("=== Enhanced Grades Table Schema ===")
        
        try:
            # Get database inspector
            inspector = inspect(db.engine)
            
            # Check if table exists
            if 'enhanced_grades' not in inspector.get_table_names():
                print("❌ enhanced_grades table does not exist")
                return
            
            # Get table columns
            columns = inspector.get_columns('enhanced_grades')
            print(f"✅ enhanced_grades table found with {len(columns)} columns:")
            
            for col in columns:
                nullable = "NULL" if col['nullable'] else "NOT NULL"
                print(f"  - {col['name']}: {col['type']} ({nullable})")
            
            # Check for specific missing columns
            column_names = [col['name'] for col in columns]
            required_columns = [
                'total_marks', 'percentage', 'grade_symbol', 'grade_points', 
                'is_passing', 'weight', 'contributes_to_final', 'is_class_score', 
                'is_external_exam', 'teacher_comments', 'remedial_action'
            ]
            
            print("\n=== Missing Columns Check ===")
            missing_columns = [col for col in required_columns if col not in column_names]
            
            if missing_columns:
                print(f"❌ Missing columns: {', '.join(missing_columns)}")
            else:
                print("✅ All required columns are present")
                
        except Exception as e:
            print(f"❌ Error inspecting schema: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    inspect_enhanced_grades_schema()