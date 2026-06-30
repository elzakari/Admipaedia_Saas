from datetime import datetime
import uuid

from flask import jsonify, request, g, current_app
from sqlalchemy import or_, func

from app.extensions import db
from app.models.security import SecurityEvent, SchoolRegistrationToken
from app.models.user import User, Role
from app.models.tenant import Tenant, TenantMembership
from app.utils.platform_access import require_platform_super_admin
from app.utils.url_helpers import get_frontend_base_url
from app.services.orphan_cleanup_service import OrphanCleanupService
from app.services.user_deletion_policy_service import UserDeletionPolicyService
from app.services.user_service import SecurePurgeService


def _serialize_school_memberships(memberships):
    serialized = []
    for membership, tenant in memberships:
        serialized.append({
            'membership_id': str(membership.id),
            'tenant_id': str(membership.tenant_id),
            'tenant_name': tenant.name if tenant else None,
            'tenant_slug': tenant.slug if tenant else None,
            'tenant_status': tenant.status if tenant else None,
            'role': membership.role,
            'status': membership.status,
            'created_at': membership.created_at.isoformat() if membership.created_at else None,
        })
    return serialized


def _membership_map_for_user_ids(user_ids):
    ids = [int(user_id) for user_id in set(user_ids or []) if user_id is not None]
    if not ids:
        return {}

    rows = (
        db.session.query(TenantMembership, Tenant)
        .join(Tenant, Tenant.id == TenantMembership.tenant_id)
        .filter(TenantMembership.user_id.in_(ids))
        .order_by(
            TenantMembership.status.asc(),
            TenantMembership.created_at.desc(),
            Tenant.name.asc(),
        )
        .all()
    )

    membership_map = {user_id: [] for user_id in ids}
    for membership, tenant in rows:
        membership_map.setdefault(int(membership.user_id), []).append((membership, tenant))
    return membership_map


def _serialize_user(u: User, memberships=None):
    school_memberships = _serialize_school_memberships(memberships or [])
    active_school_memberships = [membership for membership in school_memberships if membership.get('status') == 'active']
    primary_school = active_school_memberships[0] if active_school_memberships else (school_memberships[0] if school_memberships else None)
    return {
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'status': u.status,
        'created_at': u.created_at.isoformat() if u.created_at else None,
        'updated_at': u.updated_at.isoformat() if u.updated_at else None,
        'last_login': u.last_login.isoformat() if u.last_login else None,
        'school_memberships': school_memberships,
        'school_memberships_count': len(school_memberships),
        'active_school_memberships_count': len(active_school_memberships),
        'primary_school': {
            'tenant_id': primary_school.get('tenant_id'),
            'tenant_name': primary_school.get('tenant_name'),
            'tenant_slug': primary_school.get('tenant_slug'),
            'role': primary_school.get('role'),
            'status': primary_school.get('status'),
        } if primary_school else None,
    }


def _audit(event_type: str, actor_user_id: int, details: dict, severity: str = 'info'):
    event = SecurityEvent(
        event_type=event_type,
        user_id=actor_user_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        endpoint=request.path,
        method=request.method,
        details=details,
        severity=severity,
        created_at=datetime.utcnow(),
    )
    db.session.add(event)


from . import super_admin_bp


@super_admin_bp.route('/overview', methods=['GET'])
@require_platform_super_admin()
def super_admin_overview():
    actor = g.current_user

    total_users = db.session.query(func.count(User.id)).scalar() or 0
    roles = ['super_admin', 'super_manager', 'admin', 'teacher', 'student', 'parent', 'user']
    by_role = {r: 0 for r in roles}
    for role, count in db.session.query(User.role, func.count(User.id)).group_by(User.role).all():
        by_role[role or 'user'] = int(count)

    active_count = User.query.filter_by(status='active').count()
    inactive_count = User.query.filter(User.status != 'active').count()

    recent = SecurityEvent.query.filter(SecurityEvent.event_type.like('super_admin.%'))\
        .order_by(SecurityEvent.created_at.desc()).limit(5).all()

    recent_logs = []
    for ev in recent:
        recent_logs.append({
            'id': ev.id,
            'event_type': ev.event_type,
            'actor_user_id': ev.user_id,
            'created_at': ev.created_at.isoformat() if ev.created_at else None,
            'details': ev.details or {},
        })

    return jsonify({
        'success': True,
        'overview': {
            'total_users': int(total_users),
            'by_role': by_role,
            'by_status': {
                'active': int(active_count),
                'inactive': int(inactive_count),
            },
            'recent_audit': recent_logs,
            'actor': _serialize_user(actor)
        }
    }), 200


