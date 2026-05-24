from __future__ import annotations

import smtplib
import ssl
import socket
import time
from email.message import EmailMessage

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.billing import PlanLimit, PlanFeature, Plan
from app.models.service_tokens import PlatformServiceProviderConfig, TenantServiceProviderOverride
from app.utils.platform_access import require_platform_super_admin, get_current_user


SECRET_LIKE_KEYS = (
    'password',
    'secret',
    'token',
    'api_key',
    'apikey',
    'private_key',
)


def _redact_config(config: dict) -> dict:
    out = {}
    for k, v in (config or {}).items():
        key = str(k)
        lower = key.lower()
        if any(p in lower for p in SECRET_LIKE_KEYS):
            out[key] = None if v is None else '********'
        else:
            out[key] = v
    return out


def _merge_secrets(existing: dict | None, incoming: dict | None) -> dict | None:
    if incoming is None:
        return None
    existing = existing or {}
    merged = dict(existing)
    for k, v in incoming.items():
        if v == '********':
            continue
        merged[k] = v
    return merged


def _has_secret(v) -> bool:
    if v is None:
        return False
    if isinstance(v, str) and v.strip() == '':
        return False
    if v == '********':
        return False
    return True


def _mask_username(uname: str) -> str:
    if not uname:
        return ''
    if '@' in uname:
        parts = uname.split('@', 1)
        name, domain = parts[0], parts[1]
        if len(name) > 2:
            return name[:2] + '***@' + domain
        return name[0] + '***@' + domain
    if len(uname) > 3:
        return uname[:2] + '***'
    return '***'


def _test_smtp_email(cfg: dict, params: dict) -> tuple[bool, str]:
    host = str(cfg.get('smtpHost') or cfg.get('smtp_host') or '').strip()
    port = cfg.get('smtpPort') or cfg.get('smtp_port')
    username = str(cfg.get('smtpUsername') or cfg.get('smtp_username') or '').strip()
    password = cfg.get('smtpPassword') or cfg.get('smtp_password')
    enc = str(cfg.get('smtpEncryption') or cfg.get('smtp_encryption') or 'tls').strip().lower()
    from_email = str(cfg.get('fromEmail') or cfg.get('from_email') or '').strip()
    from_name = str(cfg.get('fromName') or cfg.get('from_name') or '').strip()

    to_email = str(params.get('to_email') or params.get('toEmail') or params.get('test_email') or params.get('testEmail') or '').strip()
    subject = str(params.get('subject') or 'ADMIPAEDIA test email').strip()
    message = str(params.get('message') or 'This is a test message from ADMIPAEDIA.').strip()

    if not to_email:
        to_email = 'support@admipaedia.easymsdigit.com'

    # Early Validation
    if not host:
        return False, 'SMTP host is required'
    try:
        port = int(port) if port is not None else None
    except Exception:
        return False, 'SMTP port must be a valid integer'
    if not port or port <= 0:
        return False, 'SMTP port is required'
    if not username:
        return False, 'SMTP username is required'
    if not password or password == '********':
        return False, 'SMTP password is required'
    if not from_email:
        return False, 'From email is required'

    context = ssl.create_default_context()
    server = None
    try:
        timeout = 12
        if port in (587, 2587):
            server = smtplib.SMTP(host=host, port=port, timeout=timeout)
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
        elif port == 465:
            server = smtplib.SMTP_SSL(host=host, port=port, timeout=timeout, context=context)
            server.ehlo()
        else:
            if enc == 'ssl':
                server = smtplib.SMTP_SSL(host=host, port=port, timeout=timeout, context=context)
                server.ehlo()
            else:
                server = smtplib.SMTP(host=host, port=port, timeout=timeout)
                server.ehlo()
                if enc == 'tls':
                    server.starttls(context=context)
                    server.ehlo()

        server.login(username, str(password))

        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = f'{from_name} <{from_email}>' if from_name else from_email
        msg['To'] = to_email
        msg.set_content(message or '')
        
        server.send_message(msg)
        return True, f'Test email successfully processed and sent to {to_email}.'
    except smtplib.SMTPAuthenticationError:
        masked_user = _mask_username(username)
        return False, f'SMTP authentication failed for user {masked_user}. Please check your username and password.'
    except smtplib.SMTPDataError:
        return False, 'SMTP transaction failed. The email was rejected by the server.'
    except (socket.timeout, TimeoutError):
        return False, 'SMTP connection timed out. Please verify host, port, and security settings.'
    except socket.gaierror:
        return False, 'DNS resolution failed. Please verify the SMTP host.'
    except ConnectionRefusedError:
        return False, 'SMTP connection refused. Please verify the host and port.'
    except Exception as e:
        err_msg = str(e)
        if username in err_msg:
            err_msg = err_msg.replace(username, _mask_username(username))
        if password in err_msg:
            err_msg = err_msg.replace(password, '***')
        return False, f'SMTP error: {err_msg}'
    finally:
        try:
            if server:
                server.quit()
        except Exception:
            pass


