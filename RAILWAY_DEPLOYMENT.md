# Railway Deployment Guide - Celery Workers

## Quick Fix for "Worker Not Starting" Issue

### Step 1: Update Procfile

Replace your current `Procfile` with `Procfile.railway`:

```bash
cp Procfile.railway Procfile
```

Or manually update `Procfile`:
```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT --log-level info
worker: bash scripts/railway_worker_start.sh
```

### Step 2: Verify Environment Variables in Railway

Go to Railway dashboard → Your service → Variables tab:

**Required:**
- `REDIS_URL` - Your Redis connection string (format: `redis://default:password@host:port`)
- `OPENAI_API_KEY` - Your OpenAI API key
- `SERPER_API_KEY` - Your Serper API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key

**Optional:**
- `LOG_LEVEL` - Set to `INFO` or `DEBUG`
- `CELERY_BROKER_USE_SSL` - Set to `true` if using Redis Labs/Cloud Redis

### Step 3: Deploy

```bash
git add Procfile scripts/railway_worker_start.sh backend/celery_app.py
git commit -m "Fix: Enhanced Celery worker startup for Railway"
git push
```

### Step 4: Check Logs

In Railway dashboard:
1. Go to your service
2. Click "Deployments" tab
3. Click latest deployment
4. Look for these messages in the logs:

```
✅ Expected Success Messages:
🚀 CELERY WORKER STARTUP ON RAILWAY
✅ backend.celery_app imported
✅ backend.tasks imported
✅ Redis connection successful
🚀 STARTING CELERY WORKER
```

```
❌ Common Error Messages:

1. "ModuleNotFoundError: No module named 'backend'"
   → Fix: PYTHONPATH issue (script handles this)

2. "Cannot connect to redis://"
   → Fix: Check REDIS_URL in Railway env vars

3. "No module named 'celery'"
   → Fix: Add celery[redis]>=5.3.0 to requirements.txt

4. Worker exits immediately with no logs
   → Fix: Check Railway build logs for import errors
```

---

## Debugging Steps

### 1. Test Locally First

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start worker with debug logging
REDIS_URL=redis://localhost:6379/0 \
LOG_LEVEL=DEBUG \
celery -A backend.celery_app worker --loglevel=debug

# Terminal 3: Test task
python -c "
from backend.tasks import run_crew_task
result = run_crew_task.delay('test-job', {'course_url': 'https://example.com'})
print(f'Task ID: {result.id}')
print(f'Status: {result.status}')
"
```

### 2. Run Test Script

```bash
./scripts/test_celery_connection.sh
```

Expected output:
```
🧪 Testing Celery Configuration...
==================================
1️⃣  Checking environment variables...
   ✅ REDIS_URL: redis://...
2️⃣  Testing Celery app import...
   ✅ Celery app imported successfully
3️⃣  Testing task import...
   ✅ run_crew_task imported successfully
4️⃣  Testing Redis connection...
   ✅ Redis connection successful
==================================
✅ All critical tests passed!
```

### 3. Check Railway Service Logs

Look for worker process startup:

```bash
# Good signs:
[worker.1] 🚀 CELERY WORKER STARTUP ON RAILWAY
[worker.1] ✅ backend.celery_app imported
[worker.1] ✅ Redis connection successful
[worker.1] [2024-01-03 10:00:00: INFO/MainProcess] Connected to redis://...