@super_admin_bp.route('/school-registration-links', methods=['POST'])
@require_platform_super_admin()
def super_admin_create_school_registration_link():
    actor = g.current_user
    payload = request.get_json() or {}

    school_name = (payload.get('school_name') or '').strip()
    slug_input = (payload.get('school_slug') or payload.get('slug') or '').strip()
    country_code = (payload.get('country_code') or '').strip().upper()
    currency = (payload.get('currency') or 'USD').strip().upper()
    admin_email = (payload.get('admin_email') or '').strip().lower()
    send_email_flag = bool(payload.get('send_email', True))

    if not school_name:
        return jsonify({'success': False, 'error': 'school_name is required'}), 400
    if not admin_email:
        return jsonify({'success': False, 'error': 'admin_email is required'}), 400
    if not country_code or len(country_code) != 2:
        return jsonify({'success': False, 'error': 'country_code must be a 2-letter code'}), 400

    from app.services.saas.tenant_ops import normalize_slug
    school_slug = normalize_slug(slug_input or school_name)
    if not school_slug:
        return jsonify({'success': False, 'error': 'school_slug is required'}), 400

    token, reg = SchoolRegistrationToken.generate_token(
        created_by_user_id=actor.id,
        school_name=school_name,
        school_slug=school_slug,
        country_code=country_code,
        currency=currency,
        admin_email=admin_email,
        expires_in_hours=24
    )

    frontend_url = get_frontend_base_url()
    registration_url = f"{frontend_url}/school/register?token={token}" if frontend_url else f"/school/register?token={token}"

    _audit('super_admin.school_registration_link_created', actor.id, {
        'registration_id': reg.id,
        'school_slug': reg.school_slug,
        'admin_email': reg.admin_email,
        'expires_at': reg.expires_at.isoformat() if reg.expires_at else None
    })
    db.session.commit()

    email_sent = False
    email_queued = False
    if send_email_flag:
        try:
            from app.services.email_service import send_school_registration_email
            email_sent = bool(send_school_registration_email(
                user_email=admin_email,
                registration_url=registration_url,
                school_name=school_name,
                expires_at=reg.expires_at.isoformat() if reg.expires_at else None,
                async_send=True
            ))
            email_queued = True
        except Exception:
            email_sent = False
            email_queued = False

    return jsonify({
        'success': True,
        'registration': {
            'id': reg.id,
            'school_name': reg.school_name,
            'school_slug': reg.school_slug,
            'country_code': reg.country_code,
            'currency': reg.currency,
            'admin_email': reg.admin_email,
            'expires_at': reg.expires_at.isoformat() if reg.expires_at else None,
            'created_at': reg.created_at.isoformat() if reg.created_at else None
        },
        'registration_url': registration_url,
        'email_sent': bool(email_sent),
        'email_queued': bool(email_queued),
        'email_suppressed': bool(current_app.config.get('MAIL_SUPPRESS_SEND'))
    }), 201


