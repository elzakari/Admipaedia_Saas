from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_mail import Mail
from flask_babel import Babel
import structlog

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

try:
    from flask_bcrypt import Bcrypt as _Bcrypt
    bcrypt = _Bcrypt()
except Exception:
    from werkzeug.security import generate_password_hash as _generate_password_hash
    from werkzeug.security import check_password_hash as _check_password_hash

    class _WerkzeugBcrypt:
        def init_app(self, app):
            return None

        def generate_password_hash(self, password, rounds=None):
            return _generate_password_hash(password).encode('utf-8')

        def check_password_hash(self, pw_hash, password):
            if isinstance(pw_hash, (bytes, bytearray)):
                pw_hash = pw_hash.decode('utf-8')
            return bool(_check_password_hash(pw_hash, password))

    bcrypt = _WerkzeugBcrypt()
cors = CORS()
mail = Mail()
babel = Babel()
# Initialize SocketIO with async mode and ping timeout settings
socketio = SocketIO(
    async_mode='eventlet', 
    ping_timeout=120, 
    ping_interval=25, 
    cors_allowed_origins="*"
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()
