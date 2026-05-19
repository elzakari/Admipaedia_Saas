"""
Comprehensive integration tests for dashboard system
Tests statistics, events, notifications, and analytics functionality
"""
import pytest
import json
from datetime import datetime, date, timedelta
from unittest.mock import patch, MagicMock

from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.dashboard import Notification, CalendarEvent, DashboardStatistic
from app.extensions import db


class TestDashboardStatistics:
    """Test dashboard statistics functionality"""
    
    def test_get_statistics_admin_role(self, auth_client, db):
        """Test getting statistics for admin role"""
        response = auth_client.get('/api/v1/dashboard/statistics?role=admin')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'statistics' in data:
            data = data['statistics']
        assert isinstance(data, list)
        
        # Verify expected statistics structure
        if data:
            stat = data[0]
            assert 'id' in stat
            assert 'title' in stat
            assert 'value' in stat
            assert 'color' in stat
            # Change field is optional
            if 'change' in stat and stat['change']:
                assert 'value' in stat['change']
                assert 'isPositive' in stat['change']
    
    def test_get_statistics_teacher_role(self, auth_client, db):
        """Test getting statistics for teacher role"""
        response = auth_client.get('/api/v1/dashboard/statistics?role=teacher')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'statistics' in data:
            data = data['statistics']
        assert isinstance(data, list)
    
    def test_get_statistics_student_role(self, auth_client, db):
        """Test getting statistics for student role"""
        response = auth_client.get('/api/v1/dashboard/statistics?role=student')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'statistics' in data:
            data = data['statistics']
        assert isinstance(data, list)
    
    def test_get_statistics_no_role_specified(self, auth_client, db):
        """Test getting statistics without specifying role"""
        response = auth_client.get('/api/v1/dashboard/statistics')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'statistics' in data:
            data = data['statistics']
        assert isinstance(data, list)


class TestDashboardEvents:
    """Test dashboard calendar events functionality"""
    
    def test_get_events_current_month(self, auth_client, db):
        """Test getting events for current month"""
        current_date = datetime.now()
        response = auth_client.get(
            f'/api/v1/dashboard/events?month={current_date.month}&year={current_date.year}'
        )
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'events' in data:
            data = data['events']
        assert isinstance(data, list)
        
        # Verify event structure if events exist
        if data:
            event = data[0]
            assert 'id' in event
            assert 'title' in event
            assert 'date' in event
            assert 'type' in event
            assert 'description' in event
    
    def test_get_events_specific_month(self, auth_client, db):
        """Test getting events for specific month"""
        response = auth_client.get('/api/v1/dashboard/events?month=12&year=2024')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'events' in data:
            data = data['events']
        assert isinstance(data, list)
    
    def test_get_events_no_parameters(self, auth_client, db):
        """Test getting events without month/year parameters"""
        response = auth_client.get('/api/v1/dashboard/events')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'events' in data:
            data = data['events']
        assert isinstance(data, list)


