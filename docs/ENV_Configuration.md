# Environment Configuration

## Alembic (Migrations)
- Preferred: `ALEMBIC_DB_URL=postgresql+psycopg2://user:pass@host:5432/dbname`
- Alternative (discrete parts):
```bash
ALEMBIC_DB_USER=user
ALEMBIC_DB_PASSWORD=pass
ALEMBIC_DB_HOST=localhost
ALEMBIC_DB_PORT=5432
ALEMBIC_DB_NAME=admipaedia
```
- Precedence matches `backend/migrations/env.py:14–45` and branch at `backend/migrations/env.py:16` (`if url:`)

## Application (.env)
```env
# Flask / App
FLASK_ENV=development
SECRET_KEY=replace-me

# JWT
JWT_SECRET_KEY=replace-me
JWT_ACCESS_TOKEN_EXPIRES=28800
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Database
SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://user:pass@localhost:5432/admipaedia

# Redis / Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Mail
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=replace-me
MAIL_PASSWORD=replace-me
```

## Socket.IO / Realtime Runtime
```env
# Flask-SocketIO async mode - MUST remain explicit.
# Production default: "threading" (matches Gunicorn gthread worker class).
# Eventlet/gevent are NOT production defaults because they monkey-patch Python
# I/O and are incompatible with gthread + Werkzeug Response handling.
# Whitelist: threading | eventlet | gevent (invalid values fall back to threading)
SOCKETIO_ASYNC_MODE=threading

# REST-only backend-api workers can disable Socket.IO entirely:
# SOCKETIO_ASYNC_MODE=disabled

# Gunicorn (backend-socket service — the one that serves Socket.IO upgrades)
# Why 1 worker? Flask-SocketIO keeps the connection registry AND the single
# background telemetry task in-process. Multi-worker without a Socket.IO Redis
# Adapter + sticky sessions causes: duplicate tasks, lost client state, and
# 400/5xx during websocket upgrade because the handshake hits a worker with
# no matching Engine.IO session.
GUNICORN_WORKERS=1
GUNICORN_WORKER_CLASS=gthread
GUNICORN_THREADS=16
GUNICORN_TIMEOUT=120
GUNICORN_GRACEFUL_TIMEOUT=30
GUNICORN_KEEPALIVE=5
GUNICORN_MAX_REQUESTS=1000
GUNICORN_MAX_REQUESTS_JITTER=100

# Optional future horizontal scaling: if you deploy N single-worker backend-socket
# containers behind a load balancer, you MUST additionally provide:
# SOCKETIO_MESSAGE_QUEUE=redis://<host>:6379/<db>   (cross-instance pub/sub)
# and enable sticky (session-affinity) load balancing so Engine.IO handshakes
# and upgrades always return to the same originating process.
```

## Windows PowerShell Examples
```powershell
$env:ALEMBIC_DB_USER="user"
$env:ALEMBIC_DB_PASSWORD="pass"
$env:ALEMBIC_DB_NAME="admipaedia"
$env:ALEMBIC_DB_HOST="localhost"
$env:ALEMBIC_DB_PORT="5432"
```

## Notes
- Prefer discrete env parts in CI to avoid encoding issues
- Keep secrets out of source control; use environment managers or secret stores
