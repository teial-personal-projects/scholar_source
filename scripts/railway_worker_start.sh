#!/bin/bash
set -euo pipefail

# Railway Celery Worker Startup Script
# This script provides comprehensive logging and error checking
# to diagnose worker startup issues on Railway.

echo "============================================" >&2
echo "🚀 CELERY WORKER STARTUP ON RAILWAY" >&2
echo "============================================" >&2
echo "Timestamp: $(date)" >&2
echo "Hostname: $(hostname)" >&2
echo "Python: $(python --version)" >&2
echo "Working Dir: $(pwd)" >&2
echo "User: $(whoami 2>/dev/null || echo 'unknown')" >&2
echo "" >&2

# Railway Environment Detection
RAILWAY_ENV=${RAILWAY_ENVIRONMENT_NAME:-${RAILWAY_ENVIRONMENT:-local}}
RAILWAY_BRANCH=${RAILWAY_GIT_BRANCH:-unknown}

echo "🚂 RAILWAY ENVIRONMENT DETECTION:" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "Environment: $RAILWAY_ENV" >&2
echo "Git Branch: $RAILWAY_BRANCH" >&2
echo "Service: ${RAILWAY_SERVICE_NAME:-unknown}" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2

# Environment check
echo "📋 ENVIRONMENT VARIABLES:" >&2
echo "REDIS_URL: ${REDIS_URL:0:40}..." >&2
echo "PYTHONPATH: ${PYTHONPATH:-not set}" >&2
echo "PORT: ${PORT:-not set}" >&2
echo "" >&2

# Set Python path
export PYTHONPATH="${PYTHONPATH:-.}:$(pwd)"
echo "✅ PYTHONPATH set to: $PYTHONPATH" >&2
echo "" >&2

echo "🔍 DIRECTORY STRUCTURE:" >&2
ls -la >&2
echo "" >&2
echo "Backend directory:" >&2
ls -la backend/ >&2
echo "" >&2

# Verify imports
echo "🔍 VERIFYING IMPORTS..." >&2
python -u -c "import backend.celery_app; print('✅ backend.celery_app imported', flush=True)" 2>&1 || {
    echo "❌ Failed to import backend.celery_app" >&2
    echo "Python path:" >&2
    python -c "import sys; print('\n'.join(sys.path))" >&2
    exit 1
}

python -u -c "import backend.tasks; print('✅ backend.tasks imported', flush=True)" 2>&1 || {
    echo "❌ Failed to import backend.tasks" >&2
    exit 1
}

echo "" >&2
echo "🔌 TESTING REDIS CONNECTION..." >&2
python -u -c "
import redis
import os
url = os.getenv('REDIS_URL')
if not url:
    print('❌ REDIS_URL not set', flush=True)
    exit(1)
print(f'Connecting to: {url[:40]}...', flush=True)
r = redis.from_url(url)
r.ping()
print('✅ Redis connection successful', flush=True)
" 2>&1 || {
    echo "❌ Redis connection failed" >&2
    echo "Please verify REDIS_URL is set correctly in Railway environment variables" >&2
    exit 1
}

echo "" >&2
echo "============================================" >&2
echo "🚀 STARTING CELERY WORKER" >&2
echo "============================================" >&2
echo "Queue: crew_jobs,default" >&2
echo "Concurrency: 2" >&2
echo "Pool: solo (Railway-optimized)" >&2
echo "Log Level: info" >&2
echo "" >&2

# Start Celery worker with Railway-optimized settings
exec python -u -m celery \
    -A backend.celery_app \
    worker \
    --loglevel=info \
    --queues=crew_jobs,default \
    --concurrency=2 \
    --max-tasks-per-child=100 \
    --time-limit=3600 \
    --soft-time-limit=3000 \
    --without-heartbeat \
    --without-gossip \
    --without-mingle \
    --pool=solo
