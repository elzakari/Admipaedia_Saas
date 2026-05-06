#!/bin/bash

# ADMIPAEDIA Production Deployment Script
set -e

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "🚀 Starting ADMIPAEDIA deployment to $ENVIRONMENT"
echo "📦 Version: $VERSION"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    echo "📋 Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | xargs)
else
    echo "⚠️  No .env.$ENVIRONMENT file found, using defaults"
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check database connectivity
echo "🗄️  Checking database connectivity..."
if ! docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U admipaedia; then
    echo "❌ Database is not ready. Please check your database configuration."
    exit 1
fi

# Check Redis connectivity
echo "🔴 Checking Redis connectivity..."
if ! docker-compose -f docker-compose.prod.yml exec redis redis-cli ping; then
    echo "❌ Redis is not ready. Please check your Redis configuration."
    exit 1
fi

# Backup database
echo "💾 Creating database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U admipaedia admipaedia > "backups/$BACKUP_FILE"
echo "✅ Database backup created: backups/$BACKUP_FILE"

# Build and deploy
echo "🏗️  Building application images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Deploying application..."
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml exec backend flask db upgrade

# Health checks
echo "🏥 Running health checks..."
sleep 30

# Check frontend health
if curl -f http://localhost/health; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# Check backend health
if curl -f http://localhost:5000/health; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Cleanup old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "🎉 Deployment completed successfully!"
echo "🌐 Application is available at: http://localhost"
echo "📊 Admin dashboard: http://localhost/admin"
echo "📚 API documentation: http://localhost:5000/api/docs"