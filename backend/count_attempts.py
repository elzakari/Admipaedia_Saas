from app import create_app
from app.extensions import db
from app.models.security import LoginAttempt
import sys

app = create_app('development')
with app.app_context():
    try:
        count = LoginAttempt.query.count()
        print(f"LOGIN ATTEMPTS COUNT: {count}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
