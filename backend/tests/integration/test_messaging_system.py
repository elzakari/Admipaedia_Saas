"""
Integration tests for the Messaging System

This module contains comprehensive integration tests for the messaging and communication system,
including announcements, notifications, WebSocket messaging, and real-time communication features.

Test Coverage:
- Announcement creation, retrieval, and management
- Notification system functionality and delivery
- WebSocket real-time messaging capabilities
- Role-based access control for messaging features
- Message persistence and retrieval
- Real-time communication workflows
- Error handling and edge cases
- Performance and concurrency testing
"""

import pytest
import json
from datetime import datetime, date, timedelta
from unittest.mock import patch, MagicMock
from flask_socketio import SocketIOTestClient
from app.models.announcement import Announcement
from app.models.dashboard import Notification
from app.models.message import Message
from app.models.user import User
from app.models.class_ import Class
from app.extensions import db, socketio
from app.services.announcement_service import AnnouncementService
from app.services.notification_service import NotificationService


class TestAnnouncementManagement:
    """Test announcement creation and management functionality"""
    
    def test_create_announcement_success(self, client, admin_auth_headers, sample_class):
        """Test successful announcement creation"""
        announcement_data = {
            'title': 'Important School Notice',
            'content': 'This is an important announcement for all students and parents.',
            'target_roles': ['students', 'parents'],
            'class_id': sample_class.id,
            'send_notification': True,
            'send_email': False
        }
        
        response = client.post(
            '/api/v1/announcements',
            headers=admin_auth_headers,
            json=announcement_data
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'announcement' in data
        
        # Verify announcement was created in database
        announcement = Announcement.query.filter_by(title='Important School Notice').first()
        assert announcement is not None
        assert announcement.content == announcement_data['content']
        assert announcement.class_id == sample_class.id
    
    def test_create_announcement_missing_fields(self, client, admin_auth_headers):
        """Test announcement creation with missing required fields"""
        incomplete_data = {
            'title': 'Incomplete Announcement'
            # Missing content and target_roles
        }
        
        response = client.post(
            '/api/v1/announcements',
            headers=admin_auth_headers,
            json=incomplete_data
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Missing required fields' in data['message']
    
    def test_get_announcements_for_user(self, client, auth_headers, sample_announcements):
        """Test retrieval of announcements for a specific user"""
        response = client.get(
            '/api/v1/announcements',
            headers=auth_headers,
            query_string={'page': 1, 'per_page': 10}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'announcements' in data
        assert 'total' in data
        assert 'page' in data
        assert 'per_page' in data
    
    def test_get_class_announcements(self, client, auth_headers, sample_class_with_announcements):
        """Test retrieval of announcements for a specific class"""
        class_id = sample_class_with_announcements.id
        
        response = client.get(
            f'/api/v1/classes/{class_id}/announcements',
            headers=auth_headers,
            query_string={'page': 1, 'per_page': 20}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'announcements' in data
        assert 'pagination' in data
        
        # Verify announcements belong to the class
        for announcement in data['announcements']:
            assert 'title' in announcement
            assert 'content' in announcement
            assert 'created_at' in announcement
    
    def test_update_class_announcement(self, client, teacher_auth_headers, sample_class_announcement):
        """Test updating a class announcement"""
        class_id = sample_class_announcement.class_id
        announcement_id = sample_class_announcement.id
        
        update_data = {
            'title': 'Updated Announcement Title',
            'content': 'This announcement has been updated with new information.',
            'target_roles': ['students', 'parents', 'teachers']
        }
        
        response = client.put(
            f'/api/v1/classes/{class_id}/announcements/{announcement_id}',
            headers=teacher_auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['announcement']['title'] == update_data['title']
        
        # Verify update in database
        updated_announcement = Announcement.query.get(announcement_id)
        assert updated_announcement.title == update_data['title']
        assert updated_announcement.content == update_data['content']
    
    def test_unauthorized_announcement_creation(self, client, student_auth_headers):
        """Test that students cannot create announcements"""
        announcement_data = {
            'title': 'Unauthorized Announcement',
            'content': 'This should not be allowed',
            'target_roles': ['students']
        }
        
        response = client.post(
            '/api/v1/announcements',
            headers=student_auth_headers,
            json=announcement_data
        )
        
        assert response.status_code == 403  # Forbidden


class TestNotificationSystem:
    """Test notification creation and delivery functionality"""
    
    def test_create_notification_success(self, client, admin_auth_headers, sample_user):
        """Test successful notification creation"""
        notification_data = {
            'title': 'System Maintenance',
            'message': 'The system will be under maintenance tonight from 10 PM to 2 AM.',
            'type': 'info',
            'user_id': sample_user.id,
            'send_email': False,
            'send_websocket': True
        }
        
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=notification_data
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'notification' in data
        
        # Verify notification was created in database
        notification = Notification.query.filter_by(title='System Maintenance').first()
        assert notification is not None
        assert notification.message == notification_data['message']
        assert notification.user_id == sample_user.id
    
    def test_create_global_notification(self, client, admin_auth_headers):
        """Test creation of global notification (no specific user)"""
        notification_data = {
            'title': 'School Holiday',
            'message': 'School will be closed tomorrow due to public holiday.',
            'type': 'info',
            'send_email': False,
            'send_websocket': True
        }
        
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=notification_data
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['notification']['user_id'] is None  # Global notification
    
    def test_get_user_notifications(self, client, auth_headers, sample_notifications):
        """Test retrieval of notifications for a user"""
        response = client.get(
            '/api/v1/dashboard/notifications',
            headers=auth_headers,
            query_string={'limit': 10}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
        
        # Verify notification structure
        if data:
            notification = data[0]
            required_fields = ['id', 'title', 'message', 'time', 'read', 'type']
            for field in required_fields:
                assert field in notification
    
    def test_notification_creation_missing_fields(self, client, admin_auth_headers):
        """Test notification creation with missing required fields"""
        incomplete_data = {
            'title': 'Incomplete Notification'
            # Missing message and type
        }
        
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=incomplete_data
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_unauthorized_notification_creation(self, client, student_auth_headers):
        """Test that students cannot create notifications"""
        notification_data = {
            'title': 'Unauthorized Notification',
            'message': 'This should not be allowed',
            'type': 'info'
        }
        
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=student_auth_headers,
            json=notification_data
        )
        
        assert response.status_code == 403  # Forbidden


class TestWebSocketMessaging:
    """Test WebSocket real-time messaging functionality"""
    
    def test_websocket_connection_with_auth(self, app, sample_user, valid_jwt_token):
        """Test WebSocket connection with valid authentication"""
        client = SocketIOTestClient(app, socketio, namespace='/messages')
        
        # Connect with authentication
        received = client.get_received('/messages')
        client.emit('connect', {'token': valid_jwt_token}, namespace='/messages')
        
        # Should receive connection confirmation
        received = client.get_received('/messages')
        assert len(received) > 0
    
    def test_websocket_connection_without_auth(self, app):
        """Test WebSocket connection without authentication"""
        client = SocketIOTestClient(app, socketio, namespace='/messages')
        
        # Attempt to connect without token
        connected = client.emit('connect', {}, namespace='/messages')
        
        # Connection should be rejected
        assert not connected
    
    def test_send_message_via_websocket(self, app, sample_users, valid_jwt_token):
        """Test sending a message via WebSocket"""
        client = SocketIOTestClient(app, socketio, namespace='/messages')
        
        # Connect with authentication
        client.emit('connect', {'token': valid_jwt_token}, namespace='/messages')
        
        # Send message
        message_data = {
            'sender_id': sample_users[0].id,
            'recipient_id': sample_users[1].id,
            'subject': 'Test WebSocket Message',
            'content': 'This is a test message sent via WebSocket'
        }
        
        client.emit('send_message', message_data, namespace='/messages')
        
        # Check for confirmation
        received = client.get_received('/messages')
        message_sent_events = [r for r in received if r['name'] == 'message_sent']
        assert len(message_sent_events) > 0
        
        # Verify message was saved to database
        message = Message.query.filter_by(subject='Test WebSocket Message').first()
        assert message is not None
        assert message.sender_id == sample_users[0].id
        assert message.recipient_id == sample_users[1].id
    
    def test_websocket_message_validation(self, app, sample_user, valid_jwt_token):
        """Test WebSocket message validation"""
        client = SocketIOTestClient(app, socketio, namespace='/messages')
        
        # Connect with authentication
        client.emit('connect', {'token': valid_jwt_token}, namespace='/messages')
        
        # Send invalid message (missing required fields)
        invalid_message = {
            'sender_id': sample_user.id
            # Missing recipient_id, subject, content
        }
        
        client.emit('send_message', invalid_message, namespace='/messages')
        
        # Should receive error
        received = client.get_received('/messages')
        error_events = [r for r in received if r['name'] == 'error']
        assert len(error_events) > 0
        assert 'Invalid message data' in error_events[0]['args'][0]['message']
    
    def test_notification_websocket_delivery(self, app, sample_user, valid_jwt_token):
        """Test notification delivery via WebSocket"""
        client = SocketIOTestClient(app, socketio, namespace='/notifications')
        
        # Connect to notifications namespace
        client.emit('connect', {'token': valid_jwt_token}, namespace='/notifications')
        
        # Create notification that should be delivered via WebSocket
        with patch('app.services.notification_service.NotificationService.create_notification') as mock_create:
            mock_notification = MagicMock()
            mock_notification.id = 1
            mock_notification.title = 'Test Notification'
            mock_notification.message = 'Test message'
            mock_notification.type = 'info'
            mock_notification.user_id = sample_user.id
            mock_notification.read = False
            mock_create.return_value = mock_notification
            
            # Trigger notification creation
            client.emit('create_notification', {
                'title': 'Test Notification',
                'message': 'Test message',
                'type': 'info',
                'user_id': sample_user.id
            }, namespace='/notifications')
            
            # Check for notification delivery
            received = client.get_received('/notifications')
            notification_events = [r for r in received if r['name'] == 'notification_created']
            assert len(notification_events) > 0


class TestMessagingIntegrationWorkflow:
    """Test end-to-end messaging system workflows"""
    
    def test_complete_announcement_workflow(self, client, admin_auth_headers, teacher_auth_headers, sample_class):
        """Test complete workflow from announcement creation to retrieval"""
        # Step 1: Admin creates announcement
        announcement_data = {
            'title': 'Parent-Teacher Conference',
            'content': 'Parent-teacher conferences will be held next week. Please schedule your appointments.',
            'target_roles': ['parents', 'teachers'],
            'class_id': sample_class.id,
            'send_notification': True
        }
        
        response = client.post(
            '/api/v1/announcements',
            headers=admin_auth_headers,
            json=announcement_data
        )
        assert response.status_code == 201
        
        # Step 2: Teacher retrieves class announcements
        response = client.get(
            f'/api/v1/classes/{sample_class.id}/announcements',
            headers=teacher_auth_headers
        )
        assert response.status_code == 200
        announcements = json.loads(response.data)['announcements']
        assert len(announcements) > 0
        assert any(a['title'] == 'Parent-Teacher Conference' for a in announcements)
        
        # Step 3: Teacher updates announcement
        announcement_id = next(a['id'] for a in announcements if a['title'] == 'Parent-Teacher Conference')
        update_data = {
            'content': 'Parent-teacher conferences will be held next week. Updated: Please bring your child\'s report card.'
        }
        
        response = client.put(
            f'/api/v1/classes/{sample_class.id}/announcements/{announcement_id}',
            headers=teacher_auth_headers,
            json=update_data
        )
        assert response.status_code == 200
        
        # Step 4: Verify update
        response = client.get(
            f'/api/v1/classes/{sample_class.id}/announcements',
            headers=teacher_auth_headers
        )
        updated_announcements = json.loads(response.data)['announcements']
        updated_announcement = next(a for a in updated_announcements if a['id'] == announcement_id)
        assert 'Updated:' in updated_announcement['content']
    
    def test_notification_cascade_workflow(self, client, admin_auth_headers, sample_users):
        """Test workflow where announcement triggers notifications"""
        # Create announcement with notification enabled
        announcement_data = {
            'title': 'Emergency Closure',
            'content': 'School is closed today due to severe weather conditions.',
            'target_roles': ['all'],
            'send_notification': True,
            'send_email': True
        }
        
        with patch('app.services.notification_service.NotificationService.create_notification') as mock_notify:
            response = client.post(
                '/api/v1/announcements',
                headers=admin_auth_headers,
                json=announcement_data
            )
            assert response.status_code == 201
            
            # Verify notification service was called
            assert mock_notify.called
    
    def test_real_time_messaging_workflow(self, app, sample_users, valid_jwt_tokens):
        """Test real-time messaging between users"""
        # Create two WebSocket clients for different users
        client1 = SocketIOTestClient(app, socketio, namespace='/messages')
        client2 = SocketIOTestClient(app, socketio, namespace='/messages')
        
        # Connect both clients
        client1.emit('connect', {'token': valid_jwt_tokens[0]}, namespace='/messages')
        client2.emit('connect', {'token': valid_jwt_tokens[1]}, namespace='/messages')
        
        # User 1 sends message to User 2
        message_data = {
            'sender_id': sample_users[0].id,
            'recipient_id': sample_users[1].id,
            'subject': 'Real-time Test',
            'content': 'Testing real-time message delivery'
        }
        
        client1.emit('send_message', message_data, namespace='/messages')
        
        # User 2 should receive the message
        received_by_user2 = client2.get_received('/messages')
        new_message_events = [r for r in received_by_user2 if r['name'] == 'new_message']
        assert len(new_message_events) > 0
        
        # User 1 should receive confirmation
        received_by_user1 = client1.get_received('/messages')
        message_sent_events = [r for r in received_by_user1 if r['name'] == 'message_sent']
        assert len(message_sent_events) > 0


class TestMessagingErrorHandling:
    """Test error handling in messaging system"""
    
    def test_announcement_creation_database_error(self, client, admin_auth_headers):
        """Test handling of database errors during announcement creation"""
        with patch('app.services.announcement_service.AnnouncementService.create_announcement') as mock_create:
            mock_create.side_effect = Exception("Database connection error")
            
            announcement_data = {
                'title': 'Test Announcement',
                'content': 'Test content',
                'target_roles': ['students']
            }
            
            response = client.post(
                '/api/v1/announcements',
                headers=admin_auth_headers,
                json=announcement_data
            )
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
    
    def test_websocket_connection_with_invalid_token(self, app):
        """Test WebSocket connection with invalid JWT token"""
        client = SocketIOTestClient(app, socketio, namespace='/messages')
        
        # Attempt connection with invalid token
        connected = client.emit('connect', {'token': 'invalid_token'}, namespace='/messages')
        
        # Connection should be rejected
        assert not connected
    
    def test_notification_creation_validation_error(self, client, admin_auth_headers):
        """Test notification creation with validation errors"""
        invalid_data = {
            'title': '',  # Empty title
            'message': 'Valid message',
            'type': 'invalid_type'  # Invalid type
        }
        
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=invalid_data
        )
        
        assert response.status_code == 400
    
    def test_websocket_message_database_error(self, app, sample_user, valid_jwt_token):
        """Test WebSocket message handling with database error"""
        client = SocketIOTestClient(app, socketio, namespace='/messages')
        
        # Connect with authentication
        client.emit('connect', {'token': valid_jwt_token}, namespace='/messages')
        
        with patch('app.models.message.Message') as mock_message:
            mock_message.side_effect = Exception("Database error")
            
            # Send message that should trigger database error
            message_data = {
                'sender_id': sample_user.id,
                'recipient_id': sample_user.id,
                'subject': 'Error Test',
                'content': 'This should cause an error'
            }
            
            client.emit('send_message', message_data, namespace='/messages')
            
            # Should receive error
            received = client.get_received('/messages')
            error_events = [r for r in received if r['name'] == 'error']
            assert len(error_events) > 0


class TestMessagingPerformance:
    """Test performance aspects of messaging system"""
    
    def test_bulk_announcement_retrieval_performance(self, client, auth_headers, large_announcement_dataset):
        """Test performance with large number of announcements"""
        import time
        
        start_time = time.time()
        response = client.get(
            '/api/v1/announcements',
            headers=auth_headers,
            query_string={'per_page': 100}
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should complete within 2 seconds
        
        data = json.loads(response.data)
        assert len(data['announcements']) <= 100
    
    def test_concurrent_websocket_connections(self, app, sample_users, valid_jwt_tokens):
        """Test handling of multiple concurrent WebSocket connections"""
        clients = []
        
        # Create multiple WebSocket clients
        for i in range(10):
            client = SocketIOTestClient(app, socketio, namespace='/messages')
            token = valid_jwt_tokens[i % len(valid_jwt_tokens)]
            client.emit('connect', {'token': token}, namespace='/messages')
            clients.append(client)
        
        # Send messages from multiple clients simultaneously
        import threading
        
        def send_message(client, sender_id, recipient_id):
            message_data = {
                'sender_id': sender_id,
                'recipient_id': recipient_id,
                'subject': f'Concurrent Test {threading.current_thread().name}',
                'content': 'Testing concurrent message sending'
            }
            client.emit('send_message', message_data, namespace='/messages')
        
        threads = []
        for i, client in enumerate(clients[:5]):  # Use first 5 clients as senders
            sender_id = sample_users[i % len(sample_users)].id
            recipient_id = sample_users[(i + 1) % len(sample_users)].id
            thread = threading.Thread(target=send_message, args=(client, sender_id, recipient_id))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify messages were processed
        message_count = Message.query.filter(Message.subject.like('Concurrent Test%')).count()
        assert message_count >= 5
    
    def test_notification_delivery_performance(self, client, admin_auth_headers, large_user_dataset):
        """Test notification delivery performance with many users"""
        import time
        
        notification_data = {
            'title': 'Performance Test Notification',
            'message': 'Testing notification delivery to many users',
            'type': 'info'
            # No user_id specified - global notification
        }
        
        start_time = time.time()
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=notification_data
        )
        end_time = time.time()
        
        assert response.status_code == 201
        assert (end_time - start_time) < 3.0  # Should complete within 3 seconds


# Fixtures for test data
@pytest.fixture
def sample_announcements(db_session, sample_class, sample_teacher):
    """Create sample announcements for testing"""
    announcements = []
    for i in range(3):
        announcement = Announcement(
            title=f'Test Announcement {i+1}',
            content=f'This is test announcement content {i+1}',
            target_roles='students,parents',
            class_id=sample_class.id,
            teacher_id=sample_teacher.id,
            is_published=True
        )
        db_session.add(announcement)
        announcements.append(announcement)
    
    db_session.commit()
    return announcements

@pytest.fixture
def sample_class_with_announcements(db_session, sample_class, sample_teacher):
    """Create a class with multiple announcements"""
    for i in range(5):
        announcement = Announcement(
            title=f'Class Announcement {i+1}',
            content=f'Important information for the class {i+1}',
            target_roles='students,parents',
            class_id=sample_class.id,
            teacher_id=sample_teacher.id,
            is_published=True
        )
        db_session.add(announcement)
    
    db_session.commit()
    return sample_class

@pytest.fixture
def sample_class_announcement(db_session, sample_class, sample_teacher):
    """Create a single class announcement for testing"""
    announcement = Announcement(
        title='Editable Announcement',
        content='This announcement can be edited',
        target_roles='students,parents',
        class_id=sample_class.id,
        teacher_id=sample_teacher.id,
        is_published=True
    )
    db_session.add(announcement)
    db_session.commit()
    return announcement

@pytest.fixture
def sample_notifications(db_session, sample_user):
    """Create sample notifications for testing"""
    notifications = []
    for i in range(3):
        notification = Notification(
            title=f'Test Notification {i+1}',
            message=f'This is test notification message {i+1}',
            type='info',
            user_id=sample_user.id,
            read=False
        )
        db_session.add(notification)
        notifications.append(notification)
    
    db_session.commit()
    return notifications

@pytest.fixture
def sample_users(db_session):
    """Create multiple sample users for testing"""
    users = []
    for i in range(5):
        user = User(
            username=f'testuser{i+1}',
            email=f'testuser{i+1}@example.com',
            first_name=f'Test{i+1}',
            last_name='User',
            is_active=True
        )
        user.set_password('testpassword')
        db_session.add(user)
        users.append(user)
    
    db_session.commit()
    return users

@pytest.fixture
def valid_jwt_tokens(sample_users):
    """Create valid JWT tokens for test users"""
    from flask_jwt_extended import create_access_token
    tokens = []
    for user in sample_users:
        token = create_access_token(identity=user.id)
        tokens.append(token)
    return tokens

@pytest.fixture
def large_announcement_dataset(db_session, sample_class, sample_teacher):
    """Create large dataset of announcements for performance testing"""
    announcements = []
    for i in range(100):
        announcement = Announcement(
            title=f'Performance Test Announcement {i+1}',
            content=f'Content for performance testing {i+1}',
            target_roles='students',
            class_id=sample_class.id,
            teacher_id=sample_teacher.id,
            is_published=True
        )
        db_session.add(announcement)
        announcements.append(announcement)
    
    db_session.commit()
    return announcements

@pytest.fixture
def large_user_dataset(db_session):
    """Create large dataset of users for performance testing"""
    users = []
    for i in range(100):
        user = User(
            username=f'perfuser{i+1}',
            email=f'perfuser{i+1}@example.com',
            first_name=f'Perf{i+1}',
            last_name='User',
            is_active=True
        )
        user.set_password('testpassword')
        db_session.add(user)
        users.append(user)
    
    db_session.commit()
    return users
