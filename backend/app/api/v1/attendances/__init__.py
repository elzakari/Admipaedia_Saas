from flask import Blueprint

attendances_bp = Blueprint('attendances', __name__)

from app.api.v1.attendances import routes