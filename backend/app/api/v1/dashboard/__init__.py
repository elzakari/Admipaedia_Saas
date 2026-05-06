from flask import Blueprint
from .routes import dashboard_bp

# Remove the duplicate prefix
api_dashboard = Blueprint('api_dashboard', __name__)
api_dashboard.register_blueprint(dashboard_bp)