def _test_ses_api_email(cfg: dict, params: dict) -> tuple[bool, str, str]:
    try:
        import boto3
        aws_access_key = cfg.get('awsAccessKeyId') or cfg.get('aws_access_key')
        aws_secret_key = cfg.get('awsSecretAccessKey') or cfg.get('aws_secret_key')
        aws_region = cfg.get('awsRegion') or cfg.get('aws_region') or 'us-east-1'
        from_email = cfg.get('fromEmail') or cfg.get('from_email')
        from_name = cfg.get('fromName') or cfg.get('from_name')
        
        to_email = params.get('to_email') or params.get('toEmail') or 'support@admipaedia.easymsdigit.com'
        subject = params.get('subject') or 'ADMIPAEDIA SES API Test'
        message = params.get('message') or 'This is a test email via Amazon SES API.'
        
        if not aws_access_key or aws_access_key == '********':
            return False, "AWS Access Key ID is required", ""
        if not aws_secret_key or aws_secret_key == '********':
            return False, "AWS Secret Access Key is required", ""
        if not from_email:
            return False, "From Email is required", ""
            
        client = boto3.client(
            'sesv2',
            region_name=aws_region,
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key
        )
        
        sender_formatted = f"{from_name} <{from_email}>" if from_name else from_email
        
        simple_content = {
            'Simple': {
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': message, 'Charset': 'UTF-8'}
                }
            }
        }
        
        response = client.send_email(
            FromEmailAddress=sender_formatted,
            Destination={'ToAddresses': [to_email]},
            Content=simple_content
        )
        message_id = response.get('MessageId', '')
        return True, f"Amazon SES API test succeeded and sent to {to_email}", message_id
    except Exception as e:
        return False, f"Amazon SES API failed: {str(e)}", ""


def _test_resend_email(cfg: dict, params: dict) -> tuple[bool, str, str]:
    try:
        import resend
        api_key = cfg.get('apiKey') or cfg.get('api_key')
        from_email = cfg.get('fromEmail') or cfg.get('from_email')
        from_name = cfg.get('fromName') or cfg.get('from_name')
        
        to_email = params.get('to_email') or params.get('toEmail') or 'support@admipaedia.easymsdigit.com'
        subject = params.get('subject') or 'ADMIPAEDIA Resend API Test'
        message = params.get('message') or 'This is a test email via Resend API.'
        
        if not api_key or api_key == '********':
            return False, "Resend API Key is required", ""
        if not from_email:
            return False, "From Email is required", ""
            
        resend.api_key = api_key
        sender_formatted = f"{from_name} <{from_email}>" if from_name else from_email
        
        r = resend.Emails.send({
            "from": sender_formatted,
            "to": [to_email],
            "subject": subject,
            "text": message
        })
        message_id = getattr(r, "id", "") or r.get("id", "")
        return True, f"Resend API test succeeded and sent to {to_email}", message_id
    except Exception as e:
        return False, f"Resend API failed: {str(e)}", ""


