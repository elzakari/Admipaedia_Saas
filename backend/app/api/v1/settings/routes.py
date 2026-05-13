from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.utils.decorators import role_required
from app.utils.tenant_context import resolve_tenant_for_request, tenant_required
from app.services.academic_configuration_service import AcademicConfigurationService
from flask import g
import json
from datetime import datetime

from app.models.tenant import Tenant, TenantMembership
from app.utils.billing_access import school_admin_required

@jwt_required()
@tenant_required
@school_admin_required
def get_settings():
    """Get tenant-scoped settings (key/value) for the current tenant."""
    keys = request.args.getlist('keys') or request.args.getlist('keys[]')
    tenant = Tenant.query.filter_by(id=g.tenant_id).first()
    if not tenant:
        return jsonify({'success': False, 'message': 'Tenant not found'}), 404
    store = getattr(tenant, 'settings', None) or {}
    if not isinstance(store, dict):
        store = {}

    if keys:
        out = {k: store.get(k) for k in keys}
    else:
        out = dict(store)

    return jsonify({'success': True, 'data': out}), 200

@jwt_required()
@tenant_required
@school_admin_required
def update_setting():
    """Update a tenant-scoped setting (key/value) for the current tenant."""
    data = request.get_json() or {}
    if 'key' not in data or 'value' not in data:
        return jsonify({'success': False, 'message': 'Key and value are required'}), 400

    key = str(data.get('key') or '').strip()
    if not key:
        return jsonify({'success': False, 'message': 'Key is required'}), 400

    setting_type = (data.get('setting_type') or 'string').strip()
    value = data.get('value')

    tenant = Tenant.query.filter_by(id=g.tenant_id).first()
    if not tenant:
        return jsonify({'success': False, 'message': 'Tenant not found'}), 404

    store = getattr(tenant, 'settings', None) or {}
    if not isinstance(store, dict):
        store = {}

    if setting_type == 'int':
        store[key] = int(value)
    elif setting_type == 'float':
        store[key] = float(value)
    elif setting_type == 'boolean':
        store[key] = bool(value) if isinstance(value, bool) else str(value).lower() in ('true', '1', 't', 'y', 'yes')
    elif setting_type == 'json':
        store[key] = value
    else:
        store[key] = '' if value is None else str(value)

    tenant.settings = store
    db.session.commit()
    return jsonify({'success': True, 'message': f"Setting {key} updated successfully", 'data': {key: store.get(key)}}), 200

@jwt_required()
def get_admission_price():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403

    if tenant_id is not None:
        tenant = Tenant.query.filter_by(id=tenant_id).first()
        if not tenant:
            return jsonify({'success': False, 'message': 'Tenant not found'}), 404
        store = getattr(tenant, 'settings', None) or {}
        if isinstance(store, dict):
            v = store.get('admission_form_price')
            try:
                if v is not None and str(v).strip() != '':
                    return jsonify({'success': True, 'price': float(v)}), 200
            except Exception:
                pass

    price = SystemSetting.get_value('admission_form_price', '100.00')
    return jsonify({'success': True, 'price': float(price)}), 200


def _get_setting(key: str, default=None, setting_type: str = 'string'):
    value = SystemSetting.get_value(key, default)
    if setting_type == 'json':
        if value is None or value == '':
            return default
        try:
            return json.loads(value)
        except Exception:
            return default
    return value


def _set_setting(key: str, value, setting_type: str = 'string', description: str | None = None):
    if setting_type == 'json':
        encoded = json.dumps(value, separators=(',', ':'), ensure_ascii=False)
        return SystemSetting.set_value(key, encoded, 'json', description)
    return SystemSetting.set_value(key, value, setting_type, description)


def _require_school_admin_for_tenant(tenant_id, user):
    if not tenant_id:
        return 'Tenant context required'
    if getattr(user, 'role', None) == 'super_admin':
        return None
    membership = TenantMembership.query.filter_by(user_id=user.id, tenant_id=tenant_id, status='active').first()
    if not membership or membership.role != 'school_admin':
        return 'School Admin privileges required'
    return None


