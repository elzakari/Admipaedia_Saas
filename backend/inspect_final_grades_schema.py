from app import create_app
from app.extensions import db
from sqlalchemy import inspect

def inspect_final_grades_table():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        
        # Check if final_grades table exists
        tables = inspector.get_table_names()
        if 'final_grades' not in tables:
            print("❌ final_grades table does not exist!")
            return
            
        print("✅ final_grades table exists")
        print("\n=== Current Columns in final_grades table ===")
        
        columns = inspector.get_columns('final_grades')
        for i, col in enumerate(columns, 1):
            print(f"{i:2d}. {col['name']:25} | {str(col['type']):20} | Nullable: {col['nullable']}")
            
        print(f"\nTotal columns: {len(columns)}")
        
        # Check for specific columns we expect
        column_names = [col['name'] for col in columns]
        expected_columns = [
            'class_score_average', 'external_exam_score', 'final_percentage',
            'final_grade_symbol', 'final_grade_points', 'is_passing'
        ]
        
        print("\n=== Expected vs Actual Columns ===")
        for col in expected_columns:
            status = "✅" if col in column_names else "❌"
            print(f"{status} {col}")
            
        # Check for original columns that should have been renamed
        original_columns = [
            'class_score', 'external_score', 'final_score',
            'final_grade', 'grade_point'
        ]
        
        print("\n=== Original Columns (should be renamed) ===")
        for col in original_columns:
            status = "❌ Still exists" if col in column_names else "✅ Renamed"
            print(f"{status}: {col}")

if __name__ == '__main__':
    inspect_final_grades_table()