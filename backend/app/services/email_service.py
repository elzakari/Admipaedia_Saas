import threading
import time
import os
from typing import Optional, List, Tuple, Dict, Any
from flask import current_app, render_template

class EmailResult(dict):
    """
    Custom dictionary subclass that behaves like a dictionary but supports
    natural boolean context evaluation (truthy/falsy) based on 'ok' status,
    maintaining 100% backward compatibility with legacy boolean assertions.
    """
    def __bool__(self) -> bool:
        return bool(self.get('ok', False))
    
    def __eq__(self, other) -> bool:
        if isinstance(other, bool):
            return bool(self) == other
        return super().__eq__(other)

def send_email(subject: str, recipients: List[str], text_body: str, html_body: Optional[str] = None, sender: Optional[str] = None, attachments: Optional[List[Tuple[str, str, bytes]]] = None, provider: Optional[str] = None) -> EmailResult:
    """
    Send an email using the configured provider (Amazon SES API, SMTP, or Resend).
    
    Args:
        subject (str): Email subject
        recipients (list): List of recipient email addresses
        text_body (str): Plain text email body
        html_body (str, optional): HTML email body. Defaults to None.
        sender (str, optional): Sender email address.
        attachments (list, optional): List of attachment tuples (filename, mimetype, data).
        provider (str, optional): Override the configured provider.
    
    Returns:
        EmailResult: An EmailResult dictionary containing the status, provider, and performance metrics.
    """
    from app.extensions import logger
    
    start_time = time.time()
    
    # 1. Determine configuration variables
    try:
        supress_send = current_app.config.get('MAIL_SUPPRESS_SEND', False)
    except Exception:
        supress_send = False
        
    if supress_send:
        duration = int((time.time() - start_time) * 1000)
        logger.info("Email sending suppressed by configuration", subject=subject, recipients=recipients)
        return EmailResult(ok=True, provider="suppressed", message="Sending suppressed by configuration", message_id="", duration_ms=duration)

    try:
        cfg_provider = current_app.config.get('EMAIL_PROVIDER', 'smtp')
        aws_region = current_app.config.get('AWS_REGION', 'us-east-1')
        aws_access_key = current_app.config.get('AWS_ACCESS_KEY_ID')
        aws_secret_key = current_app.config.get('AWS_SECRET_ACCESS_KEY')
        resend_api_key = current_app.config.get('RESEND_API_KEY')
        
        default_from = current_app.config.get('EMAIL_FROM_ADDRESS') or current_app.config.get('MAIL_DEFAULT_SENDER') or current_app.config.get('MAIL_USERNAME')
        from_name = current_app.config.get('EMAIL_FROM_NAME', 'Admipaedia Support')
    except Exception as e:
        cfg_provider = os.environ.get('EMAIL_PROVIDER', 'smtp')
        aws_region = os.environ.get('AWS_REGION', 'us-east-1')
        aws_access_key = os.environ.get('AWS_ACCESS_KEY_ID')
        aws_secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
        resend_api_key = os.environ.get('RESEND_API_KEY')
        default_from = os.environ.get('EMAIL_FROM_ADDRESS') or os.environ.get('MAIL_DEFAULT_SENDER')
        from_name = os.environ.get('EMAIL_FROM_NAME', 'Admipaedia Support')

    selected_provider = (provider or cfg_provider or 'smtp').lower()
    
    # Clean and format from address
    from_addr = sender or default_from
    if not from_addr:
        from_addr = "support@admipaedia.easymsdigit.com"
        
    if from_name and '<' not in from_addr:
        sender_formatted = f"{from_name} <{from_addr}>"
    else:
        sender_formatted = from_addr

    ok = False
    message = ""
    message_id = ""

    # 2. Dispatch to the appropriate handler
    if selected_provider == 'ses':
        ok, message, message_id = _send_via_ses(
            subject=subject,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body,
            sender=sender_formatted,
            attachments=attachments,
            aws_region=aws_region,
            aws_access_key=aws_access_key,
            aws_secret_key=aws_secret_key
        )
    elif selected_provider == 'resend':
        ok, message, message_id = _send_via_resend(
            subject=subject,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body,
            sender=sender_formatted,
            attachments=attachments,
            api_key=resend_api_key
        )
    else:
        # Default fallback to SMTP
        ok, message, message_id = _send_via_smtp(
            subject=subject,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body,
            sender=sender_formatted,
            attachments=attachments
        )

    duration = int((time.time() - start_time) * 1000)
    
    # 3. Log results defensively (never logging raw secrets!)
    if ok:
        logger.info("Email sent successfully", provider=selected_provider, subject=subject, recipients=recipients, duration_ms=duration)
    else:
        logger.error("Failed to send email", provider=selected_provider, error=message, subject=subject, recipients=recipients, duration_ms=duration)

    return EmailResult(
        ok=ok,
        provider=selected_provider,
        message=message,
        message_id=message_id,
        duration_ms=duration
    )


