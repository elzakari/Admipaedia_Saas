"""
ADMIPAEDIA Backend Package
"""
from app.core.factory import create_app
from app.extensions import db, jwt, bcrypt, mail, migrate, socketio, cors

# For backward compatibility
create_application = create_app

__version__ = "2.0.0"
__author__ = "ADMIPAEDIA Development Team"
