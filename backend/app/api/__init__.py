from flask import Blueprint, jsonify

# Create main API blueprint
api_bp = Blueprint('api', __name__)

# Import and register v1 blueprint
from app.api.v1 import api_v1_bp
api_bp.register_blueprint(api_v1_bp)

# Add a simple endpoint to the API root
@api_bp.route('/')
def api_index():
    return jsonify({
        "name": "ADMIPAEDIA API",
        "version": "1.0.0",
        "endpoints": ["/v1"]
    })