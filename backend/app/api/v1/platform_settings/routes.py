from urllib.parse import urlparse

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.security import SecurityEvent
from app.models.system_setting import SystemSetting
from app.models.billing import Plan
from app.utils.platform_access import get_current_user
from app.utils.platform_access import require_platform_super_admin


@jwt_required()
@require_platform_super_admin()
def get_platform_settings():
    keys = request.args.getlist('keys') or request.args.getlist('keys[]')
    if keys:
        rows = SystemSetting.query.filter(SystemSetting.key.in_(keys)).all()
    else:
        rows = SystemSetting.query.all()
    return jsonify({'success': True, 'data': {r.key: r.value for r in rows}}), 200


@jwt_required()
@require_platform_super_admin()
def update_platform_setting():
    data = request.get_json() or {}
    if 'key' not in data or 'value' not in data:
        return jsonify({'success': False, 'message': 'Key and value are required'}), 400

    key = str(data.get('key') or '').strip()
    if not key:
        return jsonify({'success': False, 'message': 'Key is required'}), 400

    value = data.get('value')
    setting_type = str(data.get('setting_type') or 'string')
    description = data.get('description')

    validators = {
        'platform_support_email': lambda v: '@' in str(v).strip() if str(v).strip() else True,
        'platform_terms_url': lambda v: _is_safe_http_url(v),
        'platform_privacy_url': lambda v: _is_safe_http_url(v),
        'tenancy_default_country_code': lambda v: len(str(v).strip()) == 2,
        'tenancy_default_currency': lambda v: len(str(v).strip()) == 3,
        'tenancy_default_invite_expiry_days': lambda v: _is_int_in_range(v, 1, 365),
        'licensing_trial_days': lambda v: _is_int_in_range(v, 0, 365),
        'licensing_default_student_limit': lambda v: _is_int_in_range(v, 0, 1_000_000),
        'licensing_default_plan': lambda v: Plan.query.filter_by(slug=str(v).strip().lower()).first() is not None,
    }
    if key in validators and not validators[key](value):
        return jsonify({'success': False, 'message': f'Invalid value for {key}'}), 400

    setting = SystemSetting.set_value(key, value, setting_type, description)
    actor = get_current_user()
    if actor:
        ev = SecurityEvent(
            event_type='super_admin.platform_setting_updated',
            user_id=getattr(actor, 'id', None),
            ip_address=request.remote_addr,
            endpoint=request.path,
            method=request.method,
            details={'key': key, 'setting_type': setting_type},
            severity='info'
        )
        db.session.add(ev)
        db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Setting {key} updated successfully',
        'data': {setting.key: setting.value}
    }), 200


def _is_safe_http_url(value) -> bool:
    text = str(value or '').strip()
    if not text:
        return True
    try:
        parsed = urlparse(text)
    except Exception:
        return False
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)


def _is_int_in_range(value, minimum: int, maximum: int) -> bool:
    try:
        number = int(str(value).strip())
    except Exception:
        return False
    return minimum <= number <= maximum

