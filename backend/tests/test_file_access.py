import pytest
import json
import os
from app.models.user import User
from app.models.message import Message
from app.models.attachment import Attachment
from app.models.tenant import TenantMembership
from app.extensions import db
from flask_jwt_extended import create_access_token

@pytest.fixture
def file_access_setup(db_session, sample_tenant):
    # Create test users
    uploader = User(username='up_user', email='up@test.com', role='teacher')
    uploader.set_password('Password123')
    
    recipient = User(username='rec_user', email='rec@test.com', role='student')
    recipient.set_password('Password123')
    
    intruder = User(username='int_user', email='int@test.com', role='student')
    intruder.set_password('Password123')
    
    db_session.add_all([uploader, recipient, intruder])
    db_session.commit()
    
    # Active memberships
    m_up = TenantMembership(tenant_id=sample_tenant.id, user_id=uploader.id, role='teacher', status='active')
    m_rec = TenantMembership(tenant_id=sample_tenant.id, user_id=recipient.id, role='student', status='active')
    m_int = TenantMembership(tenant_id=sample_tenant.id, user_id=intruder.id, role='student', status='active')
    db_session.add_all([m_up, m_rec, m_int])
    db_session.commit()
    
    tokens = {
        'uploader': create_access_token(identity=uploader.id),
        'recipient': create_access_token(identity=recipient.id),
        'intruder': create_access_token(identity=intruder.id)
    }
    
    return {
        'uploader': uploader,
        'recipient': recipient,
        'intruder': intruder,
        'tenant': sample_tenant,
        'tokens': tokens
    }

def test_file_access_permissions(client, file_access_setup, db_session):
    setup = file_access_setup
    
    # Create dummy file
    upload_dir = os.path.join(client.application.root_path, 'uploads', 'messages')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, 'sample_test_doc.txt')
    with open(file_path, 'w') as f:
        f.write('Confidential payload.')

    msg = Message(
        sender_id=setup['uploader'].id,
        sender_type='teacher',
        recipient_id=setup['recipient'].id,
        recipient_type='student',
        subject='File Access Test',
        content='See details attached'
    )
    db_session.add(msg)
    db_session.commit()

    att = Attachment(
        filename='sample_test_doc.txt',
        file_path='uploads/messages/sample_test_doc.txt',
        size=21,
        mime_type='text/plain',
        uploader_id=setup['uploader'].id,
        entity_type='message',
        entity_id=str(msg.id)
    )
    db_session.add(att)
    db_session.commit()

    # 1. Uploader/sender can download
    headers_uploader = {
        'Authorization': f'Bearer {setup["tokens"]["uploader"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    resp = client.get(f'/api/v1/attachments/{att.id}/download', headers=headers_uploader)
    assert resp.status_code == 200
    assert b'Confidential payload.' in resp.data
    # Content-Disposition check
    assert resp.headers.get('Content-Disposition') == f'attachment; filename="{att.filename}"'

    # 2. Recipient can download
    headers_recipient = {
        'Authorization': f'Bearer {setup["tokens"]["recipient"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    resp = client.get(f'/api/v1/attachments/{att.id}/download', headers=headers_recipient)
    assert resp.status_code == 200
    assert b'Confidential payload.' in resp.data

    # 3. Unauthorized intruder is rejected
    headers_intruder = {
        'Authorization': f'Bearer {setup["tokens"]["intruder"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    resp = client.get(f'/api/v1/attachments/{att.id}/download', headers=headers_intruder)
    assert resp.status_code == 403