@super_admin_bp.route('/users', methods=['GET'])
@require_platform_super_admin()
def super_admin_list_users():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    q = (request.args.get('q') or '').strip()
    role = (request.args.get('role') or '').strip()
    status = (request.args.get('status') or '').strip()
    tenant_id = (request.args.get('tenant_id') or request.args.get('school_id') or '').strip()
    membership_status = (request.args.get('membership_status') or '').strip()

    query = User.query

    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.email.ilike(like), User.username.ilike(like)))

    if role:
        normalized = 'user' if role == 'general' else role
        query = query.filter(User.role == normalized)

    if status:
        if status in ('inactive', 'deactivated'):
            query = query.filter(User.status != 'active')
        else:
            query = query.filter(User.status == status)

    if tenant_id or membership_status:
        membership_user_ids = db.session.query(TenantMembership.user_id)

        if tenant_id:
            try:
                tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
                membership_user_ids = membership_user_ids.filter(TenantMembership.tenant_id == tenant_uuid)
            except Exception:
                query = query.filter(db.text('1=0'))
                membership_user_ids = None

        if membership_user_ids is not None and membership_status:
            membership_user_ids = membership_user_ids.filter(TenantMembership.status == membership_status)

        if membership_user_ids is not None:
            query = query.filter(User.id.in_(membership_user_ids.distinct()))

    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    memberships_by_user = _membership_map_for_user_ids([user.id for user in pagination.items])

    return jsonify({
        'success': True,
        'users': [_serialize_user(u, memberships_by_user.get(u.id, [])) for u in pagination.items],
        'pagination': {
            'total': pagination.total,
            'pages': pagination.pages,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
        }
    }), 200


