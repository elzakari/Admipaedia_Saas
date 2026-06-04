import requests
import smtplib
import socket
import uuid
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from flask import current_app
from app.extensions import db
from app.models.notification_log import NotificationLog

logger = logging.getLogger(__name__)

class NotificationService:
    """Unified service for Parent Notifications (SMS & Email)."""
    
    @staticmethod
    def send_sms(tenant_id, branch_id, phone_number: str, message: str) -> NotificationLog:
        """
        Send an SMS notification.
        Enforces a strict 10-second request timeout on REST execution.
        Bypasses network operations completely if Flask TESTING config is true.
        """
        tenant_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
        branch_uuid = uuid.UUID(str(branch_id)) if branch_id else None
        
        is_testing = False
        try:
            is_testing = current_app.config.get('TESTING', False)
        except RuntimeError:
            pass
            
        status = 'sent'
        error_msg = None
        
        if is_testing:
            logger.info(f"[TEST MOCK SMS] Sending to {phone_number}: {message}")
        else:
            try:
                # We enforce a strict 10-second request timeout boundary on external links.
                url = current_app.config.get('SMS_PROVIDER_URL', 'https://api.sms-provider.com/v1/send')
                headers = {"Authorization": f"Bearer {current_app.config.get('SMS_PROVIDER_KEY', 'mock-key')}"}
                payload = {
                    "to": phone_number,
                    "message": message,
                    "tenant_id": str(tenant_uuid)
                }
                
                resp = requests.post(url, json=payload, headers=headers, timeout=10)
                if resp.status_code not in (200, 201):
                    status = 'failed'
                    error_msg = f"HTTP Error {resp.status_code}: {resp.text}"
            except requests.Timeout:
                status = 'failed'
                error_msg = "Network Request Timeout (10s limit exceeded)"
            except Exception as e:
                status = 'failed'
                error_msg = f"SMS Delivery failed: {str(e)}"
                
        log = NotificationLog(
            tenant_id=tenant_uuid,
            branch_id=branch_uuid,
            channel='sms',
            recipient=phone_number,
            content=message,
            status=status,
            error_message=error_msg
        )
        db.session.add(log)
        db.session.commit()
        return log

    @staticmethod
    def send_email(tenant_id, branch_id, email_address: str, subject: str, content: str) -> NotificationLog:
        """
        Send an Email notification.
        Enforces a strict 10-second SMTP connection timeout.
        Bypasses network operations completely if Flask TESTING config is true.
        """
        tenant_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
        branch_uuid = uuid.UUID(str(branch_id)) if branch_id else None
        
        is_testing = False
        try:
            is_testing = current_app.config.get('TESTING', False)
        except RuntimeError:
            pass
            
        status = 'sent'
        error_msg = None
        
        if is_testing:
            logger.info(f"[TEST MOCK EMAIL] Sending to {email_address} with subject '{subject}': {content}")
        else:
            try:
                smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.mailtrap.io')
                smtp_port = current_app.config.get('SMTP_PORT', 2525)
                smtp_user = current_app.config.get('SMTP_USERNAME', 'mock')
                smtp_password = current_app.config.get('SMTP_PASSWORD', 'mock')
                
                msg = MIMEMultipart()
                msg['From'] = current_app.config.get('SMTP_FROM', 'no-reply@admipaedia.com')
                msg['To'] = email_address
                msg['Subject'] = subject
                msg.attach(MIMEText(content, 'plain'))
                
                # Establish SMTP connection with a strict 10-second timeout boundary
                with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                    if smtp_user and smtp_password and smtp_user != 'mock':
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                    server.sendmail(msg['From'], email_address, msg.as_string())
            except (socket.timeout, TimeoutError):
                status = 'failed'
                error_msg = "SMTP Connection Timeout (10s limit exceeded)"
            except Exception as e:
                status = 'failed'
                error_msg = f"Email Delivery failed: {str(e)}"
                
        log = NotificationLog(
            tenant_id=tenant_uuid,
            branch_id=branch_uuid,
            channel='email',
            recipient=email_address,
            subject=subject,
            content=content,
            status=status,
            error_message=error_msg
        )
        db.session.add(log)
        db.session.commit()
        return log

    @staticmethod
    def get_user_notifications(user_id, page=1, per_page=20, unread_only=False):
        """Get notifications for a user, including class-scoped announcements if user is a parent or student."""
        from app.models.user import User
        from app.models.dashboard import Notification
        from app.models.announcement import Announcement
        from app.models.parent import Parent
        from app.models.student import Student
        from sqlalchemy import or_
        
        user = User.query.get(user_id)
        if not user:
            return [], 0
            
        notifications_list = []
        
        # 1. Fetch direct/scope notifications
        notif_query = Notification.query.filter(
            or_(
                Notification.recipient_id == int(user_id),
                Notification.user_id == int(user_id),
                Notification.scope == user.role,
                Notification.scope == f"{user.role}s",
                Notification.scope == 'all'
            )
        )
        if unread_only:
            notif_query = notif_query.filter(Notification.read == False)
            
        db_notifications = notif_query.all()
        for n in db_notifications:
            int_id = hash(n.id) & 0x7fffffff if isinstance(n.id, str) else n.id
            notifications_list.append({
                'id': int_id,
                'user_id': user_id,
                'title': n.title,
                'message': n.message,
                'type': n.type or 'general',
                'priority': 'medium',
                'is_read': n.read,
                'created_at': n.time or n.created_at,
                'updated_at': n.updated_at
            })
            
        # 2. Fetch classroom-context announcements if user is parent or student
        class_ids = []
        if user.role == 'student':
            student = Student.query.filter_by(user_id=int(user_id)).first()
            if student and student.class_id:
                class_ids.append(student.class_id)
        elif user.role == 'parent':
            parent = Parent.query.filter_by(user_id=int(user_id)).first()
            if parent:
                # Retrieve from parent.children relationship
                class_ids = [s.class_id for s in parent.children if s.class_id]
                
        if class_ids:
            ann_query = Announcement.query.filter(
                (Announcement.class_id.in_(class_ids)) |
                (Announcement.recipients == 'all')
            )
            announcements = ann_query.order_by(Announcement.created_at.desc()).all()
            
            for a in announcements:
                notifications_list.append({
                    'id': a.id,
                    'user_id': user_id,
                    'title': a.title,
                    'message': a.content,
                    'type': 'announcement',
                    'priority': 'high',
                    'is_read': False,
                    'created_at': a.created_at,
                    'updated_at': a.updated_at
                })
                
        # Sort combined list by created_at desc
        notifications_list.sort(key=lambda x: x['created_at'] or datetime.min, reverse=True)
        
        # Paginate in memory
        total = len(notifications_list)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_list = notifications_list[start:end]
        
        # Return as Notification objects (or dicts)
        # Marshmallow schema expects objects/dicts with keys matching schema fields.
        # We can construct lightweight dummy objects for marshmallow compatibility
        class DummyNotification:
            def __init__(self, **entries):
                self.__dict__.update(entries)
                
        dummy_objects = [DummyNotification(**x) for x in paginated_list]
        return dummy_objects, total