from flask import Blueprint

invitations_bp = Blueprint('invitations', __name__)

from . import routes

