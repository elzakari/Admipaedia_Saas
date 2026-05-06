# module-level imports
import logging
import os
from logging.config import fileConfig
from alembic import context
from sqlalchemy import create_engine, pool

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

def get_engine_url():
    url = os.environ.get('ALEMBIC_DB_URL') or os.environ.get('DATABASE_URL')
    if url:
        return url.strip()
    try:
        from urllib.parse import quote_plus
        user = os.environ.get('ALEMBIC_DB_USER') or os.environ.get('DB_USER')
        password = os.environ.get('ALEMBIC_DB_PASSWORD') or os.environ.get('DB_PASSWORD')
        host = os.environ.get('ALEMBIC_DB_HOST', 'localhost')
        port = os.environ.get('ALEMBIC_DB_PORT', '5432')
        name = os.environ.get('ALEMBIC_DB_NAME') or os.environ.get('DB_NAME')
        if user and password and name:
            safe_user = quote_plus(user)
            safe_password = quote_plus(password)
            return f"postgresql+psycopg2://{safe_user}:{safe_password}@{host}:{port}/{name}"
    except Exception:
        pass
    try:
        from flask import current_app, has_app_context
        if has_app_context():
            uri = current_app.config.get('SQLALCHEMY_DATABASE_URI')
            if uri:
                return uri.strip()
    except Exception:
        pass
    try:
        return config.get_main_option('sqlalchemy.url', '').strip()
    except Exception:
        return ''

config.set_main_option('sqlalchemy.url', get_engine_url() or "")

# Target metadata: try to import SQLAlchemy db instance without needing Flask app
try:
    import sys
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.extensions import db
    target_metadata = db.metadata
except Exception:
    target_metadata = None

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = create_engine(
        config.get_main_option("sqlalchemy.url"),
        poolclass=pool.NullPool,
    )
    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    except UnicodeDecodeError as e:
        raise RuntimeError(
            "Unicode issue in DB URL. Prefer ALEMBIC_DB_USER/PASSWORD/HOST/PORT/NAME "
            "and let env.py encode credentials."
        ) from e

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
