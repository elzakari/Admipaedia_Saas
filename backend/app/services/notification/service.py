from app.extensions import db
from app.models.user import User
from app.services.notification.adapters.base import SMSAdapter, EmailAdapter, PushAdapter
import structlog
from datetime import datetime

logger = structlog.get_logger()

class NotificationService:
    adapters = {
        'sms': SMSAdapter(),
        'email': EmailAdapter(),
        'push': PushAdapter()
    }

    @staticmethod
    def send_notification(user_id, message, channels=None, **kwargs):
        """
        Send notification to a user via specified channels.
        If channels not specified, uses user preferences (mocked for now).
        """
        user = User.query.get(user_id)
        if not user:
            return False, "User not found"
        
        # Determine channels based on preferences (Mock logic)
        # In real app, fetch from UserPreferences model
        if not channels:
            channels = ['email'] # Default
            if user.phone_number:
                channels.append('sms')
        
        results = {}
        for channel in channels:
            adapter = NotificationService.adapters.get(channel)
            if not adapter:
                logger.warning("unknown_channel", channel=channel)
                continue
            
            recipient = user.email if channel == 'email' else user.phone_number
            # For push, we'd need a device token stored in User model
            if channel == 'push':
                recipient = "DEVICE_TOKEN_PLACEHOLDER"
            
            if recipient:
                try:
                    success = adapter.send(recipient, message, **kwargs)
                    results[channel] = 'sent' if success else 'failed'
                except Exception as e:
                    logger.error("notification_failed", channel=channel, error=str(e))
                    results[channel] = 'error'
            else:
                results[channel] = 'skipped_no_recipient'
                
        return True, results

    @staticmethod
    def get_preferences(user_id):
        """Get user notification preferences."""
        # Mock response
        return {
            'email': True,
            'sms': True,
            'push': False,
            'quiet_hours_start': '22:00',
            'quiet_hours_end': '06:00'
        }

    @staticmethod
    def update_preferences(user_id, data):
        """Update user notification preferences."""
        # Mock logic
        return True
