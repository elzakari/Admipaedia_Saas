"""Socket.IO WSGI entrypoint for the dedicated backend-socket gunicorn worker.

This module is intentionally FREE of any async framework monkey-patching
(e.g. gevent/eventlet) because the gunicorn worker-class is ``gthread`` and
the selected Flask-SocketIO async_mode is ``threading``.  Mixing
gevent.monkey.patch_all with POSIX-thread workers causes random Engine.IO
session invalidation and HTTP 400 polling/xhr post errors in production.
"""

import os

from app import create_app

config_name = os.environ.get("FLASK_ENV", "production")
app = create_app(config_name)
