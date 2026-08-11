#!/bin/bash
# ADMIPAEDIA Deployment and Verification Script
# Processes build evaluations strictly using environment variables
set -e

# Configuration from environment variables with sensible defaults
export ENVIRONMENT="${ENVIRONMENT:-production}"
export VERSION="${VERSION:-latest}"
export DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.prod.yml}"
export DOCKER_COMPOSE_SOCKET_HOTFIX="${DOCKER_COMPOSE_SOCKET_HOTFIX:-docker-compose.socket-hotfix.yml}"
export BACKEND_API_PORT="${BACKEND_API_PORT:-5000}"
export FRONTEND_PORT="${FRONTEND_PORT:-80}"

# Resolve the complete docker-compose CLI arguments.
#
# Production architecture MUST include docker-compose.socket-hotfix.yml
# whenever it is present alongside the primary compose file.  Operators may
# omit the file on non-socket fleets; the function silently skips the hotfix
# overlay so this script remains portable.
DOCKER_COMPOSE_ARGS=(-f "$DOCKER_COMPOSE_FILE")
if [ -f "$DOCKER_COMPOSE_SOCKET_HOTFIX" ]; then
  DOCKER_COMPOSE_ARGS+=(-f "$DOCKER_COMPOSE_SOCKET_HOTFIX")
fi

docker_compose() {
  docker compose "${DOCKER_COMPOSE_ARGS[@]}" "$@"
}

# Wait until PostgreSQL accepts connections AND has completed crash recovery
# (pg_is_in_recovery() = f).  Only after both conditions pass may Alembic
# issue DDL writes.
wait_for_postgres_writable() {
  local max_attempts="${1:-90}"
  local attempt=1

  echo "🗄️  Checking PostgreSQL readiness..."

  while [ "$attempt" -le "$max_attempts" ]; do
    if docker_compose exec -T postgres sh -lc '
        set -e
        pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1
        recovery_state="$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT pg_is_in_recovery();")"
        [ "$recovery_state" = "f" ]
      ' 2>/dev/null; then
      echo "✅ PostgreSQL is accepting connections and is writable."
      return 0
    fi

    echo "⏳ PostgreSQL not ready yet ($attempt/$max_attempts). Retrying..."

    sleep 2
    attempt=$((attempt + 1))
  done

  echo "❌ ERROR: PostgreSQL did not become writable within $((max_attempts * 2)) seconds."
  return 1
}

echo "🚀 Starting ADMIPAEDIA update sequence..."
echo "📋 Environment: $ENVIRONMENT"
echo "📦 Version: $VERSION"
echo "📁 Docker Compose File: $DOCKER_COMPOSE_FILE"

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    echo "📋 Loading configuration from .env.$ENVIRONMENT"
    export $(cat ".env.$ENVIRONMENT" | xargs)
fi

# Pre-deployment Cloudflared status check (handled strictly as warning)
echo "🔍 Checking Cloudflared tunnel status..."
if ! command -v cloudflared >/dev/null 2>&1; then
    echo "⚠️  WARNING: cloudflared CLI is not installed on host. Cloudflared missing origin state warning."
else
    # Attempt to query active tunnel status, log warning on failure
    if ! cloudflared tunnel list 2>/dev/null | grep -q "active"; then
        echo "⚠️  WARNING: Cloudflared tunnel does not appear to be actively running. Incoming web traffic might be blocked."
    else
        echo "✅ Cloudflared tunnel is active"
    fi
fi

# Build images
echo "🏗️  Evaluating build configuration and compiling images..."
docker_compose build --no-cache backend frontend worker

# Run container updates
#
# Unified service topology matches the fleet running on sms-prod
# (service names: backend, frontend, worker, postgres, redis).
# The single `backend` container serves both REST API and Socket.IO traffic
# with a single gunicorn worker so Engine.IO sid state is preserved.
#
# Only backend/frontend/worker are force-recreated here; postgres/redis
# infrastructure containers stay up so long-running connections and volumes
# are never torn down during routine application deploys.
echo "🚀 Deploying unified backend architecture (backend + frontend + worker)..."
docker_compose up -d --no-deps --force-recreate backend frontend worker

# Ensure supporting infrastructure is running if this is a first-time deploy.
# Running `up -d --no-deps` on the infra services is a pure reconciliation
# no-op when they already exist and are healthy.
echo "🖥️  Reconciling infrastructure (postgres, redis, nginx-if-present)..."
docker_compose up -d --no-deps postgres redis 2>/dev/null || true
if docker_compose config --services 2>/dev/null | grep -qx nginx; then
  docker_compose up -d --no-deps nginx 2>/dev/null || true
fi

# Execute database migrations (which includes the bfa_apc permanent fixes).
#
# Gate sequence:
#   1. wait_for_postgres_writable — bounded retries, validates pg_isready AND
#      pg_is_in_recovery()=false.  Prevents the well-known Alembic
#      "FATAL: the database system is not yet accepting connections" crash
#      during postmaster recovery replay on container restart.
#   2. flask db upgrade — runs EXACTLY ONCE against a backend one-shot with
#      --no-deps (never starts postgres/redis).  No retry; a migration defect
#      must halt deployment immediately so operators can triage the DDL.
wait_for_postgres_writable
echo "🗄️  Enforcing migrations on active production backend..."
docker_compose run --rm --no-deps backend flask db upgrade

# Grace period for service startup
echo "⏱️  Waiting for service stabilization..."
sleep 15

# Verification: Network and Header Checks
echo "🏥 Executing explicit network header verification..."

# 1. API Health Check Response Code and Headers
echo "🔍 Querying backend API headers..."
API_HEADERS_TEMP=$(mktemp)
API_HTTP_CODE=$(curl -s -o /dev/null -D "$API_HEADERS_TEMP" -w "%{http_code}" "http://localhost:$BACKEND_API_PORT/health" || echo "failed")

