import pytest
import json

def test_register(client, db):
    """Test user registration."""
    response = client.post('/api/v1/auth/register', json={
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'password123',
        'role': 'teacher'
    })
    
    assert response.status_code == 201
    assert response.json['success'] is True
    assert response.json['user']['username'] == 'newuser'
    assert response.json['user']['email'] == 'new@example.com'
    assert response.json['user']['role'] == 'teacher'

def test_login(client, db):
    """Test user login."""
    # First register a user
    client.post('/api/v1/auth/register', json={
        'username': 'loginuser',
        'email': 'login@example.com',
        'password': 'password123',
        'role': 'teacher'
    })
    
    # Then try to login
    response = client.post('/api/v1/auth/login', json={
        'email': 'login@example.com',
        'password': 'password123'
    })
    
    assert response.status_code == 200
    assert response.json['success'] is True
    assert 'access_token' in response.json
    assert 'refresh_token' in response.json
    assert response.json['user']['email'] == 'login@example.com'

def test_me(auth_client):
    """Test getting current user info."""
    response = auth_client.get('/api/v1/auth/me')
    
    assert response.status_code == 200
    assert response.json['success'] is True
    assert response.json['user']['email'] == 'test@example.com'