import pytest
from unittest.mock import patch

class TestNotificationSystem:
    @patch('app.services.notification.service.SMSAdapter.send')
    @patch('app.services.notification.service.EmailAdapter.send')
    def test_send_notification(self, mock_email, mock_sms, auth_client, db):
        mock_email.return_value = True
        mock_sms.return_value = True
        
        data = {
            'message': 'Hello World',
            'channels': ['email', 'sms']
        }
        
        response = auth_client.post('/api/v1/notifications/test-send', json=data)
        assert response.status_code == 200
        
        assert mock_email.called
        assert mock_sms.called
        
    def test_preferences(self, auth_client):
        response = auth_client.get('/api/v1/notifications/preferences')
        assert response.status_code == 200
        assert 'email' in response.json['data']
