from flask import Blueprint

from .routes import get_platform_settings, update_platform_setting


platform_settings_bp = Blueprint('platform_settings', __name__)

platform_settings_bp.route('/settings', methods=['GET'])(get_platform_settings)
platform_settings_bp.route('/settings/update', methods=['POST'])(update_platform_setting)

