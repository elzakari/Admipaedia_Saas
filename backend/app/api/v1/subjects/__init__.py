from flask import Blueprint

subjects_bp = Blueprint('subjects', __name__)
subjects_bp.strict_slashes = False

from app.api.v1.subjects import routes