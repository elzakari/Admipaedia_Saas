import pytest
import json
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.message import Message
from flask_jwt_extended import create_access_token

@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def auth_headers(app):
    """Create authentication headers for testing."""
    with app.app_context():
        # Create a test user
        user = User(
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )
        user.set_password('testpassword')
        db.session.add(user)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=str(user.id))
        
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

def test_get_messages_empty(client, auth_headers):
    """Test getting messages when none exist."""
    response = client.get('/api/v1/messages', headers=auth_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['data'] == []
    assert data['pagination']['total'] == 0

def test_create_message(client, auth_headers, app):
    """Test creating a new message."""
    with app.app_context():
        # Create recipient user
        recipient = User(
            email='recipient@example.com',
            first_name='Recipient',
            last_name='User'
        )
        recipient.set_password('password')
        db.session.add(recipient)
        db.session.commit()
        
        message_data = {
            'recipient_id': recipient.id,
            'recipient_type': 'admin',
            'subject': 'Test Message',
            'content': 'This is a test message content.'
        }
        
        response = client.post(
            '/api/v1/messages',
            data=json.dumps(message_data),
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['subject'] == 'Test Message'
        assert data['data']['content'] == 'This is a test message content.'

def test_get_message_by_id(client, auth_headers, app):
    """Test getting a specific message by ID."""
    with app.app_context():
        # Create users
        sender = User.query.filter_by(email='test@example.com').first()
        recipient = User(
            email='recipient2@example.com',
            first_name='Recipient2',
            last_name='User'
        )
        recipient.set_password('password')
        db.session.add(recipient)
        db.session.commit()
        
        # Create message
        message = Message(
            sender_id=sender.id,
            sender_type='admin',
            recipient_id=recipient.id,
            recipient_type='admin',
            subject='Test Message 2',
            content='Test content 2'
        )
        db.session.add(message)
        db.session.commit()
        
        response = client.get(f'/api/v1/messages/{message.id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['subject'] == 'Test Message 2'

def test_unauthorized_access(client):
    """Test that unauthorized requests are rejected."""
    response = client.get('/api/v1/messages')
    assert response.status_code == 401