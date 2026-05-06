from flask import Blueprint

enhanced_grading_bp = Blueprint('enhanced_grading', __name__)

from . import routes