import pytest
from flask_jwt_extended import create_access_token

from app.models.message import Message
from app.models.tenant import TenantMembership
from flask_jwt_extended import create_access_token

def _headers(token, tenant_id):
    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant_id),
        'Content-Type': 'application/json',
    }


def test_get_messages_empty(client, db_session, sample_tenant, user_factory):
    """Test getting messages when none exist."""
    user = user_factory('teacher')
    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=user.id, role='teacher', status='active'))
    db_session.commit()

    token = create_access_token(identity=user.id)
    response = client.get('/api/v1/messages', headers=_headers(token, sample_tenant.id))
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['data'] == []
    assert data['pagination']['total'] == 0


def test_create_message(client, db_session, sample_tenant, user_factory):
    """Test creating a new message."""
    sender = user_factory('teacher')
    recipient = user_factory('teacher')
    db_session.add_all([
        TenantMembership(tenant_id=sample_tenant.id, user_id=sender.id, role='teacher', status='active'),
        TenantMembership(tenant_id=sample_tenant.id, user_id=recipient.id, role='teacher', status='active'),
    ])
    db_session.commit()

    message_data = {
        'recipient_id': recipient.id,
        'recipient_type': 'admin',
        'subject': 'Test Message',
        'content': 'This is a test message content.'
    }

    token = create_access_token(identity=sender.id)
    response = client.post(
        '/api/v1/messages',
        json=message_data,
        headers=_headers(token, sample_tenant.id)
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['subject'] == 'Test Message'
    assert data['data']['content'] == 'This is a test message content.'


def test_get_message_by_id(client, db_session, sample_tenant, user_factory):
    """Test getting a specific message by ID."""
    sender = user_factory('teacher')
    recipient = user_factory('teacher')
    db_session.add_all([
        TenantMembership(tenant_id=sample_tenant.id, user_id=sender.id, role='teacher', status='active'),
        TenantMembership(tenant_id=sample_tenant.id, user_id=recipient.id, role='teacher', status='active'),
    ])
    db_session.flush()

    message = Message(
        sender_id=sender.id,
        sender_type='teacher',
        recipient_id=recipient.id,
        recipient_type='teacher',
        subject='Test Message 2',
        content='Test content 2'
    )
    db_session.add(message)
    db_session.commit()

    token = create_access_token(identity=sender.id)
    response = client.get(f'/api/v1/messages/{message.id}', headers=_headers(token, sample_tenant.id))

    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['subject'] == 'Test Message 2'

def test_unauthorized_access(client):
    """Test that unauthorized requests are rejected."""
    response = client.get('/api/v1/messages')
    assert response.status_code == 401
