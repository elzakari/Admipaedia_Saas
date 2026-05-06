import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.student import Student
from app.models.class_ import Class
from flask_jwt_extended import create_access_token
from datetime import datetime, timedelta
from app.models.session_token import SessionToken

app = create_app('testing')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

with app.app_context():
    db.create_all()
    
    # Create admin user
    admin = User(username='admin', email='admin@example.com', role='admin')
    admin.set_password('password')
    db.session.add(admin)
    db.session.commit()
    
    print(f"Admin role: {admin.role}")

    # Get token
    from flask_jwt_extended import decode_token
    access_token = create_access_token(identity=str(admin.id))
    # decoded = decode_token(access_token)
    
    # Manually create SessionToken (BYPASS TEST)
    # session_token = SessionToken(
    #     jti=decoded['jti'],
    #     user_id=admin.id,
    #     token_type='access',
    #     expires_at=datetime.utcnow() + timedelta(hours=1)
    # )
    # db.session.add(session_token)
    # db.session.commit()
    
    # student creation ...
    student = Student(
        admission_number='STU001',
        first_name='Test',
        last_name='Student',
        gender='male',
        date_of_birth=datetime(2010, 1, 1).date(),
        user_id=admin.id, # Using same user for simplicity
        status='active'
    )
    db.session.add(student)
    db.session.commit()
    
    client = app.test_client()
    headers = {'Authorization': f'Bearer {access_token}'}
    
    # Test prediction
    print(f"Testing student prediction for student {student.id}...")
    resp = client.get(f'/api/v1/ai-analytics/predictions/student/{student.id}', headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.get_json()}")
    
    # Test school insights
    print("\nTesting school-wide insights...")
    resp = client.get('/api/v1/ai-analytics/insights/school-wide', headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.get_json()}")