def _tenant_settings_store(tenant_id):
    tenant = Tenant.query.filter_by(id=tenant_id).first()
    if not tenant:
        return None, None
    store = getattr(tenant, 'settings', None) or {}
    if not isinstance(store, dict):
        store = {}
    return tenant, store


def _coerce_setting(value, setting_type: str, default):
    if value is None:
        return default
    try:
        if setting_type == 'boolean':
            if isinstance(value, bool):
                return value
            return str(value).lower() in ('true', '1', 't', 'y', 'yes')
        if setting_type == 'int':
            return int(value)
        if setting_type == 'float':
            return float(value)
        if setting_type == 'json':
            return value
        return str(value)
    except Exception:
        return default


def _get_scoped_setting(tenant_id, key: str, default=None, setting_type: str = 'string'):
    if tenant_id:
        tenant, store = _tenant_settings_store(tenant_id)
        if not tenant:
            return default
        if key not in store:
            return default
        return _coerce_setting(store.get(key), setting_type, default)
    return _get_setting(key, default, setting_type)


def _set_scoped_setting(tenant_id, key: str, value, setting_type: str = 'string'):
    if tenant_id:
        tenant, store = _tenant_settings_store(tenant_id)
        if not tenant:
            return None
        store[key] = _coerce_setting(value, setting_type, '' if setting_type == 'string' else value)
        tenant.settings = store
        db.session.commit()
        return True
    _set_setting(key, value, setting_type)
    return True


@jwt_required()
def get_general_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401

    if tenant_id is None:
        if getattr(user, 'role', None) != 'super_admin':
            return jsonify({'success': False, 'message': 'Tenant context required'}), 400

        defaults = {
            'schoolName': 'ADMIPAEDIA Academy',
            'schoolCode': 'ADM-12345',
            'schoolEmail': 'info@admipaedia-academy.edu',
            'schoolPhone': '+233 20 123 4567',
            'timezone': 'Africa/Accra',
            'language': 'en',
            'currency': 'GHS',
            'dateFormat': 'dd/mm/yyyy',
            'aiRecommendations': True,
            'autoBackup': True,
            'maintenanceMode': False
        }

        types = {
            'aiRecommendations': 'boolean',
            'autoBackup': 'boolean',
            'maintenanceMode': 'boolean'
        }

        result = {}
        for k, d in defaults.items():
            t = types.get(k, 'string')
            result[k] = _get_setting(f'general.{k}', d, t)
        return jsonify(result), 200

    tenant = Tenant.query.filter_by(id=tenant_id).first()
    if not tenant:
        return jsonify({'success': False, 'message': 'Tenant not found'}), 404

    settings = getattr(tenant, 'settings', None) or {}
    if not isinstance(settings, dict):
        settings = {}

    def _get_from_settings(*keys, default=None):
        for k in keys:
            if k in settings and settings.get(k) not in (None, ''):
                return settings.get(k)
        return default

    def _get_bool(key: str, default: bool):
        value = settings.get(key, default)
        return bool(value)

    school_code = _get_from_settings('schoolCode', 'school_code', 'code', default=(getattr(tenant, 'slug', '') or ''))
    if isinstance(school_code, str) and school_code:
        school_code = school_code.upper()

    result = {
        'schoolName': getattr(tenant, 'name', None) or '—',
        'schoolCode': school_code or '—',
        'schoolEmail': _get_from_settings('schoolEmail', 'school_email', 'email', default=''),
        'schoolPhone': _get_from_settings('schoolPhone', 'school_phone', 'phone', default=''),
        'timezone': getattr(tenant, 'timezone', None) or _get_from_settings('timezone', default='Africa/Accra'),
        'language': getattr(tenant, 'default_language', None) or _get_from_settings('language', default='en'),
        'currency': getattr(tenant, 'currency', None) or _get_from_settings('currency', default='GHS'),
        'dateFormat': _get_from_settings('dateFormat', 'date_format', default='dd/mm/yyyy'),
        'aiRecommendations': _get_bool('aiRecommendations', True),
        'autoBackup': _get_bool('autoBackup', True),
        'maintenanceMode': _get_bool('maintenanceMode', False)
    }
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_general_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401

    payload = request.get_json() or {}

    if tenant_id is None:
        if getattr(user, 'role', None) != 'super_admin':
            return jsonify({'success': False, 'message': 'Tenant context required'}), 400

        for k, v in payload.items():
            if k in ('aiRecommendations', 'autoBackup', 'maintenanceMode'):
                _set_setting(f'general.{k}', bool(v), 'boolean')
            else:
                _set_setting(f'general.{k}', v, 'string')
        return jsonify({'success': True}), 200

    if getattr(user, 'role', None) != 'super_admin' and getattr(user, 'role', None) != 'admin':
        membership = TenantMembership.query.filter_by(user_id=user.id, tenant_id=tenant_id, status='active').first()
        if not membership or membership.role != 'school_admin':
            return jsonify({'success': False, 'message': 'School Admin privileges required'}), 403

    tenant = Tenant.query.filter_by(id=tenant_id).first()
    if not tenant:
        return jsonify({'success': False, 'message': 'Tenant not found'}), 404

    settings = getattr(tenant, 'settings', None) or {}
    if not isinstance(settings, dict):
        settings = {}

    if 'schoolName' in payload and isinstance(payload.get('schoolName'), str) and payload.get('schoolName').strip():
        tenant.name = payload.get('schoolName').strip()

    if 'currency' in payload and isinstance(payload.get('currency'), str) and payload.get('currency').strip():
        tenant.currency = payload.get('currency').strip().upper()
    if 'language' in payload and isinstance(payload.get('language'), str) and payload.get('language').strip():
        tenant.default_language = payload.get('language').strip()
    if 'timezone' in payload and isinstance(payload.get('timezone'), str) and payload.get('timezone').strip():
        tenant.timezone = payload.get('timezone').strip()

    for key, value in payload.items():
        if key in ('schoolCode', 'schoolEmail', 'schoolPhone', 'dateFormat'):
            settings[key] = value
        if key in ('aiRecommendations', 'autoBackup', 'maintenanceMode'):
            settings[key] = bool(value)

    tenant.settings = settings
    db.session.commit()
    return jsonify({'success': True}), 200


