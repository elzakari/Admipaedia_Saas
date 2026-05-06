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