@super_admin_bp.route('/users', methods=['POST'])
@require_platform_super_admin()
def super_admin_create_user():
    actor = g.current_user
    payload = request.get_json() or {}

    email = (payload.get('email') or '').strip().lower()
    username = (payload.get('username') or '').strip()
    role = (payload.get('role') or 'user').strip()
    status = (payload.get('status') or 'active').strip()
    password = (payload.get('password') or '').strip()
    send_reset = bool(payload.get('send_reset', True))

    if role == 'general':
        role = 'user'

    if role in ('super_admin', 'super_manager') and actor.role != 'super_admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    if not email:
        return jsonify({'success': False, 'error': 'Email is required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'Email already registered'}), 400

    if username and User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'error': 'Username already taken'}), 400

    if not username:
        username = email.split('@')[0]

    from app.utils.password_security import PasswordSecurity
    if not password:
        password = PasswordSecurity.generate_secure_password()

    is_strong, password_errors = PasswordSecurity.validate_password_strength(password, username=username, email=email)
    if not is_strong:
        return jsonify({
            'success': False,
            'error': 'Password does not meet security requirements',
            'errors': password_errors
        }), 400

    user = User(username=username, email=email)
    user.role = role
    user.status = 'active' if status not in ('inactive', 'deactivated') else 'inactive'
    user.set_password_hash(password)
    if hasattr(user, 'force_password_change'):
        user.force_password_change = True

    db.session.add(user)
    db.session.flush()

    role_row = Role.query.filter_by(name=role).first()
    if role_row:
        user.roles.append(role_row)

    from app.models.security import PasswordHistory
    db.session.add(PasswordHistory(user_id=user.id, password_hash=user.password_hash))

    _audit('super_admin.user_created', actor.id, {
        'target_user_id': user.id,
        'email': user.email,
        'role': user.role
    })

    email_sent = False
    if send_reset:
        try:
            from app.models.security import PasswordResetToken
            token = PasswordResetToken.generate_token(
                user_id=user.id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            from app.services.email_service import send_password_reset_email
            frontend_url = get_frontend_base_url()
            email_sent = bool(send_password_reset_email(user.email, token, frontend_url=frontend_url, async_send=True))
            _audit('super_admin.user_reset_sent', actor.id, {
                'target_user_id': user.id,
                'email_sent': email_sent
            })
        except Exception:
            email_sent = False

    db.session.commit()

    return jsonify({
        'success': True,
        'user': _serialize_user(user),
        'email_sent': bool(email_sent)
    }), 201


@super_admin_bp.route('/users/<int:user_id>', methods=['GET'])
@require_platform_super_admin()
def super_admin_get_user(user_id: int):
    user = User.query.get_or_404(user_id)
    return jsonify({'success': True, 'user': _serialize_user(user)}), 200


@super_admin_bp.route('/users/<int:user_id>', methods=['PATCH'])
@require_platform_super_admin()
def super_admin_update_user(user_id: int):
    actor = g.current_user
    target = User.query.get_or_404(user_id)
    payload = request.get_json() or {}

    if target.role in ('super_admin', 'super_manager') and actor.role != 'super_admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    if target.id == actor.id:
        if 'role' in payload and (payload.get('role') or '').strip() != 'super_admin':
            return jsonify({'success': False, 'error': 'Cannot change your own role'}), 400
        if 'status' in payload and (payload.get('status') or '').strip() in ('inactive', 'deactivated'):
            return jsonify({'success': False, 'error': 'Cannot deactivate your own account'}), 400

    old = _serialize_user(target)

    if 'email' in payload:
        new_email = (payload.get('email') or '').strip().lower()
        if not new_email:
            return jsonify({'success': False, 'error': 'Email cannot be empty'}), 400
        if new_email != target.email and User.query.filter_by(email=new_email).first():
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        target.email = new_email

    if 'username' in payload:
        new_username = (payload.get('username') or '').strip()
        if not new_username:
            return jsonify({'success': False, 'error': 'Username cannot be empty'}), 400
        if new_username != target.username and User.query.filter_by(username=new_username).first():
            return jsonify({'success': False, 'error': 'Username already taken'}), 400
        target.username = new_username

    if 'role' in payload:
        new_role = (payload.get('role') or '').strip()
        if new_role == 'general':
            new_role = 'user'
        if new_role:
            if new_role in ('super_admin', 'super_manager') and actor.role != 'super_admin':
                return jsonify({'success': False, 'error': 'Unauthorized'}), 403
            target.role = new_role
            role_row = Role.query.filter_by(name=new_role).first()
            if role_row and role_row not in target.roles:
                target.roles.clear()
                target.roles.append(role_row)

    if 'status' in payload:
        new_status = (payload.get('status') or '').strip()
        if new_status in ('inactive', 'deactivated'):
            target.status = 'inactive'
        elif new_status:
            target.status = new_status

    _audit('super_admin.user_updated', actor.id, {
        'target_user_id': target.id,
        'old': old,
        'new': _serialize_user(target)
    })
    db.session.commit()

    return jsonify({'success': True, 'user': _serialize_user(target)}), 200


@super_admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@require_platform_super_admin()
def super_admin_deactivate_user(user_id: int):
    actor = g.current_user
    target = User.query.get_or_404(user_id)

    if target.id == actor.id:
        return jsonify({'success': False, 'error': 'Cannot deactivate your own account'}), 400
    if target.role in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'error': 'Cannot deactivate this account'}), 400

    target.status = 'inactive'
    _audit('super_admin.user_deactivated', actor.id, {
        'target_user_id': target.id
    }, severity='warning')
    db.session.commit()

    return jsonify({'success': True, 'user': _serialize_user(target)}), 200


@super_admin_bp.route('/users/<int:user_id>/reactivate', methods=['POST'])
@require_platform_super_admin()
def super_admin_reactivate_user(user_id: int):
    actor = g.current_user
    target = User.query.get_or_404(user_id)

    target.status = 'active'
    if hasattr(target, 'account_locked_until'):
        target.account_locked_until = None
    if hasattr(target, 'failed_login_attempts'):
        target.failed_login_attempts = 0

    _audit('super_admin.user_reactivated', actor.id, {
        'target_user_id': target.id
    })
    db.session.commit()

    return jsonify({'success': True, 'user': _serialize_user(target)}), 200


