#!/usr/bin/env python3
from app import create_app
from app.extensions import db
from sqlalchemy import inspect

def check_class_id_in_final_grades():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        
        # Check if final_grades table exists
        tables = inspector.get_table_names()
        if 'final_grades' not in tables:
            print("❌ final_grades table does not exist!")
            return
            
        print("✅ final_grades table exists")
        print("\n=== All Columns in final_grades table ===")
        
        columns = inspector.get_columns('final_grades')
        column_names = [col['name'] for col in columns]
        
        for i, col in enumerate(columns, 1):
            print(f"{i:2d}. {col['name']:25} | {str(col['type']):20} | Nullable: {col['nullable']}")
            
        print(f"\nTotal columns: {len(columns)}")
        
        # Specifically check for class_id
        print("\n=== Critical Column Check ===")
        if 'class_id' in column_names:
            print("✅ class_id column EXISTS")
        else:
            print("❌ class_id column MISSING - This is causing the test failure!")
            print("\nColumns that DO exist:")
            for name in sorted(column_names):
                print(f"  - {name}")

if __name__ == '__main__':
    check_class_id_in_final_grades()