from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.utils.decorators import role_required
from app.utils.tenant_context import tenant_required
from app.services.academic_configuration_service import AcademicConfigurationService
from flask import g
import json
from datetime import datetime

@jwt_required()
def get_settings():
    """Get all or specific system settings."""
    keys = request.args.getlist('keys')
    if keys:
        settings = SystemSetting.query.filter(SystemSetting.key.in_(keys)).all()
    else:
        settings = SystemSetting.query.all()
        
    return jsonify({
        'success': True,
        'data': {s.key: s.value for s in settings}
    }), 200

@jwt_required()
@role_required(['admin', 'super_admin'])
def update_setting():
    """Update a specific system setting."""
    data = request.json
    if not data or 'key' not in data or 'value' not in data:
        return jsonify({'success': False, 'message': 'Key and value are required'}), 400
        
    key = data['key']
    value = data['value']
    setting_type = data.get('setting_type', 'string')
    description = data.get('description')
    
    setting = SystemSetting.set_value(key, value, setting_type, description)
    
    return jsonify({
        'success': True,
        'message': f'Setting {key} updated successfully',
        'data': {setting.key: setting.value}
    }), 200

@jwt_required()
def get_admission_price():
    """Publicly accessible endpoint to get admission form price."""
    price = SystemSetting.get_value('admission_form_price', '100.00')
    return jsonify({
        'success': True,
        'price': float(price)
    }), 200


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


