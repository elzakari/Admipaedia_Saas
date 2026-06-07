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
        print("Recreating class_subjects table...")
        # Drop the table
        db.session.execute(text("DROP TABLE IF EXISTS class_subjects CASCADE;"))
        db.session.commit()
        
        # Create the table according to the requested schema
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
        print("OK: class_subjects table created successfully.")
        
        # Run create_default_data to seed classes, subjects, and relations
        print("Running seed script...")
        import create_default_data
        create_default_data.create_default_data()
        print("OK: Default data seeded successfully!")
    except Exception as e:
        db.session.rollback()
        print("Error during migration:", e)