@super_admin_bp.route('/users/<int:user_id>/send-reset', methods=['POST'])
@require_platform_super_admin()
def super_admin_send_password_reset(user_id: int):
    actor = g.current_user
    target = User.query.get_or_404(user_id)

    from app.models.security import PasswordResetToken
    token = PasswordResetToken.generate_token(
        user_id=target.id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )

    data = request.get_json(silent=True) or {}
    send_email = data.get('send_email', True)

    frontend_url = get_frontend_base_url()
    reset_url = f"{frontend_url}/reset-password?token={token}"
    email_sent = False

    if send_email:
        from app.services.email_service import send_password_reset_email
        email_sent = send_password_reset_email(target.email, token, frontend_url=frontend_url, async_send=True)

        _audit('super_admin.user_reset_sent', actor.id, {
            'target_user_id': target.id,
            'email_sent': bool(email_sent)
        })
    else:
        _audit('super_admin.user_reset_link_generated', actor.id, {
            'target_user_id': target.id
        })
    db.session.commit()

    payload = {
        'success': True,
        'email_sent': bool(email_sent) if send_email else False,
        'email_queued': True if (send_email and email_sent) else False,
        'email_suppressed': bool(current_app.config.get('MAIL_SUPPRESS_SEND')) if send_email else False,
        'link': reset_url
    }
    if current_app.debug or current_app.config.get('MAIL_SUPPRESS_SEND') or not send_email:
        payload['reset_url'] = reset_url
    return jsonify(payload), 200


@super_admin_bp.route('/users/<int:user_id>/purge', methods=['POST'])
@require_platform_super_admin()
def super_admin_purge_user(user_id: int):
    actor = g.current_user
    if actor.role != 'super_admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    target = User.query.get_or_404(user_id)
    if target.role == 'super_admin':
        return jsonify({'success': False, 'error': 'Cannot delete a super admin account'}), 400

    payload = request.get_json() or {}
    confirm_text = (payload.get('confirm_text') or payload.get('confirmText') or '').strip()
    normalized_confirm = " ".join(confirm_text.split()).lower()
    expected_delete = f"DELETE {target.email}".strip()
    expected_anonymize = f"ANONYMIZE {target.email}".strip()
    normalized_expected_delete = " ".join(expected_delete.split()).lower()
    normalized_expected_anonymize = " ".join(expected_anonymize.split()).lower()

    mode = 'delete'
    if normalized_confirm == normalized_expected_anonymize:
        mode = 'anonymize'
    elif normalized_confirm != normalized_expected_delete:
        return jsonify({'success': False, 'error': 'Confirmation text mismatch', 'expected': expected_delete, 'expected_anonymize': expected_anonymize}), 400

    try:
        delete_status = UserDeletionPolicyService.get_delete_status(user_id, actor.id)
        if mode == 'delete':
            if not delete_status.get('can_delete') or delete_status.get('mode') != 'purge':
                status_payload = dict(delete_status)
                status_payload['expected_anonymize'] = expected_anonymize
                status_payload['can_anonymize'] = True
                return jsonify({'success': False, 'error': 'Cannot delete user', 'status': status_payload}), 400
        if mode == 'anonymize':
            ok, result = OrphanCleanupService.anonymize_user(user_id, actor_user_id=actor.id)
        else:
            ok, result = OrphanCleanupService.purge_user(user_id, actor_user_id=actor.id)
        if not ok:
            status_payload = dict(result or {})
            status_payload['expected_anonymize'] = expected_anonymize
            status_payload['can_anonymize'] = True
            return jsonify({'success': False, 'error': 'Cannot delete user', 'status': status_payload}), 400

        if mode == 'anonymize':
            _audit('super_admin.user_anonymized', actor.id, {'user_id': user_id}, severity='warning')
        else:
            _audit('super_admin.user_purged', actor.id, {
                'user_id': user_id,
                'deleted': result.get('deleted')
            }, severity='critical')
        db.session.commit()
        return jsonify({'success': True, 'result': result}), 200
    except Exception as e:
        db.session.rollback()
        try:
            current_app.logger.exception('super_admin_purge_user failed')
        except Exception:
            pass
        payload = {'success': False, 'error': 'Failed to delete user'}
        if current_app.debug:
            payload['detail'] = str(e)
            payload['error_type'] = type(e).__name__
        return jsonify(payload), 500


