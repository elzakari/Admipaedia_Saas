from flask import Blueprint

parents_bp = Blueprint('parents', __name__)

# Import routes to register them with the blueprint
from app.api.v1.parents import routes