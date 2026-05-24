import os
import unittest
from unittest.mock import patch, MagicMock
from app.extensions import db
from app.models.system_setting import SystemSettings
from app.models.service_tokens import PlatformServiceProviderConfig
from app.services.email_service import send_email

def test_email_service_env_fallback(app):
    """
    Test that when there is no platform configuration in the database,
    the email engine falls back to environment variable values.
    """
    with app.app_context():
        # Temporarily disable suppression for testing SMTP flow
        app.config['MAIL_SUPPRESS_SEND'] = False

        # Clear database configs first
        db.session.query(SystemSettings).delete()
        db.session.query(PlatformServiceProviderConfig).delete()
        db.session.commit()

        # Set environment variables for testing fallbacks
        test_env = {
            'MAIL_SERVER': 'smtp.fallback-env.com',
            'MAIL_PORT': '465',
            'MAIL_USERNAME': 'env-user@fallback.com',
            'MAIL_PASSWORD': 'env-password-secure',
            'MAIL_USE_TLS': 'ssl'
        }

        with patch.dict(os.environ, test_env):
            with patch('app.services.email_service._send_via_smtp_isolated') as mock_send:
                mock_send.return_value = (True, "Sent", "msg-123")
                
                send_email(
                    subject="Fallback Test",
                    recipients=["test@example.com"],
                    text_body="Testing environment fallback routes.",
                    provider="smtp"
                )
                
                # Check that the mock send was called with environment fallback credentials
                args, kwargs = mock_send.call_args
                assert kwargs['host'] == 'smtp.fallback-env.com'
                assert int(kwargs['port']) == 465
                assert kwargs['username'] == 'env-user@fallback.com'
                assert kwargs['password'] == 'env-password-secure'
                assert kwargs['encryption'] == 'ssl'


def test_email_service_dynamic_db_hydration(app):
    """
    Test that when active PlatformServiceProviderConfig SMTP credentials are saved
    in the database, they dynamically synchronize and hydrate SystemSettings,
    and the mail service utilizes them instead of the env variables.
    """
    with app.app_context():
        # Temporarily disable suppression for testing SMTP flow
        app.config['MAIL_SUPPRESS_SEND'] = False

        # Clear configs first
        db.session.query(SystemSettings).delete()
        db.session.query(PlatformServiceProviderConfig).delete()
        db.session.commit()

        # Insert active PlatformServiceProviderConfig record
        provider_cfg = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Admin SES SMTP',
            is_active=True
        )
        provider_cfg.set_config({
            'smtpHost': 'smtp.dynamic-database.com',
            'smtpPort': 587,
            'smtpUsername': 'db-admin-user',
            'smtpPassword': 'db-admin-password-super-secret',
            'smtpEncryption': 'tls'
        })
        db.session.add(provider_cfg)
        db.session.commit()

        # Ensure environment has different values so we can assert DB override
        test_env = {
            'MAIL_SERVER': 'smtp.should-not-use-env.com',
            'MAIL_PORT': '25',
            'MAIL_USERNAME': 'wrong-user',
            'MAIL_PASSWORD': 'wrong-password',
            'MAIL_USE_TLS': 'none'
        }

        with patch.dict(os.environ, test_env):
            with patch('app.services.email_service._send_via_smtp_isolated') as mock_send:
                mock_send.return_value = (True, "Sent from DB settings", "msg-db-789")
                
                send_email(
                    subject="Database settings Test",
                    recipients=["test@example.com"],
                    text_body="Testing dynamic settings hydration.",
                    provider="smtp"
                )
                
                # Check that dynamic db values override env variables
                args, kwargs = mock_send.call_args
                assert kwargs['host'] == 'smtp.dynamic-database.com'
                assert int(kwargs['port']) == 587
                assert kwargs['username'] == 'db-admin-user'
                assert kwargs['password'] == 'db-admin-password-super-secret'
                assert kwargs['encryption'] == 'tls'

                # Double check SystemSettings model database state directly
                settings = db.session.query(SystemSettings).first()
                assert settings is not None
                assert settings.smtp_host == 'smtp.dynamic-database.com'
                assert settings.smtp_username == 'db-admin-user'
                assert settings.smtp_password == 'db-admin-password-super-secret'