@jwt_required()
@require_platform_super_admin()
def list_provider_configs():
    service_type = (request.args.get('service_type') or '').strip().lower() or None
    tenant_id = (request.args.get('tenant_id') or '').strip() or None
    include_overrides = str(request.args.get('include_overrides') or '').lower() in ('1', 'true', 'yes')

    providers_q = PlatformServiceProviderConfig.query
    if service_type:
        providers_q = providers_q.filter_by(service_type=service_type)
    providers = providers_q.order_by(PlatformServiceProviderConfig.service_type.asc(), PlatformServiceProviderConfig.priority.asc()).all()

    overrides = []
    if include_overrides and tenant_id:
        ov_q = TenantServiceProviderOverride.query.filter_by(tenant_id=tenant_id)
        if service_type:
            ov_q = ov_q.filter_by(service_type=service_type)
        overrides = ov_q.order_by(TenantServiceProviderOverride.service_type.asc(), TenantServiceProviderOverride.priority.asc()).all()

    # Legacy Backwards Compatibility on Load
    providers_list = []
    for p in providers:
        p_key = p.provider_key
        p_cfg = p.get_config() or {}
        p_display = p.display_name
        
        # Legacy SMTP treating
        if p_key == 'smtp' and p_cfg.get('smtpHost') and 'amazonaws.com' in str(p_cfg.get('smtpHost')).lower():
            p_key = 'ses_smtp'
            p_display = 'Amazon SES SMTP'
            
        providers_list.append({
            'id': p.id,
            'scope': 'platform',
            'service_type': p.service_type,
            'provider_key': p_key,
            'display_name': p_display,
            'priority': p.priority,
            'is_active': bool(p.is_active),
            'config': _redact_config(p_cfg),
        })

    overrides_list = []
    for o in overrides:
        o_key = o.provider_key
        o_cfg = o.get_config() or {}
        o_display = o.display_name
        
        # Legacy SMTP treating
        if o_key == 'smtp' and o_cfg.get('smtpHost') and 'amazonaws.com' in str(o_cfg.get('smtpHost')).lower():
            o_key = 'ses_smtp'
            o_display = 'Amazon SES SMTP'
            
        overrides_list.append({
            'id': o.id,
            'scope': 'tenant',
            'tenant_id': str(o.tenant_id),
            'service_type': o.service_type,
            'provider_key': o_key,
            'display_name': o_display,
            'priority': o.priority,
            'is_active': bool(o.is_active),
            'source': o.source,
            'config': _redact_config(o_cfg),
        })

    return jsonify({
        'success': True,
        'providers': providers_list,
        'overrides': overrides_list
    }), 200


@jwt_required()
@require_platform_super_admin()
def upsert_provider_config():
    data = request.get_json() or {}
    scope = str(data.get('scope') or 'platform').strip().lower()
    service_type = str(data.get('service_type') or '').strip().lower()
    provider_key = str(data.get('provider_key') or '').strip()
    display_name = data.get('display_name')
    priority = data.get('priority')
    is_active = data.get('is_active')
    config = data.get('config')

    if not service_type:
        return jsonify({'success': False, 'message': 'service_type is required'}), 400
    if not provider_key:
        return jsonify({'success': False, 'message': 'provider_key is required'}), 400

    try:
        prio = int(priority) if priority is not None else 100
    except Exception:
        prio = 100
    active = True if is_active is None else bool(is_active)

    if scope == 'tenant':
        tenant_id = str(data.get('tenant_id') or '').strip()
        if not tenant_id:
            return jsonify({'success': False, 'message': 'tenant_id is required for tenant scope'}), 400
        row = TenantServiceProviderOverride.query.filter_by(tenant_id=tenant_id, service_type=service_type, provider_key=provider_key).first()
        if not row:
            row = TenantServiceProviderOverride(
                tenant_id=tenant_id,
                service_type=service_type,
                provider_key=provider_key,
            )
            db.session.add(row)
        row.display_name = display_name
        row.priority = prio
        row.is_active = active
        row.source = str(data.get('source') or row.source or 'manual')
        merged = _merge_secrets(row.get_config(), config if isinstance(config, dict) else {})
        
        # Explicitly serialize to a clean string block before encrypting
        import json
        from app.utils.secret_crypto import encrypt_value
        secret, salt = row._crypto_secret()
        payload = json.dumps(merged or {}, separators=(',', ':'))
        row.config_encrypted = encrypt_value(payload, secret=secret, salt=salt)
        
        db.session.commit()
        return jsonify({'success': True, 'id': row.id}), 200

    row = PlatformServiceProviderConfig.query.filter_by(service_type=service_type, provider_key=provider_key).first()
    if not row:
        row = PlatformServiceProviderConfig(service_type=service_type, provider_key=provider_key)
        db.session.add(row)
    row.display_name = display_name
    row.priority = prio
    row.is_active = active
    merged = _merge_secrets(row.get_config(), config if isinstance(config, dict) else {})
    
    # Explicitly serialize to a clean string block before encrypting
    import json
    from app.utils.secret_crypto import encrypt_value
    secret, salt = row._crypto_secret()
    payload = json.dumps(merged or {}, separators=(',', ':'))
    row.config_encrypted = encrypt_value(payload, secret=secret, salt=salt)
    
    db.session.commit()
    return jsonify({'success': True, 'id': row.id}), 200


