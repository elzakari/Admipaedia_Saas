from app import create_app
from app.services.enhanced_auth_service import EnhancedAuthService
import sys

app = create_app('development')
with app.app_context():
    try:
        print("TESTING FAILED LOGIN...")
        from flask import request
        with app.test_request_context(
            '/api/v1/auth/login',
            method='POST',
            headers={'User-Agent': 'Test-Agent'},
            environ_base={'REMOTE_ADDR': '127.0.0.1'}
        ):
            # Wrong password
            result = EnhancedAuthService.authenticate_with_security(
                'admin@admipaedia.com', 'wrong-password'
            )
            print(f"LOGIN RESULT: {result}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
