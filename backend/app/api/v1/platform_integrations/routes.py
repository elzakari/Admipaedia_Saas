from __future__ import annotations

import smtplib
import ssl
import socket
import time
from email.message import EmailMessage

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.security import SecurityEvent
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
        elif lower in ('smtpusername', 'smtp_username'):
            out[key] = None if v is None else _mask_username(str(v))
        else:
            out[key] = v
    return out


def _merge_secrets(existing: dict | None, incoming: dict | None) -> dict | None:
    existing = existing or {}
    if incoming is None:
        return existing
    merged = dict(existing)
    for k, v in incoming.items():
        if v is None:
            continue
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped == "" or v_stripped == "********":
                continue
        # Check if we are trying to overwrite a saved password with a masked value
        if k in ('smtpPassword', 'smtp_password') and isinstance(merged.get(k), str) and isinstance(v, str):
            if '***' in v or v.strip() == '':
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


def _parse_bool(value, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in ('1', 'true', 'yes', 'on'):
        return True
    if normalized in ('0', 'false', 'no', 'off', ''):
        return False
    return default


def _validate_provider_config(service_type: str, provider_key: str, config: dict | None) -> str | None:
    cfg = dict(config or {})
    st = str(service_type or '').strip().lower()
    pk = str(provider_key or '').strip().lower()

    if st == 'email':
        if pk not in ('smtp', 'ses_smtp', 'ses_api', 'resend'):
            return 'Unsupported email provider'
        from_email = str(cfg.get('fromEmail') or cfg.get('from_email') or '').strip()
        if not from_email or '@' not in from_email:
            return 'A valid from email is required'
        if pk in ('smtp', 'ses_smtp'):
            host = _sanitize_smtp_host(str(cfg.get('smtpHost') or cfg.get('smtp_host') or ''))
            if not host:
                return 'SMTP host is required'
            try:
                port = int(cfg.get('smtpPort') or cfg.get('smtp_port') or 0)
            except Exception:
                return 'SMTP port must be a valid integer'
            if port <= 0 or port > 65535:
                return 'SMTP port must be between 1 and 65535'
            username = str(cfg.get('smtpUsername') or cfg.get('smtp_username') or '').strip()
            if not username:
                return 'SMTP username is required'
            password = cfg.get('smtpPassword') or cfg.get('smtp_password')
            if not _has_secret(password):
                return 'SMTP password is required'
        elif pk == 'ses_api':
            if not _has_secret(cfg.get('awsAccessKeyId') or cfg.get('aws_access_key')):
                return 'AWS Access Key ID is required'
            if not _has_secret(cfg.get('awsSecretAccessKey') or cfg.get('aws_secret_key')):
                return 'AWS Secret Access Key is required'
        elif pk == 'resend':
            if not _has_secret(cfg.get('apiKey') or cfg.get('api_key')):
                return 'Resend API key is required'

    return None


def _normalize_provider_config(service_type: str, provider_key: str, config: dict | None) -> dict:
    cfg = dict(config or {})
    st = str(service_type or '').strip().lower()
    pk = str(provider_key or '').strip().lower()

    if st == 'email' and pk in ('smtp', 'ses_smtp'):
        host_value = cfg.get('smtpHost') or cfg.get('smtp_host')
        if host_value is not None:
            sanitized_host = _sanitize_smtp_host(str(host_value))
            cfg['smtpHost'] = sanitized_host
            cfg['smtp_host'] = sanitized_host

    return cfg


def _audit_provider_change(event_type: str, *, actor_id: int | None, scope: str, service_type: str, provider_key: str, row_id: int, display_name: str | None, is_active: bool, priority: int):
    ev = SecurityEvent(
        event_type=event_type,
        user_id=actor_id,
        ip_address=request.remote_addr,
        endpoint=request.path,
        method=request.method,
        details={
            'scope': scope,
            'service_type': service_type,
            'provider_key': provider_key,
            'provider_row_id': row_id,
            'display_name': display_name,
            'is_active': bool(is_active),
            'priority': int(priority),
        },
        severity='info'
    )
    db.session.add(ev)


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
        return True, 'Test email successfully processed and sent...'
    except smtplib.SMTPAuthenticationError:
        masked_user = _mask_username(username)
        return False, f'SMTP authentication failed for user {masked_user}. Please check your username and password.'
    except smtplib.SMTPDataError:
        return False, 'SMTP transaction failed. The email was rejected by the server.'
    except (socket.timeout, TimeoutError):
        return False, 'SMTP connection timed out. Please verify host, port, and security settings.'
    except socket.gaierror:
        used_host = cfg.get('smtpHost') or cfg.get('smtp_host') or ''
        return False, f'DNS resolution failed for host {used_host}. Please verify the SMTP host.'
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


def _sanitize_smtp_host(host: str) -> str:
    if not host:
        return ""
    host = host.strip()
    # Remove zero-width characters
    for char in ('\u200b', '\u200c', '\u200d', '\ufeff', '\u200E', '\u200F'):
        host = host.replace(char, '')
    # Remove protocol prefix
    for prefix in ('https://', 'http://', 'smtp://'):
        if host.lower().startswith(prefix):
            host = host[len(prefix):]
    # Remove trailing slash or path suffix
    if '/' in host:
        host = host.split('/', 1)[0]
    return host.strip()


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
        p_display = p.display_name
        
        try:
            p_cfg = p.get_config() or {}
            config_status = "active"
            warning = None
            
            # Legacy SMTP treating
            if p_key == 'smtp' and p_cfg.get('smtpHost') and 'amazonaws.com' in str(p_cfg.get('smtpHost')).lower():
                p_key = 'ses_smtp'
                p_display = 'Amazon SES SMTP'
                
            redacted_config = _redact_config(p_cfg)
        except Exception as e:
            from app.extensions import logger
            logger.error(
                "Failed to decrypt platform provider config",
                provider_id=p.id,
                service_type=p.service_type,
                provider_key=p_key,
                error_type=type(e).__name__,
                error_message=str(e)
            )
            config_status = "decrypt_failed"
            warning = "Provider settings cannot be decrypted. Please re-save this provider."
            redacted_config = {}
            
        providers_list.append({
            'id': p.id,
            'scope': 'platform',
            'service_type': p.service_type,
            'provider_key': p_key,
            'display_name': p_display,
            'priority': p.priority,
            'is_active': bool(p.is_active),
            'config': redacted_config,
            'config_status': config_status,
            'warning': warning
        })

    overrides_list = []
    for o in overrides:
        o_key = o.provider_key
        o_display = o.display_name
        
        try:
            o_cfg = o.get_config() or {}
            config_status = "active"
            warning = None
            
            # Legacy SMTP treating
            if o_key == 'smtp' and o_cfg.get('smtpHost') and 'amazonaws.com' in str(o_cfg.get('smtpHost')).lower():
                o_key = 'ses_smtp'
                o_display = 'Amazon SES SMTP'
                
            redacted_config = _redact_config(o_cfg)
        except Exception as e:
            from app.extensions import logger
            logger.error(
                "Failed to decrypt tenant override config",
                provider_id=o.id,
                service_type=o.service_type,
                provider_key=o_key,
                error_type=type(e).__name__,
                error_message=str(e)
            )
            config_status = "decrypt_failed"
            warning = "Provider settings cannot be decrypted. Please re-save this provider."
            redacted_config = {}
            
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
            'config': redacted_config,
            'config_status': config_status,
            'warning': warning
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
    active = _parse_bool(is_active, True)
    normalized_config = _normalize_provider_config(service_type, provider_key, config if isinstance(config, dict) else {})
    validation_error = _validate_provider_config(service_type, provider_key, normalized_config)
    if validation_error:
        return jsonify({'success': False, 'message': validation_error}), 400
    actor = get_current_user()
    actor_id = int(getattr(actor, 'id', 0) or 0) if actor else None

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
        merged = _merge_secrets(row.get_config(), normalized_config)
        
        # Explicitly serialize to a clean string block before encrypting
        import json
        from app.utils.secret_crypto import encrypt_value
        secret, salt = row._crypto_secret()
        payload = json.dumps(merged or {}, separators=(',', ':'))
        row.config_encrypted = encrypt_value(payload, secret=secret, salt=salt)
        db.session.flush()
        _audit_provider_change(
            'super_admin.integration_provider_saved',
            actor_id=actor_id,
            scope='tenant',
            service_type=service_type,
            provider_key=provider_key,
            row_id=int(row.id),
            display_name=row.display_name,
            is_active=bool(row.is_active),
            priority=int(row.priority or 100),
        )
        db.session.commit()
        return jsonify({'success': True, 'id': row.id}), 200

    row = PlatformServiceProviderConfig.query.filter_by(service_type=service_type, provider_key=provider_key).first()
    if not row:
        row = PlatformServiceProviderConfig(service_type=service_type, provider_key=provider_key)
        db.session.add(row)
    row.display_name = display_name
    row.priority = prio
    row.is_active = active
    merged = _merge_secrets(row.get_config(), normalized_config)
    
    # Explicitly serialize to a clean string block before encrypting
    import json
    from app.utils.secret_crypto import encrypt_value
    secret, salt = row._crypto_secret()
    payload = json.dumps(merged or {}, separators=(',', ':'))
    row.config_encrypted = encrypt_value(payload, secret=secret, salt=salt)
    db.session.flush()
    _audit_provider_change(
        'super_admin.integration_provider_saved',
        actor_id=actor_id,
        scope='platform',
        service_type=service_type,
        provider_key=provider_key,
        row_id=int(row.id),
        display_name=row.display_name,
        is_active=bool(row.is_active),
        priority=int(row.priority or 100),
    )
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

    from app.models.service_tokens import PlatformServiceProviderConfig, TenantServiceProviderOverride
    from cryptography.fernet import InvalidToken

    provider_record = None
    decryption_failed = False

    # 1. Load exact platform or override provider configuration using SQLAlchemy models directly
    if provider_key:
        if scope == 'tenant' and tenant_id:
            provider_record = TenantServiceProviderOverride.query.filter_by(
                tenant_id=tenant_id,
                service_type=service_type,
                provider_key=provider_key
            ).first()
        else:
            provider_record = PlatformServiceProviderConfig.query.filter_by(
                service_type=service_type,
                provider_key=provider_key
            ).first()

    # 2. Extract saved configuration using provider_record.get_config() only
    saved_config = {}
    actual_provider_key = provider_key or 'smtp'

    if provider_record:
        actual_provider_key = provider_record.provider_key
        try:
            saved_config = provider_record.get_config() or {}
        except InvalidToken:
            decryption_failed = True
        except Exception:
            decryption_failed = True

    # 3. If decryption failed, return HTTP 200 with result.ok=false and clean warning
    if decryption_failed:
        from flask import current_app
        current_app.logger.error(f"Decryption failed for email provider integration configuration test. Key: {actual_provider_key}")
        return jsonify({
            'success': True,
            'result': {
                'ok': False,
                'provider_key': actual_provider_key,
                'message': "Email provider settings cannot be decrypted. Please re-save provider configuration.",
                'message_id': '',
                'duration_ms': int((time.time() - start_time) * 1000)
            }
        }), 200

    # 4. Merge incoming frontend config only if test_unsaved_config is explicitly true
    cfg = dict(saved_config)
    test_unsaved_config = str(data.get('test_unsaved_config') or data.get('testUnsavedConfig') or '').lower() in ('1', 'true', 'yes')
    
    if test_unsaved_config and incoming_cfg is not None:
        for k, v in incoming_cfg.items():
            if v is None:
                continue
            if isinstance(v, str):
                v_stripped = v.strip()
                # Ignore empty strings, default placeholder asterisks, or masked values
                if v_stripped == "" or v_stripped == "********" or "***" in v_stripped:
                    continue
            cfg[k] = v

    # 5. Key Normalization: Ensure both camelCase and snake_case versions exist and are identical
    def normalize_keys(c):
        mappings = [
            ('smtpHost', 'smtp_host'),
            ('smtpPort', 'smtp_port'),
            ('smtpEncryption', 'smtp_encryption'),
            ('smtpUsername', 'smtp_username'),
            ('smtpPassword', 'smtp_password'),
            ('fromEmail', 'from_email'),
            ('fromName', 'from_name')
        ]
        for camel, snake in mappings:
            val = c.get(camel) or c.get(snake)
            if val is not None:
                c[camel] = val
                c[snake] = val
        return c

    cfg = normalize_keys(cfg)

    # 6. Normalize SMTP host before testing in the local test cfg only
    smtp_host_val = cfg.get('smtpHost') or cfg.get('smtp_host') or ''
    sanitized_host = _sanitize_smtp_host(smtp_host_val)
    cfg['smtpHost'] = sanitized_host
    cfg['smtp_host'] = sanitized_host

    # 7. Safe logging: log provider_key, smtpHost, smtpPort, smtpEncryption, fromEmail
    # NEVER log smtpPassword, api keys, tokens, or credentials
    from app.extensions import logger
    logger.info(
        "Executing integrations SMTP provider config test details",
        provider_key=actual_provider_key,
        smtpHost_repr=repr(sanitized_host),
        smtpHost_len=len(sanitized_host),
        smtpPort=cfg.get('smtpPort') or cfg.get('smtp_port'),
        smtpEncryption=cfg.get('smtpEncryption') or cfg.get('smtp_encryption'),
        fromEmail=cfg.get('fromEmail') or cfg.get('from_email')
    )

    supported = True
    ok = False
    message = ''
    message_id = ''

    # 8. Handle polymorphic email testing routes
    if service_type == 'email':
        if actual_provider_key in ('smtp', 'ses_smtp'):
            ok, message = _test_smtp_email(cfg, params)
        elif actual_provider_key == 'ses_api':
            ok, message, message_id = _test_ses_api_email(cfg, params)
        elif actual_provider_key == 'resend':
            ok, message, message_id = _test_resend_email(cfg, params)
        else:
            supported = False
            message = f"Unsupported email provider: {actual_provider_key}"
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

    return jsonify({
        'success': True,
        'result': {
            'ok': bool(ok),
            'provider_key': actual_provider_key,
            'message': message,
            'message_id': message_id,
            'duration_ms': duration_ms
        }
    }), 200