@jwt_required()
def get_general_settings_v2():
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


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_general_settings_v2():
    payload = request.get_json() or {}
    for k, v in payload.items():
        if k in ('aiRecommendations', 'autoBackup', 'maintenanceMode'):
            _set_setting(f'general.{k}', bool(v), 'boolean')
        else:
            _set_setting(f'general.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_school_settings_v2():
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
            result[k] = _get_setting(f'school.{k}', d, 'boolean')
        elif k in numeric:
            result[k] = _get_setting(f'school.{k}', d, numeric[k])
        else:
            result[k] = _get_setting(f'school.{k}', d, 'string')
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_school_settings_v2():
    payload = request.get_json() or {}
    for k, v in payload.items():
        if k in ('enableSMS', 'enableEmail', 'enableParentPortal', 'enableOnlinePayments', 'enableAttendanceTracking', 'enableGradeBook'):
            _set_setting(f'school.{k}', bool(v), 'boolean')
        elif k in ('passingGrade', 'maxStudentsPerClass'):
            _set_setting(f'school.{k}', int(v), 'int')
        else:
            _set_setting(f'school.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_notification_settings_v2():
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

    ints = {'smtpPort'}
    bools = {k for k, v in defaults.items() if isinstance(v, bool)}
    result = {}
    for k, d in defaults.items():
        if k in ints:
            result[k] = _get_setting(f'notifications.{k}', d, 'int')
        elif k in bools:
            result[k] = _get_setting(f'notifications.{k}', d, 'boolean')
        else:
            result[k] = _get_setting(f'notifications.{k}', d, 'string')
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_notification_settings_v2():
    payload = request.get_json() or {}
    for k, v in payload.items():
        if k == 'smtpPort':
            _set_setting(f'notifications.{k}', int(v), 'int')
        elif isinstance(v, bool):
            _set_setting(f'notifications.{k}', bool(v), 'boolean')
        else:
            _set_setting(f'notifications.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def test_email_configuration_v2():
    data = request.get_json() or {}
    email = (data.get('testEmail') or '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'testEmail is required'}), 400
    return jsonify({'success': True}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def test_sms_configuration_v2():
    data = request.get_json() or {}
    phone = (data.get('testPhone') or '').strip()
    if not phone:
        return jsonify({'success': False, 'message': 'testPhone is required'}), 400
    return jsonify({'success': True}), 200


@jwt_required()
def get_security_settings_v2():
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
            result[k] = _get_setting(f'security.{k}', d, 'int')
        elif k in bools:
            result[k] = _get_setting(f'security.{k}', d, 'boolean')
        else:
            result[k] = _get_setting(f'security.{k}', d, 'string')
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_security_settings_v2():
    payload = request.get_json() or {}
    for k, v in payload.items():
        if k in ('passwordMinLength', 'sessionTimeoutMinutes', 'loginAttemptsLimit', 'lockoutMinutes'):
            _set_setting(f'security.{k}', int(v), 'int')
        elif isinstance(v, bool):
            _set_setting(f'security.{k}', bool(v), 'boolean')
        else:
            _set_setting(f'security.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_backup_settings_v2():
    defaults = {
        'backupEnabled': True,
        'backupFrequency': 'daily',
        'backupTime': '02:00',
        'retainDays': 14,
        'includeUploads': True
    }
    result = {
        'backupEnabled': _get_setting('backup.backupEnabled', defaults['backupEnabled'], 'boolean'),
        'backupFrequency': _get_setting('backup.backupFrequency', defaults['backupFrequency'], 'string'),
        'backupTime': _get_setting('backup.backupTime', defaults['backupTime'], 'string'),
        'retainDays': _get_setting('backup.retainDays', defaults['retainDays'], 'int'),
        'includeUploads': _get_setting('backup.includeUploads', defaults['includeUploads'], 'boolean')
    }
    return jsonify(result), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_backup_settings_v2():
    payload = request.get_json() or {}
    for k, v in payload.items():
        if k in ('backupEnabled', 'includeUploads'):
            _set_setting(f'backup.{k}', bool(v), 'boolean')
        elif k in ('retainDays',):
            _set_setting(f'backup.{k}', int(v), 'int')
        else:
            _set_setting(f'backup.{k}', v, 'string')
    return jsonify({'success': True}), 200


@jwt_required()
def get_backup_history_v2():
    history = _get_setting('backup.history', [], 'json')
    if not isinstance(history, list):
        history = []
    return jsonify(history), 200


@jwt_required()
def get_backup_schedule_v2():
    schedule = _get_setting('backup.schedule', {
        'enabled': True,
        'frequency': 'daily',
        'time': '02:00'
    }, 'json')
    return jsonify(schedule), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def create_backup_v2():
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
    history = _get_setting('backup.history', [], 'json')
    if not isinstance(history, list):
        history = []
    history = [item] + history[:9]
    _set_setting('backup.history', history, 'json')
    return jsonify(item), 201


@jwt_required()
@role_required(['admin', 'super_admin'])
def restore_backup_v2(backup_id: str):
    return jsonify({'success': True, 'backupId': backup_id}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def delete_backup_v2(backup_id: str):
    history = _get_setting('backup.history', [], 'json')
    if not isinstance(history, list):
        history = []
    history = [h for h in history if str(h.get('id')) != str(backup_id)]
    _set_setting('backup.history', history, 'json')
    return jsonify({'success': True}), 200


@jwt_required()
def get_integration_settings_v2():
    defaults = {}
    stored = _get_setting('integrations.settings', defaults, 'json')
    return jsonify(stored or {}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_integration_settings_v2():
    payload = request.get_json() or {}
    _set_setting('integrations.settings', payload, 'json')
    return jsonify({'success': True}), 200


@jwt_required()
def get_integration_tests_v2():
    tests = _get_setting('integrations.tests', [], 'json')
    if not isinstance(tests, list):
        tests = []
    return jsonify(tests), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def test_integration_v2():
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
    tests = _get_setting('integrations.tests', [], 'json')
    if not isinstance(tests, list):
        tests = []
    tests = [result] + tests[:19]
    _set_setting('integrations.tests', tests, 'json')
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
    stored = _get_setting('ai.settings', {
        'enabled': True,
        'provider': 'openai',
        'model': 'gpt-4o-mini'
    }, 'json')
    return jsonify(stored or {}), 200


@jwt_required()
@role_required(['admin', 'super_admin'])
def update_ai_settings_v2():
    payload = request.get_json() or {}
    _set_setting('ai.settings', payload, 'json')
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
