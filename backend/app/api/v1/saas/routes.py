from datetime import date

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.api.v1.saas import saas_bp
from app.services.saas import SaaSService
from app.utils.platform_access import require_platform_super_admin
from app.services.integrations.token_service import ServiceTokenService, SERVICE_TYPES, current_period_ym
from app.models.service_tokens import TenantServiceToken, TenantServiceTokenEvent, TenantServiceTokenUsage


def _parse_date(value):
    if value is None or value == '':
        return None
    try:
        return date.fromisoformat(value)
    except Exception:
        return None


@saas_bp.route('/tenants', methods=['POST'])
@jwt_required()
def create_tenant():
    user_id = get_jwt_identity()
    from app.models.user import User
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    data = request.get_json() or {}
    tenant, err = SaaSService.create_tenant(
        creator_user_id=int(user_id),
        name=data.get('name'),
        slug=data.get('slug'),
        country_code=data.get('country_code'),
        currency=data.get('currency')
    )
    if err:
        return jsonify({'success': False, 'message': err}), 400
    return jsonify({'success': True, 'tenant': SaaSService.serialize_tenant(tenant)}), 201


@saas_bp.route('/tenants', methods=['GET'])
@jwt_required()
def list_my_tenants():
    user_id = get_jwt_identity()
    return jsonify({'success': True, 'items': SaaSService.get_user_tenants(int(user_id))}), 200


@saas_bp.route('/tenants/<tenant_id>', methods=['GET'])
@jwt_required()
def get_tenant(tenant_id):
    user_id = get_jwt_identity()
    tenant, membership, err = SaaSService.get_tenant_for_user(int(user_id), tenant_id)
    if err:
        return jsonify({'success': False, 'message': err}), 404
    if not membership:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    return jsonify({
        'success': True,
        'tenant': SaaSService.serialize_tenant(tenant),
        'membership': {'role': membership.role, 'status': membership.status}
    }), 200


@saas_bp.route('/tenants/<tenant_id>', methods=['PATCH'])
@jwt_required()
def patch_tenant(tenant_id):
    user_id = get_jwt_identity()
    updates = request.get_json() or {}
    tenant, err = SaaSService.update_tenant(int(user_id), tenant_id, updates)
    if err:
        status = 403 if err == 'Unauthorized' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({'success': True, 'tenant': SaaSService.serialize_tenant(tenant)}), 200


@saas_bp.route('/tenants/<tenant_id>/members', methods=['GET'])
@jwt_required()
def list_members(tenant_id):
    user_id = get_jwt_identity()
    members, err = SaaSService.list_members(int(user_id), tenant_id)
    if err:
        status = 403 if err == 'Unauthorized' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({'success': True, 'members': members}), 200


