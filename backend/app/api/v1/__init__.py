from flask import Blueprint

api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/v1')

# Import existing blueprints
from app.api.v1.auth import auth_bp
from app.api.v1.profile import profile_bp
from app.api.v1.students import students_bp
from app.api.v1.student import student_bp
from app.api.v1.enhanced_students import enhanced_students_bp
from app.api.v1.teachers import teachers_bp
from app.api.v1.classes import classes_bp
from app.api.v1.subjects import subjects_bp
from app.api.v1.exams import exams_bp
from app.api.v1.attendances import attendances_bp
from app.api.v1.parents import parents_bp
from app.api.v1.academics import academics_bp
from .dashboard import api_dashboard
from app.api.v1.download import download_bp
from app.api.v1.administration import administration_bp
from app.api.v1.reports import reports_bp
from .external_exams import external_exams_bp
from app.api.v1.dashboard.enhanced_routes import enhanced_dashboard_bp
from app.api.v1.analytics.ai_routes import ai_analytics_bp
from app.api.v1.analytics.ml_routes import ml_bp

# Import new Ghana Educational Service blueprints
from app.api.v1.educational_levels import educational_levels_bp
from app.api.v1.grading import grading_bp
from app.api.v1.stem import stem_bp
from app.api.v1.character import character_bp
from app.api.v1.assessment import assessment_bp
# Add this import
from .curriculum import curriculum_bp
from app.api.v1.calendar import calendar_bp
# NEW: import competencies blueprint
from app.api.v1.competencies.routes import competencies_bp

# Import RBAC blueprint
from app.api.v1.rbac import rbac_bp
from app.api.v1.messages import messages_bp
from app.api.v1.users import users_bp
from app.api.v1.staff import staff_bp
from app.api.v1.announcements import announcements_bp
from app.api.v1.library import library_bp
from app.api.v1.settings import settings_bp
from app.api.v1.platform_settings import platform_settings_bp
from app.api.v1.platform_integrations import platform_integrations_bp
from app.api.v1.educational_system import educational_system_bp
from app.api.v1.grades import grades_bp
from app.api.v1.finance import finance_bp
from app.api.v1.timetable import timetable_bp
from app.api.v1.staff_enhanced import staff_enhanced_bp
from app.api.v1.notifications import notifications_bp
from app.api.v1.portal import portal_bp
from app.api.v1.enhanced_grading.routes import enhanced_grading_bp
from app.api.v1.attendance.routes import attendance_bp
from app.api.v1.admissions import admissions_bp

from app.api.v1.saas import saas_bp
from app.api.v1.super_admin import super_admin_bp
from app.api.v1.billing import billing_bp
from app.api.v1.webhooks import webhooks_bp

from app.api.v1.invitations import invitations_bp
from app.api.v1.service_tokens import service_tokens_bp
from app.api.v1.plan_context import plan_context_bp
from app.api.v1.branches.routes import branches_bp
from app.api.v1.departments import departments_bp


# Register existing blueprints
api_v1_bp.register_blueprint(branches_bp, url_prefix='/school/branches')
api_v1_bp.register_blueprint(departments_bp, url_prefix='/departments')
api_v1_bp.register_blueprint(departments_bp, url_prefix='/structures', name='structures')  # polymorphic alias

api_v1_bp.register_blueprint(academics_bp, url_prefix='/academics')
api_v1_bp.register_blueprint(auth_bp, url_prefix='/auth')  # Enhanced auth is now included
api_v1_bp.register_blueprint(profile_bp, url_prefix='/profile')
api_v1_bp.register_blueprint(students_bp, url_prefix='/students')
api_v1_bp.register_blueprint(student_bp, url_prefix='/student')
api_v1_bp.register_blueprint(enhanced_students_bp)
api_v1_bp.register_blueprint(teachers_bp, url_prefix='/teachers')
api_v1_bp.register_blueprint(classes_bp, url_prefix='/classes')
api_v1_bp.register_blueprint(subjects_bp, url_prefix='/subjects')
api_v1_bp.register_blueprint(exams_bp, url_prefix='/exams')
api_v1_bp.register_blueprint(attendances_bp, url_prefix='/attendances')
api_v1_bp.register_blueprint(parents_bp, url_prefix='/parents')
api_v1_bp.register_blueprint(api_dashboard, url_prefix='/dashboard')
api_v1_bp.register_blueprint(download_bp, url_prefix='/download')
api_v1_bp.register_blueprint(administration_bp, url_prefix='/administration')
api_v1_bp.register_blueprint(reports_bp, url_prefix='/reports')
api_v1_bp.register_blueprint(external_exams_bp)

