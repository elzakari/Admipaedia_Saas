"""
Core application components
"""

from .blueprints import register_blueprints
from .error_handlers import register_error_handlers
from .extensions import init_extensions
from .factory import create_app
from .middleware import register_middleware

__all__ = [
    "create_app",
    "init_extensions",
    "register_blueprints",
    "register_middleware",
    "register_error_handlers",
]
