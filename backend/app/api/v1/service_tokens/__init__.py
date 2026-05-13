from flask import Blueprint

from .routes import validate_service_token, consume_service_token


service_tokens_bp = Blueprint('service_tokens', __name__)

service_tokens_bp.route('/validate', methods=['POST'])(validate_service_token)
service_tokens_bp.route('/consume', methods=['POST'])(consume_service_token)

