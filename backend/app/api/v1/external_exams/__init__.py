from flask import Blueprint

external_exams_bp = Blueprint('external_exams', __name__, url_prefix='/external-exams')

from . import routes