from tests.conftest import _create_tracked_test_access_token


def create_access_token(identity=None, **kwargs):
    """
    Legacy-test compatibility adapter.

    Ordinary access JWTs must be backed by SessionToken authority.
    JWT option-bearing calls are rejected for individual review
    rather than silently changing their intended semantics.
    """
    if kwargs:
        raise TypeError(
            "Tracked test token adapter does not support "
            f"JWT options: {sorted(kwargs)}"
        )

    return _create_tracked_test_access_token(identity)
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

import io
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
from app.models.educational_level import EducationalLevel
from app.extensions import db, socketio
from app.services.announcement_service import AnnouncementService
from app.services.notification_service import NotificationService


@pytest.fixture
def admin_auth_headers(admin_headers):
    """Tenant-aware school-admin headers for messaging tests."""
    return admin_headers


class TestAnnouncementManagement:
    """Test announcement creation and management functionality"""

    def test_create_announcement_success(self, client, admin_auth_headers, sample_class):
        """Test successful announcement creation"""
        announcement_data = {
            'title': 'Important School Notice',
            'content': 'This is an important announcement for all students and parents.',
            'target_roles': ['students', 'parents'],
            'scope': 'class_bound',
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
        assert 'required' in data['message']

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

    def test_update_class_announcement(self, client, sample_class_announcement, db_session):
        """Test updating a class announcement"""
        class_id = sample_class_announcement.class_id
        announcement_id = sample_class_announcement.id

        assigned_teacher = sample_class_announcement.class_.teacher
        teacher_user = assigned_teacher.user

        token = create_access_token(identity=teacher_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_class_announcement.class_.tenant_id)
        }

        update_data = {
            'title': 'Updated Announcement Title',
            'content': 'This announcement has been updated with new information.',
            'target_roles': ['students', 'parents', 'teachers']
        }

        response = client.put(
            f'/api/v1/classes/{class_id}/announcements/{announcement_id}',
            headers=headers,
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

    def test_create_notification_success(
        self,
        client,
        admin_auth_headers,
        sample_user,
    ):
        """Notification creation fails closed pending tenant ownership."""
        notification_data = {
            'title': 'System Maintenance',
            'message': (
                'The system will be under maintenance tonight '
                'from 10 PM to 2 AM.'
            ),
            'type': 'info',
            'user_id': sample_user.id,
            'send_email': False,
            'send_websocket': True,
        }

        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=notification_data,
        )

        assert response.status_code == 503

        data = response.get_json()
        assert data['success'] is False
        assert (
            data['code']
            == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
        )

        notification = Notification.query.filter_by(
            title='System Maintenance'
        ).first()
        assert notification is None

    def test_create_global_notification(
        self,
        client,
        admin_auth_headers,
    ):
        """Global creation also fails closed without tenant ownership."""
        notification_data = {
            'title': 'School Holiday',
            'message': (
                'School will be closed tomorrow due to '
                'public holiday.'
            ),
            'type': 'info',
            'send_email': False,
            'send_websocket': True,
        }

        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=notification_data,
        )

        assert response.status_code == 503

        data = response.get_json()
        assert data['success'] is False
        assert (
            data['code']
            == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
        )

    def test_get_user_notifications(self, client, auth_headers, sample_notifications):
        """Test retrieval of notifications for a user"""
        response = client.get(
            '/api/v1/dashboard/notifications',
            headers=auth_headers,
            query_string={'limit': 10}
        )

        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'notifications' in response_data
        notifications = response_data['notifications']
        assert isinstance(notifications, list)

        # Verify notification structure
        if notifications:
            notification = notifications[0]
            required_fields = ['id', 'title', 'message', 'time', 'read', 'type']
            for field in required_fields:
                assert field in notification

    def test_notification_creation_missing_fields(
        self,
        client,
        admin_auth_headers,
    ):
        """
        Ownership containment takes precedence over legacy payload
        validation while notification creation is disabled.
        """
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json={'title': 'Incomplete Notification'},
        )

        assert response.status_code == 503

        data = response.get_json()
        assert data['success'] is False
        assert (
            data['code']
            == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
        )

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
        client = SocketIOTestClient(app, socketio, namespace='/messages', auth={'token': valid_jwt_token})

        # Should be connected successfully
        assert client.is_connected('/messages')

    def test_websocket_connection_without_auth(self, app):
        """Test WebSocket connection without authentication"""
        client = SocketIOTestClient(app, socketio, namespace='/messages')

        # Connection should be rejected
        assert not client.is_connected()


    def test_send_message_via_websocket(
        self,
        app,
        sample_users,
        valid_jwt_token,
    ):
        """WebSocket message creation must fail closed while Message lacks tenant ownership."""
        client = SocketIOTestClient(
            app,
            socketio,
            namespace='/messages',
            auth={'token': valid_jwt_token},
        )

        message_data = {
            'sender_id': sample_users[0].id,
            'recipient_id': sample_users[1].id,
            'subject': 'Test WebSocket Message',
            'content': 'This is a test message sent via WebSocket',
        }

        client.emit(
            'send_message',
            message_data,
            namespace='/messages',
        )

        received = client.get_received('/messages')

        # No success event may be emitted while persistence is contained.
        assert not [
            event
            for event in received
            if event['name'] == 'message_sent'
        ]

        # Most importantly, no ownerless Message row may be created.
        assert Message.query.filter_by(
            subject='Test WebSocket Message'
        ).first() is None

    def test_websocket_message_validation(self, app, sample_user, valid_jwt_token):
        """Test WebSocket message validation"""
        client = SocketIOTestClient(app, socketio, namespace='/messages', auth={'token': valid_jwt_token})

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


    def test_notification_websocket_delivery(
        self,
        app,
        sample_user,
        valid_jwt_token,
    ):
        """Notification WebSocket creation must fail closed before persistence."""
        client = SocketIOTestClient(
            app,
            socketio,
            namespace='/notifications',
            auth={'token': valid_jwt_token},
        )

        with patch(
            'app.services.notification_service.'
            'NotificationService.create_notification'
        ) as mock_create:
            client.emit(
                'create_notification',
                {
                    'title': 'Test Notification',
                    'message': 'Test message',
                    'type': 'info',
                    'user_id': sample_user.id,
                },
                namespace='/notifications',
            )

            received = client.get_received('/notifications')

            errors = [
                event
                for event in received
                if event['name'] == 'error'
            ]

            assert errors
            assert 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED' in str(errors)

            assert not [
                event
                for event in received
                if event['name'] == 'notification_created'
            ]

            mock_create.assert_not_called()


