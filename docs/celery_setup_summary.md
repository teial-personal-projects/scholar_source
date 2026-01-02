# Celery Setup Summary

## Step 2.1 - Configure Celery ✅ COMPLETED

### What Was Implemented

#### 1. Added Celery Dependency
- Added `celery>=5.3.0` to [requirements.txt](../requirements.txt)
- Installed Celery in the virtual environment

#### 2. Created Celery Application ([backend/celery_app.py](../backend/celery_app.py))
Comprehensive Celery configuration with:

**Core Configuration:**
- Broker: Redis (using existing REDIS_URL from .env)
- Result Backend: Redis
- Task serialization: JSON
- Result expiration: 1 hour
- Timezone: UTC

**Worker Settings:**
- Prefetch multiplier: 1 (important for long-running tasks)
- Max tasks per child: 100 (prevents memory leaks)
- Task time limit: 1 hour (hard limit)
- Soft time limit: 50 minutes
- Tasks acknowledged after completion (acks_late=True)

**Queue Configuration:**
- `crew_jobs` queue: For CrewAI job execution (priority queue enabled)
- `default` queue: For utility tasks
- Priority support: 0-10 scale

**Error Handling:**
- Automatic retry with exponential backoff
- Max 3 retries by default
- Custom BaseTask class with retry logic
- Error handler task for failed tasks

**Monitoring:**
- Worker task events enabled
- Task sent events enabled
- Extended result metadata

#### 3. Created Task Definitions ([backend/tasks.py](../backend/tasks.py))

**Main Tasks:**
1. `run_crew_task`: Celery task that wraps the ScholarSource crew execution
   - Migrated logic from `_run_crew_worker()` in crew_runner.py
   - Supports job cancellation via Celery's revoke mechanism
   - Handles caching, status updates, and result parsing
   - Includes Celery task metadata in job records

2. `health_check`: Simple health check task for monitoring
   - Returns worker ID and task ID
   - Useful for verifying worker connectivity

3. `cleanup_old_results`: Placeholder for periodic cleanup tasks
   - Can be scheduled with Celery Beat
   - TODO: Implement cleanup logic

**Task Features:**
- All tasks use JSON serialization
- Tasks are bound (have access to `self` for retry logic)
- Proper error handling and logging
- Metadata tracking (Celery task ID stored in job records)

#### 4. Created Test Utilities

**Test Script ([backend/test_celery.py](../backend/test_celery.py)):**
- Verifies Celery configuration
- Tests Redis connection
- Tests task enqueueing
- Provides instructions for starting workers

### Configuration Summary

**Environment Variables Required:**
- `REDIS_URL`: Redis connection string (already configured in .env)

**Current Configuration:**
- Broker: Redis Cloud (production)
- 2 queues: crew_jobs (priority), default
- 4 registered tasks
- Worker prefetch: 1 task at a time
- Task timeout: 1 hour

### Testing Results

✅ Celery app loads successfully
✅ Redis connection working (production Redis Cloud)
✅ All 4 tasks registered correctly:
- backend.celery_app.error_handler
- backend.tasks.cleanup_old_results
- backend.tasks.health_check
- backend.tasks.run_crew_task

✅ Queue configuration verified:
- crew_jobs (routing_key: crew.jobs)
- default (routing_key: default)

### Next Steps

The following tasks remain in Phase 1:

#### 3. Refactor Crew Runner
- Extract `_run_crew_worker()` logic to queue-compatible function ✅ (Already done in tasks.py)
- Remove threading code from crew_runner.py
- Update `run_crew_async()` to enqueue task instead of starting thread

#### 4. Update Job Submission
- Replace `run_crew_async()` call in main.py with Celery task enqueue
- Update `/api/submit` endpoint
- Test job submission flow

#### 5. Create Worker Process
- Document how to start Celery worker
- Update Procfile for Railway deployment
- Test worker execution

#### 6. Update Rate Limiting
- Verify Redis-backed rate limiting works across instances
- Update documentation

### How to Start a Worker

Once the refactoring is complete, start workers with:

```bash
# Load environment variables
source .env

# Start worker with both queues
celery -A backend.celery_app worker --loglevel=info --queues=crew_jobs,default

# Or start multiple workers (for scaling)
celery -A backend.celery_app worker --loglevel=info --queues=crew_jobs,default -n worker1@%h
celery -A backend.celery_app worker --loglevel=info --queues=crew_jobs,default -n worker2@%h
```

### Monitoring

**Celery Flower (Optional):**
```bash
pip install flower
celery -A backend.celery_app flower
```
Then visit http://localhost:5555

### Files Created/Modified

**Created:**
- `backend/celery_app.py` - Celery application and configuration
- `backend/tasks.py` - Celery task definitions
- `backend/test_celery.py` - Testing utilities
- `docs/celery_setup_summary.md` - This document

**Modified:**
- `requirements.txt` - Added celery>=5.3.0
- `docs/scaling_plan.md` - Updated step 2.1 as completed

### Technical Notes

1. **Task Routing:** The `run_crew_task` is routed to the `crew_jobs` queue, which supports priorities (0-10)
2. **Prefetch Multiplier:** Set to 1 to ensure workers only take one long-running task at a time
3. **Acks Late:** Tasks are acknowledged after completion, ensuring tasks aren't lost if workers crash
4. **Worker Max Tasks:** Workers restart after 100 tasks to prevent memory leaks
5. **Result Expiration:** Results expire after 1 hour to save Redis memory
6. **Async Support:** The `run_crew_task` properly handles asyncio with `asyncio.run()`

---

**Status:** Step 2.1 Complete ✅
**Date:** January 1, 2026
**Next:** Step 3 - Refactor Crew Runner
