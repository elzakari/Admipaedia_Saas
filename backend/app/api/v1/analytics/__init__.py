from flask import Blueprint

analytics_bp = Blueprint('analytics', __name__)

from . import routes  # noqa: E402,F401
