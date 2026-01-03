# Celery on Railway - Troubleshooting Guide

## Problem: Celery Workers Not Starting on Railway

This guide helps diagnose and fix Celery worker startup issues on Railway where workers start locally but fail in production.

---

## Common Issues & Solutions

### 1. **No Logs Visible**

#### Problem
Worker process starts but produces no logs, making debugging impossible.

#### Root Causes
- Logs are buffered and not flushed to stdout
- Railway's log collector misses startup messages
- Worker crashes before logging initialization

#### Solution
```bash
# In Procfile, add these flags:
worker: PYTHONUNBUFFERED=1 FORCE_COLOR=1 python -u -m celery -A backend.celery_app worker --loglevel=info
```

**Key Flags:**
- `PYTHONUNBUFFERED=1` - Disable Python output buffering
- `FORCE_COLOR=1` - Enable color output (helps Rich/CrewAI)
- `python -u` - Unbuffered binary output
- `--loglevel=info` - Start with info level, increase to debug if needed

---

### 2. **Import Errors**

#### Problem
```
ModuleNotFoundError: No module named 'backend'
ModuleNotFoundError: No module named 'scholar_source'
```

#### Root Cause
Python can't find your application modules.

#### Solution

**Option A: Add to Procfile**
```bash
worker: PYTHONPATH=. PYTHONUNBUFFERED=1 celery -A backend.celery_app worker --loglevel=info
```

**Option B: Use the enhanced startup script (Recommended)**

The project already includes `scripts/railway_worker_start.sh` with comprehensive logging and diagnostics.

In Procfile:
```bash
worker: bash scripts/railway_worker_start.sh
```

This script automatically:
- Sets PYTHONPATH correctly
- Tests all imports before starting
- Verifies Redis connection
- Logs environment details
- Shows Railway environment info

---

### 3. **Redis Connection Issues**

#### Problem
```
[ERROR/MainProcess] consumer: Cannot connect to redis://...
kombu.exceptions.OperationalError: Error connecting to Redis
```

#### Root Cause
- `REDIS_URL` environment variable not set
- Redis credentials incorrect
- Network timeout
- SSL/TLS issues

#### Solution

**Check Environment Variables:**
```bash
# In Railway dashboard, verify REDIS_URL is set
# Format: redis://default:password@host:port
```

**Add Connection Retry Logic:**

Update `backend/celery_app.py`:
```python
import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL")

if not REDIS_URL:
    raise ValueError("❌ REDIS_URL environment variable is not set!")

print(f"✅ Connecting to Redis: {REDIS_URL[:30]}...", flush=True)

app = Celery(
    "scholar_source",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["backend.tasks"]
)

# Add broker connection retry settings
app.conf.update(
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
)
```

**For Redis Labs/Cloud Redis:**

If using SSL:
```python
# In celery_app.py
import ssl

app.conf.broker_use_ssl = {
    'ssl_cert_reqs': ssl.CERT_NONE  # For Railway/Redis Labs
}
app.conf.redis_backend_use_ssl = {
    'ssl_cert_reqs': ssl.CERT_NONE
}
```

---

### 4. **Worker Dies Immediately**

#### Problem
Worker starts but exits immediately with no error message.

#### Root Cause
- Unhandled exception during initialization
- Missing dependencies
- Invalid configuration

#### Solution

**Add Health Check Script:**

Create `scripts/test_celery.sh`:
```bash
#!/bin/bash
echo "Testing Celery configuration..."

# Test 1: Import Celery app
echo "1. Testing Celery app import..."
python -c "from backend.celery_app import app; print('✅ Celery app OK')" || exit 1

# Test 2: Check Redis connection
echo "2. Testing Redis connection..."
python -c "
from backend.celery_app import app
result = app.control.inspect().stats()
print('✅ Redis connection OK' if result else '❌ No workers connected')
" || exit 1

# Test 3: Test task import
echo "3. Testing task import..."
python -c "from backend.tasks import run_crew_task; print('✅ Tasks OK')" || exit 1

echo "✅ All checks passed!"
```

Run locally:
```bash
chmod +x scripts/test_celery.sh
./scripts/test_celery.sh
```

---

### 5. **Missing Dependencies**

#### Problem
```
ModuleNotFoundError: No module named 'kombu'
ModuleNotFoundError: No module named 'celery'
```

#### Root Cause
Celery and its dependencies not installed.

#### Solution

**Verify requirements.txt includes:**
```txt
celery[redis]>=5.3.0
redis>=5.0.0
kombu>=5.3.0
```

**Railway Build Log Check:**
- Go to Railway dashboard → Deployments → Build logs
- Verify `pip install -r requirements.txt` succeeds
- Look for "Successfully installed celery-X.X.X"

---

### 6. **Procfile Issues**

#### Problem
Worker doesn't start or starts wrong process.

#### Current Procfile
```bash
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT 2>&1
worker: env PYTHONUNBUFFERED=1 FORCE_COLOR=1 TERM=xterm-256color celery -A backend.celery_app worker --loglevel=debug --queues=crew_jobs,default --concurrency=2
```

#### Improved Procfile with Better Logging
```bash
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT --log-level info

worker: bash -c "echo '🚀 Worker starting...' && \
    echo 'REDIS_URL: ${REDIS_URL:0:30}...' && \
    echo 'PYTHONPATH: $PYTHONPATH' && \
    PYTHONUNBUFFERED=1 FORCE_COLOR=1 python -u -m celery \
    -A backend.celery_app worker \
    --loglevel=info \
    --queues=crew_jobs,default \
    --concurrency=2 \
    --max-tasks-per-child=100 \
    --without-heartbeat \
    --without-gossip \
    --without-mingle"
```