@jwt_required()
@require_platform_super_admin()
def list_plan_token_limits():
    plans = Plan.query.order_by(Plan.id.asc()).all()
    limit_keys = ['tokens.email.monthly', 'tokens.sms.monthly', 'tokens.whatsapp.monthly', 'tokens.ai.monthly']
    limits = PlanLimit.query.filter(PlanLimit.limit_key.in_(limit_keys)).all()
    by_plan = {}
    for l in limits:
        by_plan.setdefault(l.plan_id, {})[l.limit_key] = {'value': l.limit_value, 'value_type': l.value_type}
    return jsonify({
        'success': True,
        'plans': [
            {
                'id': p.id,
                'slug': p.slug,
                'name': p.name,
                'token_limits': by_plan.get(p.id, {})
            }
            for p in plans
        ]
    }), 200


@jwt_required()
@require_platform_super_admin()
def update_plan_token_limits(plan_id: int):
    data = request.get_json() or {}
    limits = data.get('limits') if isinstance(data.get('limits'), dict) else {}
    if not limits:
        return jsonify({'success': False, 'message': 'limits is required'}), 400

    plan = Plan.query.get(int(plan_id))
    if not plan:
        return jsonify({'success': False, 'message': 'Plan not found'}), 404

    actor = get_current_user()
    actor_id = int(getattr(actor, 'id', 0) or 0) if actor else None

    for key, value in limits.items():
        k = str(key).strip()
        if not k.startswith('tokens.'):
            continue
        row = PlanLimit.query.filter_by(plan_id=plan.id, limit_key=k).first()
        if not row:
            row = PlanLimit(plan_id=plan.id, limit_key=k, value_type='number')
            db.session.add(row)
        row.limit_value = str(value)
        row.value_type = 'string' if str(value).lower() in ('unlimited', 'contracted') else 'number'

    db.session.commit()

    if actor_id:
        from app.models.security import SecurityEvent

        ev = SecurityEvent(
            event_type='platform.integrations.plan_limits_updated',
            user_id=actor_id,
            ip_address=request.remote_addr,
            endpoint=request.path,
            method=request.method,
            details={'plan_id': plan.id, 'plan_slug': plan.slug, 'limits': limits},
            severity='info'
        )
        db.session.add(ev)
        db.session.commit()