# Register Analytics blueprints
api_v1_bp.register_blueprint(ai_analytics_bp, url_prefix='/ai-analytics')
api_v1_bp.register_blueprint(ml_bp, url_prefix='/ml')

# Register new Ghana Educational Service blueprints
api_v1_bp.register_blueprint(educational_levels_bp, url_prefix='/educational-levels')
api_v1_bp.register_blueprint(grading_bp, url_prefix='/grading')
api_v1_bp.register_blueprint(stem_bp, url_prefix='/stem')
api_v1_bp.register_blueprint(character_bp, url_prefix='/character')
api_v1_bp.register_blueprint(assessment_bp, url_prefix='/assessment')
api_v1_bp.register_blueprint(calendar_bp, url_prefix='/calendar')
# NEW: register competencies routes
api_v1_bp.register_blueprint(competencies_bp, url_prefix='/competencies')

# Add this registration - FIXED: changed api_v1 to api_v1_bp
api_v1_bp.register_blueprint(curriculum_bp, url_prefix='/curriculum')

# Register RBAC and messaging blueprints
from .attachments.routes import attachments_bp
from .admin_communication.routes import admin_comm_bp
api_v1_bp.register_blueprint(attachments_bp, url_prefix='/attachments')
api_v1_bp.register_blueprint(admin_comm_bp, url_prefix='/admin-communication')
api_v1_bp.register_blueprint(messages_bp, url_prefix='/messages')


api_v1_bp.register_blueprint(users_bp, url_prefix='/users')
api_v1_bp.register_blueprint(rbac_bp, url_prefix='/rbac')
api_v1_bp.register_blueprint(staff_bp, url_prefix='/staff')
api_v1_bp.register_blueprint(announcements_bp, url_prefix='/announcements')
api_v1_bp.register_blueprint(library_bp, url_prefix='/library')
api_v1_bp.register_blueprint(settings_bp, url_prefix='/settings')
api_v1_bp.register_blueprint(platform_settings_bp, url_prefix='/platform')
api_v1_bp.register_blueprint(platform_integrations_bp, url_prefix='/platform')
api_v1_bp.register_blueprint(educational_system_bp)
api_v1_bp.register_blueprint(grades_bp, url_prefix='/grades')
api_v1_bp.register_blueprint(finance_bp, url_prefix='/finance')
api_v1_bp.register_blueprint(timetable_bp, url_prefix='/timetable')
api_v1_bp.register_blueprint(staff_enhanced_bp, url_prefix='/staff-enhanced')
api_v1_bp.register_blueprint(notifications_bp, url_prefix='/notifications')
api_v1_bp.register_blueprint(portal_bp, url_prefix='/portal')
api_v1_bp.register_blueprint(enhanced_grading_bp, url_prefix='/enhanced-grading')
api_v1_bp.register_blueprint(attendance_bp, url_prefix='/attendance')
api_v1_bp.register_blueprint(admissions_bp, url_prefix='/admissions')
api_v1_bp.register_blueprint(saas_bp, url_prefix='/saas')
api_v1_bp.register_blueprint(super_admin_bp, url_prefix='/super-admin')
api_v1_bp.register_blueprint(billing_bp, url_prefix='/billing')
api_v1_bp.register_blueprint(webhooks_bp, url_prefix='/webhooks')
api_v1_bp.register_blueprint(invitations_bp)
api_v1_bp.register_blueprint(service_tokens_bp, url_prefix='/service-tokens')

api_v1_bp.register_blueprint(plan_context_bp)

