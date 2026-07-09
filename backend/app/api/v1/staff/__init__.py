from flask import Blueprint

staff_bp = Blueprint('staff', __name__)

# Import routes so decorators bind endpoints to the registered blueprint.
from app.api.v1.staff import routes  # noqa: F401,E402
