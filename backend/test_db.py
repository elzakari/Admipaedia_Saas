from app import create_app
from app.extensions import db
from sqlalchemy import text
import sys

app = create_app('development')
with app.app_context():
    try:
        result = db.session.execute(text('SELECT 1')).scalar()
        print(f"DATABASE CONNECTION SUCCESS: {result}")
    except Exception as e:
        print(f"DATABASE CONNECTION FAILED: {str(e)}")
        sys.exit(1)
