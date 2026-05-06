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

def send_password_reset_email(user_email, reset_token):
    """
    Send a password reset email with a reset token
    
    Args:
        user_email (str): User's email address
        reset_token (str): Password reset token
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    reset_url = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token={reset_token}"
    
    subject = "ADMIPAEDIA - Password Reset Request"
    text_body = f"Please use the following link to reset your password: {reset_url}\n\nIf you did not request a password reset, please ignore this email."
    html_body = f"""
    <p>Please use the following link to reset your password:</p>
    <p><a href="{reset_url}">Reset Password</a></p>
    <p>If you did not request a password reset, please ignore this email.</p>
    """
    
    return send_email(
        subject=subject,
        recipients=[user_email],
        text_body=text_body,
        html_body=html_body
    )