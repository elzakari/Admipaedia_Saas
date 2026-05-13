from __future__ import annotations

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

    return jsonify({'success': True}), 200

