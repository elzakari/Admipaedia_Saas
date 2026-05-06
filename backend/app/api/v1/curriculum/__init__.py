from flask import Blueprint

curriculum_bp = Blueprint('curriculum', __name__)
curriculum_bp.strict_slashes = False

from . import routes