if [ "$API_HTTP_CODE" != "200" ]; then
    echo "❌ API service returned unhealthy HTTP status code: $API_HTTP_CODE"
    cat "$API_HEADERS_TEMP" 2>/dev/null || true
    rm -f "$API_HEADERS_TEMP"
    exit 1
else
    echo "✅ API service returned healthy HTTP status: 200"
    echo "📄 API Headers:"
    cat "$API_HEADERS_TEMP" | sed 's/^/   /'
    rm -f "$API_HEADERS_TEMP"
fi

# 2. Frontend Health Check Response Code and Headers
echo "🔍 Querying frontend HTTP headers..."
FE_HEADERS_TEMP=$(mktemp)
FE_HTTP_CODE=$(curl -s -o /dev/null -D "$FE_HEADERS_TEMP" -w "%{http_code}" "http://localhost:$FRONTEND_PORT/health" || echo "failed")

if [ "$FE_HTTP_CODE" != "200" ]; then
    echo "❌ Frontend service returned unhealthy HTTP status code: $FE_HTTP_CODE"
    cat "$FE_HEADERS_TEMP" 2>/dev/null || true
    rm -f "$FE_HEADERS_TEMP"
    exit 1
else
    echo "✅ Frontend service returned healthy HTTP status: 200"
    echo "📄 Frontend Headers:"
    cat "$FE_HEADERS_TEMP" | sed 's/^/   /'
    rm -f "$FE_HEADERS_TEMP"
fi

# 3. Public Gateway Proxy Check
echo "🔍 Querying public gateway routing (Frontend Nginx -> Backend API)..."
GATEWAY_HEADERS_TEMP=$(mktemp)
GATEWAY_HTTP_CODE=$(curl -s -o /dev/null -D "$GATEWAY_HEADERS_TEMP" -w "%{http_code}" "http://localhost:$FRONTEND_PORT/api/" || echo "failed")

if [ "$GATEWAY_HTTP_CODE" != "200" ]; then
    echo "❌ Gateway proxy routing failed with HTTP status code: $GATEWAY_HTTP_CODE"
    cat "$GATEWAY_HEADERS_TEMP" 2>/dev/null || true
    rm -f "$GATEWAY_HEADERS_TEMP"
    exit 1
else
    echo "✅ Gateway proxy routing returned healthy HTTP status: 200"
    rm -f "$GATEWAY_HEADERS_TEMP"
fi

# 4. Internal API Root Check
echo "🔍 Querying internal backend API root..."
INT_HEADERS_TEMP=$(mktemp)
INT_HTTP_CODE=$(curl -s -o /dev/null -D "$INT_HEADERS_TEMP" -w "%{http_code}" "http://localhost:$BACKEND_API_PORT/" || echo "failed")

if [ "$INT_HTTP_CODE" != "200" ]; then
    echo "❌ Internal API root returned unhealthy HTTP status code: $INT_HTTP_CODE"
    cat "$INT_HEADERS_TEMP" 2>/dev/null || true
    rm -f "$INT_HEADERS_TEMP"
    exit 1
else
    echo "✅ Internal API root returned healthy HTTP status: 200"
    rm -f "$INT_HEADERS_TEMP"
fi

# 5. Compiled JS Asset Content-Type Check
echo "🔍 Querying frontend index.html to discover compiled JS bundle..."
INDEX_HTML=$(curl -s "http://localhost:$FRONTEND_PORT/")
# Extract JS path from src="...", search for /assets/ or any .js script tag
JS_PATH=$(echo "$INDEX_HTML" | grep -oE 'src="[^"]+\.js"' | head -n 1 | cut -d'"' -f2)

if [ -z "$JS_PATH" ]; then
    echo "⚠️  WARNING: Could not auto-detect JS bundle path in index.html. Trying fallback /assets/index.js..."
    JS_PATH="/assets/index.js"
fi

echo "✅ Located JS bundle path: $JS_PATH"

if [[ "$JS_PATH" == /* ]]; then
    JS_URL="http://localhost:$FRONTEND_PORT$JS_PATH"
else
    JS_URL="http://localhost:$FRONTEND_PORT/$JS_PATH"
fi

echo "🔍 Fetching JS bundle and verifying Content-Type header..."
JS_HEADERS_TEMP=$(mktemp)
JS_HTTP_CODE=$(curl -s -o /dev/null -D "$JS_HEADERS_TEMP" -w "%{http_code}" "$JS_URL" || echo "failed")

if [ "$JS_HTTP_CODE" != "200" ]; then
    echo "❌ JS bundle fetch failed with HTTP status code: $JS_HTTP_CODE (URL: $JS_URL)"
    cat "$JS_HEADERS_TEMP" 2>/dev/null || true
    rm -f "$JS_HEADERS_TEMP"
    exit 1
else
    echo "✅ JS bundle fetched successfully with HTTP status: 200"
fi

CONTENT_TYPE=$(grep -i 'content-type' "$JS_HEADERS_TEMP" | tr -d '\r\n')
echo "📄 JS Bundle Content-Type header: $CONTENT_TYPE"
if [[ "$CONTENT_TYPE" != *"application/javascript"* ]]; then
    echo "❌ ERROR: JS bundle is not served with 'application/javascript' content-type!"
    rm -f "$JS_HEADERS_TEMP"
    exit 1
else
    echo "✅ JS bundle content-type verified successfully!"
    rm -f "$JS_HEADERS_TEMP"
fi

echo "🧹 Cleaning up legacy dangling build structures..."
docker image prune -f

echo "🎉 Deployment successfully verified!"
