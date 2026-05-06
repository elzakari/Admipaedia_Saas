# ADMIPAEDIA Database Migrations Guide

## Overview
ADMIPAEDIA uses Alembic (via Flask-Migrate) to manage schema changes. This guide documents environment variable precedence, offline/online migration workflows, and safe rollout/rollback procedures.

## Engine URL Resolution
Source: `backend/migrations/env.py:14–45`
- Precedence order
  1. `ALEMBIC_DB_URL` (preferred)
  2. `DATABASE_URL`
  3. Composed from parts: `ALEMBIC_DB_USER`/`DB_USER`, `ALEMBIC_DB_PASSWORD`/`DB_PASSWORD`, `ALEMBIC_DB_HOST` (default `localhost`), `ALEMBIC_DB_PORT` (default `5432`), `ALEMBIC_DB_NAME`/`DB_NAME`
  4. Flask app context `SQLALCHEMY_DATABASE_URI` (if present)
  5. `alembic.ini` option `sqlalchemy.url`
- Notes
  - Unicode credentials are safely quoted in the composed URL
  - Prefer using discrete env parts for CI to avoid encoding issues

## Offline vs Online Migrations
Source: `backend/migrations/env.py:57–93`
- Offline (`run_migrations_offline`)
  - Generates SQL without connecting to the database
  - Enables `literal_binds`, `compare_type`, `compare_server_default`
- Online (`run_migrations_online`)
  - Connects via SQLAlchemy `create_engine`
  - Configures type and server default comparisons

## Environment Setup
- Recommended environment variables
```bash
# Engine URL (highest precedence)
ALEMBIC_DB_URL=postgresql+psycopg2://user:pass@host:5432/dbname

# Alternatively, discrete parts
ALEMBIC_DB_USER=user
ALEMBIC_DB_PASSWORD=pass
ALEMBIC_DB_HOST=localhost
ALEMBIC_DB_PORT=5432
ALEMBIC_DB_NAME=admipaedia
```
- Windows PowerShell examples
```powershell
$env:ALEMBIC_DB_USER="user"
$env:ALEMBIC_DB_PASSWORD="pass"
$env:ALEMBIC_DB_NAME="admipaedia"
$env:ALEMBIC_DB_HOST="localhost"
$env:ALEMBIC_DB_PORT="5432"
```

## Common Commands
```bash
# Initialize (once per project)
flask db init

# Create migration script (after model changes)
flask db migrate -m "describe change"

# Apply migrations
flask db upgrade

# Downgrade by one revision
flask db downgrade -1

# Show current revision
flask db current

# Stamp DB with a revision (sync without running)
flask db stamp head
```

## Safe Rollout Procedure
1. Backup database
2. Apply to staging using the same env precedence
3. Monitor performance (indexes, query plans)
4. Schedule production upgrade during low-traffic windows
5. Verify application health and logs

## Rollback Strategy
- Index-related changes
  - Drop optimization indexes as needed
- Schema changes
  - Use `flask db downgrade` to revert to prior revision
- Config resets
  - Ensure `alembic.ini` URL is not relied upon in production; use env vars

## Troubleshooting
- Credential encoding errors
  - Use discrete env parts (user/password/host/port/name) rather than a single URL
- Connection issues
  - Validate network access and SSL requirements
- Drift between environments
  - Use `flask db stamp` to align revision metadata, then `upgrade`

## References
- Env resolution logic: `backend/migrations/env.py:14–45`
- Offline/online flows: `backend/migrations/env.py:57–93`
- Project roadmap: `docs/Technical_Roadmap.md`
## Validation Checklist
- Environment variables set using preferred precedence (test with `ALEMBIC_DB_URL`, then discrete parts)
- Offline migration generation completes without errors
- Online migration on staging applies cleanly
- Backups taken prior to upgrade; rollback plan prepared
- Index changes verified with performance monitoring
- Application health checks pass post-upgrade
