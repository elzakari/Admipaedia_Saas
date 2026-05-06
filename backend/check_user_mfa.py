from app import create_app
from app.extensions import db
from app.models.user import User
import sys

app = create_app('development')
with app.app_context():
    try:
        user = User.query.filter_by(email='admin@admipaedia.com').first()
        if user:
            print(f"USER FOUND: {user.email}")
            print(f"MFA ENABLED: {getattr(user, 'mfa_enabled', 'N/A')}")
            # Also check if security_settings exists
            if hasattr(user, 'security_settings') and user.security_settings:
                print(f"SECURITY SETTINGS MFA: {user.security_settings.mfa_enabled}")
            else:
                print("NO SECURITY SETTINGS FOUND")
        else:
            print("USER NOT FOUND")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
