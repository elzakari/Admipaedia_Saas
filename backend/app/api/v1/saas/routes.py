from datetime import date, datetime

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from sqlalchemy.exc import IntegrityError
from app.models.tenant import Tenant
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
    if Tenant.query.first() is None:
        return jsonify({'success': True, 'items': []}), 200
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


@saas_bp.route('/tenant/complete-setup', methods=['POST'])
@jwt_required()
def complete_setup():
    from app.utils.tenant_context import resolve_tenant_for_request
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=True)
    if err:
        return jsonify({'success': False, 'message': err}), 403

    if getattr(user, 'role', None) not in ('school_admin', 'admin', 'super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    data = request.get_json() or {}
    
    school_name = data.get('school_name')
    address = data.get('address')
    contact = data.get('contact')
    currency = data.get('currency')
    education_system = data.get('education_system') or data.get('educational_system')
    academic_year_name = data.get('academic_year_name')
    term_name = data.get('term_name')
    term_start_date = data.get('term_start_date')
    term_end_date = data.get('term_end_date')

    # Basic validations
    if not school_name or not str(school_name).strip():
        return jsonify({'success': False, 'message': 'School name is required'}), 400
    if not currency or not str(currency).strip():
        return jsonify({'success': False, 'message': 'Currency code is required'}), 400
    if not education_system or not str(education_system).strip():
        return jsonify({'success': False, 'message': 'Education system framework is required'}), 400
    if not academic_year_name or not str(academic_year_name).strip():
        return jsonify({'success': False, 'message': 'Academic year name is required'}), 400
    if not term_name or not str(term_name).strip():
        return jsonify({'success': False, 'message': 'Term name is required'}), 400
    if not term_start_date or not term_end_date:
        return jsonify({'success': False, 'message': 'Term start and end dates are required'}), 400

    tenant = Tenant.query.filter_by(id=tenant_id).first()
    if not tenant:
        return jsonify({'success': False, 'message': 'Tenant not found'}), 404

    # 1. Update Core Metadata
    tenant.name = str(school_name).strip()
    tenant.currency = str(currency).strip().upper()

    store = getattr(tenant, 'settings', None) or {}
    if not isinstance(store, dict):
        store = {}
    store['address'] = str(address).strip() if address else ''
    store['contact'] = str(contact).strip() if contact else ''
    tenant.settings = store

    # 2. Apply Educational System template & Seeding
    from app.services.educational_system.service import EducationalSystemService
    from app.services.education_initializer import TenantEducationInitializer
    import structlog
    logger = structlog.get_logger()
    try:
        try:
            EducationalSystemService.apply_template_to_tenant(education_system, tenant_id)
        except ValueError as legacy_err:
            logger.warn("legacy_system_setup_skipped", error=str(legacy_err), system=education_system)
        
        # Polymorphic Education Engine Setup
        TenantEducationInitializer.run_setup(tenant_id, education_system)
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to apply educational system: {str(e)}'}), 400

    # 3. First Academic Term Bounds — idempotent upsert (never wipe existing data)
    from datetime import date, timedelta
    from app.models.academic_calendar import AcademicYear, Term

    try:
        t_start = date.fromisoformat(str(term_start_date).strip())
        t_end   = date.fromisoformat(str(term_end_date).strip())
        y_start = t_start
        y_end   = t_start + timedelta(days=365)
    except Exception:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Invalid term start or end date format'}), 400

    # ── Academic Year: look up by name, insert only when absent ──────────
    year_name = str(academic_year_name).strip()
    existing_academic_year = AcademicYear.query.filter_by(name=year_name).first()

    if not existing_academic_year:
        # No matching record — safe to insert a brand-new academic year
        academic_year = AcademicYear(
            name=year_name,
            start_date=y_start,
            end_date=y_end,
            is_current=True
        )
        db.session.add(academic_year)
        db.session.flush()
        active_year_id = academic_year.id
    else:
        # Record already exists — reuse it and ensure the active marker is set
        existing_academic_year.is_current = True
        existing_academic_year.start_date = y_start
        existing_academic_year.end_date   = y_end
        active_year_id = existing_academic_year.id
        academic_year  = existing_academic_year

    # ── Term: same idempotent pattern, scoped to the active year ─────────
    term_name_clean = str(term_name).strip()
    existing_term = Term.query.filter_by(
        academic_year_id=active_year_id,
        name=term_name_clean
    ).first()

    if not existing_term:
        term = Term(
            name=term_name_clean,
            academic_year_id=active_year_id,
            start_date=t_start,
            end_date=t_end,
            is_current=True
        )
        db.session.add(term)
    else:
        # Refresh dates and active marker without creating a duplicate
        existing_term.start_date = t_start
        existing_term.end_date   = t_end
        existing_term.is_current = True


    # 4. Toggle setup completion flag
    tenant.is_setup_completed = True

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Database save failed: {str(e)}'}), 500

    from app.services.saas.serialization import serialize_tenant
    return jsonify({
        'success': True,
        'message': 'School first-time onboarding completed successfully',
        'tenant': serialize_tenant(tenant)
    }), 200


@saas_bp.route('/admissions/<int:form_id>/status', methods=['PATCH'])
@jwt_required()
def patch_admission_status(form_id):
    """
    Unified route to update the status of an AdmissionApplication.
    Handles 'submitted', 'returned', and 'approved' state transitions.
    """
    from app.models.user import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    from app.models.admission import AdmissionApplication
    application = AdmissionApplication.query.filter_by(id=form_id).with_for_update().first()
    if not application:
        return jsonify({'success': False, 'message': 'Admission application not found'}), 404

    data = request.get_json() or {}
    next_status = data.get('status')
    notes = data.get('notes')

    if not next_status:
        return jsonify({'success': False, 'message': 'status parameter is required'}), 400

    if next_status not in ('submitted', 'returned', 'approved', 'under_review', 'rejected'):
        return jsonify({'success': False, 'message': f'Invalid status: {next_status}'}), 400

    # 1. State Rule: 'submitted'
    if next_status == 'submitted':
        # Only parents can submit their own forms
        if user.role != 'parent':
            return jsonify({'success': False, 'message': 'Only parents can submit applications'}), 403
        from app.models.parent import Parent
        parent = Parent.query.filter_by(user_id=user_id).first()
        if not parent or application.parent_id != parent.id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        if application.payment_status != 'paid':
            return jsonify({'success': False, 'message': 'Form not paid for'}), 400
        if application.status not in ('draft', 'returned'):
            return jsonify({'success': False, 'message': 'Application is already submitted or processed'}), 400

        # Form locks on submission
        application.status = 'submitted'
        application.submission_date = datetime.utcnow()
        if 'form_data' in data:
            application.form_data = data['form_data']

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500

        return jsonify({
            'success': True,
            'message': 'Application submitted successfully',
            'data': {'id': application.id, 'status': application.status}
        }), 200

    # 2. State Rules for Admins ('returned', 'approved', 'under_review', 'rejected')
    if user.role not in ('admin', 'school_admin', 'super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    # State Rule: 'returned'
    if next_status == 'returned':
        # Unlocks the form for editing and injects review notes into form metadata
        form_data = dict(application.form_data or {})
        if isinstance(form_data, str):
            import json
            try:
                form_data = json.loads(form_data)
            except Exception:
                form_data = {}
        if not isinstance(form_data, dict):
            form_data = {}

        review_block = form_data.get('_review', {})
        review_block.update({
            'status': 'returned',
            'notes': notes,
            'reviewed_at': datetime.utcnow().isoformat()
        })
        form_data['_review'] = review_block
        application.form_data = form_data
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(application, 'form_data')
        application.status = 'returned'

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500

        return jsonify({
            'success': True,
            'message': 'Application returned to parent with feedback',
            'data': {'id': application.id, 'status': application.status}
        }), 200

    # State Rule: 'approved'
    if next_status == 'approved':
        if application.status == 'approved':
            from app.models.student import Student
            existing_student = Student.query.filter_by(
                parent_id=application.parent_id,
                first_name=application.student_first_name,
                last_name=application.student_last_name
            ).first()
            return jsonify({
                'success': True,
                'message': 'Application already approved successfully.',
                'data': {
                    'id': application.id,
                    'status': application.status,
                    'student_id': existing_student.id if existing_student else None
                }
            }), 200

        if application.status == 'draft':
            return jsonify({'success': False, 'message': 'Draft applications cannot be approved'}), 400

        tenant_id = (
            (application.target_class.tenant_id if application.target_class else None) or
            (application.parent.tenant_id if application.parent else None)
        )
        if not tenant_id:
            return jsonify({'success': False, 'message': 'Could not resolve tenant context'}), 400

        # Determine student username first.last[suffix]
        applicant_email = getattr(application, 'email', None)
        if not applicant_email and application.form_data:
            form_dict = application.form_data
            if isinstance(form_dict, str):
                import json
                try:
                    form_dict = json.loads(form_dict)
                except Exception:
                    form_dict = {}
            if isinstance(form_dict, dict):
                applicant_email = form_dict.get('student_email') or form_dict.get('email')

        first_name_str = getattr(application, 'first_name', None) or application.student_first_name or "student"
        last_name_str = getattr(application, 'last_name', None) or application.student_last_name or "user"
        generated_username = f"{first_name_str.lower().strip()}.{last_name_str.lower().strip()}"
        # Replace any spaces or illegal characters
        generated_username = "".join(c for c in generated_username if c.isalnum() or c in ['.', '_', '-'])

        if not applicant_email or not applicant_email.strip():
            # Use admission ID as anchor — guaranteed globally unique (PK), collision-proof
            applicant_email = f"admission-{application.id}@admipaedia.local"
        else:
            # Normalize real email and guard against duplicate registrations
            applicant_email = applicant_email.strip().lower()
            existing_email_user = User.query.filter_by(email=applicant_email).first()
            if existing_email_user:
                return jsonify({
                    'success': False,
                    'message': f'A user account with email {applicant_email} already exists. '
                               'Please verify the applicant details or link to the existing account.'
                }), 409

        username_base = getattr(application, 'username', None) or generated_username
        username = username_base
        from app.models.user import User
        base_username = username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1

        # Generate activation token
        import secrets
        from werkzeug.security import generate_password_hash
        import hashlib
        from datetime import timedelta
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        stub_hash = generate_password_hash(secrets.token_urlsafe(32))

        try:
            # Now safely construct the user model record
            student_user = User(
                username=username,
                email=applicant_email,  # Enforces a non-null string value
                password_hash=stub_hash,
                role='student',
                status='pending_activation',
                password_reset_token=token_hash,
                password_reset_expires=datetime.utcnow() + timedelta(days=7)
            )
            db.session.add(student_user)
            db.session.flush()

            form_data = application.form_data or {}
            if isinstance(form_data, str):
                import json
                try:
                    form_data = json.loads(form_data)
                except Exception:
                    form_data = {}
            if not isinstance(form_data, dict):
                form_data = {}

            # Resolve dob and gender
            dob_raw = form_data.get('dob') or form_data.get('date_of_birth') or form_data.get('dateOfBirth')
            if isinstance(dob_raw, str):
                try:
                    date_of_birth = datetime.strptime(dob_raw.split('T')[0], '%Y-%m-%d').date()
                except Exception:
                    date_of_birth = datetime.now().date()
            else:
                date_of_birth = dob_raw

            gender = str(form_data.get('gender') or 'female').lower()
            if gender in ('m', 'male'):
                gender = 'male'
            elif gender in ('f', 'female'):
                gender = 'female'
            else:
                gender = 'other'

            # Resolve class_id, parent_id, and academic_year_id from nested application data
            classroom_id = form_data.get('classroom_id') or form_data.get('class_id') or application.target_class_id
            academic_year_id = form_data.get('academic_year_id')
            parent_id = form_data.get('parent_id') or application.parent_id

            # Resolve mapping attributes
            address_val = form_data.get('home_address') or form_data.get('address') or form_data.get('residential_address')
            blood_group_val = form_data.get('blood_group') or form_data.get('bloodGroup')
            phone_val = form_data.get('emergency_contact') or form_data.get('phone_number') or form_data.get('phone') or form_data.get('telephone') or form_data.get('student_phone')

            # Build student payload
            student_payload = {
                'tenant_id': tenant_id,
                'user_id': student_user.id,
                'first_name': application.student_first_name or "",
                'last_name': application.student_last_name or "",
                'parent_id': parent_id,
                'class_id': classroom_id,
                'gender': gender,
                'date_of_birth': date_of_birth,
                'status': 'pending_activation',
                'email': applicant_email,
                
                # Unpack form_data mapping
                'address': address_val,
                'residential_address': address_val,
                'blood_group': blood_group_val,
                'phone': phone_val,
                
                # Optional fields from form_data
                'middle_name': form_data.get('middle_name') or form_data.get('middleName'),
                'place_of_birth': form_data.get('place_of_birth') or form_data.get('placeOfBirth'),
                'nationality': form_data.get('nationality'),
                'religious_denomination': form_data.get('religious_denomination') or form_data.get('religiousDenomination'),
                'telephone': form_data.get('telephone') or form_data.get('student_phone') or phone_val,
                'whatsapp': form_data.get('whatsapp'),
                'postal_address': form_data.get('postal_address') or address_val,
            }
            from app.models.student import Student
            if academic_year_id and hasattr(Student, 'academic_year_id'):
                student_payload['academic_year_id'] = academic_year_id


            from app.services.student_service import StudentService
            student_service = StudentService(db.session)
            student, err = student_service.create_student(student_payload, tenant_id=tenant_id)
            if err:
                raise ValueError(err)

            if application.parent and student:
                student.parent = application.parent
                student.parent_id = application.parent.id
                if student not in application.parent.children:
                    application.parent.children.append(student)
                db.session.add(application.parent)
                db.session.add(student)

                # Push a fresh setup task record right as student provisioning fires
                from app.models.parent import ParentChildSetupTask
                setup_task = ParentChildSetupTask(
                    tenant_id=tenant_id,
                    parent_id=application.parent.id,
                    student_id=student.id,
                    status='pending',
                    task_type='child_setup',
                    title=f"Set up account for {student.first_name} {student.last_name}",
                    description=f"Complete the initial portal setup tasks for your child, {student.first_name}."
                )
                db.session.add(setup_task)

            # Store the token inside database using PasswordResetToken model
            from app.models.security import PasswordResetToken
            db.session.add(PasswordResetToken(
                user_id=student_user.id,
                token_hash=token_hash,
                expires_at=datetime.utcnow() + timedelta(days=7),
                is_used=False
            ))

            # Send activation email targeting Associated Parent's email
            parent_email = application.parent.user.email if (application.parent and application.parent.user) else None
            if not parent_email:
                parent_email = form_data.get('father_email') or form_data.get('mother_email')

            if parent_email:
                from app.services.email_service import send_student_activation_email
                send_student_activation_email(parent_email, username, raw_token)

            # Send activation email to student if student_email provided
            if applicant_email and not applicant_email.endswith('@admipaedia.local'):
                try:
                    from app.services.email_service import send_password_reset_email
                    send_password_reset_email(applicant_email, raw_token)
                except Exception:
                    pass

            # Update status
            application.status = 'approved'
            db.session.commit()

        except IntegrityError as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Student record conflict: a user with the same email or username already exists. '
                           'This may indicate a duplicate approval attempt.',
                'detail': str(e.orig) if hasattr(e, 'orig') else str(e)
            }), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Student record generation failed: {str(e)}'}), 500

        from app.schemas.admission import AdmissionApplicationSchema
        return jsonify({
            'success': True,
            'message': 'Application approved and student account initialized',
            'data': AdmissionApplicationSchema().dump(application)
        }), 200

    # 3. Handle simple statuses: under_review, rejected
    application.status = next_status
    form_data = dict(application.form_data or {})
    if isinstance(form_data, str):
        import json
        try:
            form_data = json.loads(form_data)
        except Exception:
            form_data = {}
    review_block = form_data.get('_review', {})
    review_block.update({
        'status': next_status,
        'notes': notes,
        'reviewed_at': datetime.utcnow().isoformat()
    })
    form_data['_review'] = review_block
    application.form_data = form_data
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(application, 'form_data')

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

    return jsonify({
        'success': True,
        'message': f'Application status updated to {next_status}',
        'data': {'id': application.id, 'status': application.status}
    }), 200
