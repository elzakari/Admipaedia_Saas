from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect

def fix_database():
    app = create_app()
    with app.app_context():
        engine = db.engine
        inspector = inspect(engine)
        
        # 1. Fix Teachers Table
        print("Checking 'teachers' table...")
        if 'teachers' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('teachers')]
            
            # List of columns to add to teachers
            teacher_cols = [
                ('middle_name', 'VARCHAR(50)'),
                ('nationality', 'VARCHAR(50)'),
                ('blood_group', 'VARCHAR(5)'),
                ('bio', 'TEXT'),
                ('emergency_contact_name', 'VARCHAR(100)'),
                ('emergency_contact_phone', 'VARCHAR(20)'),
                ('department_id', 'INTEGER')
            ]
            
            for col_name, col_type in teacher_cols:
                if col_name not in columns:
                    print(f"Adding column '{col_name}' to 'teachers' table...")
                    try:
                        db.session.execute(text(f"ALTER TABLE teachers ADD COLUMN {col_name} {col_type}"))
                        db.session.commit()
                    except Exception as e:
                        print(f"Error adding {col_name}: {e}")
                        db.session.rollback()
        
        # 2. Fix Students Table
        print("Checking 'students' table...")
        if 'students' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('students')]
            
            # List of columns to add to students (high priority ones from recent update)
            student_cols = [
                ('middle_name', 'VARCHAR(100)'),
                ('nationality', 'VARCHAR(100)'),
                ('blood_group', 'VARCHAR(10)'),
                ('medical_conditions', 'TEXT'),
                ('guardian_name', 'VARCHAR(100)'),
                ('guardian_contact', 'VARCHAR(20)'),
                ('guardian_relationship', 'VARCHAR(50)'),
                ('guardian_email', 'VARCHAR(100)'),
                ('guardian_address', 'VARCHAR(255)')
            ]
            
            for col_name, col_type in student_cols:
                if col_name not in columns:
                    print(f"Adding column '{col_name}' to 'students' table...")
                    try:
                        db.session.execute(text(f"ALTER TABLE students ADD COLUMN {col_name} {col_type}"))
                        db.session.commit()
                    except Exception as e:
                        print(f"Error adding {col_name}: {e}")
                        db.session.rollback()

        # 3. Ensure teacher_subjects table exists
        print("Ensuring 'teacher_subjects' table exists...")
        if 'teacher_subjects' not in inspector.get_table_names():
            print("Creating 'teacher_subjects' table...")
            try:
                db.session.execute(text("""
                    CREATE TABLE teacher_subjects (
                        teacher_id INTEGER NOT NULL REFERENCES teachers(id),
                        subject_id INTEGER NOT NULL REFERENCES subjects(id),
                        assigned_date TIMESTAMP WITHOUT TIME ZONE,
                        is_primary BOOLEAN,
                        PRIMARY KEY (teacher_id, subject_id)
                    )
                """))
                db.session.commit()
            except Exception as e:
                print(f"Error creating teacher_subjects: {e}")
                db.session.rollback()

        print("Database check and fix completed.")

if __name__ == "__main__":
    fix_database()
