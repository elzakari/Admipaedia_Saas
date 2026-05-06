"""
Application Error Handlers
"""

from flask import jsonify
import structlog

logger = structlog.get_logger()


def register_error_handlers(app):
    """Register application error handlers"""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle bad request errors"""
        logger.warning("Bad request", error=str(error))
        return jsonify({
            "error": "Bad request",
            "message": "The request could not be understood by the server"
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle unauthorized errors"""
        logger.warning("Unauthorized access attempt", error=str(error))
        return jsonify({
            "error": "Unauthorized",
            "message": "Authentication is required"
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle forbidden errors"""
        logger.warning("Forbidden access attempt", error=str(error))
        return jsonify({
            "error": "Forbidden",
            "message": "You don't have permission to access this resource"
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle not found errors"""
        return jsonify({
            "error": "Not found",
            "message": "The requested resource was not found"
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle method not allowed errors"""
        return jsonify({
            "error": "Method not allowed",
            "message": "The method is not allowed for this endpoint"
        }), 405
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Handle rate limit exceeded errors"""
        logger.warning("Rate limit exceeded", error=str(error))
        return jsonify({
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later"
        }), 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle internal server errors"""
        logger.error("Internal server error", error=str(error))
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }), 500
    
    @app.errorhandler(503)
    def service_unavailable(error):
        """Handle service unavailable errors"""
        logger.error("Service unavailable", error=str(error))
        return jsonify({
            "error": "Service unavailable",
            "message": "The service is temporarily unavailable"
        }), 503