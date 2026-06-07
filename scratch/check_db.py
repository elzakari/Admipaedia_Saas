import sys
import os

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Set environment
os.environ['DATABASE_URL'] = 'postgresql://postgres:Barbie198320132025@127.0.0.1:5432/admipaedia'
os.environ['FLASK_ENV'] = 'development'

from app import create_app
from app.extensions import db
from app.models.subject import Subject
from app.models.class_ import Class
from app.models.associations import class_subjects

app = create_app('development')
with app.app_context():
    from sqlalchemy import text
    try:
        # Check if table exists
        res = db.session.execute(text("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'class_subjects')")).scalar()
        print("class_subjects table exists:", res)
        
        if res:
            # Count rows
            count = db.session.execute(text("SELECT count(*) FROM class_subjects")).scalar()
            print("class_subjects row count:", count)
            
            # Print sample class_subjects
            sample = db.session.execute(text("SELECT * FROM class_subjects LIMIT 5")).fetchall()
            print("sample rows:", sample)
            
        # Count classes and subjects
        classes_count = db.session.query(Class).count()
        subjects_count = db.session.query(Subject).count()
        print(f"Classes count: {classes_count}, Subjects count: {subjects_count}")
        
    except Exception as e:
        print("Error checking DB:", e)