class TestMessagingIntegrationWorkflow:
    """Test end-to-end messaging system workflows"""

    def test_complete_announcement_workflow(self, client, admin_auth_headers, sample_class, db_session):
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

        created_payload = response.get_json()
        assert created_payload['announcement']['class_id'] == sample_class.id
        assert created_payload['announcement']['scope'] == 'class_bound'

        # Step 2: Teacher retrieves class announcements
        assigned_teacher = sample_class.teacher
        teacher_user = assigned_teacher.user

        token = create_access_token(identity=teacher_user.id)
        teacher_headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_class.tenant_id)
        }

        response = client.get(
            f'/api/v1/classes/{sample_class.id}/announcements',
            headers=teacher_headers
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
            headers=teacher_headers,
            json=update_data
        )
        assert response.status_code == 200

        # Step 4: Verify update
        response = client.get(
            f'/api/v1/classes/{sample_class.id}/announcements',
            headers=teacher_headers
        )
        updated_announcements = json.loads(response.data)['announcements']
        updated_announcement = next(a for a in updated_announcements if a['id'] == announcement_id)
        assert 'Updated:' in updated_announcement['content']


    def test_notification_cascade_workflow(
        self,
        client,
        admin_auth_headers,
        sample_users,
        sample_class,
    ):
        """Announcement creation succeeds while unsafe notification fanout stays suppressed."""
        announcement_data = {
            'title': 'Emergency Closure',
            'content': (
                'School is closed today due to severe weather conditions.'
            ),
            'target_roles': ['all'],
            'class_id': sample_class.id,
            'send_notification': True,
            'send_email': True,
        }

        with patch(
            'app.services.fanout.'
            'NotificationFanoutService.enqueue_class_fanout'
        ) as mock_fanout:
            response = client.post(
                '/api/v1/announcements',
                headers=admin_auth_headers,
                json=announcement_data,
            )

            assert response.status_code == 201

            # Notification has no tenant owner yet, so announcement creation
            # must not enqueue unsafe persisted notification fanout.
            mock_fanout.assert_not_called()


    def test_real_time_messaging_workflow(
        self,
        app,
        sample_users,
        valid_jwt_tokens,
    ):
        """Realtime message fanout remains disabled with ownerless Message persistence."""
        client1 = SocketIOTestClient(
            app,
            socketio,
            namespace='/messages',
            auth={'token': valid_jwt_tokens[0]},
        )
        client2 = SocketIOTestClient(
            app,
            socketio,
            namespace='/messages',
            auth={'token': valid_jwt_tokens[1]},
        )

        message_data = {
            'sender_id': sample_users[0].id,
            'recipient_id': sample_users[1].id,
            'subject': 'Real-time Test',
            'content': 'Testing real-time message delivery',
        }

        client1.emit(
            'send_message',
            message_data,
            namespace='/messages',
        )

        received_by_user2 = client2.get_received('/messages')
        received_by_user1 = client1.get_received('/messages')

        assert not [
            event
            for event in received_by_user2
            if event['name'] == 'new_message'
        ]
        assert not [
            event
            for event in received_by_user1
            if event['name'] == 'message_sent'
        ]

        assert Message.query.filter_by(
            subject='Real-time Test'
        ).count() == 0


    def test_http_message_send_route_and_socket_cascade(
        self,
        client,
        app,
        sample_users,
        valid_jwt_tokens,
    ):
        """HTTP message writes must fail closed and emit no realtime cascade."""
        token1 = valid_jwt_tokens[0]
        token2 = valid_jwt_tokens[1]

        socket_client2 = SocketIOTestClient(
            app,
            socketio,
            namespace='/messages',
            auth={'token': token2},
        )
        socket_client1 = SocketIOTestClient(
            app,
            socketio,
            namespace='/messages',
            auth={'token': token1},
        )

        message_payload = {
            'recipient_id': sample_users[1].id,
            'recipient_type': 'user',
            'subject': 'HTTP Send Test',
            'content': 'This message is sent via HTTP POST to /messages/send',
        }

        response = client.post(
            '/api/v1/messages/send',
            headers={'Authorization': f'Bearer {token1}'},
            json=message_payload,
        )

        assert response.status_code == 503

        body = response.get_json()
        assert body['success'] is False
        assert body['code'] == 'MESSAGE_TENANT_OWNERSHIP_REQUIRED'

        assert Message.query.filter_by(
            subject='HTTP Send Test'
        ).count() == 0

        received_by_user2 = socket_client2.get_received('/messages')
        received_by_user1 = socket_client1.get_received('/messages')

        assert not [
            event
            for event in received_by_user2
            if event['name'] == 'new_message'
        ]
        assert not [
            event
            for event in received_by_user1
            if event['name'] == 'message_sent'
        ]


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
        client = SocketIOTestClient(app, socketio, namespace='/messages', auth={'token': 'invalid_token'})

        # Connection should be rejected
        assert not client.is_connected()


    def test_notification_creation_validation_error(
        self,
        client,
        admin_auth_headers,
    ):
        """Ownership containment takes precedence over notification validation."""
        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json={
                'title': '',
                'message': 'Valid message',
                'type': 'invalid_type',
            },
        )

        assert response.status_code == 503

        body = response.get_json()
        assert body['success'] is False
        assert (
            body['code']
            == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
        )

    def test_websocket_message_database_error(self, app, sample_user, valid_jwt_token):
        """Test WebSocket message handling with database error"""
        client = SocketIOTestClient(app, socketio, namespace='/messages', auth={'token': valid_jwt_token})

        with patch('app.services.message_service.MessageService.create_message') as mock_create:
            mock_create.side_effect = Exception("Database error")

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


    def test_concurrent_websocket_connections(
        self,
        app,
        sample_users,
        valid_jwt_tokens,
    ):
        """Concurrent WebSocket writes must all remain fail-closed."""
        clients = []

        for i in range(10):
            token = valid_jwt_tokens[i % len(valid_jwt_tokens)]
            clients.append(
                SocketIOTestClient(
                    app,
                    socketio,
                    namespace='/messages',
                    auth={'token': token},
                )
            )

        import threading

        def send_message(socket_client, sender_id, recipient_id):
            socket_client.emit(
                'send_message',
                {
                    'sender_id': sender_id,
                    'recipient_id': recipient_id,
                    'subject': (
                        f'Concurrent Test '
                        f'{threading.current_thread().name}'
                    ),
                    'content': 'Testing concurrent message sending',
                },
                namespace='/messages',
            )

        threads = []

        for i, socket_client in enumerate(clients[:5]):
            sender_id = sample_users[i % len(sample_users)].id
            recipient_id = sample_users[
                (i + 1) % len(sample_users)
            ].id

            thread = threading.Thread(
                target=send_message,
                args=(
                    socket_client,
                    sender_id,
                    recipient_id,
                ),
            )
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # Security invariant: concurrency must not bypass containment.
        assert Message.query.filter(
            Message.subject.like('Concurrent Test%')
        ).count() == 0

        for socket_client in clients[:5]:
            events = socket_client.get_received('/messages')
            assert not [
                event
                for event in events
                if event['name'] == 'message_sent'
            ]


    def test_notification_delivery_performance(
        self,
        client,
        admin_auth_headers,
        large_user_dataset,
    ):
        """Contained global notification creation should reject promptly."""
        import time

        notification_data = {
            'title': 'Performance Test Notification',
            'message': 'Testing notification delivery to many users',
            'type': 'info',
        }

        start_time = time.time()

        response = client.post(
            '/api/v1/dashboard/notifications',
            headers=admin_auth_headers,
            json=notification_data,
        )

        elapsed = time.time() - start_time

        assert response.status_code == 503

        body = response.get_json()
        assert body['success'] is False
        assert (
            body['code']
            == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
        )

        # Fail-closed path should remain inexpensive.
        assert elapsed < 3.0


