import pytest
import json
import os
from uuid import uuid4
from app.models.user import User
from app.models.message import Message
from app.models.attachment import Attachment
from app.models.class_ import Class
from app.models.resource import Resource
from app.models.tenant import Tenant
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

    headers_uploader = {
        'Authorization': f'Bearer {setup["tokens"]["uploader"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    headers_recipient = {
        'Authorization': f'Bearer {setup["tokens"]["recipient"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    headers_intruder = {
        'Authorization': f'Bearer {setup["tokens"]["intruder"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }

    # Message-backed attachments fail closed until Message.tenant_id exists.
    for headers in (headers_uploader, headers_recipient, headers_intruder):
        resp = client.get(
            f'/api/v1/attachments/{att.id}/download',
            headers=headers,
        )
        assert resp.status_code == 403


def test_attachment_download_rejects_tenantless_uploader_record(
    client, file_access_setup, db_session
):
    setup = file_access_setup
    upload_dir = os.path.join(client.application.root_path, 'uploads', 'resources')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, 'tenantless_attachment.txt')
    with open(file_path, 'w') as handle:
        handle.write('must remain inaccessible')

    try:
        att = Attachment(
            filename='tenantless_attachment.txt',
            file_path='uploads/resources/tenantless_attachment.txt',
            size=24,
            mime_type='text/plain',
            uploader_id=setup['uploader'].id,
            tenant_id=None,
            entity_type='assignment',
            entity_id='999999',
        )
        db_session.add(att)
        db_session.commit()
        headers = {
            'Authorization': f'Bearer {setup["tokens"]["uploader"]}',
            'X-Tenant-ID': str(setup['tenant'].id),
        }
        response = client.get(f'/api/v1/attachments/{att.id}/download', headers=headers)
        assert response.status_code == 403
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


def test_attachment_download_rejects_path_traversal(
    client, file_access_setup, db_session
):
    setup = file_access_setup
    outside_name = 'attachment_path_boundary_secret.txt'
    outside_path = os.path.join(client.application.root_path, outside_name)
    with open(outside_path, 'w') as handle:
        handle.write('outside uploads')

    try:
        att = Attachment(
            filename=outside_name,
            file_path=f'uploads/../{outside_name}',
            size=15,
            mime_type='text/plain',
            uploader_id=setup['uploader'].id,
            tenant_id=setup['tenant'].id,
            entity_type='assignment',
            entity_id='999999',
        )
        db_session.add(att)
        db_session.commit()
        headers = {
            'Authorization': f'Bearer {setup["tokens"]["uploader"]}',
            'X-Tenant-ID': str(setup['tenant'].id),
        }
        response = client.get(f'/api/v1/attachments/{att.id}/download', headers=headers)
        assert response.status_code == 404
        assert b'outside uploads' not in response.data
    finally:
        if os.path.exists(outside_path):
            os.remove(outside_path)


def test_generic_attachment_signed_url_fails_closed(client, file_access_setup):
    setup = file_access_setup
    headers = {
        'Authorization': f'Bearer {setup["tokens"]["uploader"]}',
        'X-Tenant-ID': str(setup['tenant'].id),
    }
    response = client.post(
        '/api/v1/attachments/signed-url',
        headers=headers,
        json={'storage_key': 'tenants/other-school/private.pdf'},
    )
    assert response.status_code == 503
    assert response.json['code'] == 'ATTACHMENT_STORAGE_OWNERSHIP_REQUIRED'


def test_generic_download_rejects_traversal(client, file_access_setup):
    setup = file_access_setup
    outside_name = 'generic_download_boundary_secret.txt'
    outside_path = os.path.join(client.application.root_path, outside_name)
    with open(outside_path, 'w') as handle:
        handle.write('generic secret')

    try:
        headers = {
            'Authorization': f'Bearer {setup["tokens"]["uploader"]}',
            'X-Tenant-ID': str(setup['tenant'].id),
        }
        response = client.get(
            f'/api/v1/download/uploads/%2e%2e/{outside_name}',
            headers=headers,
        )
        assert response.status_code in (403, 404)
        assert b'generic secret' not in response.data
    finally:
        if os.path.exists(outside_path):
            os.remove(outside_path)

