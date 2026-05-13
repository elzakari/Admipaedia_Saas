from flask import Blueprint

plan_context_bp = Blueprint('plan_context', __name__)

from . import routes  # noqa: E402,F401
from . import platform_routes  # noqa: E402,F401
