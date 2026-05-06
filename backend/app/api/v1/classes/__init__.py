from flask import Blueprint

classes_bp = Blueprint('classes', __name__)
classes_bp.strict_slashes = False

from app.api.v1.classes import routes