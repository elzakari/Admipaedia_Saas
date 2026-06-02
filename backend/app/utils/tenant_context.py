import uuid
from functools import wraps
from typing import Optional, Tuple

from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User
from app.models.tenant import Tenant, TenantMembership


def _parse_uuid(value: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(str(value))
    except Exception:
        return None


def _get_requested_tenant_id() -> Optional[uuid.UUID]:
    # 1. Primary check: Extract from custom proxy headers
    header_value = request.headers.get('X-Tenant-ID') or request.headers.get('X-Tenant-Id')
    if header_value:
        return _parse_uuid(header_value.strip())

    # 2. Secondary check: Extract from raw URL query parameters
    qp_value = request.args.get('tenant_id') or request.args.get('tenantId')
    if qp_value:
        return _parse_uuid(str(qp_value).strip())

    # 3. Root Level Fallback: Contextual lookup via token identity data tables
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id is not None:
            user = User.query.get(user_id)
            if user:
                # Direct lookup if user is a teacher
                if user.role == 'teacher':
                    from app.models import Teacher
                    profile = Teacher.query.filter_by(user_id=user.id).first()
                    if profile and profile.tenant_id:
                        return _parse_uuid(profile.tenant_id)
                
                # Direct lookup if user is a student
                elif user.role == 'student':
                    from app.models import Student
                    profile = Student.query.filter_by(user_id=user.id).first()
                    if profile and profile.tenant_id:
                        return _parse_uuid(profile.tenant_id)
    except Exception:
        pass

    return None


def resolve_tenant_for_request(require_explicit: bool = True) -> Tuple[Optional[uuid.UUID], Optional[User], Optional[str]]:
    verify_jwt_in_request()
    user_id = get_jwt_identity()
    user = User.query.get(user_id) if user_id is not None else None
    if not user:
        return None, None, 'Authentication required'

    requested = _get_requested_tenant_id()
    if requested is None:
        if not require_explicit:
            return None, user, None
        memberships = TenantMembership.query.filter_by(user_id=user.id, status='active').all()
        if len(memberships) == 1:
            return memberships[0].tenant_id, user, None
        return None, user, 'Tenant context required'

    if user.role in ('super_admin', 'super_manager'):
        exists = Tenant.query.filter_by(id=requested).first()
        if not exists:
            return None, user, 'Tenant not found'
        return requested, user, None

    membership = TenantMembership.query.filter_by(user_id=user.id, tenant_id=requested, status='active').first()
    if not membership:
        return None, user, 'Tenant access denied'
    return requested, user, None


def tenant_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if Tenant.query.first() is None:
            g.tenant_id = None
            g.current_user = None
            g.branch_id = None
            return fn(*args, **kwargs)

        tenant_id, user, err = resolve_tenant_for_request(require_explicit=True)
        if err:
            return jsonify({'success': False, 'message': err}), 400 if err == 'Tenant context required' else 403
        g.tenant_id = tenant_id
        g.current_user = user

        # Parse X-Branch-ID header contextually
        branch_id_val = request.headers.get('X-Branch-ID') or request.headers.get('X-Branch-Id')
        if branch_id_val:
            try:
                g.branch_id = uuid.UUID(branch_id_val.strip())
            except Exception:
                g.branch_id = None
        else:
            g.branch_id = None

        return fn(*args, **kwargs)

    return wrapper
