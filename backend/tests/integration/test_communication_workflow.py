import pytest
import json
import os
from app.models.user import User
from app.models.message import Message
from app.models.attachment import Attachment
from app.models.dashboard import Notification
from app.models.tenant import TenantMembership
from app.extensions import db
from flask_jwt_extended import create_access_token

@pytest.fixture
def workflow_users(db_session):
    u_admin = User(username='adm_user', email='adm@test.com', role='admin')
    u_admin.set_password('Password123')
    u_teacher = User(username='teach_user', email='teach@test.com', role='teacher')
    u_teacher.set_password('Password123')
    u_student = User(username='stud_user', email='stud@test.com', role='student')
    u_student.set_password('Password123')
    u_parent = User(username='par_user', email='par@test.com', role='parent')
    u_parent.set_password('Password123')
    u_unrelated = User(username='unrel_user', email='unrel@test.com', role='user')
    u_unrelated.set_password('Password123')

    db_session.add_all([u_admin, u_teacher, u_student, u_parent, u_unrelated])
    db_session.commit()
    return {
        'admin': u_admin,
        'teacher': u_teacher,
        'student': u_student,
        'parent': u_parent,
        'unrelated': u_unrelated
    }

@pytest.fixture
def workflow_headers(workflow_users, sample_tenant):
    # Setup TenantMembership
    for role, u in workflow_users.items():
        role_name = 'admin' if role == 'admin' else role
        tm = TenantMembership(tenant_id=sample_tenant.id, user_id=u.id, role=role_name)
        db.session.add(tm)
    db.session.commit()

    tokens = {}
    for role, u in workflow_users.items():
        token = create_access_token(identity=u.id)
        tokens[role] = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }
    return tokens

class TestCommunicationWorkflow:

    def test_message_recipient_validation(self, client, workflow_headers):
        # Post message with recipient_id that does not exist in users table
        payload = {
            'recipient_id': 99999,
            'recipient_type': 'student',
            'subject': 'Hello',
            'content': 'Test content'
        }
        response = client.post(
            '/api/v1/messages/send',
            headers=workflow_headers['teacher'],
            json=payload
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False

    def test_message_all_folder_and_bad_rows_exclusion(self, client, workflow_users, workflow_headers, db_session):
        # Create a valid message
        msg_valid = Message(
            sender_id=workflow_users['teacher'].id,
            sender_type='teacher',
            recipient_id=workflow_users['student'].id,
            recipient_type='student',
            subject='Durable Msg',
            content='This is a durable message'
        )
        # Create a corrupt message pointing to non-existent recipient ID
        msg_corrupt = Message(
            sender_id=workflow_users['teacher'].id,
            sender_type='teacher',
            recipient_id=9999,
            recipient_type='student',
            subject='Corrupt Msg',
            content='This recipient does not exist'
        )
        db_session.add_all([msg_valid, msg_corrupt])
        db_session.commit()

        # Fetch messages for teacher (folder=all)
        response = client.get(
            '/api/v1/messages?folder=all',
            headers=workflow_headers['teacher']
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        messages = data['data']
        # Corrupt message must be excluded by schema guard join/in_ filter
        subjects = [m['subject'] for m in messages]
        assert 'Durable Msg' in subjects
        assert 'Corrupt Msg' not in subjects

    def test_attachment_download_authorization(self, client, workflow_users, workflow_headers, db_session, tmpdir):
        # Create a dummy attachment file on disk
        upload_dir = os.path.join(client.application.root_path, 'uploads', 'messages')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, 'test_workflow_file.txt')
        with open(file_path, 'w') as f:
            f.write('Secrets go here.')

        # Create message and attachment record
        msg = Message(
            sender_id=workflow_users['teacher'].id,
            sender_type='teacher',
            recipient_id=workflow_users['student'].id,
            recipient_type='student',
            subject='Attached Info',
            content='Please see attachment'
        )
        db_session.add(msg)
        db_session.commit()

        att = Attachment(
            filename='test_workflow_file.txt',
            file_path='uploads/messages/test_workflow_file.txt',
            size=16,
            mime_type='text/plain',
            uploader_id=workflow_users['teacher'].id,
            entity_type='message',
            entity_id=str(msg.id)
        )
        db_session.add(att)
        db_session.commit()

        # 1. Sender downloads it -> 200
        resp = client.get(f'/api/v1/attachments/{att.id}/download', headers=workflow_headers['teacher'])
        assert resp.status_code == 200
        assert resp.data == b'Secrets go here.'

        # 2. Recipient downloads it -> 200
        resp = client.get(f'/api/v1/attachments/{att.id}/download', headers=workflow_headers['student'])
        assert resp.status_code == 200
        assert resp.data == b'Secrets go here.'

        # 3. Unrelated user tries -> 403
        resp = client.get(f'/api/v1/attachments/{att.id}/download', headers=workflow_headers['unrelated'])
        assert resp.status_code == 403

    def test_admin_communication_console(self, client, workflow_users, workflow_headers, db_session):
        # Admin broadcasts notification to parents
        payload = {
            'comm_type': 'broadcast_notification',
            'recipient_type': 'role',
            'recipient_id': 'parent',
            'subject': 'Broadcasting Notification',
            'content': 'School starts tomorrow.'
        }
        response = client.post(
            '/api/v1/admin-communication/communicate',
            headers=workflow_headers['admin'],
            json=payload
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        summary = data['delivery_summary']
        assert summary['delivered_count'] > 0
        assert summary['failed_count'] == 0

        # Verify notification was stored
        notif = Notification.query.filter_by(title='Broadcasting Notification').first()
        assert notif is not None
        assert notif.recipient_id == workflow_users['parent'].id