def test_email_service_raw_tuple_hydration(app):
    """
    Test that when the email service database query returns a raw database tuple/mapping,
    the polymorphic email engine successfully parses the fields defensively and resolves them.
    """
    with app.app_context():
        app.config['MAIL_SUPPRESS_SEND'] = False
        
        # Clear configs first
        db.session.query(SystemSettings).delete()
        db.session.query(PlatformServiceProviderConfig).delete()
        db.session.commit()

        # Let's craft an encrypted config payload using the model helper
        temp_model = PlatformServiceProviderConfig()
        temp_model.set_config({
            'smtpHost': 'smtp.tuple-raw.com',
            'smtpPort': 465,
            'smtpUsername': 'tuple-raw-user',
            'smtpPassword': 'tuple-raw-password',
            'smtpEncryption': 'ssl'
        })
        enc_payload = temp_model.config_encrypted

        # Standard raw database tuple: (id, service_type, provider_key, display_name, priority, is_active, config_encrypted, created_at, updated_at)
        mock_mapping = {
            'id': 999,
            'service_type': 'email',
            'provider_key': 'smtp',
            'display_name': 'Raw Mapped Provider',
            'priority': 100,
            'is_active': True,
            'config_encrypted': enc_payload
        }

        with patch('app.extensions.db.session.execute') as mock_execute:
            # mock_execute().mappings().first() returns the mock_mapping
            mock_execute.return_value.mappings.return_value.first.return_value = mock_mapping
            
            with patch('app.services.email_service._send_via_smtp_isolated') as mock_send:
                mock_send.return_value = (True, "Sent", "msg-tuple-101")
                
                send_email(
                    subject="Tuple Test",
                    recipients=["test@example.com"],
                    text_body="Testing polymorphic tuple query.",
                    provider="smtp"
                )
                
                # Check that dynamic db values from raw tuple override environmental defaults
                args, kwargs = mock_send.call_args
                assert kwargs['host'] == 'smtp.tuple-raw.com'
                assert int(kwargs['port']) == 465
                assert kwargs['username'] == 'tuple-raw-user'
                assert kwargs['password'] == 'tuple-raw-password'
                assert kwargs['encryption'] == 'ssl'


def test_email_integration_check_resend_guard(app):
    """
    Test that when EMAIL_PROVIDER environment variable is set to 'resend',
    the test_provider_config endpoint bypasses other checks and immediately returns
    success with the resend_api provider_key.
    """
    import json
    
    with app.app_context():
        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request') as mock_jwt, \
             patch('app.utils.platform_access.get_current_user') as mock_user, \
             patch.dict(os.environ, {'EMAIL_PROVIDER': 'resend'}):
            
            mock_user.return_value = MagicMock(role='super_admin')
            
            with app.test_client() as client:
                response = client.post(
                    '/api/v1/platform/integrations/providers/test',
                    json={
                        'service_type': 'email',
                        'provider_key': 'smtp'
                    }
                )
                assert response.status_code == 200
                res_data = json.loads(response.data)
                
                # Check direct guard dictionary values
                assert res_data['ok'] is True
                assert res_data['provider_key'] == 'resend_api'
                assert res_data['message'] == 'Resend API connection ready.'
                
                # Check standard UI-compatible nested format too
                assert res_data['success'] is True
                assert res_data['result']['ok'] is True
                assert res_data['result']['provider_key'] == 'resend_api'
                assert res_data['result']['message'] == 'Resend API connection ready.'


