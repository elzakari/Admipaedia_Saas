import pytest
import json
from datetime import datetime
from app.models.user import User
from app.models.message import Message
from app.models.tenant import TenantMembership
from app.extensions import db
from flask_jwt_extended import create_access_token

@pytest.fixture
def threading_setup(db_session, sample_tenant):
    # Create test users
    teacher = User(username='t_thread', email='t_thread@test.com', role='teacher')
    teacher.set_password('Password123')
    
    student = User(username='s_thread', email='s_thread@test.com', role='student')
    student.set_password('Password123')
    
    db_session.add_all([teacher, student])
    db_session.commit()
    
    # Active memberships
    m_teacher = TenantMembership(tenant_id=sample_tenant.id, user_id=teacher.id, role='teacher', status='active')
    m_student = TenantMembership(tenant_id=sample_tenant.id, user_id=student.id, role='student', status='active')
    db_session.add_all([m_teacher, m_student])
    db_session.commit()
    
    tokens = {
        'teacher': create_access_token(identity=teacher.id),
        'student': create_access_token(identity=student.id)
    }
    
    return {
        'teacher': teacher,
        'student': student,
        'tenant': sample_tenant,
        'tokens': tokens
    }

def test_messages_threading_and_inbox_sent(client, threading_setup, db_session):
    setup = threading_setup
    
    # 1. Message from teacher to student
    msg1 = Message(
        sender_id=setup['teacher'].id,
        sender_type='teacher',
        recipient_id=setup['student'].id,
        recipient_type='student',
        subject='Thread Subject',
        content='Message 1 content'
    )
    
    # 2. Reply from student to teacher
    msg2 = Message(
        sender_id=setup['student'].id,
        sender_type='student',
        recipient_id=setup['teacher'].id,
        recipient_type='teacher',
        subject='Re: Thread Subject',
        content='Message 2 reply'
    )
    
    db_session.add_all([msg1, msg2])
    db_session.commit()
    
    # Get messages endpoint with folder=all for student
    headers_student = {
        'Authorization': f'Bearer {setup["tokens"]["student"]}',
        'X-Tenant-ID': str(setup['tenant'].id)
    }
    
    response = client.get('/api/v1/messages?folder=all', headers=headers_student)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    
    messages = data['data']
    assert len(messages) == 2
    
    # Verify recipient_user_ids() helper works
    assert setup['student'].id in msg1.recipient_user_ids()
    assert setup['teacher'].id in msg2.recipient_user_ids()
