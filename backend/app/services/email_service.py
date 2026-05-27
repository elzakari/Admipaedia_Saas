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
    Send an email using the active provider configured in the database, with fallback to environment configuration.
    
    Args:
        subject (str): Email subject
        recipients (list): List of recipient email addresses
        text_body (str): Plain text email body
        html_body (str, optional): HTML email body. Defaults to None.
        sender (str, optional): Sender email address override.
        attachments (list, optional): List of attachment tuples (filename, mimetype, data).
        provider (str, optional): Override the configured provider.
    
    Returns:
        EmailResult: An EmailResult dictionary containing the status, provider, and performance metrics.
    """
    from app.extensions import logger
    
    start_time = time.time()
    
    # 1. Check suppression setting
    try:
        supress_send = current_app.config.get('MAIL_SUPPRESS_SEND', False)
    except Exception:
        supress_send = False
        
    if supress_send:
        duration = int((time.time() - start_time) * 1000)
        logger.info("Email sending suppressed by configuration", subject=subject, recipients=recipients)
        return EmailResult(ok=True, provider="suppressed", message="Sending suppressed by configuration", message_id="", duration_ms=duration)

    # 2. Defaults from environment/config
    default_from = None
    default_name = "Admipaedia Support"
    try:
        default_from = current_app.config.get('EMAIL_FROM_ADDRESS') or current_app.config.get('MAIL_DEFAULT_SENDER') or current_app.config.get('MAIL_USERNAME')
        default_name = current_app.config.get('EMAIL_FROM_NAME', 'Admipaedia Support')
    except Exception:
        default_from = os.environ.get('EMAIL_FROM_ADDRESS') or os.environ.get('MAIL_DEFAULT_SENDER')
        default_name = os.environ.get('EMAIL_FROM_NAME', 'Admipaedia Support')

    selected_provider = (provider or os.environ.get('EMAIL_PROVIDER', 'smtp')).lower()
    cfg = {}

    # 3. Refactored Extraction Logic: Check decrypted database platform configurations
    try:
        from app.models.service_tokens import PlatformServiceProviderConfig, TenantServiceProviderOverride
        from flask import g
        
        db_provider = None
        # Try to resolve tenant-level override first if in a tenant context
        tenant_id = getattr(g, 'tenant_id', None)
        if tenant_id:
            db_provider = TenantServiceProviderOverride.query.filter_by(
                tenant_id=tenant_id, service_type='email', is_active=True
            ).first()
            
        # Fallback to platform-level provider config
        if not db_provider:
            from sqlalchemy import text
            from app.extensions import db
            query = text("SELECT id, service_type, provider_key, display_name, priority, is_active, config_encrypted FROM platform_service_provider_configs WHERE service_type = 'email' AND is_active = :is_active LIMIT 1")
            result = db.session.execute(query, {"is_active": True})
            db_provider = result.mappings().first()
            
        if db_provider:
            # Map database configuration parameters
            if hasattr(db_provider, 'get_config'):
                cfg = db_provider.get_config() or {}
                provider_key = db_provider.provider_key
            else:
                # db_provider is a row mapping or dict
                provider_key = db_provider.get('provider_key')
                config_encrypted = db_provider.get('config_encrypted')
                
                cfg = {}
                if config_encrypted:
                    try:
                        from flask import current_app
                        from app.utils.secret_crypto import decrypt_value
                        import json
                        secret = current_app.config.get('SECRET_KEY') or current_app.config.get('ENCRYPTION_KEY') or ''
                        salt = current_app.config.get('SECURITY_PASSWORD_SALT') or ''
                        decrypted_text = decrypt_value(config_encrypted, secret=secret, salt=salt)
                        if decrypted_text:
                            config_data = json.loads(decrypted_text)
                            if isinstance(config_data, dict):
                                cfg = config_data
                    except Exception as dec_err:
                        logger.warning(f"Failed to decrypt dynamic email config: {str(dec_err)}")
            
            selected_provider = (provider or provider_key or 'smtp').lower()
            logger.info("Retrieved active email integration settings from DB", provider_key=selected_provider)
    except Exception as e:
        logger.warning(f"Could not load email configuration from database, falling back to env/defaults: {str(e)}")

    # 4. Resolve sender address and formatted headers
    from_addr = sender or cfg.get('fromEmail') or cfg.get('from_email') or default_from or "support@admipaedia.easymsdigit.com"
    from_name = cfg.get('fromName') or cfg.get('from_name') or default_name
    
    if from_name and '<' not in from_addr:
        sender_formatted = f"{from_name} <{from_addr}>"
    else:
        sender_formatted = from_addr

    ok = False
    message = ""
    message_id = ""

    # 5. Dispatch inside explicit isolation blocks
    if selected_provider == 'ses_api':
        # Amazon SES API Integration Block (boto3)
        aws_region = cfg.get('awsRegion') or cfg.get('aws_region') or os.environ.get('AWS_REGION', 'us-east-1')
        aws_key = cfg.get('awsAccessKeyId') or cfg.get('aws_access_key') or os.environ.get('AWS_ACCESS_KEY_ID')
        aws_secret = cfg.get('awsSecretAccessKey') or cfg.get('aws_secret_key') or os.environ.get('AWS_SECRET_ACCESS_KEY')
        
        ok, message, message_id = _send_via_ses_api(
            subject=subject,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body,
            sender=sender_formatted,
            attachments=attachments,
            aws_region=aws_region,
            aws_access_key=aws_key,
            aws_secret_key=aws_secret
        )
    elif selected_provider == 'resend':
        # Resend API Integration Block (Official SDK)
        resend_key = cfg.get('apiKey') or cfg.get('api_key') or os.environ.get('RESEND_API_KEY')
        
        ok, message, message_id = _send_via_resend_api(
            subject=subject,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body,
            sender=sender_formatted,
            attachments=attachments,
            api_key=resend_key
        )
    else:
        # SMTP / Amazon SES SMTP Integration Block (decoupled smtplib client)
        db_smtp_host = None
        db_smtp_port = None
        db_smtp_user = None
        db_smtp_pass = None
        db_smtp_enc = None

        try:
            from app.extensions import db
            from app.models.system_setting import SystemSettings
            from app.models.service_tokens import PlatformServiceProviderConfig

            # Synchronize active platform provider config (email service type) to SystemSettings
            from sqlalchemy import text
            query = text("SELECT id, service_type, provider_key, display_name, priority, is_active, config_encrypted FROM platform_service_provider_configs WHERE service_type = 'email' AND is_active = :is_active LIMIT 1")
            result = db.session.execute(query, {"is_active": True})
            provider_config = result.mappings().first()

            settings = db.session.query(SystemSettings).first()
            if not settings:
                from flask import g
                import uuid
                active_tenant_id = getattr(g, 'tenant_id', None)
                if active_tenant_id and isinstance(active_tenant_id, str):
                    try:
                        active_tenant_id = uuid.UUID(active_tenant_id)
                    except ValueError:
                        pass
                settings = SystemSettings(id=1, tenant_id=active_tenant_id)
                db.session.add(settings)
                db.session.flush()

            if provider_config:
                p_cfg = {}
                if hasattr(provider_config, 'get_config'):
                    p_cfg = provider_config.get_config() or {}
                else:
                    config_encrypted = provider_config.get('config_encrypted')
                    if config_encrypted:
                        try:
                            from flask import current_app
                            from app.utils.secret_crypto import decrypt_value
                            import json
                            secret = current_app.config.get('SECRET_KEY') or current_app.config.get('ENCRYPTION_KEY') or ''
                            salt = current_app.config.get('SECURITY_PASSWORD_SALT') or ''
                            decrypted_text = decrypt_value(config_encrypted, secret=secret, salt=salt)
                            if decrypted_text:
                                config_data = json.loads(decrypted_text)
                                if isinstance(config_data, dict):
                                    p_cfg = config_data
                        except Exception as dec_err:
                            logger.warning(f"Failed to decrypt provider_config dynamic SMTP settings: {str(dec_err)}")

                settings.smtp_host = p_cfg.get('smtpHost') or p_cfg.get('smtp_host')
                settings.smtp_password = p_cfg.get('smtpPassword') or p_cfg.get('smtp_password')
                settings.smtp_username = p_cfg.get('smtpUsername') or p_cfg.get('smtp_username')
                settings.smtp_port = p_cfg.get('smtpPort') or p_cfg.get('smtp_port')
                settings.smtp_encryption = p_cfg.get('smtpEncryption') or p_cfg.get('smtp_encryption')
                db.session.commit()

            # Dynamic hydration from SystemSettings database record
            db_smtp_host = settings.smtp_host
            db_smtp_port = settings.smtp_port
            db_smtp_user = settings.smtp_username
            db_smtp_pass = settings.smtp_password
            db_smtp_enc = settings.smtp_encryption
        except Exception as e:
            logger.warning(f"Failed to query dynamic SystemSettings block: {str(e)}")

        smtp_host = cfg.get('smtpHost') or cfg.get('smtp_host') or db_smtp_host or os.environ.get('MAIL_SERVER', 'localhost')
        smtp_port = cfg.get('smtpPort') or cfg.get('smtp_port') or db_smtp_port
        smtp_user = cfg.get('smtpUsername') or cfg.get('smtp_username') or db_smtp_user or os.environ.get('MAIL_USERNAME')
        smtp_pass = cfg.get('smtpPassword') or cfg.get('smtp_password') or db_smtp_pass or os.environ.get('MAIL_PASSWORD')
        smtp_enc = cfg.get('smtpEncryption') or cfg.get('smtp_encryption') or db_smtp_enc or os.environ.get('MAIL_USE_TLS', 'tls')
        
        # Coerce port to int
        if smtp_port is None:
            smtp_port = os.environ.get('MAIL_PORT', 587)
            
        ok, message, message_id = _send_via_smtp_isolated(
            subject=subject,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body,
            sender=sender_formatted,
            attachments=attachments,
            host=str(smtp_host),
            port=smtp_port,
            username=str(smtp_user or ''),
            password=str(smtp_pass or ''),
            encryption=str(smtp_enc)
        )

        if not ok:
            fallback_provider = str(os.environ.get("FALLBACK_EMAIL_PROVIDER") or cfg.get('fallbackProvider') or cfg.get('fallback_provider') or '').strip().lower()
            if fallback_provider == 'resend':
                logger.warning(f"⚠️ Primary SMTP failed: {message}. Activating Resend fallback...")
                resend_key = cfg.get('apiKey') or cfg.get('api_key') or os.environ.get('RESEND_API_KEY')
                ok_fb, msg_fb, msg_id_fb = _send_via_resend_api(
                    subject=subject,
                    recipients=recipients,
                    text_body=text_body,
                    html_body=html_body,
                    sender=sender_formatted,
                    attachments=attachments,
                    api_key=resend_key
                )
                if ok_fb:
                    ok = True
                    message = f"Resend API fallback succeeded. (Primary failure: {message})"
                    message_id = msg_id_fb
                    selected_provider = 'resend'
                else:
                    message = f"Primary SMTP failed ({message}) and Resend fallback failed ({msg_fb})"


    duration = int((time.time() - start_time) * 1000)
    
    # 6. Log results defensively
    if ok:
        logger.info("Polymorphic email sent successfully", provider=selected_provider, subject=subject, duration_ms=duration)
    else:
        logger.error("Failed to send polymorphic email", provider=selected_provider, error=message, subject=subject, duration_ms=duration)

    return EmailResult(
        ok=ok,
        provider=selected_provider,
        message=message,
        message_id=message_id,
        duration_ms=duration
    )


def _send_via_ses_api(subject: str, recipients: List[str], text_body: str, html_body: Optional[str], sender: str, attachments: Optional[List[Tuple[str, str, bytes]]], aws_region: Optional[str], aws_access_key: Optional[str], aws_secret_key: Optional[str]) -> Tuple[bool, str, str]:
    """Decoupled Amazon SES client block using native boto3."""
    try:
        import boto3
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.application import MIMEApplication
        
        if not aws_access_key or not aws_secret_key:
            return False, "Amazon SES credentials are missing", ""

        region = aws_region or 'us-east-1'
        
        try:
            client = boto3.client(
                'sesv2',
                region_name=region,
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            use_v2 = True
        except Exception:
            client = boto3.client(
                'ses',
                region_name=region,
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            use_v2 = False

        if attachments or not use_v2:
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


def _send_via_resend_api(subject: str, recipients: List[str], text_body: str, html_body: Optional[str], sender: str, attachments: Optional[List[Tuple[str, str, bytes]]], api_key: Optional[str]) -> Tuple[bool, str, str]:
    """Decoupled Resend client block using the resend package."""
    try:
        import resend
        
        if not api_key:
            return False, "Resend API Key is missing", ""
            
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


def _send_via_smtp_isolated(subject: str, recipients: List[str], text_body: str, html_body: Optional[str], sender: str, attachments: Optional[List[Tuple[str, str, bytes]]], host: str, port: Any, username: str, password: str, encryption: str) -> Tuple[bool, str, str]:
    """Decoupled smtplib client block, fully isolated from Flask-Mail application states."""
    import smtplib
    import ssl
    import socket
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.application import MIMEApplication
    
    if not host:
        return False, "SMTP host is required", ""
        
    try:
        port = int(port)
    except Exception:
        return False, f"Invalid SMTP port: {port}", ""
        
    context = ssl.create_default_context()
    server = None
    
    try:
        timeout = 15
        if port in (587, 2587):
            server = smtplib.SMTP(host=host, port=port, timeout=timeout)
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
        elif port == 465:
            server = smtplib.SMTP_SSL(host=host, port=port, timeout=timeout, context=context)
            server.ehlo()
        else:
            if str(encryption).lower() in ('ssl', 'true'):
                server = smtplib.SMTP_SSL(host=host, port=port, timeout=timeout, context=context)
                server.ehlo()
            else:
                server = smtplib.SMTP(host=host, port=port, timeout=timeout)
                server.ehlo()
                if str(encryption).lower() in ('tls', 'starttls'):
                    server.starttls(context=context)
                    server.ehlo()
                    
        if username and password and password != '********':
            server.login(username, password)
            
        # Build Standard MIME Message
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
                
        server.send_message(msg)
        return True, "SMTP send succeeded", ""
    except Exception as e:
        return False, f"SMTP send failed: {str(e)}", ""
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass


def _send_email_background(subject: str, recipients: List[str], text_body: str, html_body: Optional[str] = None, sender: Optional[str] = None, attachments: Optional[List[Tuple[str, str, bytes]]] = None) -> bool:
    """Asynchronous background thread wrapper for send_email."""
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


def send_student_activation_email(parent_email: str, student_username: str, activation_token: str, frontend_url: Optional[str] = None) -> bool:
    """Send a transactional email to the parent with student credentials and password reset link."""
    base = _normalize_frontend_url(frontend_url)
    activation_url = f"{base}/reset-password?token={activation_token}"
    
    subject = "ADMIPAEDIA - Student Account Activation"
    text_body = (
        f"Hello,\n\n"
        f"Your child's student profile has been approved and activated!\n"
        f"Here are the student credentials:\n\n"
        f"Username: {student_username}\n"
        f"Activation Link: {activation_url}\n\n"
        f"Please click the link above to configure the student password."
    )
    html_body = f"""
    <p>Hello,</p>
    <p>Your child's student profile has been approved and activated!</p>
    <p>Here are the student credentials:</p>
    <ul>
        <li><strong>Username:</strong> {student_username}</li>
    </ul>
    <p><a href="{activation_url}">Configure Student Password & Activate Account</a></p>
    <p>Please use the link above to configure the student password.</p>
    """
    result = send_email(subject=subject, recipients=[parent_email], text_body=text_body, html_body=html_body)
    return bool(result)
