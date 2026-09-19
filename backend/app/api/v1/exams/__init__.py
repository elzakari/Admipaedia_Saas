from flask import Blueprint

exams_bp = Blueprint("exams", __name__)
exams_bp.strict_slashes = False

from app.api.v1.exams import routes

# Enhanced exam routes are intentionally mounted as part
# of the existing /api/v1/exams resource namespace.
from .enhanced_routes import enhanced_exams_bp

exams_bp.register_blueprint(enhanced_exams_bp)