def test_email_service_fallback_to_resend(app):
    """
    Test that when the dynamic database SMTP provider fails,
    and FALLBACK_EMAIL_PROVIDER env var is set to 'resend',
    the email service automatically fails over to the Resend API.
    """
    with app.app_context():
        # Clear database configs first
        db.session.query(SystemSettings).delete()
        db.session.query(PlatformServiceProviderConfig).delete()
        db.session.commit()

        # Insert active PlatformServiceProviderConfig SMTP record
        provider_cfg = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Primary AWS SES SMTP',
            is_active=True
        )
        provider_cfg.set_config({
            'smtpHost': 'smtp.fail-primary.com',
            'smtpPort': 587,
            'smtpUsername': 'db-ses-user',
            'smtpPassword': 'db-ses-password',
            'smtpEncryption': 'tls',
            'apiKey': 'resend_test_placeholder_token',  # gitleaks:allow
            'fromEmail': 'no-reply@easymsdigit.com'
        })
        db.session.add(provider_cfg)
        db.session.commit()

        test_env = {
            'FALLBACK_EMAIL_PROVIDER': 'resend',
            'RESEND_API_KEY': 'resend_test_placeholder_token'  # gitleaks:allow
        }

        with patch.dict(os.environ, test_env):
            # SMTP isolated throws failure
            with patch('app.services.email_service._send_via_smtp_isolated') as mock_smtp, \
                 patch('app.services.email_service._send_via_resend_api') as mock_resend:
                
                mock_smtp.return_value = (False, "SMTP Timeout or Refusal", "")
                mock_resend.return_value = (True, "Sent successfully via Resend API", "resend-msg-12345")
                
                result = send_email(
                    subject="Failover Test",
                    recipients=["recipient@example.com"],
                    text_body="Checking failover paths.",
                    provider="smtp"
                )
                
                # Assert that dynamic fallback succeeded and changed provider to 'resend'
                assert result['ok'] is True
                assert result['provider'] == 'resend'
                assert "Resend API fallback succeeded" in result['message']
                assert result['message_id'] == "resend-msg-12345"
                
                # Check that SMTP was attempted first
                mock_smtp.assert_called_once()
                # Check that Resend was invoked next
                mock_resend.assert_called_once()


def test_email_integration_check_smtp_sync(app):
    """
    Test that calling the integrations check API automatically synchronizes
    active SMTP environment variables down to the PlatformServiceProviderConfig database record.
    """
    import json
    from unittest.mock import patch, MagicMock
    from app.models.service_tokens import PlatformServiceProviderConfig
    
    with app.app_context():
        # Clear database configs first and initialize dynamic PlatformServiceProviderConfig with outdated placeholder host
        db.session.query(PlatformServiceProviderConfig).delete()
        provider_cfg = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Primary SMTP',
            is_active=True
        )
        provider_cfg.set_config({
            'smtpHost': 'smtp.your-provider.com',
            'smtpPort': 25,
            'smtpUsername': 'stale-user',
            'smtpPassword': 'stale-password',
            'smtpEncryption': 'tls'
        })
        db.session.add(provider_cfg)
        db.session.commit()

        test_env = {
            'SMTP_HOST': 'email-smtp.us-east-1.amazonaws.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'live-aws-user',
            'SMTP_PASSWORD': 'live-aws-password',
            'EMAIL_PROVIDER': 'smtp'  # ensure resend guard is not triggered
        }

        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request') as mock_jwt, \
             patch('app.utils.platform_access.get_current_user') as mock_user, \
             patch.dict(os.environ, test_env), \
             patch('app.services.email_service._send_via_smtp_isolated') as mock_send:
            
            mock_user.return_value = MagicMock(role='super_admin')
            mock_send.return_value = (True, "Sent", "msg-aws-smtp-456")
            
            with app.test_client() as client:
                response = client.post(
                    '/api/v1/platform/integrations/providers/test',
                    json={
                        'service_type': 'email',
                        'provider_key': 'smtp'
                    }
                )
                assert response.status_code == 200
                
                # Retrieve from database directly to verify synchronization
                updated_record = PlatformServiceProviderConfig.query.filter_by(
                    service_type='email',
                    provider_key='smtp'
                ).first()
                assert updated_record is not None
                updated_cfg = updated_record.get_config() or {}
                assert updated_cfg.get('smtpHost') == 'email-smtp.us-east-1.amazonaws.com'
                assert updated_cfg.get('smtpPort') == 587
                assert updated_cfg.get('smtpUsername') == 'live-aws-user'
                assert updated_cfg.get('smtpPassword') == 'live-aws-password'