class TestMessagingIdentityResolution:
    """Test identity resolution and class dynamic messaging"""


    def test_parent_profile_id_resolution(
        self,
        db_session,
        sample_tenant,
    ):
        """Parent profile IDs still resolve to canonical User IDs."""
        from app.models.parent import Parent
        from app.models.user import User
        from app.services.message_service import MessageService

        parent_user = User(
            username='parent_resolve_user',
            email='parent_resolve@example.com',
        )
        parent_user.set_password('password')
        db_session.add(parent_user)
        db_session.flush()

        parent_profile = Parent(
            tenant_id=sample_tenant.id,
            user_id=parent_user.id,
        )
        db_session.add(parent_profile)
        db_session.commit()

        resolved_id, resolved_role = MessageService._resolve_recipient(
            parent_profile.id,
            'parent',
        )

        assert resolved_id == parent_user.id
        assert resolved_role == 'parent'

        # Persistence remains intentionally unavailable.
        with pytest.raises(
            RuntimeError,
            match='MESSAGE_TENANT_OWNERSHIP_REQUIRED',
        ):
            MessageService.create_message(
                {
                    'sender_id': parent_user.id,
                    'recipient_id': parent_profile.id,
                    'recipient_type': 'parent',
                    'subject': 'Parent Resolution Test',
                    'content': 'Test content',
                }
            )

        assert Message.query.filter_by(
            subject='Parent Resolution Test'
        ).count() == 0


    def test_student_profile_id_resolution(
        self,
        db_session,
        sample_tenant,
    ):
        """Student profile IDs still resolve to canonical User IDs."""
        from datetime import date

        from app.models.student import Student
        from app.models.user import User
        from app.services.message_service import MessageService

        student_user = User(
            username='student_resolve_user',
            email='student_resolve@example.com',
        )
        student_user.set_password('password')
        db_session.add(student_user)
        db_session.flush()

        student_profile = Student(
            tenant_id=sample_tenant.id,
            user_id=student_user.id,
            admission_number='RESOLVE123',
            first_name='Resolve',
            last_name='Student',
            date_of_birth=date(2010, 1, 1),
            gender='male',
        )
        db_session.add(student_profile)
        db_session.commit()

        resolved_id, resolved_role = MessageService._resolve_recipient(
            student_profile.id,
            'student',
        )

        assert resolved_id == student_user.id
        assert resolved_role == 'student'

        with pytest.raises(
            RuntimeError,
            match='MESSAGE_TENANT_OWNERSHIP_REQUIRED',
        ):
            MessageService.create_message(
                {
                    'sender_id': student_user.id,
                    'recipient_id': student_profile.id,
                    'recipient_type': 'student',
                    'subject': 'Student Resolution Test',
                    'content': 'Test content',
                }
            )

        assert Message.query.filter_by(
            subject='Student Resolution Test'
        ).count() == 0


    def test_class_messaging_dynamic_resolution(
        self,
        db_session,
        sample_tenant,
    ):
        """Class refs still resolve and deduplicate recipients without persistence."""
        from datetime import date

        from app.models.class_ import Class
        from app.models.parent import Parent
        from app.models.student import Student
        from app.models.user import User
        from app.services.message_service import MessageService

        test_class = Class(
            tenant_id=sample_tenant.id,
            name='Test Resolve Class',
            grade_level='Grade 1',
            academic_year='2024',
        )
        db_session.add(test_class)
        db_session.flush()

        p_user = User(
            username='parent_class_user',
            email='p_class@example.com',
        )
        p_user.set_password('password')
        db_session.add(p_user)
        db_session.flush()

        parent_profile = Parent(
            tenant_id=sample_tenant.id,
            user_id=p_user.id,
        )
        db_session.add(parent_profile)
        db_session.flush()

        s_user1 = User(
            username='s_class_user1',
            email='s1_class@example.com',
        )
        s_user1.set_password('password')
        db_session.add(s_user1)
        db_session.flush()

        db_session.add(
            Student(
                tenant_id=sample_tenant.id,
                user_id=s_user1.id,
                admission_number='SC1',
                first_name='Student',
                last_name='One',
                date_of_birth=date(2010, 1, 1),
                gender='male',
                class_id=test_class.id,
                parent_id=parent_profile.id,
            )
        )

        s_user2 = User(
            username='s_class_user2',
            email='s2_class@example.com',
        )
        s_user2.set_password('password')
        db_session.add(s_user2)
        db_session.flush()

        db_session.add(
            Student(
                tenant_id=sample_tenant.id,
                user_id=s_user2.id,
                admission_number='SC2',
                first_name='Student',
                last_name='Two',
                date_of_birth=date(2010, 1, 1),
                gender='male',
                class_id=test_class.id,
                parent_id=parent_profile.id,
            )
        )

        db_session.commit()

        recipients, recipient_type = (
            MessageService.resolve_recipient_ref(
                f'class:{test_class.id}:all',
                tenant_id=sample_tenant.id,
            )
        )

        assert recipient_type == 'class'

        resolved_user_ids = {
            user_id
            for user_id, _role in recipients
        }

        # Shared parent is deduplicated.
        assert resolved_user_ids == {
            s_user1.id,
            s_user2.id,
            p_user.id,
        }
        assert len(recipients) == 3

        assert Message.query.filter_by(
            subject='Class Message Test'
        ).count() == 0


    def test_invalid_recipient_resolution_failure(
        self,
        client,
        admin_auth_headers,
    ):
        """Message write containment takes precedence over recipient validation."""
        response = client.post(
            '/api/v1/messages/send',
            headers=admin_auth_headers,
            json={
                'recipient_id': 999999,
                'recipient_type': 'parent',
                'subject': 'Failure Test',
                'content': 'Should fail',
            },
        )

        assert response.status_code == 503

        body = response.get_json()
        assert body['success'] is False
        assert body['code'] == 'MESSAGE_TENANT_OWNERSHIP_REQUIRED'

        assert Message.query.filter_by(
            subject='Failure Test'
        ).count() == 0


    def test_recipient_role_mismatch_failure(
        self,
        client,
        db_session,
        admin_auth_headers,
        sample_tenant,
    ):
        """Message persistence remains unavailable before role validation."""
        from app.models.user import User

        mismatch_user = User(
            username='mismatch_user',
            email='mismatch@example.com',
            role='teacher',
        )
        mismatch_user.set_password('password')
        db_session.add(mismatch_user)
        db_session.commit()

        response = client.post(
            '/api/v1/messages/send',
            headers=admin_auth_headers,
            json={
                'recipient_id': mismatch_user.id,
                'recipient_type': 'parent',
                'subject': 'Role Mismatch Test',
                'content': 'Should fail',
            },
        )

        assert response.status_code == 503

        body = response.get_json()
        assert body['success'] is False
        assert body['code'] == 'MESSAGE_TENANT_OWNERSHIP_REQUIRED'

        assert Message.query.filter_by(
            subject='Role Mismatch Test'
        ).count() == 0

    def test_get_class_teachers_endpoint(self, client, db_session, sample_tenant, admin_auth_headers):
        """Test GET /api/v1/classes/<class_id>/teachers endpoint"""
        from app.models.class_ import Class as ClassModel, ClassTeacherMapping
        from app.models.teacher import Teacher
        from app.models.user import User
        from tests.test_production_integration import create_test_membership

        # Create a teacher user and teacher profile
        teacher_user = User(username='class_teacher_user', email='cteacher@example.com', role='teacher')
        teacher_user.set_password('password')
        db_session.add(teacher_user)
        db_session.flush()

        teacher_profile = Teacher(tenant_id=sample_tenant.id, user_id=teacher_user.id, first_name='John', last_name='Doe', specialization='Math')
        db_session.add(teacher_profile)
        db_session.flush()

        # Create a class and assign the teacher as primary
        test_class = ClassModel(tenant_id=sample_tenant.id, name='Test Class Math', grade_level='Grade 1', academic_year='2024', teacher_id=teacher_profile.id)
        db_session.add(test_class)
        db_session.flush()

        # Map another teacher user via ClassTeacherMapping
        assistant_user = User(username='assistant_teacher_user', email='assistant@example.com', role='teacher')
        assistant_user.set_password('password')
        db_session.add(assistant_user)
        db_session.flush()

        assistant_profile = Teacher(tenant_id=sample_tenant.id, user_id=assistant_user.id, first_name='Jane', last_name='Smith', specialization='Science')
        db_session.add(assistant_profile)
        db_session.flush()

        mapping = ClassTeacherMapping(class_id=test_class.id, teacher_id=assistant_user.id)
        db_session.add(mapping)
        db_session.commit()

        # Call the endpoint
        headers = {
            **admin_auth_headers,
            'X-Tenant-ID': str(sample_tenant.id)
        }
        response = client.get(
            f'/api/v1/classes/{test_class.id}/teachers',
            headers=headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'teachers' in data
        assert len(data['teachers']) == 2

        teacher_names = [t['name'] for t in data['teachers']]
        assert 'John Doe' in teacher_names
        assert 'Jane Smith' in teacher_names

        teacher_user_ids = [t['user_id'] for t in data['teachers']]
        assert teacher_user.id in teacher_user_ids
        assert assistant_user.id in teacher_user_ids

    def test_get_recipients_scoping_and_references(self, client, db_session, sample_tenant, admin_auth_headers):
        """Test GET /api/v1/messages/recipients and message creation with references"""
        from app.models.student import Student
        from app.models.parent import Parent
        from app.models.teacher import Teacher
        from app.models.user import User
        from app.models.class_ import Class as ClassModel, ClassTeacherMapping
        from tests.test_production_integration import create_test_membership

        # Create a student user, student profile, parent user, and parent profile
        student_user = User(username='test_student_user', email='student@example.com', role='student')
        student_user.set_password('password')
        db_session.add(student_user)
        db_session.flush()

        parent_user = User(username='test_parent_user', email='parent@example.com', role='parent')
        parent_user.set_password('password')
        db_session.add(parent_user)
        db_session.flush()

        parent_profile = Parent(tenant_id=sample_tenant.id, user_id=parent_user.id)
        db_session.add(parent_profile)
        db_session.flush()

        student_profile = Student(
            tenant_id=sample_tenant.id,
            user_id=student_user.id,
            admission_number='STU1001',
            first_name='Yvette',
            last_name='Doe',
            date_of_birth=date(2010, 1, 1),
            gender='female',
            parent_id=parent_profile.id
        )
        db_session.add(student_profile)
        db_session.flush()

        # Create class group
        test_class = ClassModel(tenant_id=sample_tenant.id, name='Class Class1', grade_level='Primary 1', academic_year='2024')
        db_session.add(test_class)
        db_session.flush()

        student_profile.class_id = test_class.id
        db_session.add(student_profile)

        # Create teacher
        teacher_user = User(username='math_teacher_user', email='teacher@example.com', role='teacher')
        teacher_user.set_password('password')
        db_session.add(teacher_user)
        db_session.flush()

        teacher_profile = Teacher(tenant_id=sample_tenant.id, user_id=teacher_user.id, first_name='Teacher', last_name='One', specialization='Math')
        db_session.add(teacher_profile)
        db_session.flush()

        mapping = ClassTeacherMapping(class_id=test_class.id, teacher_id=teacher_user.id)
        db_session.add(mapping)
        db_session.commit()

        # Create memberships for all
        create_test_membership(db_session, sample_tenant.id, student_user.id, 'student')
        create_test_membership(db_session, sample_tenant.id, parent_user.id, 'parent')
        create_test_membership(db_session, sample_tenant.id, teacher_user.id, 'teacher')
        db_session.commit()

        # 1. Search recipients: parent role searching student (unauthorized, parents cannot search students)
        parent_token = create_access_token(identity=parent_user.id)
        headers = {
            'Authorization': f'Bearer {parent_token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }
        response = client.get('/api/v1/messages/recipients?type=student', headers=headers)
        assert response.status_code == 200, response.get_json()
        data = json.loads(response.data)
        assert len(data['data']['recipients']) == 0

        # 2. Search recipients: teacher searching parent "Yvette" -> should find Yvette's parent
        teacher_token = create_access_token(identity=teacher_user.id)
        headers = {
            'Authorization': f'Bearer {teacher_token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }
        response = client.get('/api/v1/messages/recipients?type=parent&search=Yvette', headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['recipients']) == 1
        rec = data['data']['recipients'][0]
        assert rec['ref'] == f"parent:{parent_profile.id}"
        assert 'Yvette Doe' in rec['subtitle']

        # 3. Recipient resolution succeeds, but persistence must
        # fail closed until Message has durable tenant ownership.
        message_data = {
            'recipient_ref': f"parent:{parent_profile.id}",
            'subject': 'Test Ref Message',
            'content': 'Hello from Ref!'
        }

        response = client.post(
            '/api/v1/messages/send',
            headers=headers,
            json=message_data,
        )

        assert response.status_code == 503
        assert Message.query.filter_by(
            subject='Test Ref Message'
        ).count() == 0

        # Ownership containment takes precedence over legacy
        # recipient_ref validation while message writes are disabled.
        response = client.post(
            '/api/v1/messages/send',
            headers=headers,
            json={
                'recipient_ref': 'invalid_format_ref',
                'subject': 'Failure Test',
                'content': 'Should fail',
            },
        )

        assert response.status_code == 503
        assert Message.query.filter_by(
            subject='Failure Test'
        ).count() == 0

# Recovered module fixtures after structural test repair
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

@pytest.fixture
def parent_auth_context(db_session, client, user_factory, sample_tenant):
    from tests.test_production_integration import create_test_parent, create_test_membership

    user = user_factory('parent')
    parent = create_test_parent(db_session, user, sample_tenant.id)
    create_test_membership(db_session, sample_tenant.id, user.id, 'parent')
    db_session.commit()

    token = create_access_token(identity=user.id)
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(sample_tenant.id)
    }
    return {
        'user': user,
        'parent': parent,
        'headers': headers,
    }

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
def sample_class_announcement(db_session, sample_class, sample_teacher):
    """Create a single class announcement for testing"""
    teacher_id = sample_class.teacher_id if getattr(sample_class, 'teacher_id', None) is not None else sample_class.teacher.id
    announcement = Announcement(
        title='Editable Announcement',
        content='This announcement can be edited',
        target_roles='students,parents',
        class_id=sample_class.id,
        teacher_id=teacher_id,
        is_published=True
    )
    db_session.add(announcement)
    db_session.commit()
    return announcement

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
def sample_teacher(db_session, teacher_factory):
    """Create a sample teacher for testing"""
    return teacher_factory()

@pytest.fixture
def sample_user(sample_users):
    """Return a single sample user"""
    return sample_users[0]

@pytest.fixture
def sample_users(db_session):
    """Create multiple sample users for testing"""
    import uuid
    users = []
    for i in range(5):
        suffix = uuid.uuid4().hex[:6]
        user = User(
            username=f'testuser{i+1}_{suffix}',
            email=f'testuser{i+1}_{suffix}@example.com',
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
def student_auth_context(db_session, client, user_factory, sample_tenant):
    from tests.test_production_integration import create_test_student, create_test_membership

    user = user_factory('student')
    student = create_test_student(db_session, user, sample_tenant.id)
    create_test_membership(db_session, sample_tenant.id, user.id, 'student')
    db_session.commit()

    token = create_access_token(identity=user.id)
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(sample_tenant.id)
    }
    return {
        'user': user,
        'student': student,
        'headers': headers,
    }

@pytest.fixture
def student_auth_headers(db_session, client, user_factory, sample_tenant):
    user = user_factory('student')
    from tests.test_production_integration import create_test_student, create_test_membership
    student = create_test_student(db_session, user, sample_tenant.id)
    create_test_membership(db_session, sample_tenant.id, user.id, 'student')
    db_session.commit()
    token = create_access_token(identity=user.id)
    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(sample_tenant.id)
    }

@pytest.fixture
def teacher_auth_context(db_session, client, user_factory, sample_tenant):
    from tests.test_production_integration import create_test_teacher, create_test_membership

    user = user_factory('teacher')
    teacher = create_test_teacher(db_session, user, sample_tenant.id)
    create_test_membership(db_session, sample_tenant.id, user.id, 'teacher')
    db_session.commit()

    token = create_access_token(identity=user.id)
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(sample_tenant.id)
    }
    return {
        'user': user,
        'teacher': teacher,
        'headers': headers,
    }