@saas_bp.route('/tenants/<tenant_id>/invitations', methods=['POST'])
@jwt_required()
def create_invitation(tenant_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    invite, err = SaaSService.create_invitation(
        inviter_user_id=int(user_id),
        tenant_id=tenant_id,
        email=data.get('email'),
        role=data.get('role')
    )
    if err:
        status = 403 if err == 'Unauthorized' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({
        'success': True,
        'invitation': {
            'id': str(invite.id),
            'tenant_id': str(invite.tenant_id),
            'email': invite.email,
            'role': invite.role,
            'token': invite.token,
            'status': invite.status,
            'expires_at': invite.expires_at.isoformat() if invite.expires_at else None
        }
    }), 201


@saas_bp.route('/invitations/accept', methods=['POST'])
@jwt_required()
def accept_invitation():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    membership, err = SaaSService.accept_invitation(int(user_id), data.get('token'))
    if err:
        status = 404 if err in ('Invitation not found',) else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({
        'success': True,
        'membership': {
            'id': str(membership.id),
            'tenant_id': str(membership.tenant_id),
            'user_id': membership.user_id,
            'role': membership.role,
            'status': membership.status
        }
    }), 200


@saas_bp.route('/tenants/<tenant_id>/billing/invoices', methods=['GET'])
@jwt_required()
def list_invoices(tenant_id):
    user_id = get_jwt_identity()
    invoices, err = SaaSService.list_invoices(int(user_id), tenant_id)
    if err:
        status = 403 if err == 'Unauthorized' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({'success': True, 'invoices': invoices}), 200


@saas_bp.route('/tenants/<tenant_id>/billing/invoices', methods=['POST'])
@jwt_required()
def create_invoice(tenant_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    issued_on = _parse_date(data.get('issued_on'))
    if not issued_on:
        return jsonify({'success': False, 'message': 'issued_on is required (YYYY-MM-DD)'}), 400
    due_on = _parse_date(data.get('due_on'))
    inv, err = SaaSService.create_invoice(
        int(user_id),
        tenant_id,
        invoice_number=data.get('invoice_number'),
        amount=data.get('amount'),
        currency=data.get('currency'),
        issued_on=issued_on,
        due_on=due_on
    )
    if err:
        status = 403 if err == 'Unauthorized' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({'success': True, 'invoice': SaaSService.serialize_invoice(inv)}), 201


@saas_bp.route('/tenants/<tenant_id>/billing/payments', methods=['GET'])
@jwt_required()
def list_payments(tenant_id):
    user_id = get_jwt_identity()
    payments, err = SaaSService.list_payments(int(user_id), tenant_id)
    if err:
        status = 403 if err == 'Unauthorized' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({'success': True, 'payments': payments}), 200


@saas_bp.route('/tenants/<tenant_id>/billing/payments', methods=['POST'])
@jwt_required()
def record_payment(tenant_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    paid_on = _parse_date(data.get('paid_on'))
    if not paid_on:
        return jsonify({'success': False, 'message': 'paid_on is required (YYYY-MM-DD)'}), 400
    payment, err = SaaSService.record_payment(
        int(user_id),
        tenant_id,
        invoice_id=data.get('invoice_id'),
        amount=data.get('amount'),
        method=data.get('method'),
        reference=data.get('reference'),
        paid_on=paid_on
    )
    if err:
        status = 403 if err == 'Unauthorized' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({'success': True, 'payment': SaaSService.serialize_payment(payment)}), 201


@saas_bp.route('/platform/tenants', methods=['GET'])
@require_platform_super_admin()
def platform_list_tenants():
    q = request.args.get('q')
    status = request.args.get('status')
    plan = request.args.get('plan')
    country_code = request.args.get('country_code')
    sort = request.args.get('sort')
    page = request.args.get('page', type=int) or 1
    per_page = request.args.get('per_page', type=int) or 50

    result = SaaSService.platform_list_tenants_filtered(
        q=q,
        status=status,
        plan=plan,
        country_code=country_code,
        sort=sort,
        page=page,
        per_page=per_page
    )
    return jsonify({'success': True, **result}), 200


@saas_bp.route('/platform/kpis', methods=['GET'])
@require_platform_super_admin()
def platform_kpis():
    return jsonify({'success': True, 'kpis': SaaSService.platform_kpis()}), 200


@saas_bp.route('/platform/tenants/<tenant_id>', methods=['GET'])
@require_platform_super_admin()
def platform_get_tenant_detail(tenant_id):
    detail, err = SaaSService.platform_get_tenant_detail(tenant_id)
    if err:
        return jsonify({'success': False, 'message': err}), 404
    return jsonify({'success': True, 'detail': detail}), 200


@saas_bp.route('/platform/tenants/<tenant_id>', methods=['PATCH'])
@require_platform_super_admin()
def platform_update_tenant(tenant_id):
    data = request.get_json() or {}
    tenant, err = SaaSService.platform_update_tenant(
        tenant_id,
        status=data.get('status'),
        plan=data.get('plan')
    )
    if err:
        return jsonify({'success': False, 'message': err}), 404
    return jsonify({'success': True, 'tenant': SaaSService.serialize_tenant(tenant)}), 200


@saas_bp.route('/platform/tenants/<tenant_id>/members', methods=['GET'])
@require_platform_super_admin()
def platform_list_members(tenant_id):
    members, err = SaaSService.platform_list_members(tenant_id)
    if err:
        return jsonify({'success': False, 'message': err}), 404
    return jsonify({'success': True, 'members': members}), 200


@saas_bp.route('/platform/tenants/<tenant_id>/service-tokens', methods=['GET'])
@require_platform_super_admin()
def platform_list_service_tokens(tenant_id):
    import uuid
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
    except Exception:
        return jsonify({'success': False, 'message': 'Tenant not found'}), 404
    ServiceTokenService.provision_for_tenant(tenant_id)
    from app.extensions import db
    db.session.commit()

    year, month = current_period_ym()
    tokens = TenantServiceToken.query.filter_by(tenant_id=tenant_uuid).all()
    usage_rows = TenantServiceTokenUsage.query.filter_by(tenant_id=tenant_uuid, year=year, month=month).all()
    usage_by_service = {u.service_type: int(u.used_count or 0) for u in usage_rows}

    items = []
    for t in tokens:
        status = ServiceTokenService.get_status(str(t.tenant_id), t.service_type)
        items.append({
            'id': str(t.id),
            'service_type': t.service_type,
            'status': t.status,
            'token_last4': t.token_last4,
            'monthly_allowance': t.monthly_allowance,
            'unlimited': bool(status.unlimited),
            'used': int(usage_by_service.get(t.service_type, 0)),
            'remaining': None if status.unlimited else int(status.remaining or 0),
            'last_used_at': t.last_used_at.isoformat() if t.last_used_at else None,
            'created_at': t.created_at.isoformat() if t.created_at else None,
            'rotated_at': t.rotated_at.isoformat() if t.rotated_at else None,
        })

    return jsonify({'success': True, 'tokens': items, 'period': {'year': year, 'month': month}}), 200


@saas_bp.route('/platform/tenants/<tenant_id>/service-tokens/provision', methods=['POST'])
@require_platform_super_admin()
def platform_provision_service_tokens(tenant_id):
    from app.models.user import User
    from flask_jwt_extended import get_jwt_identity
    actor_id = get_jwt_identity()
    actor_user_id = int(actor_id) if actor_id else None

    issued = ServiceTokenService.provision_for_tenant(tenant_id, actor_user_id=actor_user_id)
    from app.extensions import db
    db.session.commit()

    if actor_user_id:
        from app.models.security import SecurityEvent
        db.session.add(SecurityEvent(
            event_type='platform.service_tokens.provisioned',
            user_id=actor_user_id,
            ip_address=request.remote_addr,
            endpoint=request.path,
            method=request.method,
            details={'tenant_id': tenant_id, 'issued': {k: ('********' if v else None) for k, v in issued.items()}},
            severity='info'
        ))
        db.session.commit()

    return jsonify({'success': True, 'issued': issued}), 200


@saas_bp.route('/platform/tenants/<tenant_id>/service-tokens/<service_type>/rotate', methods=['POST'])
@require_platform_super_admin()
def platform_rotate_service_token(tenant_id, service_type):
    service_type = str(service_type or '').strip().lower()
    if service_type not in SERVICE_TYPES:
        return jsonify({'success': False, 'message': 'Invalid service type'}), 400

    from flask_jwt_extended import get_jwt_identity
    actor_id = get_jwt_identity()
    actor_user_id = int(actor_id) if actor_id else None

    try:
        token_plain = ServiceTokenService.rotate_token(tenant_id, service_type, actor_user_id=actor_user_id)
        from app.extensions import db
        db.session.commit()
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    if actor_user_id:
        from app.models.security import SecurityEvent
        from app.extensions import db
        db.session.add(SecurityEvent(
            event_type='platform.service_tokens.rotated',
            user_id=actor_user_id,
            ip_address=request.remote_addr,
            endpoint=request.path,
            method=request.method,
            details={'tenant_id': tenant_id, 'service_type': service_type},
            severity='info'
        ))
        db.session.commit()

    return jsonify({'success': True, 'token': token_plain}), 200


@saas_bp.route('/platform/tenants/<tenant_id>/service-tokens/events', methods=['GET'])
@require_platform_super_admin()
def platform_service_token_events(tenant_id):
    service_type = (request.args.get('service_type') or '').strip().lower() or None
    limit = request.args.get('limit', type=int) or 100
    limit = max(1, min(limit, 500))

    q = TenantServiceTokenEvent.query.filter_by(tenant_id=tenant_id)
    if service_type:
        q = q.filter_by(service_type=service_type)
    rows = q.order_by(TenantServiceTokenEvent.created_at.desc()).limit(limit).all()
    return jsonify({
        'success': True,
        'events': [
            {
                'id': str(r.id),
                'tenant_id': str(r.tenant_id) if r.tenant_id else None,
                'token_id': str(r.token_id) if r.token_id else None,
                'service_type': r.service_type,
                'event_type': r.event_type,
                'actor_user_id': r.actor_user_id,
                'ip_address': r.ip_address,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'details': r.details,
            }
            for r in rows
        ]
    }), 200


@saas_bp.route('/platform/tenants/<tenant_id>/members', methods=['POST'])
@require_platform_super_admin()
def platform_upsert_member(tenant_id):
    data = request.get_json() or {}
    membership, err = SaaSService.platform_upsert_member(
        tenant_id=tenant_id,
        email=data.get('email'),
        role=data.get('role'),
        status=data.get('status') or 'active'
    )
    if err:
        status = 404 if err in ('Tenant not found', 'User not found') else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({
        'success': True,
        'membership': {
            'id': str(membership.id),
            'tenant_id': str(membership.tenant_id),
            'user_id': membership.user_id,
            'role': membership.role,
            'status': membership.status
        }
    }), 201


@saas_bp.route('/platform/tenants/<tenant_id>/members/<membership_id>', methods=['PATCH'])
@require_platform_super_admin()
def platform_patch_membership(tenant_id, membership_id):
    updates = request.get_json() or {}
    membership, err = SaaSService.platform_update_membership(tenant_id, membership_id, updates)
    if err:
        status = 404 if 'not found' in err.lower() or err == 'Tenant not found' else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({
        'success': True,
        'membership': {
            'id': str(membership.id),
            'tenant_id': str(membership.tenant_id),
            'user_id': membership.user_id,
            'role': membership.role,
            'status': membership.status
        }
    }), 200


@saas_bp.route('/platform/tenants/<tenant_id>/members/<membership_id>', methods=['DELETE'])
@require_platform_super_admin()
def platform_delete_membership(tenant_id, membership_id):
    err = SaaSService.platform_delete_membership(tenant_id, membership_id)
    if err:
        status = 404 if 'not found' in err.lower() else 400
        return jsonify({'success': False, 'message': err}), status
    return jsonify({'success': True}), 200


@saas_bp.route('/platform/financial/summary', methods=['GET'])
@require_platform_super_admin()
def platform_financial_summary():
    return jsonify({'success': True, 'summary': SaaSService.platform_financial_summary()}), 200


@saas_bp.route('/platform/financial/invoices', methods=['GET'])
@require_platform_super_admin()
def platform_list_invoices():
    result = SaaSService.platform_list_invoices(
        tenant_id=request.args.get('tenant_id'),
        status=request.args.get('status'),
        q=request.args.get('q'),
        date_from=request.args.get('from'),
        date_to=request.args.get('to'),
        page=request.args.get('page', type=int) or 1,
        per_page=request.args.get('per_page', type=int) or 50
    )
    return jsonify({'success': True, **result}), 200


@saas_bp.route('/platform/financial/payments', methods=['GET'])
@require_platform_super_admin()
def platform_list_payments():
    result = SaaSService.platform_list_payments(
        tenant_id=request.args.get('tenant_id'),
        method=request.args.get('method'),
        q=request.args.get('q'),
        date_from=request.args.get('from'),
        date_to=request.args.get('to'),
        page=request.args.get('page', type=int) or 1,
        per_page=request.args.get('per_page', type=int) or 50
    )
    return jsonify({'success': True, **result}), 200


@saas_bp.route('/registration-links/preview', methods=['POST'])
def preview_registration_link():
    data = request.get_json() or {}
    token = str(data.get('token') or '').strip()

    from app.models.security import SchoolRegistrationToken
    reg, err = SchoolRegistrationToken.validate_token(token)
    if err or not reg:
        return jsonify({"error": "Invalid or expired registration context"}), 422

    return jsonify({
        'success': True,
        'registration': {
            'school_name': reg.school_name,
            'school_slug': reg.school_slug,
            'country_code': reg.country_code,
            'currency': reg.currency,
            'admin_email': reg.admin_email,
            'expires_at': reg.expires_at.isoformat() if reg.expires_at else None
        }
    }), 200


@saas_bp.route('/registration-links/complete', methods=['POST'])
def complete_registration_link():
    import traceback
    import sys
    try:
        data = request.get_json() or {}
        token = str(data.get('token') or '').strip()
        admin_name = str(data.get('admin_name') or '').strip()
        password = str(data.get('password') or '').strip()
        confirm_password = str(data.get('confirm_password') or data.get('confirmPassword') or '').strip()

        if not password:
            return jsonify({'success': False, 'message': 'password is required'}), 400
        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match'}), 400

        from app.models.security import SchoolRegistrationToken, PasswordHistory
        reg, err = SchoolRegistrationToken.validate_token(token)
        if err or not reg:
            return jsonify({"error": "Invalid or expired registration context"}), 422

        from app.models.user import User
        email = str(getattr(reg, 'admin_email', '') or '').strip().lower()
        if not email:
            return jsonify({"error": "Invalid or expired registration context"}), 422

        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': 'Email already registered. Please sign in instead.'}), 400

        base_username = (admin_name or email.split('@')[0]).strip()
        base_username = ''.join([c if c.isalnum() or c in ('_', '-') else '_' for c in base_username]).lower()
        base_username = base_username.strip('_-') or email.split('@')[0]

        username = base_username
        suffix = 0
        while User.query.filter_by(username=username).first():
            suffix += 1
            username = f"{base_username}_{suffix}"

        from app.utils.password_security import PasswordSecurity
        is_strong, password_errors = PasswordSecurity.validate_password_strength(password, username=username, email=email)
        if not is_strong:
            return jsonify({
                'success': False,
                'message': 'Password does not meet security requirements',
                'errors': password_errors
            }), 400

        from app.extensions import db
        from app.services.saas.tenant_ops import _create_tenant_and_membership

        try:
            user = User(username=username, email=email)
            user.role = 'admin'
            user.status = 'active'
            if hasattr(user, 'email_verified'):
                user.email_verified = True
            user.set_password_hash(password)
            db.session.add(user)
            db.session.flush()

            db.session.add(PasswordHistory(user_id=user.id, password_hash=user.password_hash))

            tenant, _, tenant_err = _create_tenant_and_membership(
                user=user,
                name=reg.school_name,
                slug=reg.school_slug,
                country_code=reg.country_code,
                currency=reg.currency
            )
            if tenant_err:
                db.session.rollback()
                return jsonify({'success': False, 'message': tenant_err}), 400

            reg.mark_as_used()
            db.session.add(reg)
            db.session.commit()

            from app.services.enhanced_auth_service import EnhancedAuthService
            auth_result = EnhancedAuthService.authenticate_with_security(email=email, password=password)
            auth_result['tenant'] = SaaSService.serialize_tenant(tenant)
            return jsonify(auth_result), 200
        except Exception as e:
            db.session.rollback()
            raise e
    except Exception as e:
        print("!!! CRITICAL REGISTRATION FAILURE !!!", file=sys.stderr)
        tb = traceback.format_exc()
        print(tb, file=sys.stderr)
        with open('crash_dump.txt', 'w') as f:
            f.write(tb)
        return jsonify({"error_debug": str(e), "traceback": tb}), 500
