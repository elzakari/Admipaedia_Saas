from flask import Blueprint

educational_levels_bp = Blueprint('educational_levels', __name__)

from . import routes