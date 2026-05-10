from __future__ import annotations

from functools import wraps
from typing import Callable

from flask import g, jsonify

from app.services.entitlements.service import EntitlementError, EntitlementService


def require_feature(feature_key: str):
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            school_id = getattr(g, 'tenant_id', None)
            if not school_id:
                return jsonify({'success': False, 'message': 'Tenant context required'}), 400
            try:
                EntitlementService.enforceFeature(school_id, feature_key)
            except EntitlementError as e:
                return jsonify({'success': False, 'message': e.message}), e.status_code
            return fn(*args, **kwargs)

        return wrapper

    return decorator

