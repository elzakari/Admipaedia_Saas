import smtplib
from email.mime.text import MIMEText
import os
import logging

logger = logging.getLogger(__name__)

def send_via_resend_api(recipient, subject, html_content):
    """Seamless Resend API fallback dispatch."""
    try:
        import resend
        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            logger.error("❌ Resend API key is missing.")
            return {"success": False, "error": "Resend API key is missing."}
        
        resend.api_key = api_key
        sender = os.getenv("SMTP_FROM", "no-reply@easymsdigit.com")
        
        r = resend.Emails.send({
            "from": sender,
            "to": [recipient],
            "subject": subject,
            "html": html_content
        })
        msg_id = getattr(r, "id", "") or r.get("id", "")
        logger.info(f"🚀 Email successfully sent to {recipient} via Resend API fallback. ID: {msg_id}")
        return {"success": True, "provider": "resend", "message_id": msg_id}
    except Exception as e:
        logger.error(f"❌ Resend API fallback failed: {str(e)}")
        return {"success": False, "error": str(e)}

def send_transactional_email(recipient, subject, html_content):
    """Send transactional email with automatic failover support."""
    provider = os.getenv("EMAIL_PROVIDER", "aws_ses")
    
    if provider == "aws_ses":
        try:
            # 1. Attempt Primary Outbound Route via AWS SES SMTP
            msg = MIMEText(html_content, 'html')
            msg['Subject'] = subject
            msg['From'] = os.getenv("SMTP_FROM", "no-reply@easymsdigit.com")
            msg['To'] = recipient

            with smtplib.SMTP(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT", 587))) as server:
                server.starttls() # Secure connection over 587
                server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
                server.send_message(msg)
            logger.info(f"🚀 Email successfully sent to {recipient} via AWS SES SMTP.")
            return {"success": True, "provider": "aws_ses"}
            
        except Exception as ses_error:
            logger.warning(f"⚠️ Primary AWS SES SMTP failed: {ses_error}. Activating Resend fallback...")
            
            # 2. Seamless Failover to Resend API
            if os.getenv("FALLBACK_EMAIL_PROVIDER") == "resend":
                return send_via_resend_api(recipient, subject, html_content)
            raise ses_error
    elif provider == "resend":
        return send_via_resend_api(recipient, subject, html_content)
    else:
        # Fallback to general SMTP or other configured providers
        try:
            msg = MIMEText(html_content, 'html')
            msg['Subject'] = subject
            msg['From'] = os.getenv("SMTP_FROM", "no-reply@easymsdigit.com")
            msg['To'] = recipient

            with smtplib.SMTP(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT", 587))) as server:
                server.starttls()
                server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
                server.send_message(msg)
            logger.info(f"🚀 Email successfully sent to {recipient} via {provider} SMTP.")
            return {"success": True, "provider": provider}
        except Exception as e:
            logger.warning(f"⚠️ Primary SMTP failed: {e}. Checking fallback...")
            if os.getenv("FALLBACK_EMAIL_PROVIDER") == "resend":
                return send_via_resend_api(recipient, subject, html_content)
            raise e
