import threading
from typing import Optional
from flask import current_app, render_template
from flask_mail import Message
from app.extensions import mail, logger

def send_email(subject, recipients, text_body, html_body=None, sender=None, attachments=None):
    """
    Send an email using Flask-Mail
    
    Args:
        subject (str): Email subject
        recipients (list): List of recipient email addresses
        text_body (str): Plain text email body
        html_body (str, optional): HTML email body. Defaults to None.
        sender (str, optional): Sender email address. Defaults to configured MAIL_DEFAULT_SENDER.
        attachments (list, optional): List of attachment tuples (filename, mimetype, data). Defaults to None.
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        if current_app.config.get('MAIL_SUPPRESS_SEND'):
            logger.info("Email sending suppressed by configuration", subject=subject, recipients=recipients)
            return True

        if not sender:
            sender = current_app.config.get('MAIL_DEFAULT_SENDER', current_app.config.get('MAIL_USERNAME'))
        
        msg = Message(subject, sender=sender, recipients=recipients)
        msg.body = text_body
        
        if html_body:
            msg.html = html_body
            
        if attachments:
            for attachment in attachments:
                filename, mimetype, data = attachment
                msg.attach(filename=filename, content_type=mimetype, data=data)
                
        mail.send(msg)
        logger.info("Email sent", subject=subject, recipients=recipients)
        return True
    except Exception as e:
        logger.error("Failed to send email", error=str(e), subject=subject, recipients=recipients)
        return False


def _send_email_background(subject, recipients, text_body, html_body=None, sender=None, attachments=None):
    try:
        app = current_app._get_current_object()
    except Exception:
        return False

    if app.config.get('MAIL_SUPPRESS_SEND'):
        logger.info("Email sending suppressed by configuration", subject=subject, recipients=recipients)
        return True

    def _run():
        with app.app_context():
            send_email(
                subject=subject,
                recipients=recipients,
                text_body=text_body,
                html_body=html_body,
                sender=sender,
                attachments=attachments
            )

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return True


def _normalize_frontend_url(frontend_url: Optional[str]):
    url = (frontend_url or current_app.config.get('FRONTEND_URL') or '').strip().rstrip('/')
    if not url:
        url = 'http://localhost:3000'
    if 'localhost:5173' in url:
        url = url.replace('localhost:5173', 'localhost:3000')
    return url.rstrip('/')

def send_notification_email(user_email, subject, message):
    """
    Send a notification email to a user
    
    Args:
        user_email (str): Recipient email address
        subject (str): Email subject
        message (str): Email message
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    text_body = message
    html_body = f"<p>{message}</p>"
    
    return send_email(
        subject=subject,
        recipients=[user_email],
        text_body=text_body,
        html_body=html_body
    )

def send_password_reset_email(user_email, reset_token, frontend_url=None, async_send=False):
    """
    Send a password reset email with a reset token
    
    Args:
        user_email (str): User's email address
        reset_token (str): Password reset token
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    base = _normalize_frontend_url(frontend_url)
    reset_url = f"{base}/reset-password?token={reset_token}"
    
    subject = "ADMIPAEDIA - Password Reset Request"
    text_body = f"Please use the following link to reset your password: {reset_url}\n\nIf you did not request a password reset, please ignore this email."
    html_body = f"""
    <p>Please use the following link to reset your password:</p>
    <p><a href="{reset_url}">Reset Password</a></p>
    <p>If you did not request a password reset, please ignore this email.</p>
    """
    
    if async_send:
        return _send_email_background(
            subject=subject,
            recipients=[user_email],
            text_body=text_body,
            html_body=html_body
        )

    return send_email(subject=subject, recipients=[user_email], text_body=text_body, html_body=html_body)


def send_school_registration_email(user_email, registration_url, school_name=None, expires_at=None, async_send=False):
    base_subject = "ADMIPAEDIA - School Registration Link"
    subject = base_subject if not school_name else f"{base_subject} ({school_name})"

    expires_line = ''
    if expires_at:
        expires_line = f"\n\nThis link expires on: {expires_at}"

    text_body = (
        f"You have been invited to set up a school on ADMIPAEDIA.\n\n"
        f"Use this secure link to complete registration:\n{registration_url}"
        f"{expires_line}\n\n"
        f"If you did not expect this email, please ignore it."
    )

    html_body = f"""
    <p>You have been invited to set up a school on ADMIPAEDIA.</p>
    <p><a href="{registration_url}">Complete school registration</a></p>
    {f"<p><strong>Expires on:</strong> {expires_at}</p>" if expires_at else ""}
    <p>If you did not expect this email, please ignore it.</p>
    """

    if async_send:
        return _send_email_background(
            subject=subject,
            recipients=[user_email],
            text_body=text_body,
            html_body=html_body
        )

    return send_email(subject=subject, recipients=[user_email], text_body=text_body, html_body=html_body)
