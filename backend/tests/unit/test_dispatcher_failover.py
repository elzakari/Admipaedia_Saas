import os
import unittest
from unittest.mock import patch, MagicMock
from app.services.mail.dispatcher import send_transactional_email

class TestDispatcherFailover(unittest.TestCase):
    def test_send_transactional_email_aws_ses_success(self):
        """Test that AWS SES SMTP is used when EMAIL_PROVIDER is set to aws_ses and succeeds."""
        test_env = {
            'EMAIL_PROVIDER': 'aws_ses',
            'SMTP_HOST': 'smtp.aws-ses.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'ses-user',
            'SMTP_PASSWORD': 'ses-password',
            'SMTP_FROM': 'no-reply@easymsdigit.com'
        }
        with patch.dict(os.environ, test_env):
            with patch('smtplib.SMTP') as mock_smtp:
                mock_server = MagicMock()
                mock_smtp.return_value.__enter__.return_value = mock_server
                
                res = send_transactional_email(
                    recipient="recipient@example.com",
                    subject="Test AWS SES",
                    html_content="<p>Hello AWS SES</p>"
                )
                
                assert res["success"] is True
                assert res["provider"] == "aws_ses"
                mock_smtp.assert_called_once_with('smtp.aws-ses.com', 587)
                mock_server.starttls.assert_called_once()
                mock_server.login.assert_called_once_with('ses-user', 'ses-password')
                mock_server.send_message.assert_called_once()

    def test_send_transactional_email_failover_to_resend(self):
        """Test that AWS SES SMTP failures automatically failover to Resend API when fallback is configured."""
        test_env = {
            'EMAIL_PROVIDER': 'aws_ses',
            'SMTP_HOST': 'smtp.aws-ses.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'ses-user',
            'SMTP_PASSWORD': 'ses-password',
            'FALLBACK_EMAIL_PROVIDER': 'resend',
            'RESEND_API_KEY': 're_123456789'
        }
        with patch.dict(os.environ, test_env):
            with patch('smtplib.SMTP') as mock_smtp, \
                 patch('resend.Emails.send') as mock_resend_send:
                
                # Mock SMTP to throw an exception
                mock_smtp.side_effect = Exception("SMTP Connection Refused")
                
                # Mock Resend API response
                mock_resend_response = MagicMock()
                mock_resend_response.id = "msg-resend-999"
                mock_resend_send.return_value = mock_resend_response
                
                res = send_transactional_email(
                    recipient="recipient@example.com",
                    subject="Test Failover",
                    html_content="<p>Hello Failover</p>"
                )
                
                assert res["success"] is True
                assert res["provider"] == "resend"
                assert res["message_id"] == "msg-resend-999"
                
                mock_resend_send.assert_called_once_with({
                    "from": "no-reply@easymsdigit.com",
                    "to": ["recipient@example.com"],
                    "subject": "Test Failover",
                    "html": "<p>Hello Failover</p>"
                })

    def test_send_transactional_email_fallback_disabled_raises(self):
        """Test that SMTP failures raise exception if Resend fallback is not configured."""
        test_env = {
            'EMAIL_PROVIDER': 'aws_ses',
            'SMTP_HOST': 'smtp.aws-ses.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'ses-user',
            'SMTP_PASSWORD': 'ses-password',
            'FALLBACK_EMAIL_PROVIDER': 'none'
        }
        with patch.dict(os.environ, test_env):
            with patch('smtplib.SMTP') as mock_smtp:
                mock_smtp.side_effect = Exception("SMTP Fatal Failure")
                
                with self.assertRaises(Exception) as context:
                    send_transactional_email(
                        recipient="recipient@example.com",
                        subject="Test Fail",
                        html_content="<p>Hello Fail</p>"
                    )
                
                self.assertIn("SMTP Fatal Failure", str(context.exception))
