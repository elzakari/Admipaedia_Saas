#!/usr/bin/env python3
from app import create_app
from app.extensions import db
from sqlalchemy import text

def add_class_id_to_final_grades():
    """Add the missing class_id column to final_grades table"""
    app = create_app()
    with app.app_context():
        try:
            print("=== Adding class_id column to final_grades table ===")
            
            # Add the class_id column
            db.session.execute(text("""
                ALTER TABLE final_grades 
                ADD COLUMN class_id INTEGER;
            """))
            print("✅ Added class_id column")
            
            # Add foreign key constraint
            db.session.execute(text("""
                ALTER TABLE final_grades 
                ADD CONSTRAINT fk_final_grades_class_id 
                FOREIGN KEY (class_id) REFERENCES classes(id);
            """))
            print("✅ Added foreign key constraint")
            
            # Set default values for existing records (if any)
            # You may need to update this based on your data
            db.session.execute(text("""
                UPDATE final_grades 
                SET class_id = 1 
                WHERE class_id IS NULL;
            """))
            print("✅ Set default values for existing records")
            
            # Make the column non-nullable
            db.session.execute(text("""
                ALTER TABLE final_grades 
                ALTER COLUMN class_id SET NOT NULL;
            """))
            print("✅ Made class_id column non-nullable")
            
            # Commit all changes
            db.session.commit()
            
            print("\n=== Verifying the fix ===")
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'final_grades' AND column_name = 'class_id';
            """))
            
            row = result.fetchone()
            if row:
                print(f"✅ class_id column verified: {row[0]} | {row[1]} | Nullable: {row[2]}")
            else:
                print("❌ class_id column still not found")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == '__main__':
    add_class_id_to_final_grades()