**Flags Explained:**
- `--without-heartbeat` - Disable periodic heartbeat (can cause issues in containers)
- `--without-gossip` - Disable gossip protocol (not needed for single worker)
- `--without-mingle` - Disable worker synchronization (faster startup)

---

### 7. **Railway-Specific Configuration**

#### Problem
Works locally but not on Railway.

#### Railway Environment Differences
- Different file system paths
- Different Python version
- Different resource constraints
- Different networking

#### Solution

**Create Railway-specific startup script:**

`scripts/railway_worker_start.sh`:
```bash
#!/bin/bash
set -euo pipefail

# Railway worker startup script with comprehensive logging

echo "============================================"
echo "🚀 CELERY WORKER STARTUP ON RAILWAY"
echo "============================================"
echo "Timestamp: $(date)"
echo "Hostname: $(hostname)"
echo "Python: $(python --version)"
echo "Working Dir: $(pwd)"
echo "User: $(whoami)"
echo ""

# Environment check
echo "📋 ENVIRONMENT VARIABLES:"
echo "REDIS_URL: ${REDIS_URL:0:40}..."
echo "PYTHONPATH: ${PYTHONPATH:-not set}"
echo "RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-not set}"
echo ""

# Set Python path
export PYTHONPATH="${PYTHONPATH:-.}:$(pwd)"
echo "✅ PYTHONPATH set to: $PYTHONPATH"
echo ""

# Verify imports
echo "🔍 VERIFYING IMPORTS..."
python -c "import backend.celery_app; print('✅ backend.celery_app imported')" || {
    echo "❌ Failed to import backend.celery_app"
    echo "Directory contents:"
    ls -la
    echo "Backend directory:"
    ls -la backend/
    exit 1
}

python -c "import backend.tasks; print('✅ backend.tasks imported')" || {
    echo "❌ Failed to import backend.tasks"
    exit 1
}

echo ""
echo "🔌 TESTING REDIS CONNECTION..."
python -c "
import redis
import os
url = os.getenv('REDIS_URL')
r = redis.from_url(url)
r.ping()
print('✅ Redis connection successful')
" || {
    echo "❌ Redis connection failed"
    exit 1
}

echo ""
echo "============================================"
echo "🚀 STARTING CELERY WORKER"
echo "============================================"
echo ""

# Start Celery worker with all flags
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
```

Make executable:
```bash
chmod +x scripts/railway_worker_start.sh
```

Update Procfile:
```bash
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
worker: bash scripts/railway_worker_start.sh
```

---

### 8. **Pool/Concurrency Issues**

#### Problem
Worker starts but tasks don't execute or worker hangs.

#### Root Cause
Railway containers have limited resources and certain pool types don't work well.

#### Solution

**Use `solo` pool for Railway:**
```bash
celery -A backend.celery_app worker --pool=solo --loglevel=info
```

**Pool Comparison:**
- `prefork` (default) - Multi-process, higher memory
- `solo` - Single process, best for Railway (recommended)
- `threads` - Multi-threaded, lower memory
- `gevent`/`eventlet` - Async, requires additional dependencies

---

## Railway Deployment Checklist

### ✅ Pre-Deployment
- [ ] `REDIS_URL` set in Railway environment variables
- [ ] All Celery dependencies in `requirements.txt`
- [ ] Procfile has both `web` and `worker` processes
- [ ] Worker uses `PYTHONUNBUFFERED=1` flag
- [ ] Logging configured for stdout/stderr

### ✅ Post-Deployment
- [ ] Check Railway logs for worker startup
- [ ] Verify "CELERY WORKER STARTED" message appears
- [ ] Test submitting a job from frontend
- [ ] Check worker picks up and processes task
- [ ] Verify job completes successfully

---

## Debugging Commands

### View Railway Logs
```bash
# In Railway dashboard:
# 1. Go to your service
# 2. Click "Deployments" tab
# 3. Click latest deployment
# 4. View "Deploy Logs" and "Service Logs"
```

### Test Locally
```bash
# Terminal 1: Start Redis (if local)
redis-server

# Terminal 2: Start worker
REDIS_URL=redis://localhost:6379/0 \
celery -A backend.celery_app worker --loglevel=debug

# Terminal 3: Start FastAPI
uvicorn backend.main:app --reload

# Terminal 4: Test task
python -c "
from backend.tasks import run_crew_task
result = run_crew_task.delay('test-job-123', {'course_url': 'https://example.com'})
print(f'Task ID: {result.id}')
print(f'Status: {result.status}')
"
```

### Inspect Worker Status
```python
# In Python shell
from backend.celery_app import app

# Check active workers
app.control.inspect().active()

# Check registered tasks
app.control.inspect().registered()

# Check stats
app.control.inspect().stats()
```

---

## Monitoring & Alerts

### Add Health Endpoint for Workers

Create `backend/worker_health.py`:
```python
from backend.celery_app import app

def check_worker_health():
    """Check if Celery workers are active."""
    try:
        stats = app.control.inspect().stats()
        if stats and len(stats) > 0:
            return {"status": "healthy", "workers": len(stats)}
        return {"status": "unhealthy", "workers": 0}
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

Add to `backend/main.py`:
```python
from backend.worker_health import check_worker_health

@app.get("/api/worker-health")
async def worker_health():
    return check_worker_health()
```

---

## Next Steps

1. **Implement enhanced startup script** (`railway_worker_start.sh`)
2. **Update Procfile** with new worker command
3. **Deploy to Railway** and check logs
4. **Monitor worker health** endpoint
5. **Test job submission** from frontend

---

## Support

If issues persist:
1. Share Railway deployment logs (first 100 lines)
2. Share worker startup logs
3. Verify `REDIS_URL` format
4. Check Railway service resource usage

Happy debugging! 🐛🔧
