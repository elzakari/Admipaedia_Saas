from flask import Blueprint

academics_bp = Blueprint('academics', __name__)

from app.api.v1.academics import routes