def test_generic_download_allows_same_tenant_resource(
    client,
    db_session,
    sample_tenant,
    sample_class,
):
    admin = User(
        username='resource_admin',
        email='resource_admin@example.com',
        role='admin',
    )
    admin.set_password('Password123!')
    db_session.add(admin)
    db_session.flush()

    db_session.add(
        TenantMembership(
            tenant_id=sample_tenant.id,
            user_id=admin.id,
            role='school_admin',
            status='active',
        )
    )

    relative_path = 'uploads/resources/same_tenant_resource.txt'
    full_path = os.path.join(
        client.application.root_path,
        'uploads',
        'resources',
        'same_tenant_resource.txt',
    )
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, 'w') as handle:
        handle.write('same tenant resource')

    response = None
    try:
        resource = Resource(
            title='Same Tenant Resource',
            type='document',
            file_path=relative_path,
            class_id=sample_class.id,
            teacher_id=None,
        )
        db_session.add(resource)
        db_session.commit()

        token = create_access_token(identity=admin.id)
        response = client.get(
            f'/api/v1/download/{relative_path}',
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': str(sample_tenant.id),
            },
        )

        assert response.status_code == 200
        assert b'same tenant resource' in response.data
    finally:
        if response is not None:
            response.close()
        if os.path.exists(full_path):
            os.remove(full_path)


def test_generic_download_rejects_foreign_tenant_resource(
    client,
    db_session,
    sample_tenant,
):
    admin = User(
        username='foreign_resource_admin',
        email='foreign_resource_admin@example.com',
        role='admin',
    )
    admin.set_password('Password123!')
    db_session.add(admin)
    db_session.flush()

    db_session.add(
        TenantMembership(
            tenant_id=sample_tenant.id,
            user_id=admin.id,
            role='school_admin',
            status='active',
        )
    )

    foreign_tenant = Tenant(
        slug=f'foreign-resource-{uuid4().hex[:8]}',
        name='Foreign Resource Tenant',
        country_code='GH',
        schema_name=f'foreign_resource_{uuid4().hex[:8]}',
        currency='GHS',
    )
    db_session.add(foreign_tenant)
    db_session.flush()

    foreign_class = Class(
        tenant_id=foreign_tenant.id,
        name='Foreign Class',
        grade_level='Grade 5',
        academic_year='2026',
    )
    db_session.add(foreign_class)
    db_session.flush()

    relative_path = 'uploads/resources/foreign_tenant_resource.txt'
    full_path = os.path.join(
        client.application.root_path,
        'uploads',
        'resources',
        'foreign_tenant_resource.txt',
    )
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, 'w') as handle:
        handle.write('foreign tenant secret')

    try:
        resource = Resource(
            title='Foreign Tenant Resource',
            type='document',
            file_path=relative_path,
            class_id=foreign_class.id,
            teacher_id=None,
        )
        db_session.add(resource)
        db_session.commit()

        token = create_access_token(identity=admin.id)
        response = client.get(
            f'/api/v1/download/{relative_path}',
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': str(sample_tenant.id),
            },
        )

        assert response.status_code == 403
        assert b'foreign tenant secret' not in response.data
    finally:
        if os.path.exists(full_path):
            os.remove(full_path)


def test_generic_download_rejects_ownerless_upload_file(
    client,
    db_session,
    sample_tenant,
):
    admin = User(
        username='ownerless_resource_admin',
        email='ownerless_resource_admin@example.com',
        role='admin',
    )
    admin.set_password('Password123!')
    db_session.add(admin)
    db_session.flush()

    db_session.add(
        TenantMembership(
            tenant_id=sample_tenant.id,
            user_id=admin.id,
            role='school_admin',
            status='active',
        )
    )
    db_session.commit()

    relative_path = 'uploads/resources/ownerless_resource.txt'
    full_path = os.path.join(
        client.application.root_path,
        'uploads',
        'resources',
        'ownerless_resource.txt',
    )
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, 'w') as handle:
        handle.write('ownerless secret')

    try:
        token = create_access_token(identity=admin.id)
        response = client.get(
            f'/api/v1/download/{relative_path}',
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': str(sample_tenant.id),
            },
        )

        assert response.status_code == 403
        assert b'ownerless secret' not in response.data
    finally:
        if os.path.exists(full_path):
            os.remove(full_path)
