import os
import unittest
from unittest.mock import patch, MagicMock
from app.extensions import db
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
    in the database, the mail service uses them instead of environment values.
    """
    with app.app_context():
        # Temporarily disable suppression for testing SMTP flow
        app.config['MAIL_SUPPRESS_SEND'] = False

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

def test_email_service_uses_lowest_priority_active_provider(app):
    with app.app_context():
        app.config['MAIL_SUPPRESS_SEND'] = False
        db.session.query(PlatformServiceProviderConfig).delete()
        db.session.commit()

        fallback = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Fallback SMTP',
            is_active=True,
            priority=50,
        )
        fallback.set_config({
            'smtpHost': 'smtp.fallback-priority.com',
            'smtpPort': 587,
            'smtpUsername': 'fallback-user',
            'smtpPassword': 'fallback-pass',
            'smtpEncryption': 'tls',
        })
        preferred = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Preferred SMTP',
            is_active=True,
            priority=10,
        )
        preferred.set_config({
            'smtpHost': 'smtp.preferred-priority.com',
            'smtpPort': 465,
            'smtpUsername': 'preferred-user',
            'smtpPassword': 'preferred-pass',
            'smtpEncryption': 'ssl',
        })
        db.session.add_all([fallback, preferred])
        db.session.commit()

        with patch('app.services.email_service._send_via_smtp_isolated') as mock_send:
            mock_send.return_value = (True, "Sent", "msg-priority-001")

            send_email(
                subject="Priority Test",
                recipients=["test@example.com"],
                text_body="Testing deterministic provider selection.",
                provider="smtp"
            )

            _, kwargs = mock_send.call_args
            assert kwargs['host'] == 'smtp.preferred-priority.com'
            assert int(kwargs['port']) == 465
            assert kwargs['username'] == 'preferred-user'
            assert kwargs['password'] == 'preferred-pass'
            assert kwargs['encryption'] == 'ssl'


def test_email_service_fallback_to_resend(app):
    """
    Test that when the dynamic database SMTP provider fails,
    and FALLBACK_EMAIL_PROVIDER env var is set to 'resend',
    the email service automatically fails over to the Resend API.
    """
    with app.app_context():
        # Clear database configs first
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
    Test that calling the integrations check API does NOT automatically synchronize
    or mutate active SMTP environment variables down to the PlatformServiceProviderConfig database record.
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
                
                # Retrieve from database directly to verify NO synchronization/mutation took place
                updated_record = PlatformServiceProviderConfig.query.filter_by(
                    service_type='email',
                    provider_key='smtp'
                ).first()
                assert updated_record is not None
                updated_cfg = updated_record.get_config() or {}
                assert updated_cfg.get('smtpHost') == 'smtp.your-provider.com'
                assert updated_cfg.get('smtpPort') == 25
                assert updated_cfg.get('smtpUsername') == 'stale-user'
                assert updated_cfg.get('smtpPassword') == 'stale-password'


def test_email_integration_check_test_unsaved_config_defaults(app):
    """
    Test that test_provider_config defaults to using saved database config,
    ignoring incoming config unless test_unsaved_config=true is specified.
    """
    from unittest.mock import patch, MagicMock
    from app.models.service_tokens import PlatformServiceProviderConfig
    
    with app.app_context():
        db.session.query(PlatformServiceProviderConfig).delete()
        provider_cfg = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Primary SMTP',
            is_active=True
        )
        provider_cfg.set_config({
            'smtpHost': 'smtp.saved-db-host.com',
            'smtpPort': 587,
            'smtpUsername': 'saved-user',
            'smtpPassword': 'saved-password',
            'smtpEncryption': 'tls',
            'fromEmail': 'no-reply@saved.com'
        })
        db.session.add(provider_cfg)
        db.session.commit()

        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request') as mock_jwt, \
             patch('app.utils.platform_access.get_current_user') as mock_user, \
             patch('smtplib.SMTP') as mock_smtp:
            
            mock_user.return_value = MagicMock(role='super_admin')
            mock_server = MagicMock()
            mock_smtp.return_value = mock_server
            
            # Scenario A: test_unsaved_config is missing/false. Incoming config should be ignored!
            with app.test_client() as client:
                response = client.post(
                    '/api/v1/platform/integrations/providers/test',
                    json={
                        'service_type': 'email',
                        'provider_key': 'smtp',
                        'config': {
                            'smtpHost': 'smtp.frontend-unsaved.com',
                            'smtpPort': 587,
                            'smtpUsername': 'frontend-user',
                            'smtpPassword': 'frontend-password'
                        }
                    }
                )
                assert response.status_code == 200
                res_data = response.json
                assert res_data['success'] is True
                assert res_data['result']['ok'] is True
                
                # Check that mock_smtp was called with the SAVED config host, NOT the frontend unsaved config host
                mock_smtp.assert_called_with(host='smtp.saved-db-host.com', port=587, timeout=12)
                mock_server.login.assert_called_with('saved-user', 'saved-password')

            # Reset mocks
            mock_smtp.reset_mock()
            mock_server.reset_mock()

            # Scenario B: test_unsaved_config is True. Incoming config should be merged!
            with app.test_client() as client:
                response = client.post(
                    '/api/v1/platform/integrations/providers/test',
                    json={
                        'service_type': 'email',
                        'provider_key': 'smtp',
                        'test_unsaved_config': True,
                        'config': {
                            'smtpHost': 'smtp.frontend-unsaved.com',
                            'smtpPort': 587,
                            'smtpUsername': 'frontend-user',
                            'smtpPassword': 'frontend-password'
                        }
                    }
                )
                assert response.status_code == 200
                res_data = response.json
                assert res_data['success'] is True
                assert res_data['result']['ok'] is True
                
                # Check that mock_smtp was called with the MERGED incoming config
                mock_smtp.assert_called_with(host='smtp.frontend-unsaved.com', port=587, timeout=12)
                mock_server.login.assert_called_with('frontend-user', 'frontend-password')


def test_email_integration_check_dns_sanitization(app):
    """
    Test that SMTP host is sanitized before execution and that DNS failures
    return the requested message format showing the sanitized host.
    """
    import socket
    from unittest.mock import patch, MagicMock
    from app.models.service_tokens import PlatformServiceProviderConfig
    
    with app.app_context():
        db.session.query(PlatformServiceProviderConfig).delete()
        provider_cfg = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Primary SMTP',
            is_active=True
        )
        provider_cfg.set_config({
            'smtpHost': '  https://email-smtp.us-east-1.amazonaws.com/v1\u200b ',
            'smtpPort': 587,
            'smtpUsername': 'saved-user',
            'smtpPassword': 'saved-password',
            'smtpEncryption': 'tls',
            'fromEmail': 'no-reply@example.com'
        })
        db.session.add(provider_cfg)
        db.session.commit()

        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request') as mock_jwt, \
             patch('app.utils.platform_access.get_current_user') as mock_user, \
             patch('socket.getaddrinfo') as mock_dns:
            
            mock_user.return_value = MagicMock(role='super_admin')
            # Force gaierror to simulate DNS failure
            mock_dns.side_effect = socket.gaierror("DNS failed")
            
            with app.test_client() as client:
                response = client.post(
                    '/api/v1/platform/integrations/providers/test',
                    json={
                        'service_type': 'email',
                        'provider_key': 'smtp'
                    }
                )
                assert response.status_code == 200
                res_data = response.json
                
                # Assert DNS resolution failure message includes sanitized host
                assert res_data['success'] is True
                assert res_data['result']['ok'] is False
                assert "DNS resolution failed for host email-smtp.us-east-1.amazonaws.com" in res_data['result']['message']

def test_email_service_tenant_context_hydration(app):
    """
    Test that when send_email is called within a tenant context (g.tenant_id set),
    the tenant override is selected ahead of the platform provider.
    """
    from flask import g
    import uuid
    from app.models.service_tokens import TenantServiceProviderOverride
    from app.models.tenant import Tenant
    
    with app.app_context():
        app.config['MAIL_SUPPRESS_SEND'] = False

        # Clear configs first
        db.session.query(TenantServiceProviderOverride).delete()
        db.session.query(PlatformServiceProviderConfig).delete()
        db.session.commit()

        tenant = Tenant(
            slug=f"email-tenant-{uuid.uuid4().hex[:8]}",
            name='Email Tenant Test',
            country_code='GH',
            schema_name=f"tenant_email_{uuid.uuid4().hex[:8]}",
            status='active',
            plan='pro',
        )
        db.session.add(tenant)
        db.session.flush()

        platform_provider = PlatformServiceProviderConfig(
            service_type='email',
            provider_key='smtp',
            display_name='Platform SMTP',
            is_active=True
        )
        platform_provider.set_config({
            'smtpHost': 'smtp.platform-database.com',
            'smtpPort': 587,
            'smtpUsername': 'platform-user',
            'smtpPassword': 'platform-password',
            'smtpEncryption': 'tls'
        })
        tenant_override = TenantServiceProviderOverride(
            tenant_id=str(tenant.id),
            service_type='email',
            provider_key='smtp',
            display_name='Tenant Override SMTP',
            is_active=True,
            priority=5,
        )
        tenant_override.set_config({
            'smtpHost': 'smtp.tenant-database.com',
            'smtpPort': 465,
            'smtpUsername': 'tenant-user',
            'smtpPassword': 'tenant-password',
            'smtpEncryption': 'ssl'
        })
        db.session.add_all([platform_provider, tenant_override])
        db.session.commit()

        g.tenant_id = str(tenant.id)

        try:
            with patch('app.services.email_service._send_via_smtp_isolated') as mock_send:
                mock_send.return_value = (True, "Sent", "msg-tenant-456")
                
                send_email(
                    subject="Tenant Context Hydration Test",
                    recipients=["test@example.com"],
                    text_body="Testing dynamic settings hydration with active tenant context.",
                    provider="smtp"
                )
                
                _, kwargs = mock_send.call_args
                assert kwargs['host'] == 'smtp.tenant-database.com'
                assert int(kwargs['port']) == 465
                assert kwargs['username'] == 'tenant-user'
                assert kwargs['password'] == 'tenant-password'
                assert kwargs['encryption'] == 'ssl'
        finally:
            # Clean up g context
            if hasattr(g, 'tenant_id'):
                delattr(g, 'tenant_id')