@super_admin_bp.route('/audit-logs', methods=['GET'])
@require_platform_super_admin()
def super_admin_audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    q = (request.args.get('q') or '').strip()
    event_type = (request.args.get('event_type') or '').strip()
    actor_user_id = request.args.get('actor_user_id', type=int)
    target_user_id = request.args.get('target_user_id', type=int)
    date_from = (request.args.get('from') or '').strip()
    date_to = (request.args.get('to') or '').strip()

    query = SecurityEvent.query.filter(SecurityEvent.event_type.like('super_admin.%'))
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type)
    if actor_user_id:
        query = query.filter(SecurityEvent.user_id == actor_user_id)
    if date_from:
        try:
            query = query.filter(SecurityEvent.created_at >= datetime.fromisoformat(date_from))
        except Exception:
            pass
    if date_to:
        try:
            query = query.filter(SecurityEvent.created_at <= datetime.fromisoformat(date_to))
        except Exception:
            pass
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            SecurityEvent.event_type.ilike(like),
            SecurityEvent.endpoint.ilike(like),
            SecurityEvent.details.cast(db.String).ilike(like)
        ))
    if target_user_id:
        like = f"%\"target_user_id\": {target_user_id}%"
        query = query.filter(SecurityEvent.details.cast(db.String).ilike(like))

    query = query.order_by(SecurityEvent.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    items = []
    for ev in pagination.items:
        items.append({
            'id': ev.id,
            'event_type': ev.event_type,
            'actor_user_id': ev.user_id,
            'severity': ev.severity,
            'endpoint': ev.endpoint,
            'method': ev.method,
            'ip_address': ev.ip_address,
            'created_at': ev.created_at.isoformat() if ev.created_at else None,
            'details': ev.details or {},
        })

    return jsonify({
        'success': True,
        'logs': items,
        'pagination': {
            'total': pagination.total,
            'pages': pagination.pages,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
        }
    }), 200


@super_admin_bp.route('/audit-logs/event-types', methods=['GET'])
@require_platform_super_admin()
def super_admin_audit_log_event_types():
    rows = (
        db.session.query(SecurityEvent.event_type)
        .filter(SecurityEvent.event_type.like('super_admin.%'))
        .distinct()
        .order_by(SecurityEvent.event_type.asc())
        .all()
    )
    return jsonify({
        'success': True,
        'event_types': [row[0] for row in rows if row and row[0]],
    }), 200


@super_admin_bp.route('/orphans/tenants/<tenant_id>', methods=['GET'])
@require_platform_super_admin()
def super_admin_get_orphan_tenant_status(tenant_id: str):
    status = OrphanCleanupService.get_orphan_tenant_status(tenant_id)
    code = 200 if status.get('exists') else 404
    return jsonify({'success': True, 'status': status}), code


@super_admin_bp.route('/orphans/tenants/<tenant_id>', methods=['DELETE'])
@require_platform_super_admin()
def super_admin_delete_orphan_tenant(tenant_id: str):
    actor = g.current_user
    confirm = (request.args.get('confirm') or '').strip().lower() in ('1', 'true', 'yes')
    if not confirm:
        return jsonify({'success': False, 'error': 'confirm=true is required for permanent deletion'}), 400

    try:
        ok, result = OrphanCleanupService.delete_orphan_tenant(tenant_id)
        if not ok:
            return jsonify({'success': False, 'status': result}), 400

        _audit('super_admin.orphan_tenant_deleted', actor.id, {
            'tenant_id': result.get('tenant_id'),
            'deleted': result.get('deleted')
        }, severity='warning')
        db.session.commit()
        return jsonify({'success': True, 'result': result}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to delete orphan tenant'}), 500


@super_admin_bp.route('/tenants/<tenant_id>/purge', methods=['POST'])
@require_platform_super_admin()
def super_admin_purge_tenant(tenant_id: str):
    actor = g.current_user
    if actor.role != 'super_admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    target = Tenant.query.get_or_404(OrphanCleanupService._parse_tenant_id(tenant_id))
    payload = request.get_json() or {}
    confirm_text = (payload.get('confirm_text') or payload.get('confirmText') or '').strip()
    expected = f"DELETE {target.slug or str(target.id)}".strip()
    normalized_confirm = " ".join(confirm_text.split()).lower()
    normalized_expected = " ".join(expected.split()).lower()
    if normalized_confirm != normalized_expected:
        return jsonify({'success': False, 'error': 'Confirmation text mismatch', 'expected': expected}), 400

    try:
        ok, result = OrphanCleanupService.purge_tenant(tenant_id, actor_user_id=actor.id)
        if not ok:
            return jsonify({'success': False, 'error': 'Cannot delete school', 'status': result}), 400

        _audit('super_admin.tenant_purged', actor.id, {
            'tenant_id': tenant_id,
            'deleted': result.get('deleted')
        }, severity='critical')
        db.session.commit()
        return jsonify({'success': True, 'result': result}), 200
    except Exception as e:
        db.session.rollback()
        try:
            current_app.logger.exception('super_admin_purge_tenant failed')
        except Exception:
            pass
        payload = {'success': False, 'error': 'Failed to delete school'}
        if current_app.debug:
            payload['detail'] = str(e)
            payload['error_type'] = type(e).__name__
        return jsonify(payload), 500


@super_admin_bp.route('/tenants/<tenant_id>/purge-status', methods=['GET'])
@require_platform_super_admin()
def super_admin_get_tenant_purge_status(tenant_id: str):
    status = OrphanCleanupService.get_tenant_purge_status(tenant_id)
    code = 200 if status.get('exists') else 404
    return jsonify({'success': True, 'status': status}), code


@super_admin_bp.route('/orphans/users/<int:user_id>', methods=['GET'])
@require_platform_super_admin()
def super_admin_get_orphan_user_status(user_id: int):
    try:
        status = OrphanCleanupService.get_orphan_user_status(user_id)
        code = 200 if status.get('exists') else 404
        return jsonify({'success': True, 'status': status}), code
    except Exception:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to fetch orphan user status'}), 500


@super_admin_bp.route('/orphans/users/<int:user_id>', methods=['DELETE'])
@require_platform_super_admin()
def super_admin_delete_orphan_user(user_id: int):
    actor = g.current_user
    confirm = (request.args.get('confirm') or '').strip().lower() in ('1', 'true', 'yes')
    if not confirm:
        return jsonify({'success': False, 'error': 'confirm=true is required for permanent deletion'}), 400

    try:
        ok, result = OrphanCleanupService.delete_orphan_user(user_id, actor_user_id=actor.id)
        if not ok:
            return jsonify({'success': False, 'status': result}), 400

        _audit('super_admin.orphan_user_deleted', actor.id, {
            'user_id': user_id,
            'deleted': result.get('deleted')
        }, severity='warning')
        db.session.commit()
        return jsonify({'success': True, 'result': result}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to delete orphan user'}), 500


@super_admin_bp.route('/users/<int:user_id>/delete-status', methods=['GET'])
@require_platform_super_admin()
def super_admin_get_user_delete_status(user_id: int):
    actor = g.current_user
    status = UserDeletionPolicyService.get_delete_status(user_id, actor.id)
    code = 200 if status.get('exists') else 404
    return jsonify({'success': True, 'status': status}), code


@super_admin_bp.route('/users/<int:user_id>/force-purge', methods=['POST', 'DELETE'])
@require_platform_super_admin()
def super_admin_force_purge_user(user_id: int):
    actor = g.current_user
    if not actor or actor.role not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    ok, result = SecurePurgeService.force_purge_user(user_id, actor_user_id=actor.id)
    if not ok:
        return jsonify({'success': False, 'error': result.get('error', 'Force purge failed'), 'detail': result}), 400

    _audit('super_admin.user_force_purged', actor.id, {
        'user_id': user_id,
        'purged': True
    }, severity='critical')
    return jsonify({'success': True, 'result': result}), 200