from app.api.v1.saas.routes import complete_setup, get_tenant_notification_status
from app.api.v1.settings.routes import get_assessment_categories
from app.api.v1.academics.routes import get_grading_scheme
api_v1_bp.add_url_rule('/tenant/complete-setup', 'complete_setup', complete_setup, methods=['POST'])
api_v1_bp.add_url_rule('/tenant/notification-status', 'get_tenant_notification_status', get_tenant_notification_status, methods=['GET'])
api_v1_bp.add_url_rule('/assessment-categories', 'get_assessment_categories', get_assessment_categories, methods=['GET'])
api_v1_bp.add_url_rule('/academic/grading-system', 'get_grading_scheme_legacy', get_grading_scheme, methods=['GET'])

from app.api.v1.dashboard.routes import get_admin_dashboard_metrics, get_admin_dashboard_analytics
api_v1_bp.add_url_rule('/admin/dashboard-metrics', 'get_admin_dashboard_metrics', get_admin_dashboard_metrics, methods=['GET'])
api_v1_bp.add_url_rule('/admin/dashboard/analytics', 'get_admin_dashboard_analytics', get_admin_dashboard_analytics, methods=['GET'])

# Stub admin/users route for RBAC access control testing
from flask import jsonify as _jsonify
from flask_jwt_extended import jwt_required as _jwt_required
from app.utils.auth_utils import admin_required as _admin_required

@_jwt_required()
@_admin_required
def _admin_list_users():
    from app.models.user import User
    users = User.query.all()
    return _jsonify({'success': True, 'users': [{'id': u.id, 'email': u.email, 'role': u.role} for u in users]}), 200

api_v1_bp.add_url_rule('/admin/users', 'admin_list_users', _admin_list_users, methods=['GET'])

from app.api.v1.super_admin.routes import super_admin_force_purge_user
api_v1_bp.add_url_rule('/superadmin/users/<int:user_id>/force-purge', 'super_admin_force_purge_user_non_hyphen', super_admin_force_purge_user, methods=['POST', 'DELETE'])

# Issue 8: Register error logging route /errors
from flask import request as _request
import logging as _logging

_logger = _logging.getLogger('frontend_errors')

def _sanitize_telemetry_payload(data):
    if not isinstance(data, dict):
        return data
    
    sensitive_keys = {
        'token', 'password', 'auth', 'authorization', 'jwt', 'credential',
        'secret', 'key', 'email', 'username', 'phone', 'session', 'cookie',
        'headers', 'access_token', 'refresh_token', 'bearer', 'signature'
    }
    
    sanitized = {}
    for k, v in data.items():
        if str(k).lower() in sensitive_keys:
            continue
        if isinstance(v, dict):
            sanitized[k] = _sanitize_telemetry_payload(v)
        elif isinstance(v, list):
            sanitized[k] = [_sanitize_telemetry_payload(item) if isinstance(item, dict) else item for item in v]
        else:
            sanitized[k] = v
    return sanitized

def _ingest_errors():
    try:
        payload = _request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            payload = {"raw_data": str(payload)}
    except Exception:
        payload = {}
    
    sanitized_payload = _sanitize_telemetry_payload(payload)
    error_msg = sanitized_payload.get('message') or sanitized_payload.get('error') or "Telemetry error captured"
    _logger.error(f"Frontend diagnostic log captured: {error_msg} | Payload: {sanitized_payload}")
    return _jsonify({'success': True}), 202

api_v1_bp.add_url_rule('/errors', 'ingest_errors', _ingest_errors, methods=['POST'])



def register_blueprints(app):
    """Register all API blueprints."""
    # Enhanced Dashboard
    app.register_blueprint(enhanced_dashboard_bp, url_prefix='/api/v1/enhanced-dashboard')
    
    # Register the main API v1 blueprint
    # This registers all the blueprints attached to api_v1_bp above
    # The prefix will be /api/v1 (from api_bp) + /v1 (from api_v1_bp) = /api/v1/v1 if not careful
    # But wait, api_bp in app/api/__init__.py registers api_v1_bp
    # And app/core/blueprints.py registers api_bp with /api prefix
    # So we get /api/v1/... which is correct.
    
    # We don't need to do anything here regarding api_v1_bp because it's imported by app/api/__init__.py
    pass
