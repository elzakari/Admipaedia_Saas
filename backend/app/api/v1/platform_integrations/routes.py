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
            # Explicitly use standard SMTP with STARTTLS for port 587 or 2587
            server = smtplib.SMTP(host=host, port=port, timeout=timeout)
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
        elif port == 465:
            # Explicitly use strict SMTP_SSL for port 465
            server = smtplib.SMTP_SSL(host=host, port=port, timeout=timeout, context=context)
            server.ehlo()
        else:
            # Fallback for other ports (e.g. 25) using encryption settings
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

    return jsonify({
        'success': True,
        'providers': [
            {
                'id': p.id,
                'scope': 'platform',
                'service_type': p.service_type,
                'provider_key': p.provider_key,
                'display_name': p.display_name,
                'priority': p.priority,
                'is_active': bool(p.is_active),
                'config': _redact_config(p.get_config() or {}),
            }
            for p in providers
        ],
        'overrides': [
            {
                'id': o.id,
                'scope': 'tenant',
                'tenant_id': str(o.tenant_id),
                'service_type': o.service_type,
                'provider_key': o.provider_key,
                'display_name': o.display_name,
                'priority': o.priority,
                'is_active': bool(o.is_active),
                'source': o.source,
                'config': _redact_config(o.get_config() or {}),
            }
            for o in overrides
        ]
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
        row.set_config(merged or {})
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
    row.set_config(merged or {})
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
    if not provider_key:
        return jsonify({'success': False, 'message': 'provider_key is required'}), 400

    row = None
    if scope == 'tenant':
        if not tenant_id:
            return jsonify({'success': False, 'message': 'tenant_id is required for tenant scope'}), 400
        row = TenantServiceProviderOverride.query.filter_by(tenant_id=tenant_id, service_type=service_type, provider_key=provider_key).first()
    else:
        row = PlatformServiceProviderConfig.query.filter_by(service_type=service_type, provider_key=provider_key).first()

    existing_cfg = row.get_config() if row else {}
    cfg = _merge_secrets(existing_cfg, incoming_cfg) if incoming_cfg is not None else existing_cfg
    cfg = cfg or {}

    supported = True
    ok = False
    message = ''

    if service_type == 'email' and provider_key == 'smtp':
        ok, message = _test_smtp_email(cfg, params)
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
            'scope': scope,
            'tenant_id': tenant_id,
            'service_type': service_type,
            'provider_key': provider_key,
            'supported': bool(supported),
            'ok': bool(ok),
            'message': message,
            'duration_ms': duration_ms,
        }
    }), 200

