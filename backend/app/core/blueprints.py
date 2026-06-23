"""
Blueprint Registration
"""

def register_blueprints(app):
    """Register all application blueprints"""
    
    # Main API Blueprint
    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # SaaS Report Blueprint
    from app.saas.routes import saas_report_bp
    app.register_blueprint(saas_report_bp, url_prefix='/api/v1')
    
    # WebSocket Namespaces
    from app.websockets import register_websocket_namespaces
    register_websocket_namespaces()
    
    # Root endpoint
    @app.route('/')
    def index():
        from flask import jsonify
        return jsonify({
            "message": "ADMIPAEDIA School Management System API",
            "version": "2.0.0",
            "status": "running",
            "endpoints": {
                "api": "/api",
                "docs": "/api/docs",
                "health": "/health"
            }
        })
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        from flask import jsonify
        return jsonify({
            "status": "healthy",
            "timestamp": "2024-12-20T10:00:00Z"
        })
