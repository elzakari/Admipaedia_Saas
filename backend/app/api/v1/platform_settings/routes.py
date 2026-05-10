from flask import jsonify, request
from flask_jwt_extended import jwt_required

from app.models.system_setting import SystemSetting
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

    setting = SystemSetting.set_value(key, value, setting_type, description)
    return jsonify({
        'success': True,
        'message': f'Setting {key} updated successfully',
        'data': {setting.key: setting.value}
    }), 200

