import pytest
from app.models.user import User

def test_user_creation(db):
    """Test user creation."""
    user = User(
        username='testuser',
        email='test@example.com',
        password_hash='hashed_password',
        role='admin'
    )
    db.session.add(user)
    db.session.commit()
    
    assert user.id is not None
    assert user.username == 'testuser'
    assert user.email == 'test@example.com'
    assert user.role == 'admin'

def test_check_password(db):
    """Test password checking."""
    from app.extensions import bcrypt
    
    password = 'test_password'
    hashed = bcrypt.generate_password_hash(password).decode('utf-8')
    
    user = User(
        username='testuser',
        email='test@example.com',
        password_hash=hashed,
        role='admin'
    )
    
    assert user.check_password_hash(password) is True
    assert user.check_password_hash('wrong_password') is False