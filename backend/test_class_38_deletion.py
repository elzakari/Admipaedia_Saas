#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.class_service import ClassService
from app.extensions import db
from app.models.class_ import Class
from app.models.associations import class_subjects

def test_class_38_deletion():
    """Test deletion of class 38 to identify the specific error."""
    app = create_app()
    
    with app.app_context():
        print("=== Testing Class 38 Deletion ===")
        
        # First, check if class 38 exists
        class_obj = Class.query.get(38)
        if not class_obj:
            print("❌ Class 38 not found in database")
            return
        
        print(f"✅ Class 38 found: {class_obj.name} (Grade: {class_obj.grade_level})")
        
        # Check related records before deletion
        print("\n=== Checking Related Records ===")
        
        # Check students
        from app.models.student import Student
        students = Student.query.filter_by(class_id=38).all()
        print(f"Students in class 38: {len(students)}")
        for student in students:
            print(f"  - Student ID {student.id}: {student.first_name} {student.last_name}")
        
        # Check attendances
        from app.models.attendance import Attendance
        attendances = Attendance.query.filter_by(class_id=38).all()
        print(f"Attendance records for class 38: {len(attendances)}")
        
        # Check exams
        from app.models.exam import Exam
        exams = Exam.query.filter_by(class_id=38).all()
        print(f"Exams for class 38: {len(exams)}")
        
        # Check grades
        from app.models.grade import Grade
        grades = Grade.query.filter_by(class_id=38).all()
        print(f"Grades for class 38: {len(grades)}")
        
        # Check assignments
        from app.models.assignment import Assignment
        assignments = Assignment.query.filter_by(class_id=38).all()
        print(f"Assignments for class 38: {len(assignments)}")
        
        # Check class_subjects using raw SQL since it's a Table, not a Model
        try:
            result = db.session.execute(
                db.text("SELECT COUNT(*) FROM class_subjects WHERE class_id = :class_id"),
                {"class_id": 38}
            )
            class_subjects_count = result.scalar()
            print(f"Class subjects for class 38: {class_subjects_count}")
        except Exception as e:
            print(f"Error checking class_subjects: {e}")
        
        # Check lessons
        try:
            from app.models.lesson import Lesson
            lessons = Lesson.query.filter_by(class_id=38).all()
            print(f"Lessons for class 38: {len(lessons)}")
        except ImportError:
            print("Lesson model not found")
        
        # Check STEM resource bookings
        try:
            from app.models.stem_curriculum import STEMResourceBooking
            stem_bookings = STEMResourceBooking.query.filter_by(class_id=38).all()
            print(f"STEM resource bookings for class 38: {len(stem_bookings)}")
        except (ImportError, AttributeError):
            print("STEM resource bookings model not found")
        
        # Check any other potential foreign key relationships
        try:
            # Check teacher_attendance if it has class_id
            result = db.session.execute(
                db.text("SELECT COUNT(*) FROM teacher_attendance WHERE class_id = :class_id"),
                {"class_id": 38}
            )
            teacher_attendance_count = result.scalar()
            print(f"Teacher attendance records for class 38: {teacher_attendance_count}")
        except Exception:
            print("No teacher_attendance.class_id found")
        
        # Now attempt deletion
        print("\n=== Attempting Deletion ===")
        success, error = ClassService.delete_class(38)
        
        if success:
            print("✅ Class 38 deleted successfully!")
        else:
            print(f"❌ Failed to delete class 38: {error}")
            
            # If it's a foreign key constraint error, let's identify which table
            if "foreign key constraint" in error.lower():
                print("\n=== Foreign Key Constraint Analysis ===")
                print("This error indicates there are still related records that prevent deletion.")
                print("Based on our migration, the following should happen automatically:")
                print("- Students: class_id should be set to NULL")
                print("- Attendances, Exams, Grades, Assignments: should be CASCADE deleted")
                print("- Class_subjects: should be CASCADE deleted")
                print("- STEM Resource Bookings: class_id should be set to NULL")
                print("\nThe error suggests our migration may not have been applied correctly.")
                print("\nLet's check the current foreign key constraints:")
                
                # Check current constraints
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
                        AND ccu.column_name = 'id';
                    """))
                    
                    constraints = result.fetchall()
                    print("\nCurrent foreign key constraints referencing classes.id:")
                    for constraint in constraints:
                        print(f"  {constraint[0]}.{constraint[1]} -> {constraint[2]}.{constraint[3]} (DELETE: {constraint[4]})")
                        
                except Exception as e:
                    print(f"Error checking constraints: {e}")

if __name__ == "__main__":
    test_class_38_deletion()