@pytest.fixture
def teacher_auth_headers(db_session, client, user_factory, sample_tenant):
    user = user_factory('teacher')
    from tests.test_production_integration import create_test_teacher, create_test_membership
    teacher = create_test_teacher(db_session, user, sample_tenant.id)
    create_test_membership(db_session, sample_tenant.id, user.id, 'teacher')
    db_session.commit()
    token = create_access_token(identity=user.id)
    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(sample_tenant.id)
    }

@pytest.fixture
def valid_jwt_token(valid_jwt_tokens):
    """Return a single valid JWT token"""
    return valid_jwt_tokens[0]

@pytest.fixture
def valid_jwt_tokens(sample_users):
    """Create valid JWT tokens for test users"""
    tokens = []
    for user in sample_users:
        token = create_access_token(identity=user.id)
        tokens.append(token)
    return tokens


class TestADMIWorkflowAndRelationshipAudit:
    """Comprehensive relationship validation, workflow, and Schema Guard integrity tests."""

    def test_schema_guard_notifications_drift_detection(self, db_session):
        from app.utils.schema_guard import SchemaGuard
        # By default, sqlite uses INTEGER for notifications.id, so no drift is detected.
        assert SchemaGuard.check_notifications_id_drift() is False

    def test_schema_guard_orphaned_messages_detection(
        self,
        db_session,
    ):
        from sqlalchemy.exc import IntegrityError
        from app.utils.schema_guard import SchemaGuard
        from app.models.message import Message

        sender = User(
            username='schema_guard_sender',
            email='schema.guard.sender@example.com',
            role='teacher',
        )
        sender.set_password('Password123!')
        db_session.add(sender)
        db_session.flush()

        orphan_msg = Message(
            sender_id=sender.id,
            sender_type='teacher',
            recipient_id=999999,
            recipient_type='parent',
            subject='Orphan test',
            content='This recipient does not exist in users table',
        )
        db_session.add(orphan_msg)

        # Current schema prevents the orphan from ever being committed.
        with pytest.raises(IntegrityError):
            db_session.commit()

        db_session.rollback()

        assert Message.query.filter_by(
            subject='Orphan test'
        ).count() == 0

        # Guard should therefore have no committed orphan to report.
        assert SchemaGuard.check_message_recipient_orphan_rows() == []

    def test_teacher_create_announcement_restricted_to_assigned_classes(self, client, db_session, sample_tenant, sample_class):
        from tests.test_production_integration import create_test_teacher, create_test_membership

        teacher_user = User(username='unassigned_t', email='unassigned@example.com', role='teacher')
        teacher_user.set_password('Password123!')
        db_session.add(teacher_user)
        db_session.flush()

        teacher = create_test_teacher(db_session, teacher_user, sample_tenant.id)
        create_test_membership(db_session, sample_tenant.id, teacher_user.id, 'teacher')
        db_session.commit()

        token = create_access_token(identity=teacher_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }

        response = client.post(
            f'/api/v1/classes/{sample_class.id}/announcements',
            headers=headers,
            json={
                'title': 'Intruder Notice',
                'content': 'I should not be able to post this.'
            }
        )
        assert response.status_code == 403

    def test_student_and_parent_read_scoping_class_announcements(
        self,
        client,
        db_session,
        sample_tenant,
        sample_class,
        sample_teacher,
    ):
        from tests.test_production_integration import (
            create_test_membership,
            create_test_student,
        )
        from app.models.announcement import Announcement
        from app.models.class_ import Class

        announcement = Announcement(
            title='Class Secret Notice',
            content='Only for this class members.',
            class_id=sample_class.id,
            teacher_id=sample_teacher.id,
            is_published=True,
        )
        db_session.add(announcement)

        other_class = Class(
            tenant_id=sample_tenant.id,
            name='Other Messaging Class',
            grade_level='Grade 99',
            academic_year='2024',
        )
        db_session.add(other_class)
        db_session.flush()

        other_user = User(
            username='other_student',
            email='other_s@example.com',
            role='student',
        )
        other_user.set_password('Password123!')
        db_session.add(other_user)
        db_session.flush()

        other_student = create_test_student(
            db_session,
            other_user,
            sample_tenant.id,
        )
        other_student.class_id = other_class.id

        create_test_membership(
            db_session,
            sample_tenant.id,
            other_user.id,
            'student',
        )
        db_session.commit()

        token = create_access_token(identity=other_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        response = client.get(
            f'/api/v1/classes/{sample_class.id}/announcements',
            headers=headers,
        )

        assert response.status_code == 403

    def test_parent_sees_child_assignments(self, client, db_session, sample_tenant, sample_class, sample_teacher):
        from tests.test_production_integration import create_test_student, create_test_membership, create_test_parent
        from app.models.assignment import Assignment
        from app.models.subject import Subject

        p_user = User(username='p_user_t', email='parent_t@example.com', role='parent')
        p_user.set_password('Password123!')
        db_session.add(p_user)
        db_session.flush()
        parent = create_test_parent(db_session, p_user, sample_tenant.id)
        create_test_membership(db_session, sample_tenant.id, p_user.id, 'parent')

        s_user = User(username='s_user_t', email='student_t@example.com', role='student')
        s_user.set_password('Password123!')
        db_session.add(s_user)
        db_session.flush()
        student = create_test_student(db_session, s_user, sample_tenant.id)
        student.class_id = sample_class.id
        student.parent_id = parent.id
        create_test_membership(db_session, sample_tenant.id, s_user.id, 'student')

        subject = Subject(name='Maths', code='MTH101', tenant_id=sample_tenant.id)
        db_session.add(subject)
        db_session.flush()

        assignment = Assignment(
            title='Homework #1',
            description='Algebra tasks',
            class_id=sample_class.id,
            subject_id=subject.id,
            teacher_id=sample_teacher.id,
            due_date=datetime.utcnow() + timedelta(days=2),
            total_points=100.0,
            assignment_type='homework',
            status='active'
        )
        db_session.add(assignment)
        db_session.commit()

        token = create_access_token(identity=p_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }

        response = client.get(
            f'/api/v1/parents/children/{student.id}/homework',
            headers=headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['data']['assignments']) > 0
        assert data['data']['assignments'][0]['title'] == 'Homework #1'

    def test_student_submission_belongs_only_to_current_student(self, client, db_session, sample_tenant, sample_class, sample_teacher):
        from tests.test_production_integration import create_test_student, create_test_membership
        from app.models.assignment import Assignment
        from app.models.subject import Subject
        from app.models.assignment_submission import AssignmentSubmission

        s_user = User(username='s_sub_test', email='student_sub@example.com', role='student')
        s_user.set_password('Password123!')
        db_session.add(s_user)
        db_session.flush()
        student = create_test_student(db_session, s_user, sample_tenant.id)
        student.class_id = sample_class.id
        create_test_membership(db_session, sample_tenant.id, s_user.id, 'student')

        subject = Subject(name='Maths', code='MTH101', tenant_id=sample_tenant.id)
        db_session.add(subject)
        db_session.flush()

        assignment = Assignment(
            title='Homework #2',
            description='Geometry tasks',
            class_id=sample_class.id,
            subject_id=subject.id,
            teacher_id=sample_teacher.id,
            due_date=datetime.utcnow() + timedelta(days=2),
            total_points=100.0,
            assignment_type='homework',
            status='active'
        )
        db_session.add(assignment)
        db_session.commit()

        token = create_access_token(identity=s_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }

        response = client.post(
            f'/api/v1/student/assignments/{assignment.id}/submit',
            headers=headers,
            json={
                'content': 'My submitted geometry code answers.',
                'file_path': '/uploads/student_geometry.pdf'
            }
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['submission']['student_id'] == student.id

        sub = AssignmentSubmission.query.get(data['submission']['id'])
        assert sub is not None
        assert sub.student_id == student.id

    def test_teacher_can_grade_only_assigned_class_submissions(
        self,
        client,
        db_session,
        sample_tenant,
        sample_class,
        sample_teacher,
    ):
        from tests.test_production_integration import (
            create_test_membership,
            create_test_student,
            create_test_teacher,
        )
        from app.models.assignment import Assignment
        from app.models.assignment_submission import AssignmentSubmission
        from app.models.subject import Subject

        s_user = User(
            username='s_grade_test',
            email='student_grade@example.com',
            role='student',
        )
        s_user.set_password('Password123!')
        db_session.add(s_user)
        db_session.flush()

        student = create_test_student(
            db_session,
            s_user,
            sample_tenant.id,
        )
        student.class_id = sample_class.id

        create_test_membership(
            db_session,
            sample_tenant.id,
            s_user.id,
            'student',
        )

        subject = Subject(
            name='Grade Authorization Subject',
            code='GRADE-AUTH',
            tenant_id=sample_tenant.id,
        )
        db_session.add(subject)
        db_session.flush()

        assignment = Assignment(
            title='Authorization Test Assignment',
            description='Assignment used for authorization testing',
            class_id=sample_class.id,
            subject_id=subject.id,
            teacher_id=sample_teacher.id,
            due_date=datetime.utcnow() + timedelta(days=2),
            total_points=100.0,
            assignment_type='homework',
            status='active',
        )
        db_session.add(assignment)
        db_session.flush()

        submission = AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=student.id,
            content='Answers',
            status='submitted',
        )
        db_session.add(submission)
        db_session.commit()

        t_user = User(
            username='t_other',
            email='teacher_other@example.com',
            role='teacher',
        )
        t_user.set_password('Password123!')
        db_session.add(t_user)
        db_session.flush()

        teacher2 = create_test_teacher(
            db_session,
            t_user,
            sample_tenant.id,
        )
        create_test_membership(
            db_session,
            sample_tenant.id,
            t_user.id,
            'teacher',
        )
        db_session.commit()

        assert teacher2.id != sample_teacher.id

        token = create_access_token(identity=t_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        response = client.post(
            f'/api/v1/classes/submissions/{submission.id}/grade',
            headers=headers,
            json={
                'score': 85.5,
                'feedback': 'Good work!',
            },
        )

        assert response.status_code == 403

    def test_teacher_can_list_visible_assignment_submissions(self, client, db_session, sample_tenant, sample_class, sample_teacher):
        from tests.test_production_integration import create_test_membership, create_test_student
        from app.models.assignment import Assignment
        from app.models.assignment_submission import AssignmentSubmission
        from app.models.subject import Subject
        from app.models.class_ import ClassTeacherMapping

        teacher_user = sample_teacher.user
        create_test_membership(db_session, sample_tenant.id, teacher_user.id, 'teacher')

        s_user = User(username='s_visible_sub', email='visible_sub@example.com', role='student')
        s_user.set_password('Password123!')
        db_session.add(s_user)
        db_session.flush()
        student = create_test_student(db_session, s_user, sample_tenant.id)
        student.class_id = sample_class.id
        create_test_membership(db_session, sample_tenant.id, s_user.id, 'student')

        subject = Subject(name='Science', code='SCI101', tenant_id=sample_tenant.id)
        db_session.add(subject)
        db_session.flush()

        if not ClassTeacherMapping.query.filter_by(class_id=sample_class.id, teacher_id=teacher_user.id).first():
            db_session.add(ClassTeacherMapping(class_id=sample_class.id, teacher_id=teacher_user.id))
            db_session.flush()

        assignment = Assignment(
            title='Visible Homework',
            description='Submit lab notes',
            class_id=sample_class.id,
            subject_id=subject.id,
            teacher_id=sample_teacher.id,
            due_date=datetime.utcnow() + timedelta(days=3),
            total_points=100.0,
            assignment_type='homework',
            status='active'
        )
        db_session.add(assignment)
        db_session.flush()

        submission = AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=student.id,
            content='Attached my answers.',
            file_path='/uploads/lab-notes.pdf',
            status='submitted'
        )
        db_session.add(submission)
        db_session.commit()

        token = create_access_token(identity=teacher_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }

        response = client.get(
            f'/api/v1/classes/assignments/{assignment.id}/submissions',
            headers=headers,
        )

        assert response.status_code == 200
        payload = response.get_json()
        assert payload['success'] is True
        assert payload['assignment']['id'] == assignment.id
        assert len(payload['submissions']) == 1
        assert payload['submissions'][0]['student_id'] == student.id
        assert payload['submissions'][0]['student_name'] is not None
        assert payload['submissions'][0]['file_path'] == '/uploads/lab-notes.pdf'

    def test_assignment_attachments_flow_visible_to_student_teacher_and_parent(self, client, db_session, sample_tenant, sample_class, sample_teacher):
        from tests.test_production_integration import (
            create_test_membership,
            create_test_parent,
            create_test_student,
        )
        from app.models.subject import Subject
        from app.models.class_ import ClassTeacherMapping
        from app.models.assignment_submission import AssignmentSubmission
        from app.models.attachment import Attachment

        teacher_user = sample_teacher.user
        create_test_membership(db_session, sample_tenant.id, teacher_user.id, 'teacher')

        parent_user = User(username='p_assignment_flow', email='parent.assignment.flow@example.com', role='parent')
        parent_user.set_password('Password123!')
        db_session.add(parent_user)
        db_session.flush()
        parent = create_test_parent(db_session, parent_user, sample_tenant.id)
        create_test_membership(db_session, sample_tenant.id, parent_user.id, 'parent')

        student_user = User(username='s_assignment_flow', email='student.assignment.flow@example.com', role='student')
        student_user.set_password('Password123!')
        db_session.add(student_user)
        db_session.flush()
        student = create_test_student(db_session, student_user, sample_tenant.id)
        student.class_id = sample_class.id
        student.parent_id = parent.id
        create_test_membership(db_session, sample_tenant.id, student_user.id, 'student')

        subject = Subject(name='Integrated Science', code='INT-SCI', tenant_id=sample_tenant.id)
        db_session.add(subject)
        db_session.flush()

        if not ClassTeacherMapping.query.filter_by(class_id=sample_class.id, teacher_id=teacher_user.id).first():
            db_session.add(ClassTeacherMapping(class_id=sample_class.id, teacher_id=teacher_user.id))

        db_session.commit()

        teacher_headers = {
            'Authorization': f'Bearer {create_access_token(identity=teacher_user.id)}',
            'X-Tenant-ID': str(sample_tenant.id),
        }
        student_headers = {
            'Authorization': f'Bearer {create_access_token(identity=student_user.id)}',
            'X-Tenant-ID': str(sample_tenant.id),
        }
        parent_headers = {
            'Authorization': f'Bearer {create_access_token(identity=parent_user.id)}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        uploaded_paths = []

        def fake_upload_resource_file(file_obj, resource_id=None):
            safe_name = file_obj.filename.replace(' ', '_')
            stored_path = f'uploads/resources/{resource_id}_{safe_name}'
            uploaded_paths.append(stored_path)
            return stored_path, None

        with patch('app.services.assignment_service.FileUtils.upload_resource_file', side_effect=fake_upload_resource_file):
            create_response = client.post(
                f'/api/v1/classes/{sample_class.id}/assignments',
                headers=teacher_headers,
                data={
                    'title': 'Attachment Visibility Homework',
                    'description': 'Review the attached worksheet and submit your answer sheet.',
                    'due_date': '2026-12-31',
                    'subject_id': str(subject.id),
                    'total_points': '100',
                    'assignment_type': 'homework',
                    'attachments': (io.BytesIO(b'teacher worksheet'), 'worksheet.pdf'),
                },
                content_type='multipart/form-data',
            )

            assert create_response.status_code == 201
            created_payload = create_response.get_json()
            assignment_id = created_payload['assignment']['id']
            assert created_payload['assignment']['attachments'][0]['filename'] == 'worksheet.pdf'

            student_list_response = client.get('/api/v1/student/assignments', headers=student_headers)
            assert student_list_response.status_code == 200
            student_assignments = student_list_response.get_json()['assignments']
            matching_assignment = next(item for item in student_assignments if item['id'] == assignment_id)
            assert matching_assignment['attachments'][0]['filename'] == 'worksheet.pdf'

            submit_response = client.post(
                f'/api/v1/student/assignments/{assignment_id}/submit',
                headers=student_headers,
                data={
                    'content': 'Please find my completed answer sheet attached.',
                    'file': (io.BytesIO(b'student answer sheet'), 'answers.docx'),
                },
                content_type='multipart/form-data',
            )

            assert submit_response.status_code == 201
            submit_payload = submit_response.get_json()
            assert submit_payload['submission']['attachments'][0]['filename'] == 'answers.docx'
            assert submit_payload['submission']['file_path'].endswith('answers.docx')

        submission = AssignmentSubmission.query.get(submit_payload['submission']['id'])
        assert submission is not None

        teacher_submissions_response = client.get(
            f'/api/v1/classes/assignments/{assignment_id}/submissions',
            headers=teacher_headers,
        )
        assert teacher_submissions_response.status_code == 200
        teacher_submissions_payload = teacher_submissions_response.get_json()
        assert len(teacher_submissions_payload['submissions']) == 1
        assert teacher_submissions_payload['submissions'][0]['attachments'][0]['filename'] == 'answers.docx'

        parent_homework_response = client.get(
            f'/api/v1/parents/children/{student.id}/homework',
            headers=parent_headers,
        )
        assert parent_homework_response.status_code == 200
        parent_homework_payload = parent_homework_response.get_json()
        homework_item = next(item for item in parent_homework_payload['data']['assignments'] if item['id'] == assignment_id)
        assert homework_item['status'] == 'submitted'
        assert homework_item['attachments'][0]['filename'] == 'worksheet.pdf'
        assert homework_item['submission_attachments'][0]['filename'] == 'answers.docx'

        saved_attachments = Attachment.query.filter(
            Attachment.entity_type.in_(['assignment', 'assignment_submission'])
        ).order_by(Attachment.created_at.asc()).all()
        assert len(saved_attachments) >= 2
        assert uploaded_paths[0].endswith('worksheet.pdf')
        assert uploaded_paths[1].endswith('answers.docx')

    def test_teacher_can_create_school_based_assessment_from_legacy_payload(self, client, db_session, sample_tenant, sample_class, sample_teacher):
        from tests.test_production_integration import create_test_membership, create_test_student
        from app.models.assessment_methods import SchoolBasedAssessment
        from app.models.subject import Subject
        from app.models.class_ import ClassTeacherMapping
        from app.models.tenant import TenantMembership

        teacher_user = sample_teacher.user
        if not TenantMembership.query.filter_by(tenant_id=sample_tenant.id, user_id=teacher_user.id, status='active').first():
            create_test_membership(db_session, sample_tenant.id, teacher_user.id, 'teacher')

        s_user = User(username='s_assess_sba', email='s_assess_sba@example.com', role='student')
        s_user.set_password('Password123!')
        db_session.add(s_user)
        db_session.flush()

        student = create_test_student(db_session, s_user, sample_tenant.id)
        student.class_id = sample_class.id
        if not TenantMembership.query.filter_by(tenant_id=sample_tenant.id, user_id=s_user.id, status='active').first():
            create_test_membership(db_session, sample_tenant.id, s_user.id, 'student')

        subject = Subject(name='Integrated Science', code='ISCI101', tenant_id=sample_tenant.id)
        db_session.add(subject)
        db_session.flush()

        if not ClassTeacherMapping.query.filter_by(class_id=sample_class.id, teacher_id=teacher_user.id).first():
            db_session.add(ClassTeacherMapping(class_id=sample_class.id, teacher_id=teacher_user.id))
            db_session.flush()

        db_session.commit()

        token = create_access_token(identity=teacher_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }

        response = client.post(
            '/api/v1/assessment/sba',
            headers=headers,
            json={
                'student_id': student.id,
                'subject_id': subject.id,
                'class_id': sample_class.id,
                'assessment_date': '2026-06-25',
                'term': 'Term 1',
                'academic_year': '2025/2026',
                'total_marks': 40,
                'marking_scheme': {
                    'class_exercises_score': 8,
                    'homework_score': 6,
                    'project_score': 7,
                    'assignment_score': 5,
                    'class_test_scores': [12, 14]
                },
                'core_competencies_score': {'critical_thinking': 4}
            }
        )

        assert response.status_code == 201
        payload = response.get_json()
        assert payload['success'] is True

        created = SchoolBasedAssessment.query.get(payload['data']['id'])
        assert created is not None
        assert created.teacher_id == sample_teacher.id
        assert created.student_id == student.id
        assert created.class_test_average == 13.0
        assert created.total_sba_score == 39.0
        assert created.sba_percentage == 97.5

    def test_teacher_can_record_continuous_assessment_from_legacy_payload(self, client, db_session, sample_tenant, sample_class, sample_teacher):
        from tests.test_production_integration import create_test_membership, create_test_student
        from app.models.assessment_methods import ContinuousAssessmentRecord
        from app.models.subject import Subject
        from app.models.class_ import ClassTeacherMapping
        from app.models.tenant import TenantMembership

        teacher_user = sample_teacher.user
        if not TenantMembership.query.filter_by(tenant_id=sample_tenant.id, user_id=teacher_user.id, status='active').first():
            create_test_membership(db_session, sample_tenant.id, teacher_user.id, 'teacher')

        s_user = User(username='s_assess_cont', email='s_assess_cont@example.com', role='student')
        s_user.set_password('Password123!')
        db_session.add(s_user)
        db_session.flush()

        student = create_test_student(db_session, s_user, sample_tenant.id)
        student.class_id = sample_class.id
        if not TenantMembership.query.filter_by(tenant_id=sample_tenant.id, user_id=s_user.id, status='active').first():
            create_test_membership(db_session, sample_tenant.id, s_user.id, 'student')

        subject = Subject(name='English Language', code='ENG101', tenant_id=sample_tenant.id)
        db_session.add(subject)
        db_session.flush()

        if not ClassTeacherMapping.query.filter_by(class_id=sample_class.id, teacher_id=teacher_user.id).first():
            db_session.add(ClassTeacherMapping(class_id=sample_class.id, teacher_id=teacher_user.id))
            db_session.flush()

        db_session.commit()

        token = create_access_token(identity=teacher_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id)
        }

        response = client.post(
            f'/api/v1/assessment/continuous/{student.id}',
            headers=headers,
            json={
                'subject_id': subject.id,
                'assessment_date': '2026-06-25',
                'assessment_type': 'quiz',
                'score': 18,
                'max_score': 20,
                'feedback': 'Strong class participation and understanding.',
                'term': 'Term 1',
                'academic_year': '2025/2026',
                'week_number': 3
            }
        )

        assert response.status_code == 201
        payload = response.get_json()
        assert payload['success'] is True

        created = ContinuousAssessmentRecord.query.get(payload['data']['id'])
        assert created is not None
        assert created.teacher_id == sample_teacher.id
        assert created.student_id == student.id
        assert created.class_id == sample_class.id
        assert created.quiz_score == 18.0
        assert created.class_score == 36.0
        assert created.teacher_observations == 'Strong class participation and understanding.'

    def test_create_assessment_framework_and_task_endpoints(self, client, db_session, sample_tenant, teacher_auth_context):
        from app.models.assessment_methods import AssessmentFramework, AssessmentTask
        from app.models.subject import Subject

        headers = teacher_auth_context['headers']

        level = EducationalLevel(
            level_code='B2',
            level_name='Basic 2',
            key_phase='key_phase_2',
        )
        subject = Subject(name='Mathematics', code='MATH201', tenant_id=sample_tenant.id)
        db_session.add_all([level, subject])
        db_session.commit()

        framework_response = client.post(
            '/api/v1/assessment/frameworks',
            headers=headers,
            json={
                'name': 'Mathematics Assessment Framework',
                'description': 'Assessment framework for Basic 2 mathematics.',
                'educational_level_id': level.id,
                'subject_id': subject.id,
                'formative_weight': 30.0,
                'summative_weight': 40.0,
                'school_based_weight': 20.0,
                'project_weight': 10.0,
            }
        )

        assert framework_response.status_code == 201
        framework_payload = framework_response.get_json()
        assert framework_payload['success'] is True
        framework_id = framework_payload['framework']['id']

        created_framework = AssessmentFramework.query.get(framework_id)
        assert created_framework is not None
        assert created_framework.name == 'Mathematics Assessment Framework'

        task_response = client.post(
            '/api/v1/assessment/tasks',
            headers=headers,
            json={
                'title': 'Algebra Problem Solving',
                'description': 'Assessment task for algebra problem solving skills',
                'framework_id': framework_id,
                'assessment_type': 'formative',
                'assessment_mode': 'written',
                'scheduled_date': '2026-06-30',
                'duration_minutes': 60,
                'total_marks': 50,
                'pass_mark': 25,
            }
        )

        assert task_response.status_code == 201
        task_payload = task_response.get_json()
        assert task_payload['success'] is True
        assert task_payload['task']['title'] == 'Algebra Problem Solving'

        created_task = AssessmentTask.query.get(task_payload['task']['id'])
        assert created_task is not None
        assert created_task.framework_id == framework_id
        assert created_task.assessment_type.value == 'formative'
        assert created_task.assessment_mode.value == 'written'

    def test_student_can_submit_and_teacher_can_score_assessment(self, client, db_session, sample_tenant, sample_class, teacher_auth_context, student_auth_context):
        from app.models.assessment_methods import AssessmentFramework, AssessmentTask, AssessmentSubmission, AssessmentScore, AssessmentType, AssessmentMode
        from app.models.subject import Subject

        teacher = teacher_auth_context['teacher']
        teacher_headers = teacher_auth_context['headers']
        student = student_auth_context['student']
        student_headers = student_auth_context['headers']

        level = EducationalLevel(
            level_code='B3',
            level_name='Basic 3',
            key_phase='key_phase_2',
        )
        subject = Subject(name='Science', code='SCI301', tenant_id=sample_tenant.id)
        db_session.add_all([level, subject])
        db_session.flush()

        student.class_id = sample_class.id

        framework = AssessmentFramework(
            name='Science Framework',
            educational_level_id=level.id,
            subject_id=subject.id,
        )
        db_session.add(framework)
        db_session.flush()

        task = AssessmentTask(
            title='Science Experiment Reflection',
            framework_id=framework.id,
            assessment_type=AssessmentType.FORMATIVE,
            assessment_mode=AssessmentMode.WRITTEN,
            scheduled_date=datetime(2026, 6, 30).date(),
            total_marks=50,
            pass_mark=25,
        )
        db_session.add(task)
        db_session.commit()

        submission_response = client.post(
            '/api/v1/assessment/submissions',
            headers=student_headers,
            json={
                'task_id': task.id,
                'submission_content': 'Student solution to the assessment task',
                'submission_files': ['solution.pdf'],
                'submitted_at': '2026-06-29T10:00:00',
            }
        )

        assert submission_response.status_code == 201
        submission_payload = submission_response.get_json()
        assert submission_payload['success'] is True
        assert submission_payload['submission']['task_id'] == task.id

        created_submission = AssessmentSubmission.query.get(submission_payload['submission']['id'])
        assert created_submission is not None
        assert created_submission.student_id == student.id
        assert created_submission.file_attachments == ['solution.pdf']
        assert created_submission.is_submitted is True
        assert created_submission.is_late is False

        scoring_response = client.post(
            '/api/v1/assessment/scores',
            headers=teacher_headers,
            json={
                'submission_id': created_submission.id,
                'raw_score': 42,
                'written_feedback': 'Good work on problem solving approach',
                'criterion_scores': {
                    'understanding': 8,
                    'method': 9,
                    'accuracy': 7,
                    'communication': 8,
                }
            }
        )

        assert scoring_response.status_code == 201
        score_payload = scoring_response.get_json()
        assert score_payload['success'] is True
        assert score_payload['score']['raw_score'] == 42
        assert score_payload['score']['percentage_score'] == 84.0
        assert score_payload['score']['grade_level'] == 4

        created_score = AssessmentScore.query.get(score_payload['score']['id'])
        assert created_score is not None
        assert created_score.teacher_id == teacher.id
        assert created_score.submission_id == created_submission.id
        assert created_score.criterion_scores['method'] == 9


    def test_parent_can_list_own_messages(
        self,
        client,
        db_session,
        sample_tenant,
        parent_auth_context,
    ):
        """Legacy ownerless Message rows must not be exposed to parent reads."""
        from tests.test_production_integration import (
            create_test_membership,
        )

        parent_user = parent_auth_context['user']
        parent = parent_auth_context['parent']
        headers = parent_auth_context['headers']

        sender = User(
            username='teacher_for_parent_messages',
            email='teacher-parent-messages@example.com',
            first_name='Teacher',
            last_name='Sender',
            role='teacher',
            is_active=True,
        )
        sender.set_password('testpassword')
        db_session.add(sender)
        db_session.flush()

        create_test_membership(
            db_session,
            sample_tenant.id,
            sender.id,
            'teacher',
        )

        inbound = Message(
            sender_id=sender.id,
            sender_type='teacher',
            recipient_id=parent_user.id,
            recipient_type='parent',
            subject='Parent Workflow Update',
            content='Your child has a new assignment submission update.',
        )
        outbound = Message(
            sender_id=parent_user.id,
            sender_type='parent',
            recipient_id=sender.id,
            recipient_type='teacher',
            subject='Re: Parent Workflow Update',
            content='Thanks for the update.',
        )

        db_session.add_all([inbound, outbound])
        db_session.commit()

        response = client.get(
            f'/api/v1/parents/{parent.id}/messages',
            headers=headers,
        )

        assert response.status_code == 200

        payload = response.get_json()
        assert payload['success'] is True

        # Message has no durable tenant owner, so reads fail closed.
        assert payload['data']['messages'] == []

        # Suppression must not mutate/delete legacy data.
        assert Message.query.filter(
            Message.id.in_([inbound.id, outbound.id])
        ).count() == 2

    def test_message_cannot_save_to_non_existent_recipient_id(self, db_session):
        from app.services.message_service import MessageService

        with pytest.raises(RuntimeError, match="MESSAGE_TENANT_OWNERSHIP_REQUIRED"):
            MessageService.create_message({
                'sender_id': 1,
                'recipient_ref': 'user:999999',
                'subject': 'Failure message',
                'content': 'This must fail.'
            })

    def test_notifications_mark_read_scoped_to_current_user(
        self,
        client,
        db_session,
        sample_tenant,
    ):
        from app.models.dashboard import (
            Notification,
            NotificationUserState,
        )
        from tests.test_production_integration import (
            create_test_membership,
        )

        user1 = User(
            username='notif_u1',
            email='notif_u1@example.com',
            role='student',
        )
        user1.set_password('Password123!')

        user2 = User(
            username='notif_u2',
            email='notif_u2@example.com',
            role='student',
        )
        user2.set_password('Password123!')

        db_session.add_all([user1, user2])
        db_session.flush()

        create_test_membership(
            db_session,
            sample_tenant.id,
            user1.id,
            'student',
        )
        create_test_membership(
            db_session,
            sample_tenant.id,
            user2.id,
            'student',
        )

        n1 = Notification(
            title='U1 Notif',
            message='Private for u1',
            type='info',
            recipient_id=user1.id,
            user_id=user1.id,
        )
        n2 = Notification(
            title='U2 Notif',
            message='Private for u2',
            type='info',
            recipient_id=user2.id,
            user_id=user2.id,
        )

        db_session.add_all([n1, n2])
        db_session.commit()

        token = create_access_token(identity=user1.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        response = client.patch(
            '/api/v1/notifications/mark-read',
            headers=headers,
            json={'notification_ids': [n1.id, n2.id]},
        )

        assert response.status_code == 503

        payload = response.get_json()
        assert payload['success'] is False
        assert (
            payload['code']
            == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
        )

        # Fail-closed means no per-user state may be materialized.
        assert NotificationUserState.query.filter_by(
            user_id=user1.id
        ).count() == 0

        db_session.refresh(n1)
        db_session.refresh(n2)

        assert n1.read is False
        assert n2.read is False

    def test_notifications_mark_read_allows_role_scoped_notifications(
        self,
        client,
        db_session,
        sample_tenant,
    ):
        from app.models.dashboard import (
            Notification,
            NotificationUserState,
        )
        from tests.test_production_integration import (
            create_test_membership,
        )

        student_user = User(
            username='notif_student',
            email='notif_student@example.com',
            role='student',
        )
        student_user.set_password('Password123!')

        other_user = User(
            username='notif_parent',
            email='notif_parent@example.com',
            role='parent',
        )
        other_user.set_password('Password123!')

        db_session.add_all([student_user, other_user])
        db_session.flush()

        create_test_membership(
            db_session,
            sample_tenant.id,
            student_user.id,
            'student',
        )
        create_test_membership(
            db_session,
            sample_tenant.id,
            other_user.id,
            'parent',
        )

        role_scoped = Notification(
            title='Student Scope',
            message='Visible to all students',
            type='info',
            scope='students',
        )
        other_scope = Notification(
            title='Parent Scope',
            message='Visible to parents only',
            type='info',
            scope='parents',
        )

        db_session.add_all([role_scoped, other_scope])
        db_session.commit()

        token = create_access_token(identity=student_user.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        response = client.patch(
            '/api/v1/notifications/mark-read',
            headers=headers,
            json={
                'notification_ids': [
                    role_scoped.id,
                    other_scope.id,
                ],
            },
        )

        assert response.status_code == 503

        payload = response.get_json()
        assert payload['success'] is False
        assert (
            payload['code']
            == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
        )

        assert NotificationUserState.query.filter_by(
            user_id=student_user.id
        ).count() == 0

    def test_notifications_list_excludes_other_users_private_notifications(
        self,
        client,
        db_session,
        sample_tenant,
    ):
        from app.models.dashboard import Notification
        from tests.test_production_integration import (
            create_test_membership,
        )

        user1 = User(
            username='notif_list_u1',
            email='notif_list_u1@example.com',
            role='student',
        )
        user1.set_password('Password123!')

        user2 = User(
            username='notif_list_u2',
            email='notif_list_u2@example.com',
            role='student',
        )
        user2.set_password('Password123!')

        db_session.add_all([user1, user2])
        db_session.flush()

        create_test_membership(
            db_session,
            sample_tenant.id,
            user1.id,
            'student',
        )
        create_test_membership(
            db_session,
            sample_tenant.id,
            user2.id,
            'student',
        )

        private_u1 = Notification(
            title='Private U1',
            message='Only user1 should see this',
            type='info',
            recipient_id=user1.id,
            user_id=user1.id,
        )
        private_u2 = Notification(
            title='Private U2',
            message='Only user2 should see this',
            type='info',
            recipient_id=user2.id,
            user_id=user2.id,
        )
        scoped_students = Notification(
            title='Student Notice',
            message='Visible to students',
            type='info',
            scope='students',
        )

        db_session.add_all([
            private_u1,
            private_u2,
            scoped_students,
        ])
        db_session.commit()

        token = create_access_token(identity=user1.id)
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        response = client.get(
            '/api/v1/notifications',
            headers=headers,
        )

        assert response.status_code == 200

        payload = response.get_json()

        # Notification lacks durable tenant ownership, so even otherwise
        # visible rows must not be returned in a tenant-scoped request.
        assert payload['data'] == []

        if 'code' in payload:
            assert (
                payload['code']
                == 'notification_tenant_ownership_pending'
            )

    def test_notifications_user_state_actions_are_user_specific(
        self,
        client,
        db_session,
        sample_tenant,
    ):
        from app.models.dashboard import (
            Notification,
            NotificationUserState,
        )
        from tests.test_production_integration import (
            create_test_membership,
        )

        user1 = User(
            username='notif_state_u1',
            email='notif_state_u1@example.com',
            role='student',
        )
        user1.set_password('Password123!')

        user2 = User(
            username='notif_state_u2',
            email='notif_state_u2@example.com',
            role='student',
        )
        user2.set_password('Password123!')

        db_session.add_all([user1, user2])
        db_session.flush()

        create_test_membership(
            db_session,
            sample_tenant.id,
            user1.id,
            'student',
        )
        create_test_membership(
            db_session,
            sample_tenant.id,
            user2.id,
            'student',
        )

        shared_notification = Notification(
            title='Shared Student Notice',
            message='Visible to all students',
            type='info',
            scope='students',
        )
        db_session.add(shared_notification)
        db_session.commit()

        user1_headers = {
            'Authorization': (
                f'Bearer {create_access_token(identity=user1.id)}'
            ),
            'X-Tenant-ID': str(sample_tenant.id),
        }
        user2_headers = {
            'Authorization': (
                f'Bearer {create_access_token(identity=user2.id)}'
            ),
            'X-Tenant-ID': str(sample_tenant.id),
        }

        mutation_requests = [
            (
                'patch',
                '/api/v1/notifications/star',
                {
                    'notification_ids': [shared_notification.id],
                    'starred': True,
                },
            ),
            (
                'patch',
                '/api/v1/notifications/archive',
                {
                    'notification_ids': [shared_notification.id],
                    'archived': True,
                },
            ),
            (
                'delete',
                '/api/v1/notifications/delete',
                {
                    'notification_ids': [shared_notification.id],
                },
            ),
        ]

        for method, url, payload in mutation_requests:
            response = getattr(client, method)(
                url,
                headers=user1_headers,
                json=payload,
            )

            assert response.status_code == 503
            body = response.get_json()
            assert body['success'] is False
            assert (
                body['code']
                == 'NOTIFICATION_TENANT_OWNERSHIP_REQUIRED'
            )

        # No user-state row may be created while ownership is unresolved.
        assert NotificationUserState.query.filter_by(
            notification_id=shared_notification.id
        ).count() == 0

        # Reads also suppress ownerless notifications.
        for headers in (user1_headers, user2_headers):
            response = client.get(
                '/api/v1/notifications',
                headers=headers,
            )
            assert response.status_code == 200
            assert response.get_json()['data'] == []

    def test_socket_failure_does_not_rollback_db(self, db_session, sample_class, sample_teacher):
        from unittest.mock import patch
        from app.services.announcement_service import AnnouncementService

        with patch('app.extensions.socketio.emit', side_effect=Exception("Socket disconnected")):
            announcement, error = AnnouncementService.create_announcement({
                'title': 'Socket Fault Test',
                'content': 'We must persist even if sockets fail.',
                'class_id': sample_class.id,
                'teacher_id': sample_teacher.id
            })
            assert error is None
            assert announcement is not None
            from app.models.announcement import Announcement
            db_announcement = Announcement.query.get(announcement.id)
            assert db_announcement is not None

    def test_new_teacher_rbac_and_class_mappings(
        self,
        db_session,
        sample_tenant,
        sample_class,
    ):
        from tests.test_production_integration import (
            create_test_membership,
            create_test_teacher,
        )
        from app.models.class_ import ClassTeacherMapping

        new_user = User(
            username='new_teacher_rbac',
            email='new_t_rbac@example.com',
            role='teacher',
        )
        new_user.set_password('Password123!')
        db_session.add(new_user)
        db_session.flush()

        teacher = create_test_teacher(
            db_session,
            new_user,
            sample_tenant.id,
        )
        create_test_membership(
            db_session,
            sample_tenant.id,
            new_user.id,
            'teacher',
        )

        assert teacher is not None
        assert sample_class.tenant_id == sample_tenant.id

        mapping = ClassTeacherMapping(
            class_id=sample_class.id,
            teacher_id=new_user.id,
        )
        db_session.add(mapping)
        db_session.commit()

        assert new_user.role == 'teacher'

        persisted = ClassTeacherMapping.query.filter_by(
            class_id=sample_class.id,
            teacher_id=new_user.id,
        ).one()

        assert persisted.class_id == sample_class.id
        assert persisted.teacher_id == new_user.id
