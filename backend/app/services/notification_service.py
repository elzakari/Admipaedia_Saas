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