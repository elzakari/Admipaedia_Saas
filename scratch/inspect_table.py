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
from sqlalchemy import inspect

app = create_app('development')
with app.app_context():
    inspector = inspect(db.engine)
    columns = inspector.get_columns('class_subjects')
    print("class_subjects columns:")
    for col in columns:
        print(f" - {col['name']}: {col['type']} (nullable: {col['nullable']})")
