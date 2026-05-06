#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.class_service import ClassService
from app.extensions import db
from app.models.class_ import Class

def test_class_38_deletion():
    """Test deletion of class 38 to identify the specific error."""
    app = create_app()
    
    with app.app_context():
        print("=== Testing Class 38 Deletion ===")
        
        # Check if class 38 exists
        class_obj = db.session.get(Class, 38)  # Using new SQLAlchemy 2.0 syntax
        if not class_obj:
            print("❌ Class 38 not found in database")
            return
        
        print(f"✅ Class 38 found: {class_obj.name} (Grade: {class_obj.grade_level})")
        
        # Check key related records
        print("\n=== Checking Related Records ===")
        
        from app.models.student import Student
        students = Student.query.filter_by(class_id=38).all()
        print(f"Students in class 38: {len(students)}")
        
        from app.models.attendance import Attendance
        attendances = Attendance.query.filter_by(class_id=38).all()
        print(f"Attendance records for class 38: {len(attendances)}")
        
        # Now attempt deletion
        print("\n=== Attempting Deletion ===")
        success, error = ClassService.delete_class(38)
        
        if success:
            print("✅ Class 38 deleted successfully!")
        else:
            print(f"❌ Failed to delete class 38: {error}")
            
            # Check current foreign key constraints
            print("\n=== Checking Foreign Key Constraints ===")
            try:
                result = db.session.execute(db.text("""
                    SELECT 
                        tc.table_name, 
                        kcu.column_name, 
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name,
                        rc.delete_rule
                    FROM 
                        information_schema.table_constraints AS tc 
                        JOIN information_schema.key_column_usage AS kcu
                          ON tc.constraint_name = kcu.constraint_name
                          AND tc.table_schema = kcu.table_schema
                        JOIN information_schema.constraint_column_usage AS ccu
                          ON ccu.constraint_name = tc.constraint_name
                          AND ccu.table_schema = tc.table_schema
                        JOIN information_schema.referential_constraints AS rc
                          ON tc.constraint_name = rc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND ccu.table_name = 'classes'
                    AND ccu.column_name = 'id'
                    ORDER BY tc.table_name;
                """))
                
                constraints = result.fetchall()
                print("\nCurrent foreign key constraints referencing classes.id:")
                for constraint in constraints:
                    print(f"  {constraint[0]}.{constraint[1]} -> {constraint[2]}.{constraint[3]} (DELETE: {constraint[4]})")
                    
            except Exception as e:
                print(f"Error checking constraints: {e}")

if __name__ == "__main__":
    test_class_38_deletion()