# Bad signs:
[worker.1] ModuleNotFoundError
[worker.1] Connection refused
[worker.1] Process exited with code 1
```

---

## Common Issues & Solutions

### Issue 1: "Worker Logs Not Appearing"

**Problem:** Worker process starts but produces no logs.

**Solution:**
- Script already uses `>&2` for stderr logging (Railway captures this)
- Script uses `flush=True` for Python print statements
- Worker command uses `python -u` for unbuffered output

**Verify:** Check Railway "Service Logs" tab (not just "Deploy Logs")

---

### Issue 2: "Connection Refused to Redis"

**Problem:** `kombu.exceptions.OperationalError: Connection refused`

**Solutions:**

1. **Verify REDIS_URL format:**
   ```
   redis://default:PASSWORD@HOST:PORT
   ```

2. **For Redis Labs/Cloud Redis with SSL:**
   Add to Railway environment variables:
   ```
   CELERY_BROKER_USE_SSL=true
   ```

3. **Test connection manually:**
   ```bash
   python -c "
   import redis
   import os
   r = redis.from_url(os.getenv('REDIS_URL'))
   r.ping()
   print('✅ Connected')
   "
   ```

---

### Issue 3: "ModuleNotFoundError: backend"

**Problem:** Python can't find your modules.

**Solution:** Script already sets `PYTHONPATH=$(pwd)` but verify:

1. Check Railway build logs show backend/ directory
2. Verify backend/__init__.py exists
3. Check indentation in scripts/railway_worker_start.sh

---

### Issue 4: "Worker Exits Immediately"

**Problem:** Worker starts then exits with code 1.

**Debug Steps:**

1. Check for syntax errors:
   ```bash
   python -m py_compile backend/celery_app.py
   python -m py_compile backend/tasks.py
   ```

2. Test imports:
   ```bash
   python -c "import backend.celery_app"
   python -c "import backend.tasks"
   ```

3. Check Railway build logs for dependency installation

---

### Issue 5: "Tasks Not Executing"

**Problem:** Worker starts successfully but tasks don't run.

**Debug:**

1. **Check task is registered:**
   ```python
   from backend.celery_app import app
   print(app.control.inspect().registered())
   ```

2. **Check queues:**
   ```python
   from backend.celery_app import app
   print(app.control.inspect().active_queues())
   ```

3. **Verify task submission:**
   ```python
   from backend.tasks import run_crew_task
   result = run_crew_task.delay('test', {})
   print(f"Task ID: {result.id}")
   print(f"Status: {result.status}")
   ```

---

## Health Monitoring

### Add Worker Health Endpoint

Already created in `backend/main.py`:

```python
@app.get("/api/worker-health")
async def worker_health():
    """Check if Celery workers are active."""
    try:
        from backend.celery_app import app as celery_app
        stats = celery_app.control.inspect().stats()
        if stats and len(stats) > 0:
            return {"status": "healthy", "workers": len(stats)}
        return {"status": "unhealthy", "workers": 0}
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

**Test:**
```bash
curl https://your-app.railway.app/api/worker-health
```

**Expected:**
```json
{"status": "healthy", "workers": 1}
```

---

## Performance Tuning

### Worker Concurrency

Current setting: `--concurrency=2` (2 parallel tasks)

**Adjust based on Railway plan:**

- **Hobby plan (512MB RAM):** `--concurrency=1` or `--pool=solo`
- **Pro plan (8GB RAM):** `--concurrency=4`

Update in `scripts/railway_worker_start.sh`:
```bash
--concurrency=1 \
--pool=solo
```

### Pool Types

- `solo` - Single process (best for Railway)
- `prefork` - Multi-process (higher memory)
- `threads` - Multi-threaded (lower memory)

**Recommendation for Railway:** Use `--pool=solo`

---

## Rollback Plan

If worker still doesn't start, revert to simple Procfile:

```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
worker: PYTHONUNBUFFERED=1 python -u -m celery -A backend.celery_app worker --loglevel=debug --pool=solo
```

Then check logs for specific error messages.

---

## Next Steps

1. ✅ Update Procfile to use `railway_worker_start.sh`
2. ✅ Verify REDIS_URL in Railway environment
3. ✅ Deploy and check logs for startup messages
4. ✅ Test `/api/worker-health` endpoint
5. ✅ Submit test job from frontend
6. ✅ Monitor worker processes tasks successfully

---

## Support

For additional help, check:
- [CELERY_RAILWAY_TROUBLESHOOTING.md](./CELERY_RAILWAY_TROUBLESHOOTING.md) - Comprehensive troubleshooting guide
- Railway service logs (first 100 lines of worker startup)
- Redis connection test results

**Still stuck?** Share:
1. Railway worker startup logs (first 50 lines)
2. Output of `./scripts/test_celery_connection.sh`
3. Railway environment variable names (not values)
