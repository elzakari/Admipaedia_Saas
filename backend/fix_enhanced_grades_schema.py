#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from sqlalchemy import text

def fix_enhanced_grades_schema():
    """Manually add missing columns to enhanced_grades table."""
    app = create_app()
    
    with app.app_context():
        try:
            print("=== Adding Missing Columns to enhanced_grades ===\n")
            
            # SQL commands to add missing columns
            sql_commands = [
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS total_marks DOUBLE PRECISION;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS percentage DOUBLE PRECISION;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS grade_symbol VARCHAR(5);",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS grade_points DOUBLE PRECISION;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS is_passing BOOLEAN;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS contributes_to_final BOOLEAN;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS is_class_score BOOLEAN;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS is_external_exam BOOLEAN;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS teacher_comments TEXT;",
                "ALTER TABLE enhanced_grades ADD COLUMN IF NOT EXISTS remedial_action TEXT;"
            ]
            
            # Execute each command
            for i, sql in enumerate(sql_commands, 1):
                print(f"{i:2d}. Adding column: {sql.split('ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0]}")
                db.session.execute(text(sql))
            
            # Set default values for existing records
            print("\n=== Setting Default Values ===\n")
            default_updates = [
                "UPDATE enhanced_grades SET total_marks = 100.0 WHERE total_marks IS NULL;",
                "UPDATE enhanced_grades SET percentage = (raw_score / 100.0 * 100) WHERE percentage IS NULL;",
                "UPDATE enhanced_grades SET grade_symbol = COALESCE(grade, 'C6') WHERE grade_symbol IS NULL;",
                "UPDATE enhanced_grades SET grade_points = COALESCE(grade_point, 3.0) WHERE grade_points IS NULL;",
                "UPDATE enhanced_grades SET is_passing = true WHERE is_passing IS NULL;",
                "UPDATE enhanced_grades SET weight = 1.0 WHERE weight IS NULL;",
                "UPDATE enhanced_grades SET contributes_to_final = true WHERE contributes_to_final IS NULL;",
                "UPDATE enhanced_grades SET is_class_score = true WHERE is_class_score IS NULL;",
                "UPDATE enhanced_grades SET is_external_exam = false WHERE is_external_exam IS NULL;"
            ]
            
            for i, sql in enumerate(default_updates, 1):
                column_name = sql.split('SET ')[1].split(' =')[0]
                print(f"{i:2d}. Setting defaults for: {column_name}")
                result = db.session.execute(text(sql))
                print(f"    Updated {result.rowcount} rows")
            
            # Commit all changes
            db.session.commit()
            print("\n✅ All changes committed successfully!")
            
            # Verify the fix
            print("\n=== Verification ===\n")
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = inspector.get_columns('enhanced_grades')
            
            required_columns = [
                'total_marks', 'percentage', 'grade_symbol', 'grade_points', 
                'is_passing', 'weight', 'contributes_to_final', 'is_class_score', 
                'is_external_exam', 'teacher_comments', 'remedial_action'
            ]
            
            column_names = [col['name'] for col in columns]
            missing_columns = [col for col in required_columns if col not in column_names]
            
            if missing_columns:
                print(f"❌ Still missing: {', '.join(missing_columns)}")
            else:
                print("✅ All required columns are now present!")
                print(f"✅ Total columns in enhanced_grades: {len(columns)}")
                
        except Exception as e:
            print(f"❌ Error fixing schema: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    fix_enhanced_grades_schema()