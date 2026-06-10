import pytest
import json
from datetime import date
from app.models.user import User
from app.models.message import Message
from app.models.student import Student
from app.models.parent import Parent
from app.models.attachment import Attachment
from app.extensions import db
from flask_jwt_extended import create_access_token

@pytest.fixture
def messaging_setup(db_session, sample_tenant):
    # Create test users
    teacher_user = User(username='t_user', email='t_user@test.com', role='teacher')
    teacher_user.set_password('Password123')
    
    student_user = User(username='s_user', email='s_user@test.com', role='student')
    student_user.set_password('Password123')
    
    parent_user = User(username='p_user', email='p_user@test.com', role='parent')
    parent_user.set_password('Password123')
    
    from app.models.tenant import TenantMembership
    db_session.add_all([teacher_user, student_user, parent_user])
    db_session.commit()
    
    # Create tenant memberships
    m_teacher = TenantMembership(tenant_id=sample_tenant.id, user_id=teacher_user.id, role='teacher', status='active')
    m_student = TenantMembership(tenant_id=sample_tenant.id, user_id=student_user.id, role='student', status='active')
    m_parent = TenantMembership(tenant_id=sample_tenant.id, user_id=parent_user.id, role='parent', status='active')
    db_session.add_all([m_teacher, m_student, m_parent])
    db_session.commit()
    
    # Create profiles
    parent_profile = Parent(tenant_id=sample_tenant.id, user_id=parent_user.id)
    db_session.add(parent_profile)
    db_session.flush()
    
    student_profile = Student(
        tenant_id=sample_tenant.id,
        user_id=student_user.id,
        parent_id=parent_profile.id,
        admission_number='STUD101',
        first_name='John',
        last_name='Doe',
        date_of_birth=date(2010, 1, 1),
        gender='male'
    )
    db_session.add(student_profile)
    db_session.commit()
    
    tokens = {
        'teacher': create_access_token(identity=teacher_user.id),
        'student': create_access_token(identity=student_user.id),
        'parent': create_access_token(identity=parent_user.id)
    }
    
    return {
        'teacher_user': teacher_user,
        'student_user': student_user,
        'parent_user': parent_user,
        'parent_profile': parent_profile,
        'student_profile': student_profile,
        'tenant': sample_tenant,
        'tokens': tokens
    }

def test_student_inbox_and_parent_messages(client, messaging_setup, db_session):
    setup = messaging_setup
    
    # 1. Message from teacher to student
    msg1 = Message(
        sender_id=setup['teacher_user'].id,
        sender_type='teacher',
        recipient_id=setup['student_user'].id,
        recipient_type='student',
        subject='Student HW',
        content='Do your homework.'
    )
    
    # 2. Message from teacher to parent
    msg2 = Message(
        sender_id=setup['teacher_user'].id,
        sender_type='teacher',
        recipient_id=setup['parent_user'].id,
        recipient_type='parent',
        subject='Parent Notice',
        content='Sign report card.'
    )
    
    db_session.add_all([msg1, msg2])
    db_session.commit()
    
    # Query student conversations
    headers = {
        'Authorization': f'Bearer {setup["tokens"]["student"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    response = client.get('/api/v1/student/messages/conversations', headers=headers)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    
    threads = data['threads']
    assert len(threads) == 1  # Grouped by teacher user ID
    
    messages = threads[0]['messages']
    bodies = [m['body'] for m in messages]
    # Should include both student messages AND parent messages
    assert 'Do your homework.' in bodies
    assert 'Sign report card.' in bodies

def test_student_send_message_resolves_parent(client, messaging_setup, db_session):
    setup = messaging_setup
    
    headers = {
        'Authorization': f'Bearer {setup["tokens"]["student"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    
    # Send message targeting parent profile ID
    payload = {
        'recipient_id': setup['parent_profile'].id,
        'recipient_type': 'parent',
        'content': 'Hello Mom'
    }
    
    response = client.post('/api/v1/student/messages/send', headers=headers, json=payload)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    
    # Verify message recipient resolved to parent's user_id
    msg = Message.query.filter_by(content='Hello Mom').first()
    assert msg is not None
    assert msg.recipient_id == setup['parent_user'].id

def test_message_attachments_delivery(client, messaging_setup, db_session):
    setup = messaging_setup
    
    # Create message with attachment info
    msg = Message(
        sender_id=setup['teacher_user'].id,
        sender_type='teacher',
        recipient_id=setup['student_user'].id,
        recipient_type='student',
        subject='Attached Docs',
        content='Here is the class manual',
        attachments=['uploads/messages/sample_manual.pdf']
    )
    db_session.add(msg)
    db_session.commit()
    
    headers = {
        'Authorization': f'Bearer {setup["tokens"]["student"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    response = client.get('/api/v1/student/messages/conversations', headers=headers)
    assert response.status_code == 200
    data = json.loads(response.data)
    
    threads = data['threads']
    messages = threads[0]['messages']
    
    # In student routes, the custom serializer is not applied since it outputs raw thread dictionary,
    # but let's query the shared route /messages to verify attachment serialization
    response_shared = client.get('/api/v1/messages?folder=all', headers=headers)
    assert response_shared.status_code == 200
    shared_data = json.loads(response_shared.data)
    
    msg_serialized = shared_data['data'][0]
    attachments = msg_serialized['attachments']
    assert len(attachments) == 1
    assert attachments[0]['filename'] == 'sample_manual.pdf'
    assert 'download_url' in attachments[0]
