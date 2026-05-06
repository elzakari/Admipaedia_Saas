from flask import Blueprint
from .routes import (
    get_settings,
    update_setting,
    get_admission_price,
    get_general_settings_v2,
    update_general_settings_v2,
    get_school_settings_v2,
    update_school_settings_v2,
    get_notification_settings_v2,
    update_notification_settings_v2,
    test_email_configuration_v2,
    test_sms_configuration_v2,
    get_security_settings_v2,
    update_security_settings_v2,
    get_backup_settings_v2,
    update_backup_settings_v2,
    get_backup_history_v2,
    get_backup_schedule_v2,
    create_backup_v2,
    restore_backup_v2,
    delete_backup_v2,
    get_integration_settings_v2,
    update_integration_settings_v2,
    get_integration_tests_v2,
    test_integration_v2,
    get_theme_settings_v2,
    update_theme_settings_v2,
    get_ai_settings_v2,
    update_ai_settings_v2,
    get_academic_settings_v2,
    update_academic_settings_v2,
    get_audit_logs_v2,
    get_audit_stats_v2,
    get_audit_filter_options_v2,
    export_audit_logs_v2
)

settings_bp = Blueprint('settings', __name__)

settings_bp.route('/', methods=['GET'])(get_settings)
settings_bp.route('/update', methods=['POST'])(update_setting)
settings_bp.route('/admission-price', methods=['GET'])(get_admission_price)

settings_bp.route('/general', methods=['GET'])(get_general_settings_v2)
settings_bp.route('/general', methods=['PUT'])(update_general_settings_v2)

settings_bp.route('/school', methods=['GET'])(get_school_settings_v2)
settings_bp.route('/school', methods=['PUT'])(update_school_settings_v2)

settings_bp.route('/notifications', methods=['GET'])(get_notification_settings_v2)
settings_bp.route('/notifications', methods=['PUT'])(update_notification_settings_v2)
settings_bp.route('/notifications/test-email', methods=['POST'])(test_email_configuration_v2)
settings_bp.route('/notifications/test-sms', methods=['POST'])(test_sms_configuration_v2)

settings_bp.route('/security', methods=['GET'])(get_security_settings_v2)
settings_bp.route('/security', methods=['PUT'])(update_security_settings_v2)

settings_bp.route('/backup', methods=['GET'])(get_backup_settings_v2)
settings_bp.route('/backup', methods=['PUT'])(update_backup_settings_v2)
settings_bp.route('/backup/history', methods=['GET'])(get_backup_history_v2)
settings_bp.route('/backup/schedule', methods=['GET'])(get_backup_schedule_v2)
settings_bp.route('/backup/create', methods=['POST'])(create_backup_v2)
settings_bp.route('/backup/restore/<backup_id>', methods=['POST'])(restore_backup_v2)
settings_bp.route('/backup/<backup_id>', methods=['DELETE'])(delete_backup_v2)

settings_bp.route('/integrations', methods=['GET'])(get_integration_settings_v2)
settings_bp.route('/integrations', methods=['PUT'])(update_integration_settings_v2)
settings_bp.route('/integrations/tests', methods=['GET'])(get_integration_tests_v2)
settings_bp.route('/integrations/test', methods=['POST'])(test_integration_v2)

settings_bp.route('/theme', methods=['GET'])(get_theme_settings_v2)
settings_bp.route('/theme', methods=['PUT'])(update_theme_settings_v2)

settings_bp.route('/ai', methods=['GET'])(get_ai_settings_v2)
settings_bp.route('/ai', methods=['PUT'])(update_ai_settings_v2)

settings_bp.route('/academic', methods=['GET'])(get_academic_settings_v2)
settings_bp.route('/academic', methods=['PUT'])(update_academic_settings_v2)

settings_bp.route('/audit-logs', methods=['GET'])(get_audit_logs_v2)
settings_bp.route('/audit-stats', methods=['GET'])(get_audit_stats_v2)
settings_bp.route('/audit-filter-options', methods=['GET'])(get_audit_filter_options_v2)
settings_bp.route('/audit-logs/export', methods=['GET'])(export_audit_logs_v2)
