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

# Automatic Context-Aware Branch Scoping
from sqlalchemy.orm import Query
from sqlalchemy import event
from flask import g, has_app_context

@event.listens_for(Query, "before_compile", retval=True)
def before_compile_query(query):
    """
    SQLAlchemy query compiler event listener.
    Automatically scopes all default queries on branch-aware models
    to the active branch_id in the current request context (if set).
    """
    try:
        if has_app_context() and hasattr(g, 'branch_id') and g.branch_id is not None:
            for desc in query.column_descriptions:
                entity = desc.get('entity')
                if entity and hasattr(entity, 'branch_id'):
                    # Save and temporarily remove limit/offset clauses to bypass the strict ordering check
                    limit_clause = getattr(query, '_limit_clause', None)
                    offset_clause = getattr(query, '_offset_clause', None)
                    limit = getattr(query, '_limit', None)
                    offset = getattr(query, '_offset', None)
                    
                    if limit_clause is not None or limit is not None:
                        if hasattr(query, '_limit_clause'): query._limit_clause = None
                        if hasattr(query, '_limit'): query._limit = None
                    if offset_clause is not None or offset is not None:
                        if hasattr(query, '_offset_clause'): query._offset_clause = None
                        if hasattr(query, '_offset'): query._offset = None
                        
                    query = query.filter(entity.branch_id == g.branch_id)
                    
                    # Restore limit/offset clauses
                    if limit_clause is not None: query._limit_clause = limit_clause
                    if limit is not None: query._limit = limit
                    if offset_clause is not None: query._offset_clause = offset_clause
                    if offset is not None: query._offset = offset
    except Exception:
        pass
    return query

migrate = Migrate()
jwt = JWTManager()

from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
cors = CORS()
mail = Mail()
babel = Babel()
# Initialize SocketIO with async mode and ping timeout settings
import os
socketio_async_mode = os.environ.get('SOCKETIO_ASYNC_MODE', 'eventlet')
async_mode = 'threading' if socketio_async_mode == 'disabled' else socketio_async_mode

socketio = SocketIO(
    async_mode=async_mode, 
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
