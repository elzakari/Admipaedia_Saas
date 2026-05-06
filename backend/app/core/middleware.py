"""
Application Middleware Registration
"""

from flask import request, g
from app.middleware.security_middleware import log_security_event


def register_middleware(app):
    """Register application middleware"""
    
    @app.before_request
    def security_before_request():
        """Security checks before each request"""
        
        # Log suspicious activity
        if request.endpoint and request.method in ['POST', 'PUT', 'DELETE']:
            user_agent = request.headers.get('User-Agent', '')
            suspicious_patterns = ['bot', 'crawler', 'spider', 'scraper']
            
            if any(pattern in user_agent.lower() for pattern in suspicious_patterns):
                log_security_event('suspicious_user_agent', {
                    'user_agent': user_agent,
                    'endpoint': request.endpoint,
                    'method': request.method,
                    'ip': request.remote_addr
                })
        
        # Rate limiting for large file uploads
        max_size = app.config.get('MAX_CONTENT_LENGTH', 50 * 1024 * 1024)
        if request.content_length and request.content_length > max_size:
            log_security_event('large_file_upload_attempt', {
                'content_length': request.content_length,
                'endpoint': request.endpoint,
                'ip': request.remote_addr
            })
    
    @app.before_request
    def log_request_info():
        """Log request information for debugging"""
        if app.config.get('DEBUG'):
            app.logger.debug(f"Request: {request.method} {request.url}")
            app.logger.debug(f"Headers: {dict(request.headers)}")
    
    @app.after_request
    def log_response_info(response):
        """Log response information for debugging"""
        if app.config.get('DEBUG'):
            app.logger.debug(f"Response: {response.status_code}")
        return response
    
    @app.after_request
    def add_security_headers(response):
        """Add additional security headers"""
        if not app.config.get('TESTING'):
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            
            # HSTS (Strict-Transport-Security)
            if app.config.get('ENV') == 'production':
                response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            
            # Content Security Policy (CSP) - Basic policy, can be refined
            response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
            
            # Referrer Policy
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response