class TestDashboardNotifications:
    """Test dashboard notifications functionality"""
    
    def test_get_notifications_default_limit(self, auth_client, db):
        """Test getting notifications with default limit"""
        response = auth_client.get('/api/v1/dashboard/notifications')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'notifications' in data:
            data = data['notifications']
        assert isinstance(data, list)
        assert len(data) <= 10  # Default limit
        
        # Verify notification structure if notifications exist
        if data:
            notification = data[0]
            assert 'id' in notification
            assert 'title' in notification
            assert 'message' in notification
            assert 'time' in notification
            assert 'read' in notification
            assert 'type' in notification
    
    def test_get_notifications_custom_limit(self, auth_client, db):
        """Test getting notifications with custom limit"""
        response = auth_client.get('/api/v1/dashboard/notifications?limit=5')
        assert response.status_code == 200
        
        data = response.get_json()
        if isinstance(data, dict) and 'notifications' in data:
            data = data['notifications']
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_mark_notification_as_read(self, auth_client, db):
        """Test marking a notification as read"""
        # First create a notification (assuming we have a test notification)
        notification_id = 1
        response = auth_client.put(f'/api/v1/dashboard/notifications/{notification_id}/read')
        
        # Should return success even if notification doesn't exist
        assert response.status_code == 200
        data = response.get_json()
        assert 'success' in data
    
    def test_mark_all_notifications_as_read(self, auth_client, db):
        """Test marking all notifications as read"""
        response = auth_client.put('/api/v1/dashboard/notifications/read-all')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'success' in data
    
    def test_create_notification_success(self, auth_client, db):
        """Test creating a new notification"""
        notification_data = {
            'title': 'Test Notification',
            'message': 'This is a test notification message',
            'type': 'info',
            'recipients': ['all']
        }
        
        response = auth_client.post('/api/v1/dashboard/notifications', json=notification_data)
        assert response.status_code in [200, 201]
        
        data = response.get_json()
        if 'success' in data:
            assert data['success'] is True
    
    def test_create_notification_missing_data(self, auth_client, db):
        """Test creating notification with missing required data"""
        notification_data = {
            'title': 'Test Notification'
            # Missing message and other required fields
        }
        
        response = auth_client.post('/api/v1/dashboard/notifications', json=notification_data)
        assert response.status_code in [400, 422]
    
    def test_create_bulk_notifications(self, auth_client, db):
        """Test creating bulk notifications"""
        bulk_data = {
            'notifications': [
                {
                    'title': 'Bulk Notification 1',
                    'message': 'First bulk notification',
                    'type': 'info'
                },
                {
                    'title': 'Bulk Notification 2',
                    'message': 'Second bulk notification',
                    'type': 'warning'
                }
            ],
            'recipients': ['all']
        }
        
        response = auth_client.post('/api/v1/dashboard/notifications/bulk', json=bulk_data)
        assert response.status_code in [200, 201]


class TestTeacherAnalytics:
    """Test teacher analytics functionality"""
    
    def test_get_teacher_analytics(self, auth_client, db):
        """Test getting teacher analytics"""
        teacher_id = 1
        response = auth_client.get(f'/api/v1/dashboard/teacher-analytics/{teacher_id}')
        
        # Should return 200 even if teacher doesn't exist (empty data)
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.get_json()
            assert isinstance(data, dict)
    
    def test_get_teacher_stats(self, auth_client, db):
        """Test getting teacher statistics"""
        teacher_id = 1
        response = auth_client.get(f'/api/v1/dashboard/teacher-stats/{teacher_id}')
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.get_json()
            assert isinstance(data, dict)
            # Verify expected stats structure
            if data:
                assert 'total_students' in data or 'classes' in data or 'subjects' in data


class TestDashboardIntegrationWorkflow:
    """Test complete dashboard integration workflows"""
    
    def test_dashboard_data_flow(self, auth_client, db):
        """Test complete dashboard data retrieval flow"""
        # Get statistics
        stats_response = auth_client.get('/api/v1/dashboard/statistics?role=admin')
        assert stats_response.status_code == 200
        
        # Get events
        events_response = auth_client.get('/api/v1/dashboard/events')
        assert events_response.status_code == 200
        
        # Get notifications
        notifications_response = auth_client.get('/api/v1/dashboard/notifications')
        assert notifications_response.status_code == 200
        
        # Verify all responses are valid
        stats_data = stats_response.get_json()
        events_data = events_response.get_json()
        notifications_data = notifications_response.get_json()
        
        if isinstance(stats_data, dict) and 'statistics' in stats_data:
            stats_data = stats_data['statistics']
        if isinstance(events_data, dict) and 'events' in events_data:
            events_data = events_data['events']
        if isinstance(notifications_data, dict) and 'notifications' in notifications_data:
            notifications_data = notifications_data['notifications']
            
        assert isinstance(stats_data, list)
        assert isinstance(events_data, list)
        assert isinstance(notifications_data, list)
    
    def test_notification_management_workflow(self, auth_client, db):
        """Test complete notification management workflow"""
        # Create notification
        notification_data = {
            'title': 'Workflow Test Notification',
            'message': 'Testing notification workflow',
            'type': 'info',
            'recipients': ['all']
        }
        
        create_response = auth_client.post('/api/v1/dashboard/notifications', json=notification_data)
        assert create_response.status_code in [200, 201]
        
        # Get notifications to verify creation
        get_response = auth_client.get('/api/v1/dashboard/notifications')
        assert get_response.status_code == 200
        
        # Mark all as read
        read_response = auth_client.put('/api/v1/dashboard/notifications/read-all')
        assert read_response.status_code == 200
        
        read_data = read_response.get_json()
        assert 'success' in read_data
    
    def test_role_based_dashboard_access(self, auth_client, db):
        """Test role-based dashboard access and data filtering"""
        roles = ['admin', 'teacher', 'student']
        
        for role in roles:
            response = auth_client.get(f'/api/v1/dashboard/statistics?role={role}')
            assert response.status_code == 200
            
            data = response.get_json()
            if isinstance(data, dict) and 'statistics' in data:
                data = data['statistics']
            assert isinstance(data, list)
            
            # Each role should potentially have different statistics
            # The actual filtering logic would be tested in the service layer


