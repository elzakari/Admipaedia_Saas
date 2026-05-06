from app.api.v1.auth.routes import auth_bp
from app.api.v1.auth.enhanced_routes import enhanced_auth_bp

# Register enhanced auth routes with the main auth blueprint
auth_bp.register_blueprint(enhanced_auth_bp, url_prefix='/enhanced')