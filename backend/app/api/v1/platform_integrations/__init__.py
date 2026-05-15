from flask import Blueprint

from .routes import (
    list_provider_configs,
    upsert_provider_config,
    test_provider_config,
    list_plan_token_limits,
    update_plan_token_limits,
)


platform_integrations_bp = Blueprint('platform_integrations', __name__)

platform_integrations_bp.route('/integrations/providers', methods=['GET'])(list_provider_configs)
platform_integrations_bp.route('/integrations/providers', methods=['POST'])(upsert_provider_config)
platform_integrations_bp.route('/integrations/providers/test', methods=['POST'])(test_provider_config)
platform_integrations_bp.route('/integrations/plans/token-limits', methods=['GET'])(list_plan_token_limits)
platform_integrations_bp.route('/integrations/plans/<int:plan_id>/token-limits', methods=['POST'])(update_plan_token_limits)

