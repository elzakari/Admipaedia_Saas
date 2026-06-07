import sys
import os

backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

os.environ['DATABASE_URL'] = 'postgresql://postgres:Barbie198320132025@127.0.0.1:5432/admipaedia'
os.environ['FLASK_ENV'] = 'development'

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    try:
        # Check and add missing columns to tenants
        columns_to_add = [
            ("is_setup_completed", "BOOLEAN DEFAULT FALSE"),
            ("is_hq", "BOOLEAN DEFAULT FALSE")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                db.session.execute(text(f"ALTER TABLE tenants ADD COLUMN {col_name} {col_type};"))
                db.session.commit()
                print(f"Added column {col_name} to tenants.")
            except Exception as e:
                db.session.rollback()
                if "already exists" in str(e) or "existe déjà" in str(e):
                    print(f"Column {col_name} already exists in tenants.")
                else:
                    print(f"Error adding {col_name}: {e}")
                    
        # Recreate class_subjects table just in case
        print("Recreating class_subjects table...")
        db.session.execute(text("DROP TABLE IF EXISTS class_subjects CASCADE;"))
        db.session.commit()
        
        db.session.execute(text("""
            CREATE TABLE class_subjects (
                id SERIAL PRIMARY KEY,
                class_id INT REFERENCES classes(id) ON DELETE CASCADE,
                subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
                teacher_id INT REFERENCES users(id) ON DELETE SET NULL,
                assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.session.commit()
        print("class_subjects table created successfully.")
        
        # Now run the default data seeding
        print("Running seed script...")
        import create_default_data
        create_default_data.create_default_data()
        print("Default data seeded successfully!")
        
    except Exception as e:
        db.session.rollback()
        print("Migration/seeding failed:", e)