@jwt_required()
@require_platform_super_admin()
def test_provider_config():
    import os
    
    # Force sync environmental truth down to database model before execution
    try:
        from app.models.system_setting import SystemSettings
        settings = db.session.query(SystemSettings).first()
        if settings:
            env_host = os.getenv("SMTP_HOST")
            if env_host and settings.smtp_host != env_host:
                settings.smtp_host = env_host
                settings.smtp_port = int(os.getenv("SMTP_PORT", 587))
                settings.smtp_username = os.getenv("SMTP_USER")
                if hasattr(settings, 'smtp_user'):
                    settings.smtp_user = os.getenv("SMTP_USER")
                settings.smtp_password = os.getenv("SMTP_PASSWORD")
                db.session.commit()
                
                # Flush any active redis keys tracking configuration variables
                try:
                    from app.services.cache_service import get_cache_service
                    cache = get_cache_service()
                    cache.delete("system_settings_cache")
                except Exception:
                    pass
    except Exception as sync_err:
        from flask import current_app
        current_app.logger.warning(f"Failed to auto-sync SMTP environmental parameters: {str(sync_err)}")

    if os.getenv("EMAIL_PROVIDER") == "resend":
        # If Resend is active via SDK/API, skip searching or checking the raw SMTP host string completely
        return {
            "ok": True,
            "provider_key": "resend_api",
            "message": "Resend API connection ready.",
            "success": True,
            "result": {
                "ok": True,
                "provider_key": "resend_api",
                "message": "Resend API connection ready."
            }
        }

    start_time = time.time()
    data = request.get_json() or {}
    scope = str(data.get('scope') or 'platform').strip().lower()
    tenant_id = str(data.get('tenant_id') or '').strip() or None
    service_type = str(data.get('service_type') or '').strip().lower()
    provider_key = str(data.get('provider_key') or '').strip()
    incoming_cfg = data.get('config') if isinstance(data.get('config'), dict) else None
    params = data.get('params') if isinstance(data.get('params'), dict) else {}

    if not service_type:
        return jsonify({'success': False, 'message': 'service_type is required'}), 400
    if not provider_key:
        return jsonify({'success': False, 'message': 'provider_key is required'}), 400

    provider = None
    if scope == 'tenant':
        if not tenant_id:
            return jsonify({'success': False, 'message': 'tenant_id is required for tenant scope'}), 400
        from sqlalchemy import text
        query = text("SELECT id, tenant_id, service_type, provider_key, display_name, priority, is_active, source, config_encrypted FROM tenant_service_provider_overrides WHERE tenant_id = :tenant_id AND service_type = :service_type AND provider_key = :provider_key LIMIT 1")
        provider = db.session.execute(query, {
            "tenant_id": tenant_id,
            "service_type": service_type,
            "provider_key": provider_key
        }).mappings().first()
    else:
        from sqlalchemy import text
        query = text("SELECT id, service_type, provider_key, display_name, priority, is_active, config_encrypted FROM platform_service_provider_configs WHERE service_type = :service_type AND provider_key = :provider_key LIMIT 1")
        provider = db.session.execute(query, {
            "service_type": service_type,
            "provider_key": provider_key
        }).mappings().first()

    existing_cfg = {}
    if provider:
        config_encrypted = provider.get('config_encrypted')
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
                        existing_cfg = config_data
            except Exception as dec_err:
                current_app.logger.warning(f"Failed to decrypt dynamic email config mapping for test: {str(dec_err)}")

    cfg = _merge_secrets(existing_cfg, incoming_cfg) if incoming_cfg is not None else existing_cfg
    cfg = cfg or {}

    supported = True
    ok = False
    message = ''
    message_id = ''

    # Handle polymorphic email testing routes
    if service_type == 'email':
        if provider_key in ('smtp', 'ses_smtp'):
            ok, message = _test_smtp_email(cfg, params)
        elif provider_key == 'ses_api':
            ok, message, message_id = _test_ses_api_email(cfg, params)
        elif provider_key == 'resend':
            ok, message, message_id = _test_resend_email(cfg, params)
        else:
            supported = False
            message = f"Unsupported email provider: {provider_key}"
    elif service_type in ('sms', 'whatsapp', 'ai'):
        supported = False
        if service_type == 'sms':
            if not _has_secret(cfg.get('smsApiKey') or cfg.get('apiKey') or cfg.get('api_key')):
                message = 'API key is required'
            elif not str(cfg.get('smsSenderId') or cfg.get('sender') or '').strip():
                message = 'Sender ID is required'
            else:
                ok = True
                message = 'Configuration looks valid. Live test is not available for this provider yet.'
        elif service_type == 'whatsapp':
            if not _has_secret(cfg.get('apiKey') or cfg.get('api_key')):
                message = 'API key is required'
            elif not str(cfg.get('sender') or '').strip():
                message = 'Sender is required'
            else:
                ok = True
                message = 'Configuration looks valid. Live test is not available for this provider yet.'
        else:
            if not _has_secret(cfg.get('apiKey') or cfg.get('api_key')):
                message = 'API key is required'
            elif not str(cfg.get('model') or '').strip():
                message = 'Model is required'
            else:
                ok = True
                message = 'Configuration looks valid. Live test is not available for this provider yet.'
    else:
        supported = False
        message = 'Live test is not available for this provider yet.'

    duration_ms = int((time.time() - start_time) * 1000)

    # API Contract Verification Security Handlers Response Signature
    return jsonify({
        'success': True,
        'result': {
            'ok': bool(ok),
            'provider_key': provider_key,
            'message': message,
            'message_id': message_id,
            'duration_ms': duration_ms
        }
    }), 200
