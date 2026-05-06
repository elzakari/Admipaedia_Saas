from flask import Blueprint

calendar_bp = Blueprint('calendar', __name__)

# Ensure routes are registered when the package is imported
from . import routes