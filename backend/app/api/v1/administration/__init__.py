from flask import Blueprint

administration_bp = Blueprint('administration', __name__)

from app.api.v1.administration.routes import *