def _send_via_ses(subject: str, recipients: List[str], text_body: str, html_body: Optional[str], sender: str, attachments: Optional[List[Tuple[str, str, bytes]]], aws_region: str, aws_access_key: str, aws_secret_key: str) -> Tuple[bool, str, str]:
    """Helper to send email via Amazon SES HTTPS API using boto3."""
    try:
        import boto3
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.application import MIMEApplication
        
        if not aws_access_key or not aws_secret_key:
            return False, "Amazon SES credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are missing", ""

        # Initialize Amazon SES Client (trying SES v2 first, falling back to v1)
        try:
            client = boto3.client(
                'sesv2',
                region_name=aws_region or 'us-east-1',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            use_v2 = True
        except Exception:
            client = boto3.client(
                'ses',
                region_name=aws_region or 'us-east-1',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            use_v2 = False

        if attachments or use_v2 is False:
            # Build standard MIME raw message
            msg = MIMEMultipart('mixed')
            msg['Subject'] = subject
            msg['From'] = sender
            msg['To'] = ", ".join(recipients)
            
            msg_body = MIMEMultipart('alternative')
            msg_body.attach(MIMEText(text_body, 'plain', 'utf-8'))
            if html_body:
                msg_body.attach(MIMEText(html_body, 'html', 'utf-8'))
            msg.attach(msg_body)
            
            if attachments:
                for filename, mimetype, data in attachments:
                    att = MIMEApplication(data)
                    att.add_header('Content-Disposition', 'attachment', filename=filename)
                    msg.attach(att)
                    
            raw_payload = msg.as_string()
            
            if use_v2:
                response = client.send_email(
                    Content={'Raw': {'Data': raw_payload.encode('utf-8')}}
                )
            else:
                response = client.send_raw_email(
                    Source=sender,
                    Destinations=recipients,
                    RawMessage={'Data': raw_payload.encode('utf-8')}
                )
        else:
            # Simple content structure for SES v2 API
            simple_content = {
                'Simple': {
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': {
                        'Text': {'Data': text_body, 'Charset': 'UTF-8'}
                    }
                }
            }
            if html_body:
                simple_content['Simple']['Body']['Html'] = {'Data': html_body, 'Charset': 'UTF-8'}
                
            response = client.send_email(
                FromEmailAddress=sender,
                Destination={'ToAddresses': recipients},
                Content=simple_content
            )

        message_id = response.get('MessageId', '')
        return True, "Amazon SES API send succeeded", message_id

    except Exception as e:
        return False, f"Amazon SES API failed: {str(e)}", ""


def _send_via_resend(subject: str, recipients: List[str], text_body: str, html_body: Optional[str], sender: str, attachments: Optional[List[Tuple[str, str, bytes]]], api_key: str) -> Tuple[bool, str, str]:
    """Helper to send email via Resend API using the official resend package."""
    try:
        import resend
        
        if not api_key:
            return False, "Resend API Key (RESEND_API_KEY) is missing", ""
            
        resend.api_key = api_key
        
        params = {
            "from": sender,
            "to": recipients,
            "subject": subject,
            "text": text_body
        }
        if html_body:
            params["html"] = html_body
            
        if attachments:
            params["attachments"] = []
            for filename, mimetype, data in attachments:
                params["attachments"].append({
                    "filename": filename,
                    "content": list(data) if isinstance(data, (bytes, bytearray)) else data
                })
                
        r = resend.Emails.send(params)
        message_id = getattr(r, "id", "") or r.get("id", "")
        return True, "Resend API send succeeded", message_id

    except Exception as e:
        return False, f"Resend API failed: {str(e)}", ""


def _send_via_smtp(subject: str, recipients: List[str], text_body: str, html_body: Optional[str], sender: str, attachments: Optional[List[Tuple[str, str, bytes]]]) -> Tuple[bool, str, str]:
    """Helper to send email via standard legacy SMTP protocol using flask-mail."""
    try:
        from app.extensions import mail
        from flask_mail import Message
        
        msg = Message(subject, sender=sender, recipients=recipients)
        msg.body = text_body
        if html_body:
            msg.html = html_body
            
        if attachments:
            for filename, mimetype, data in attachments:
                msg.attach(filename=filename, content_type=mimetype, data=data)
                
        mail.send(msg)
        return True, "SMTP send succeeded", ""
    except Exception as e:
        return False, f"SMTP failed: {str(e)}", ""


def _send_email_background(subject: str, recipients: List[str], text_body: str, html_body: Optional[str] = None, sender: Optional[str] = None, attachments: Optional[List[Tuple[str, str, bytes]]] = None) -> bool:
    """Asynchronous background dispatcher for email sending."""
    try:
        app = current_app._get_current_object()
    except Exception:
        return False

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


def _normalize_frontend_url(frontend_url: Optional[str]) -> str:
    url = (frontend_url or current_app.config.get('FRONTEND_URL') or '').strip().rstrip('/')
    if not url:
        url = 'http://localhost:3000'
    if 'localhost:5173' in url:
        url = url.replace('localhost:5173', 'localhost:3000')
    return url.rstrip('/')


def send_notification_email(user_email: str, subject: str, message: str) -> bool:
    """Send a notification email to a user."""
    text_body = message
    html_body = f"<p>{message}</p>"
    result = send_email(
        subject=subject,
        recipients=[user_email],
        text_body=text_body,
        html_body=html_body
    )
    return bool(result)


def send_password_reset_email(user_email: str, reset_token: str, frontend_url: Optional[str] = None, async_send: bool = False) -> bool:
    """Send a password reset email containing a secure token link."""
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

    result = send_email(subject=subject, recipients=[user_email], text_body=text_body, html_body=html_body)
    return bool(result)


def send_school_registration_email(user_email: str, registration_url: str, school_name: Optional[str] = None, expires_at: Optional[str] = None, async_send: bool = False) -> bool:
    """Send a registration invite email to setup a new school profile."""
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

    result = send_email(subject=subject, recipients=[user_email], text_body=text_body, html_body=html_body)
    return bool(result)