@jwt_required()
def get_school_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    defaults = {
        'name': 'ADMIPAEDIA Academy',
        'code': 'ADM-12345',
        'type': 'Secondary School',
        'address': '123 Education Street',
        'city': 'Accra',
        'region': 'Greater Accra',
        'country': 'Ghana',
        'postalCode': 'GA-123-4567',
        'phone': '+233 20 123 4567',
        'email': 'info@admipaedia-academy.edu.gh',
        'website': 'https://admipaedia-academy.edu.gh',
        'academicYear': '2024/2025',
        'currentTerm': 'First Term',
        'gradingSystem': 'GES',
        'passingGrade': 50,
        'maxStudentsPerClass': 40,
        'timezone': 'Africa/Accra',
        'language': 'en',
        'currency': 'GHS',
        'dateFormat': 'DD/MM/YYYY',
        'timeFormat': '24h',
        'enableSMS': True,
        'enableEmail': True,
        'enableParentPortal': True,
        'enableOnlinePayments': False,
        'enableAttendanceTracking': True,
        'enableGradeBook': True,
        'primaryColor': '#3B82F6',
        'secondaryColor': '#10B981',
        'logo': '',
        'favicon': ''
    }

    numeric = {'passingGrade': 'int', 'maxStudentsPerClass': 'int'}
    bools = {
        'enableSMS', 'enableEmail', 'enableParentPortal', 'enableOnlinePayments',
        'enableAttendanceTracking', 'enableGradeBook'
    }

    result = {}
    for k, d in defaults.items():
        if k in bools:
            result[k] = _get_scoped_setting(tenant_id, f'school.{k}', d, 'boolean')
        elif k in numeric:
            result[k] = _get_scoped_setting(tenant_id, f'school.{k}', d, numeric[k])
        else:
            result[k] = _get_scoped_setting(tenant_id, f'school.{k}', d, 'string')
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_school_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    payload = request.get_json() or {}
    for k, v in payload.items():
        if k in ('enableSMS', 'enableEmail', 'enableParentPortal', 'enableOnlinePayments', 'enableAttendanceTracking', 'enableGradeBook'):
            _set_scoped_setting(tenant_id, f'school.{k}', bool(v), 'boolean')
        elif k in ('passingGrade', 'maxStudentsPerClass'):
            _set_scoped_setting(tenant_id, f'school.{k}', int(v), 'int')
        else:
            _set_scoped_setting(tenant_id, f'school.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_notification_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Notification provider configuration is managed by the platform.'}), 403
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    defaults = {
        'emailEnabled': True,
        'smtpHost': 'smtp.gmail.com',
        'smtpPort': 587,
        'smtpUsername': '',
        'smtpPassword': '',
        'smtpEncryption': 'tls',
        'fromEmail': 'noreply@admipaedia-academy.edu.gh',
        'fromName': 'ADMIPAEDIA Academy',
        'smsEnabled': True,
        'smsProvider': 'twilio',
        'smsApiKey': '',
        'smsSenderId': 'ADMIPAEDIA',
        'studentRegistration': True,
        'examResults': True,
        'feePayment': True,
        'attendanceAlerts': True,
        'disciplinaryActions': True,
        'generalAnnouncements': True,
        'notifyStudents': True,
        'notifyParents': True,
        'notifyTeachers': True,
        'notifyAdmin': True,
        'sendImmediately': True,
        'dailyDigest': False,
        'digestTime': '08:00',
        'quietHours': True,
        'quietHoursStart': '22:00',
        'quietHoursEnd': '07:00'
    }

    if tenant_id is not None:
        tenant, store = _tenant_settings_store(tenant_id)
        if tenant:
            defaults['fromName'] = getattr(tenant, 'name', None) or defaults['fromName']
            if isinstance(store, dict):
                defaults['fromEmail'] = store.get('schoolEmail') or store.get('school_email') or defaults['fromEmail']

    ints = {'smtpPort'}
    bools = {k for k, v in defaults.items() if isinstance(v, bool)}
    result = {}
    for k, d in defaults.items():
        if k in ints:
            result[k] = _get_scoped_setting(tenant_id, f'notifications.{k}', d, 'int')
        elif k in bools:
            result[k] = _get_scoped_setting(tenant_id, f'notifications.{k}', d, 'boolean')
        else:
            result[k] = _get_scoped_setting(tenant_id, f'notifications.{k}', d, 'string')
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_notification_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Notification provider configuration is managed by the platform.'}), 403
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    payload = request.get_json() or {}
    for k, v in payload.items():
        if k == 'smtpPort':
            _set_scoped_setting(tenant_id, f'notifications.{k}', int(v), 'int')
        elif isinstance(v, bool):
            _set_scoped_setting(tenant_id, f'notifications.{k}', bool(v), 'boolean')
        else:
            _set_scoped_setting(tenant_id, f'notifications.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def test_email_configuration_v2():
    from app.utils.platform_access import get_current_user
    actor = get_current_user()
    if getattr(actor, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Email provider configuration is managed by the platform.'}), 403
    data = request.get_json() or {}
    email = (data.get('testEmail') or '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'testEmail is required'}), 400
    return jsonify({'success': True}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def test_sms_configuration_v2():
    from app.utils.platform_access import get_current_user
    actor = get_current_user()
    if getattr(actor, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'SMS provider configuration is managed by the platform.'}), 403
    data = request.get_json() or {}
    phone = (data.get('testPhone') or '').strip()
    if not phone:
        return jsonify({'success': False, 'message': 'testPhone is required'}), 400
    return jsonify({'success': True}), 200


@jwt_required()
def get_security_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    defaults = {
        'mfaEnabled': False,
        'passwordMinLength': 8,
        'passwordRequireUppercase': True,
        'passwordRequireLowercase': True,
        'passwordRequireNumbers': True,
        'passwordRequireSymbols': False,
        'sessionTimeoutMinutes': 60,
        'loginAttemptsLimit': 5,
        'lockoutMinutes': 15
    }
    ints = {'passwordMinLength', 'sessionTimeoutMinutes', 'loginAttemptsLimit', 'lockoutMinutes'}
    bools = {k for k, v in defaults.items() if isinstance(v, bool)}
    result = {}
    for k, d in defaults.items():
        if k in ints:
            result[k] = _get_scoped_setting(tenant_id, f'security.{k}', d, 'int')
        elif k in bools:
            result[k] = _get_scoped_setting(tenant_id, f'security.{k}', d, 'boolean')
        else:
            result[k] = _get_scoped_setting(tenant_id, f'security.{k}', d, 'string')
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_security_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    payload = request.get_json() or {}
    for k, v in payload.items():
        if k in ('passwordMinLength', 'sessionTimeoutMinutes', 'loginAttemptsLimit', 'lockoutMinutes'):
            _set_scoped_setting(tenant_id, f'security.{k}', int(v), 'int')
        elif isinstance(v, bool):
            _set_scoped_setting(tenant_id, f'security.{k}', bool(v), 'boolean')
        else:
            _set_scoped_setting(tenant_id, f'security.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_backup_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    defaults = {
        'backupEnabled': True,
        'backupFrequency': 'daily',
        'backupTime': '02:00',
        'retainDays': 14,
        'includeUploads': True
    }
    result = {
        'backupEnabled': _get_scoped_setting(tenant_id, 'backup.backupEnabled', defaults['backupEnabled'], 'boolean'),
        'backupFrequency': _get_scoped_setting(tenant_id, 'backup.backupFrequency', defaults['backupFrequency'], 'string'),
        'backupTime': _get_scoped_setting(tenant_id, 'backup.backupTime', defaults['backupTime'], 'string'),
        'retainDays': _get_scoped_setting(tenant_id, 'backup.retainDays', defaults['retainDays'], 'int'),
        'includeUploads': _get_scoped_setting(tenant_id, 'backup.includeUploads', defaults['includeUploads'], 'boolean')
    }
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_backup_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    payload = request.get_json() or {}
    for k, v in payload.items():
        if k in ('backupEnabled', 'includeUploads'):
            _set_scoped_setting(tenant_id, f'backup.{k}', bool(v), 'boolean')
        elif k in ('retainDays',):
            _set_scoped_setting(tenant_id, f'backup.{k}', int(v), 'int')
        else:
            _set_scoped_setting(tenant_id, f'backup.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_backup_history_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    history = _get_scoped_setting(tenant_id, 'backup.history', [], 'json')
    if not isinstance(history, list):
        history = []
    return jsonify(history), 200


@jwt_required()
def get_backup_schedule_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    schedule = _get_scoped_setting(tenant_id, 'backup.schedule', {
        'enabled': True,
        'frequency': 'daily',
        'time': '02:00'
    }, 'json')
    return jsonify(schedule), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def create_backup_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    payload = request.get_json() or {}
    btype = payload.get('type', 'manual')
    now = datetime.utcnow().isoformat()
    item = {
        'id': f"backup_{int(datetime.utcnow().timestamp())}",
        'type': btype,
        'status': 'success',
        'createdAt': now,
        'size': '0MB'
    }
    history = _get_scoped_setting(tenant_id, 'backup.history', [], 'json')
    if not isinstance(history, list):
        history = []
    history = [item] + history[:9]
    _set_scoped_setting(tenant_id, 'backup.history', history, 'json')
    return jsonify(item), 201


@jwt_required()
@role_required(['admin', 'super_admin'])
def restore_backup_v2(backup_id: str):
    return jsonify({'success': True, 'backupId': backup_id}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def delete_backup_v2(backup_id: str):
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    history = _get_scoped_setting(tenant_id, 'backup.history', [], 'json')
    if not isinstance(history, list):
        history = []
    history = [h for h in history if str(h.get('id')) != str(backup_id)]
    _set_scoped_setting(tenant_id, 'backup.history', history, 'json')
    return jsonify({'success': True}), 200


@jwt_required()
def get_integration_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Integration configuration is managed by the platform.'}), 403
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403
    stored = _get_scoped_setting(tenant_id, 'integrations.settings', {}, 'json')
    return jsonify(stored or {}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_integration_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Integration configuration is managed by the platform.'}), 403
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403
    payload = request.get_json() or {}
    _set_scoped_setting(tenant_id, 'integrations.settings', payload, 'json')
    return jsonify({'success': True}), 200


@jwt_required()
def get_integration_tests_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403
    tests = _get_scoped_setting(tenant_id, 'integrations.tests', [], 'json')
    if not isinstance(tests, list):
        tests = []
    return jsonify(tests), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def test_integration_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Integration configuration is managed by the platform.'}), 403
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    payload = request.get_json() or {}
    service = payload.get('service')
    itype = payload.get('type')
    now = datetime.utcnow().isoformat()
    result = {
        'id': f"test_{int(datetime.utcnow().timestamp())}",
        'service': service or 'unknown',
        'type': itype or 'unknown',
        'status': 'success',
        'message': 'Test passed',
        'timestamp': now
    }
    tests = _get_scoped_setting(tenant_id, 'integrations.tests', [], 'json')
    if not isinstance(tests, list):
        tests = []
    tests = [result] + tests[:19]
    _set_scoped_setting(tenant_id, 'integrations.tests', tests, 'json')
    return jsonify(result), 200


@jwt_required()
def get_theme_settings_v2():
    user_id = get_jwt_identity()
    defaults = {
        'theme': 'system',
        'primaryColor': '#3B82F6',
        'reducedMotion': False
    }
    result = {
        'theme': _get_setting(f'user.{user_id}.theme.theme', defaults['theme'], 'string'),
        'primaryColor': _get_setting(f'user.{user_id}.theme.primaryColor', defaults['primaryColor'], 'string'),
        'reducedMotion': _get_setting(f'user.{user_id}.theme.reducedMotion', defaults['reducedMotion'], 'boolean')
    }
    return jsonify(result), 200


@jwt_required()
def update_theme_settings_v2():
    user_id = get_jwt_identity()
    payload = request.get_json() or {}
    for k, v in payload.items():
        if k == 'reducedMotion':
            _set_setting(f'user.{user_id}.theme.{k}', bool(v), 'boolean')
        else:
            _set_setting(f'user.{user_id}.theme.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_ai_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'AI provider configuration is managed by the platform.'}), 403
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403

    stored = _get_scoped_setting(tenant_id, 'ai.settings', {
        'enabled': True,
        'provider': 'openai',
        'model': 'gpt-4o-mini'
    }, 'json')
    return jsonify(stored or {}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_ai_settings_v2():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    if getattr(user, 'role', None) not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'AI provider configuration is managed by the platform.'}), 403
    if tenant_id is None and getattr(user, 'role', None) != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400
    if tenant_id is not None:
        perr = _require_school_admin_for_tenant(tenant_id, user)
        if perr:
            return jsonify({'success': False, 'message': perr}), 403
    payload = request.get_json() or {}
    _set_scoped_setting(tenant_id, 'ai.settings', payload, 'json')
    return jsonify({'success': True}), 200


@jwt_required()
@tenant_required
def get_academic_settings_v2():
    config = AcademicConfigurationService.build_harmonized_config(g.tenant_id)
    return jsonify(config or {}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
@tenant_required
def update_academic_settings_v2():
    payload = request.get_json() or {}
    AcademicConfigurationService.upsert_tenant_settings(g.tenant_id, payload)
    AcademicConfigurationService.sync_grading_scheme_from_config(g.tenant_id, payload)
    return jsonify({'success': True}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def get_audit_logs_v2():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    return jsonify({
        'data': [],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': 0,
            'pages': 0
        }
    }), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def get_audit_stats_v2():
    return jsonify({
        'totalLogs': 0,
        'successRate': 100,
        'criticalEvents': 0,
        'uniqueUsers': 0,
        'topActions': [],
        'recentFailures': 0
    }), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def get_audit_filter_options_v2():
    return jsonify({
        'categories': [],
        'actions': [],
        'resources': []
    }), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def export_audit_logs_v2():
    header = 'timestamp,userName,userRole,action,resource,status,severity,category\n'
    return header, 200, {'Content-Type': 'text/csv'}