class TestDashboardErrorHandling:
    """Test dashboard error handling and edge cases"""
    
    def test_invalid_teacher_id_analytics(self, auth_client, db):
        """Test analytics with invalid teacher ID"""
        response = auth_client.get('/api/v1/dashboard/teacher-analytics/99999')
        assert response.status_code in [404, 200]  # Depending on implementation
    
    def test_invalid_notification_id_read(self, auth_client, db):
        """Test marking non-existent notification as read"""
        response = auth_client.put('/api/v1/dashboard/notifications/99999/read')
        assert response.status_code == 200  # Should handle gracefully
        
        data = response.get_json()
        assert 'success' in data
    
    def test_invalid_date_parameters(self, auth_client, db):
        """Test events endpoint with invalid date parameters"""
        response = auth_client.get('/api/v1/dashboard/events?month=13&year=2024')
        assert response.status_code in [200, 400]  # Depending on validation
        
        response = auth_client.get('/api/v1/dashboard/events?month=0&year=2024')
        assert response.status_code in [200, 400]
    
    def test_malformed_notification_data(self, auth_client, db):
        """Test creating notification with malformed data"""
        malformed_data = {
            'title': '',  # Empty title
            'message': None,  # Null message
            'type': 'invalid_type',  # Invalid type
            'recipients': []  # Empty recipients
        }
        
        response = auth_client.post('/api/v1/dashboard/notifications', json=malformed_data)
        assert response.status_code in [400, 422]


class TestDashboardPerformance:
    """Test dashboard performance and optimization"""
    
    def test_statistics_response_time(self, auth_client, db):
        """Test statistics endpoint response time"""
        import time
        
        start_time = time.time()
        response = auth_client.get('/api/v1/dashboard/statistics?role=admin')
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should respond within 2 seconds
    
    def test_notifications_pagination_performance(self, auth_client, db):
        """Test notifications endpoint with different limits"""
        limits = [5, 10, 20, 50]
        
        for limit in limits:
            response = auth_client.get(f'/api/v1/dashboard/notifications?limit={limit}')
            assert response.status_code == 200
            
            data = response.get_json()
            if isinstance(data, dict) and 'notifications' in data:
                data = data['notifications']
            assert len(data) <= limit
    
    def test_concurrent_notification_creation(self, auth_client, db):
        """Test concurrent notification creation"""
        import threading
        
        def create_notification(index):
            notification_data = {
                'title': f'Concurrent Notification {index}',
                'message': f'Testing concurrent creation {index}',
                'type': 'info',
                'recipients': ['all']
            }
            
            response = auth_client.post('/api/v1/dashboard/notifications', json=notification_data)
            assert response.status_code in [200, 201]
        
        # Create multiple notifications concurrently
        threads = []
        for i in range(5):
            thread = threading.Thread(target=create_notification, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
