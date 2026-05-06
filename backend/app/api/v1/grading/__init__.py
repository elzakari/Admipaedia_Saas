from flask import Blueprint

grading_bp = Blueprint('grading', __name__)

from . import routes