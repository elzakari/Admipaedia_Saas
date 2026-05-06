import structlog
from datetime import datetime
from flask_socketio import emit
from app.extensions import db, socketio
from app.models.dashboard import Notification
from app.services.email_service import send_notification_email
from app.models.user import User
from app.services.cache_service import get_cache_service

logger = structlog.get_logger()
cache_service = get_cache_service()

class NotificationService:
    """Service for notification-related operations."""
    
    @staticmethod
    def create_notification(title, message, notification_type, user_id=None, send_email=False, send_websocket=True):
        """Create a new notification.
        
        Args:
            title (str): Notification title
            message (str): Notification message
            notification_type (str): Type of notification (info, warning, success, error)
            user_id (int, optional): User ID to associate with the notification. If None, it's a global notification.
            send_email (bool, optional): Whether to send an email notification. Defaults to False.
            send_websocket (bool, optional): Whether to send a real-time websocket notification. Defaults to True.
            
        Returns:
            Notification: The created notification object
        """
        try:
            # Create notification in database
            notification = Notification(
                title=title,
                message=message,
                type=notification_type,
                user_id=user_id,
                read=False,
                time=datetime.utcnow()
            )
            
            db.session.add(notification)
            db.session.commit()
            
            # Format notification for frontend
            notification_data = {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'time': 'Just now',
                'read': notification.read,
                'type': notification.type
            }
            
            # Send real-time notification via WebSocket if requested
            if send_websocket:
                if user_id:
                    # Send to specific user
                    socketio.emit('new_notification', notification_data, room=f"user_{user_id}", namespace='/notifications')
                else:
                    # Broadcast to all users
                    socketio.emit('new_notification', notification_data, namespace='/notifications')
            
            # Send email notification if requested
            if send_email and user_id:
                user = User.query.get(user_id)
                if user and user.email:
                    email_subject = f"ADMIPAEDIA Notification: {title}"
                    send_notification_email(user.email, email_subject, message)
            
            logger.info("Notification created", 
                       notification_id=notification.id, 
                       user_id=user_id, 
                       type=notification_type)
            
            return notification
            
        except Exception as e:
            logger.error("Failed to create notification", error=str(e))
            db.session.rollback()
            raise
    
    @staticmethod
    def create_bulk_notifications(title, message, notification_type, user_ids, send_email=False, send_websocket=True):
        """Create notifications for multiple users.
        
        Args:
            title (str): Notification title
            message (str): Notification message
            notification_type (str): Type of notification (info, warning, success, error)
            user_ids (list): List of user IDs to create notifications for
            send_email (bool, optional): Whether to send email notifications. Defaults to False.
            send_websocket (bool, optional): Whether to send real-time websocket notifications. Defaults to True.
            
        Returns:
            list: List of created notification objects
        """
        notifications = []
        
        for user_id in user_ids:
            notification = NotificationService.create_notification(
                title=title,
                message=message,
                notification_type=notification_type,
                user_id=user_id,
                send_email=send_email,
                send_websocket=send_websocket
            )
            notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def send_security_alert(user_id, alert_type, data):
        """Send a security alert notification to a user.
        
        Args:
            user_id (int): User ID
            alert_type (str): Type of security alert (e.g., 'new_login_ip')
            data (dict): Additional data for the alert
        """
        titles = {
            'new_login_ip': 'New Login Detected',
            'account_locked': 'Account Locked',
            'mfa_enabled': 'MFA Enabled',
            'mfa_disabled': 'MFA Disabled',
            'password_changed': 'Password Changed'
        }
        
        messages = {
            'new_login_ip': f"A new login was detected from IP address {data.get('ip_address', 'Unknown')} using {data.get('device', 'Unknown Device')}.",
            'account_locked': "Your account has been temporarily locked due to too many failed login attempts.",
            'mfa_enabled': "Multi-Factor Authentication has been successfully enabled for your account.",
            'mfa_disabled': "Multi-Factor Authentication has been disabled for your account.",
            'password_changed': "Your account password was recently changed."
        }
        
        title = titles.get(alert_type, 'Security Alert')
        message = messages.get(alert_type, 'A security event was detected on your account.')
        
        return NotificationService.create_notification(
            title=title,
            message=message,
            notification_type='warning',
            user_id=user_id,
            send_email=True,
            send_websocket=True
        )

    @staticmethod
    def get_user_notifications(user_id, limit=10, include_read=True):
        """Get notifications for a specific user.
        
        Args:
            user_id (int): User ID
            limit (int, optional): Maximum number of notifications to return. Defaults to 10.
            include_read (bool, optional): Whether to include read notifications. Defaults to True.
            
        Returns:
            list: List of notification objects
        """
        from sqlalchemy.orm import joinedload
        
        # Try to get from cache first
        cache_key = f"user_notifications:{user_id}:limit_{limit}:read_{include_read}"
        cached_notifications = cache_service.get(cache_key)
        if cached_notifications:
            return cached_notifications
        
        query = Notification.query.options(
            joinedload(Notification.user)
        ).filter(
            (Notification.user_id == user_id) | (Notification.user_id == None)
        )
        
        if not include_read:
            query = query.filter(Notification.read == False)
        
        notifications = query.order_by(Notification.time.desc()).limit(limit).all()
        
        # Cache the result for 2 minutes (notifications change frequently)
        cache_service.set(cache_key, notifications, ttl=120)
        
        return notifications