from __future__ import annotations

from functools import wraps
from typing import Callable, Iterable, Sequence

from flask import g, jsonify

from app.models.tenant import Tenant
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


def has_any_feature_access(
    school_id,
    feature_keys: Iterable[str],
    *,
    allow_if_unconfigured: bool = False,
    fallback_plan_slugs: Sequence[str] | None = None,
) -> bool:
    normalized_feature_keys = [str(feature_key).strip() for feature_key in feature_keys if str(feature_key).strip()]
    if not normalized_feature_keys:
        return True

    features, _err = EntitlementService.getSchoolFeatures(school_id)
    if isinstance(features, dict) and features:
        return any(bool(features.get(feature_key)) for feature_key in normalized_feature_keys)

    tenant = Tenant.query.get(school_id)
    enabled_features = getattr(tenant, 'enabled_features', None) or []
    normalized_enabled_features = {
        str(feature_key).strip()
        for feature_key in enabled_features
        if str(feature_key).strip()
    }
    if normalized_enabled_features:
        return any(feature_key in normalized_enabled_features for feature_key in normalized_feature_keys)

    if tenant and fallback_plan_slugs:
        normalized_plan = str(getattr(tenant, 'plan', '') or '').strip().lower()
        if normalized_plan in {str(plan_slug).strip().lower() for plan_slug in fallback_plan_slugs if str(plan_slug).strip()}:
            return True

    return bool(allow_if_unconfigured)


def require_any_feature(
    feature_keys: Iterable[str],
    *,
    allow_if_unconfigured: bool = False,
    fallback_plan_slugs: Sequence[str] | None = None,
    message: str = 'This feature is not available on your current plan.',
):
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            school_id = getattr(g, 'tenant_id', None)
            if not school_id:
                return jsonify({'success': False, 'message': 'Tenant context required'}), 400

            if not has_any_feature_access(
                school_id,
                feature_keys,
                allow_if_unconfigured=allow_if_unconfigured,
                fallback_plan_slugs=fallback_plan_slugs,
            ):
                return jsonify({'success': False, 'message': message}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator

