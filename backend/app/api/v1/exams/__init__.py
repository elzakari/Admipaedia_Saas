from flask import Blueprint

exams_bp = Blueprint('exams', __name__)
exams_bp.strict_slashes = False

from app.api.v1.exams import routes