from uuid import uuid4

from flask_jwt_extended import create_access_token

from app.models.message import Message
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User


def _headers(token, tenant_id):
    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant_id),
    }


def test_messages_list_scopes_results_to_active_tenant(client, db_session, sample_tenant):
    sender = User(username='tenant_sender', email='tenant_sender@example.com', role='teacher')
    sender.set_password('Password123!')
    tenant_a_recipient = User(username='tenant_a_recipient', email='tenant_a_recipient@example.com', role='student')
    tenant_a_recipient.set_password('Password123!')
    tenant_b_recipient = User(username='tenant_b_recipient', email='tenant_b_recipient@example.com', role='student')
    tenant_b_recipient.set_password('Password123!')
    db_session.add_all([sender, tenant_a_recipient, tenant_b_recipient])
    db_session.flush()

    second_tenant = Tenant(
        slug=f"messages-tenant-{uuid4().hex[:8]}",
        name='Messages Tenant B',
        country_code='GH',
        schema_name=f"messages_tenant_{uuid4().hex[:8]}",
        currency='GHS',
    )
    db_session.add(second_tenant)
    db_session.flush()

    db_session.add_all([
        TenantMembership(tenant_id=sample_tenant.id, user_id=sender.id, role='teacher', status='active'),
        TenantMembership(tenant_id=sample_tenant.id, user_id=tenant_a_recipient.id, role='student', status='active'),
        TenantMembership(tenant_id=second_tenant.id, user_id=sender.id, role='teacher', status='active'),
        TenantMembership(tenant_id=second_tenant.id, user_id=tenant_b_recipient.id, role='student', status='active'),
    ])
    db_session.flush()

    db_session.add_all([
        Message(
            sender_id=sender.id,
            sender_type='teacher',
            recipient_id=tenant_a_recipient.id,
            recipient_type='student',
            subject='Tenant A Message',
            content='Visible in tenant A only',
        ),
        Message(
            sender_id=sender.id,
            sender_type='teacher',
            recipient_id=tenant_b_recipient.id,
            recipient_type='student',
            subject='Tenant B Message',
            content='Visible in tenant B only',
        ),
    ])
    db_session.commit()

    token = create_access_token(identity=sender.id)
    response = client.get('/api/v1/messages?folder=sent', headers=_headers(token, sample_tenant.id))

    assert response.status_code == 200
    assert response.json['success'] is True
    assert len(response.json['data']) == 1
    assert response.json['data'][0]['subject'] == 'Tenant A Message'


def test_create_message_rejects_cross_tenant_recipient(client, db_session, sample_tenant):
    sender = User(username='tenant_admin_sender', email='tenant_admin_sender@example.com', role='admin')
    sender.set_password('Password123!')
    recipient = User(username='tenant_external_recipient', email='tenant_external_recipient@example.com', role='admin')
    recipient.set_password('Password123!')
    db_session.add_all([sender, recipient])
    db_session.flush()

    second_tenant = Tenant(
        slug=f"messages-cross-{uuid4().hex[:8]}",
        name='Messages Cross Tenant',
        country_code='GH',
        schema_name=f"messages_cross_{uuid4().hex[:8]}",
        currency='GHS',
    )
    db_session.add(second_tenant)
    db_session.flush()

    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=sender.id, role='school_admin', status='active'))
    db_session.add(TenantMembership(tenant_id=second_tenant.id, user_id=recipient.id, role='school_admin', status='active'))
    db_session.commit()

    token = create_access_token(identity=sender.id)
    response = client.post(
        '/api/v1/messages/send',
        json={
            'recipient_id': recipient.id,
            'recipient_type': 'admin',
            'subject': 'Cross Tenant Attempt',
            'content': 'This should be blocked.',
        },
        headers=_headers(token, sample_tenant.id),
    )

    assert response.status_code == 400
    assert response.json['success'] is False
    assert Message.query.filter_by(subject='Cross Tenant Attempt').count() == 0
