from flask import Blueprint

teachers_bp = Blueprint('teachers', __name__)
teachers_bp.strict_slashes = False

from app.api.v1.teachers import routes

# Import routes to register them with the blueprint
# from app.api.v1.teachers import routes