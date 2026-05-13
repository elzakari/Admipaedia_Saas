#!/usr/bin/env python3

import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models.tenant import Tenant
from app.models.service_tokens import TenantServiceProviderOverride
from app.services.integrations.token_service import ServiceTokenService


def _ensure_override(*, tenant_id, service_type: str, provider_key: str, display_name: str, config: dict):
    row = TenantServiceProviderOverride.query.filter_by(
        tenant_id=tenant_id,
        service_type=service_type,
        provider_key=provider_key,
    ).first()
    if not row:
        row = TenantServiceProviderOverride(
            tenant_id=tenant_id,
            service_type=service_type,
            provider_key=provider_key,
            display_name=display_name,
            priority=10,
            is_active=True,
            source='migrated'
        )
        db.session.add(row)
    row.display_name = display_name
    row.priority = 10
    row.is_active = True
    row.source = 'migrated'
    row.set_config(config or {})


def migrate():
    app = create_app()
    with app.app_context():
        tenants = Tenant.query.all()
        migrated = 0
        provisioned = 0

        for t in tenants:
            settings = getattr(t, 'settings', None)
            if not isinstance(settings, dict):
                settings = {}

            notifications = settings.get('notifications') if isinstance(settings.get('notifications'), dict) else {}
            ai = settings.get('ai') if isinstance(settings.get('ai'), dict) else {}
            ai_settings = ai.get('settings') if isinstance(ai.get('settings'), dict) else {}

            did_migrate = False

            smtp_host = notifications.get('smtpHost') or notifications.get('smtp_host')
            smtp_user = notifications.get('smtpUsername') or notifications.get('smtp_username')
            smtp_password = notifications.get('smtpPassword') or notifications.get('smtp_password')
            if smtp_host or smtp_user or smtp_password:
                config = {
                    'smtpHost': notifications.get('smtpHost'),
                    'smtpPort': notifications.get('smtpPort'),
                    'smtpUsername': notifications.get('smtpUsername'),
                    'smtpPassword': notifications.get('smtpPassword'),
                    'smtpEncryption': notifications.get('smtpEncryption'),
                    'fromEmail': notifications.get('fromEmail'),
                    'fromName': notifications.get('fromName'),
                    'emailEnabled': notifications.get('emailEnabled'),
                }
                _ensure_override(
                    tenant_id=t.id,
                    service_type='email',
                    provider_key='smtp',
                    display_name='SMTP (migrated)',
                    config={k: v for k, v in config.items() if v is not None}
                )
                did_migrate = True

            sms_provider = notifications.get('smsProvider')
            sms_key = notifications.get('smsApiKey')
            sms_sender = notifications.get('smsSenderId')
            if sms_provider or sms_key or sms_sender:
                config = {
                    'smsProvider': sms_provider,
                    'smsApiKey': sms_key,
                    'smsSenderId': sms_sender,
                    'smsEnabled': notifications.get('smsEnabled'),
                }
                _ensure_override(
                    tenant_id=t.id,
                    service_type='sms',
                    provider_key=str(sms_provider or 'sms').lower(),
                    display_name=f"{sms_provider or 'SMS'} (migrated)",
                    config={k: v for k, v in config.items() if v is not None}
                )
                did_migrate = True

            if ai_settings:
                config = {
                    'enabled': ai_settings.get('enabled'),
                    'provider': ai_settings.get('provider'),
                    'model': ai_settings.get('model'),
                    'api_key': ai_settings.get('api_key') or ai_settings.get('apiKey'),
                    'base_url': ai_settings.get('base_url') or ai_settings.get('baseUrl'),
                }
                _ensure_override(
                    tenant_id=t.id,
                    service_type='ai',
                    provider_key=str(ai_settings.get('provider') or 'ai').lower(),
                    display_name=f"{ai_settings.get('provider') or 'AI'} (migrated)",
                    config={k: v for k, v in config.items() if v is not None}
                )
                did_migrate = True

            if did_migrate:
                migrated += 1
                if 'notifications' in settings:
                    settings.pop('notifications', None)
                if 'ai' in settings and isinstance(settings.get('ai'), dict):
                    settings['ai'] = {'settings': {}}
                t.settings = settings

            ServiceTokenService.provision_for_tenant(str(t.id))
            provisioned += 1

        db.session.commit()
        return migrated, provisioned


if __name__ == '__main__':
    migrated, provisioned = migrate()
    print(f'Migrated {migrated} tenant provider configs.')
    print(f'Provisioned tokens for {provisioned} tenants.')

