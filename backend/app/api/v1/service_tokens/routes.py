from flask import jsonify, request

from app.services.integrations.token_service import ServiceTokenService, SERVICE_TYPES


def _get_plain_token() -> str:
    header = request.headers.get('X-Service-Token') or request.headers.get('X-Api-Token')
    if header:
        return header.strip()
    data = request.get_json(silent=True) or {}
    return str(data.get('token') or data.get('service_token') or '').strip()


def validate_service_token():
    data = request.get_json(silent=True) or {}
    service_type = str(data.get('service_type') or data.get('serviceType') or '').strip().lower()
    if service_type not in SERVICE_TYPES:
        return jsonify({'success': False, 'message': 'Invalid service_type'}), 400

    token_plain = _get_plain_token()
    tenant_hint = request.headers.get('X-Tenant-ID')
    token, err = ServiceTokenService.validate_token(token_plain, service_type, tenant_id_hint=tenant_hint)
    if err or not token:
        from app.extensions import db
        db.session.commit()
        return jsonify({'success': False, 'message': err or 'Invalid token'}), 401

    ServiceTokenService._event(
        tenant_id=str(token.tenant_id),
        service_type=service_type,
        event_type='validated',
        token_id=str(token.id),
        details={'tenant_id': str(token.tenant_id)},
    )
    from app.extensions import db
    db.session.commit()

    status = ServiceTokenService.get_status(str(token.tenant_id), service_type)
    return jsonify({
        'success': True,
        'tenant_id': str(token.tenant_id),
        'service_type': service_type,
        'allowance': None if status.unlimited else status.allowance,
        'unlimited': bool(status.unlimited),
        'used': int(status.used),
        'remaining': None if status.unlimited else int(status.remaining or 0),
        'token_last4': token.token_last4
    }), 200


def consume_service_token():
    data = request.get_json(silent=True) or {}
    service_type = str(data.get('service_type') or data.get('serviceType') or '').strip().lower()
    if service_type not in SERVICE_TYPES:
        return jsonify({'success': False, 'message': 'Invalid service_type'}), 400

    token_plain = _get_plain_token()
    tenant_hint = request.headers.get('X-Tenant-ID')
    amount = data.get('amount')
    try:
        amount_i = int(amount) if amount is not None else 1
    except Exception:
        amount_i = 1

    status, err, http_status = ServiceTokenService.consume(
        token_plain,
        service_type,
        amount=amount_i,
        tenant_id_hint=tenant_hint
    )
    if err or not status:
        return jsonify({'success': False, 'message': err or 'Invalid token'}), http_status

    return jsonify({
        'success': True,
        'tenant_id': str(status.tenant_id),
        'service_type': status.service_type,
        'allowance': None if status.unlimited else status.allowance,
        'unlimited': bool(status.unlimited),
        'used': int(status.used),
        'remaining': None if status.unlimited else int(status.remaining or 0),
    }), http_status

