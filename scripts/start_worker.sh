#!/bin/bash
# Start Celery Worker for ScholarSource
#
# This script starts a Celery worker that processes jobs from the task queue.
# Make sure Redis is running and REDIS_URL is set in .env before starting.

# Load environment variables from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Check if Redis is accessible
echo "Checking Redis connection..."
python -c "
from redis import Redis
import os
import sys

try:
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    redis_client = Redis.from_url(redis_url)
    redis_client.ping()
    print('✅ Redis connection successful')
except Exception as e:
    print(f'❌ Redis connection failed: {e}')
    print('Make sure Redis is running and REDIS_URL is set correctly in .env')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    exit 1
fi

echo ""
echo "Starting Celery worker..."
echo "Queues: crew_jobs, default"
echo "Concurrency: 2 workers"
echo "Press Ctrl+C to stop"
echo ""

# Start Celery worker
# --loglevel=info: Show informational logs
# --queues=crew_jobs,default: Process tasks from both queues
# --concurrency=2: Run 2 worker processes (adjust based on your CPU cores)
# -n worker1@%h: Worker name (hostname-based)
celery -A backend.celery_app worker \
    --loglevel=info \
    --queues=crew_jobs,default \
    --concurrency=2 \
    -n worker1@%h
