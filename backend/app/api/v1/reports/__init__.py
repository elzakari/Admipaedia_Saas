from flask import Blueprint

reports_bp = Blueprint('reports', __name__)
reports_bp.strict_slashes = False

from . import routes