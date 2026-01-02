# ScholarSource Scaling Plan

## Document Control

| Field | Value |
|-------|-------|
| **Document Title** | ScholarSource Scaling Plan |
| **Version** | 1.0 |
| **Date** | December 2024 |
| **Author** | ScholarSource Development Team |
| **Status** | Draft |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Scaling Bottlenecks](#3-scaling-bottlenecks)
4. [Scaling Strategy](#4-scaling-strategy)
5. [Component Changes Required](#5-component-changes-required)
6. [Implementation Phases](#6-implementation-phases)
7. [Technology Choices](#7-technology-choices)
8. [Cost Considerations](#8-cost-considerations)
9. [Monitoring and Metrics](#9-monitoring-and-metrics)
10. [Risk Assessment](#10-risk-assessment)
11. [Appendix: Current Code Analysis](#11-appendix-current-code-analysis)

---

## 1. Executive Summary

This document outlines a comprehensive plan to scale ScholarSource from a single-instance deployment to a horizontally scalable system capable of handling high concurrent loads. The primary focus is on decoupling job execution from the API layer, implementing proper task queuing, and enabling independent scaling of compute-intensive workers.

**Key Goals:**
- Support 10-100x increase in concurrent job processing
- Enable horizontal scaling of API and worker layers independently
- Maintain current functionality and user experience
- Minimize infrastructure costs through efficient resource utilization

**Primary Change Required:**
Migration from thread-based job execution to a distributed task queue architecture with separate worker processes.

---

## 2. Current Architecture Analysis

### 2.1 Current System Components

```
┌─────────────┐
│   Frontend  │ (React/Vite - Cloudflare Pages)
└──────┬──────┘
       │ HTTP/REST
┌──────▼─────────────────────────────────────────────┐
│          FastAPI Backend (Single Instance)         │
│  ┌──────────────────────────────────────────────┐  │
│  │ API Endpoints                                │  │
│  │  - /api/submit (job submission)              │  │
│  │  - /api/status/{job_id} (status polling)     │  │
│  │  - /api/cancel/{job_id} (job cancellation)   │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Job Execution (Threading)                    │  │
│  │  - run_crew_async() creates Thread           │  │
│  │  - Each thread runs CrewAI execution         │  │
│  │  - Threads are daemon (no cleanup)           │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Rate Limiting (In-Memory)                    │  │
│  │  - Single-instance only                      │  │
│  │  - Redis support exists but not required     │  │
│  └──────────────────────────────────────────────┘  │
└──────┬─────────────────────────────────────────────┘
       │
┌──────▼─────────────────────────────────────────────┐
│            Supabase PostgreSQL                     │
│  - jobs table (job status, results)                │
│  - course_cache table (analysis cache)             │
└────────────────────────────────────────────────────┘
```

### 2.2 Current Execution Flow

1. **Job Submission** (`main.py:92-156`)
   - Client POSTs to `/api/submit`
   - Rate limiting checked (in-memory)
   - Job created in Supabase
   - `run_crew_async()` called immediately
   - Returns job_id immediately

2. **Job Execution** (`crew_runner.py:37-66`)
   - Creates a new daemon thread
   - Thread creates new event loop
   - Runs `_run_crew_worker()` asynchronously
   - Thread completes when job finishes (minutes to hours)

3. **Status Polling** (`main.py:159-205`)
   - Client GETs `/api/status/{job_id}`
   - Direct database query
   - Returns current job status

### 2.3 Resource Characteristics

**CrewAI Job Execution:**
- **Duration:** 2-10 minutes per job (variable)
- **CPU:** Medium-high (LLM API calls, web scraping)
- **Memory:** 100-500 MB per job (varies with input size)
- **I/O:** Network-heavy (API calls, web requests)
- **Concurrency:** Limited by thread count and memory

**API Layer:**
- **Latency:** <100ms for status checks
- **Throughput:** High (stateless, simple DB queries)
- **Resource Usage:** Low (mostly I/O wait)

---

## 3. Scaling Bottlenecks

### 3.1 Critical Bottlenecks

#### 3.1.1 Thread-Based Execution Model
**Location:** `backend/crew_runner.py:53-66`

**Problem:**
- Jobs run in daemon threads within the API process
- Limited by Python GIL and thread overhead
- No process isolation (memory leaks affect entire API)
- Cannot scale workers independently
- Thread exhaustion under load

**Impact:**
- Maximum ~10-50 concurrent jobs per instance
- API becomes unresponsive under high job load
- Single point of failure for both API and job processing

#### 3.1.2 No Task Queue
**Location:** `backend/main.py:140`

**Problem:**
- Jobs start immediately upon submission
- No queuing or prioritization mechanism
- No backpressure handling
- Cannot distribute work across multiple workers

**Impact:**
- Overwhelming system under sudden load spikes
- No way to throttle job execution
- Cannot implement job priorities or scheduling

#### 3.1.3 In-Memory Rate Limiting
**Location:** `backend/rate_limiter.py:31-36`

**Problem:**
- Rate limiting stored in process memory
- Does not work across multiple API instances
- Warning already present in code (line 36)

**Impact:**
- Cannot horizontally scale API layer
- Rate limits reset on each instance
- Inconsistent rate limiting behavior

#### 3.1.4 Resource Contention
**Location:** Entire `backend/crew_runner.py`

**Problem:**
- Long-running CrewAI tasks compete with API requests
- CPU and memory contention
- Database connections shared between API and workers

**Impact:**
- Degraded API performance during job execution
- Potential connection pool exhaustion
- Unpredictable resource usage patterns

### 3.2 Secondary Bottlenecks

#### 3.2.1 Database Connection Management
- No explicit connection pooling configuration
- Supabase client may handle pooling, but not verified
- Potential connection exhaustion under high load

#### 3.2.2 Cache Storage
- Cache stored in Supabase (good for consistency)
- May become bottleneck if cache misses spike
- No in-memory hot cache layer

#### 3.2.3 Status Polling Pattern
- Clients poll `/api/status/{job_id}` repeatedly
- No WebSocket or SSE for real-time updates
- Creates unnecessary database load
- Works but not optimal for high concurrency

---

## 4. Scaling Strategy

### 4.1 Target Architecture

```
┌─────────────┐
│   Frontend  │ (React/Vite)
└──────┬──────┘
       │ HTTP/REST
┌──────▼─────────────────────────────────────────┐
│        FastAPI API Layer (Multiple Instances)  │
│  ┌──────────────────────────────────────────┐  │
│  │ API Endpoints (Stateless)                │  │
│  │  - /api/submit → Enqueue job             │  │
│  │  - /api/status/{job_id} → DB query       │  │
│  │  - /api/cancel/{job_id} → Cancel queue   │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ Rate Limiting (Redis-backed)             │  │
│  │  - Shared state across instances         │  │
│  └──────────────────────────────────────────┘  │
└──────┬─────────────────────────────────────────┘
       │
┌──────▼─────────────────────────────────────────┐
│           Redis (Task Queue + Rate Limit)      │
│  - Job Queue: Enqueued jobs                    │
│  - Rate Limit: Shared rate limit state         │
│  - Result Backend: Optional result storage     │
└──────┬─────────────────────────────────────────┘
       │
┌──────▼─────────────────────────────────────────┐
│     Worker Processes (Multiple Instances)      │
│  ┌──────────────────────────────────────────┐  │
│  │ Worker 1: Consumes jobs from queue       │  │
│  │ Worker 2: Consumes jobs from queue       │  │
│  │ Worker N: Consumes jobs from queue       │  │
│  │  - Each runs CrewAI execution            │  │
│  │  - Updates job status in DB              │  │
│  │  - Process isolation                     │  │
│  └──────────────────────────────────────────┘  │
└──────┬─────────────────────────────────────────┘
       │
┌──────▼─────────────────────────────────────────┐
│            Supabase PostgreSQL                 │
│  - jobs table                                  │
│  - course_cache table                          │
└────────────────────────────────────────────────┘
```

### 4.2 Scaling Dimensions

#### Horizontal Scaling
- **API Layer:** Scale to N instances behind load balancer
- **Worker Layer:** Scale to M instances based on queue depth
- **Independent Scaling:** Scale API and workers separately based on demand

#### Vertical Scaling (Limited)
- Workers can use larger instances for memory-intensive jobs
- API layer remains lightweight

### 4.3 Scaling Targets

**Phase 1 (Short-term):**
- Support 10-20 concurrent job executions
- Handle 100-500 requests/minute
- 2-3 API instances, 2-5 worker instances

**Phase 2 (Medium-term):**
- Support 50-100 concurrent job executions
- Handle 1000+ requests/minute
- 3-5 API instances, 5-20 worker instances

**Phase 3 (Long-term):**
- Support 200+ concurrent job executions
- Handle 5000+ requests/minute
- 5-10 API instances, 20-100 worker instances
- Advanced features (priorities, scheduling, batching)

---

## 5. Component Changes Required

### 5.1 Critical Changes

#### 5.1.1 Task Queue Implementation

**Component:** New `backend/queue.py` or use Celery

**Changes:**
- Replace `run_crew_async()` threading with queue enqueue
- Move `_run_crew_worker()` logic to queue worker task
- Implement job cancellation via queue API
- Add queue monitoring and metrics

**Code Changes:**
- `backend/main.py:140`: Change from `run_crew_async()` to `enqueue_job()`
- `backend/crew_runner.py`: Refactor `_run_crew_worker()` as queue task
- New worker process: Consume from queue, execute jobs

**Dependencies:**
- Add `redis` Python package
- Add `celery` package
- Add `flower` for monitoring (optional)

#### 5.1.2 Worker Process Separation

**Component:** New `backend/worker.py` or separate worker service

**Changes:**
- Extract job execution logic to standalone worker process
- Worker connects to Redis queue
- Worker updates job status in Supabase
- Handle worker health checks and graceful shutdown

**Deployment:**
- Separate container/service for workers
- Can scale independently from API
- Environment variables for queue configuration

#### 5.1.3 Rate Limiting Redis Migration

**Component:** `backend/rate_limiter.py`

**Changes:**
- Make `REDIS_URL` required (or highly recommended)
- Remove in-memory fallback or keep as development-only
- Update deployment documentation

**Code Changes:**
```python
# backend/rate_limiter.py
REDIS_URL = os.getenv("REDIS_URL")
if not REDIS_URL:
    raise ValueError("REDIS_URL must be set for multi-instance deployments")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=REDIS_URL,
    default_limits=["1000/hour"]
)
```

### 5.2 Moderate Changes

#### 5.2.1 Job Cancellation

**Component:** `backend/main.py:208-286` and `backend/crew_runner.py:69-84`

**Changes:**
- Cancel jobs via queue API instead of thread cancellation
- Update `cancel_crew_job()` to interact with queue
- Handle job cancellation in worker process

**Implementation:**
- Celery: Use `revoke()` method
- Update job status in database

#### 5.2.2 Connection Pooling

**Component:** `backend/database.py`

**Changes:**
- Verify Supabase client connection pooling
- Add connection pool configuration if needed
- Monitor connection usage

**Investigation Needed:**
- Check Supabase Python client documentation
- Test connection behavior under load
- May not need changes if client handles pooling

#### 5.2.3 Error Handling and Retries

**Component:** `backend/crew_runner.py` and queue worker

**Changes:**
- Implement job retry logic (queue-level)
- Handle worker failures gracefully
- Dead letter queue for failed jobs
- Improve error reporting

**Queue Features:**
- Celery: Retry policies and error handling
- Configure max retries and backoff

### 5.3 Optional Enhancements

#### 5.3.1 Job Priorities

**Component:** Queue configuration

**Changes:**
- Add priority queues (high, normal, low)
- Update job submission to accept priority
- Worker processes consume priority queues first

**Implementation:**
- Celery: Priority queues or routing

#### 5.3.2 Result Backend

**Component:** Redis result backend

**Changes:**
- Store job results in Redis (temporary)
- Reduce database queries for status checks
- TTL-based expiration

**Trade-off:**
- Faster status checks
- Additional Redis memory usage
- Still need DB for persistence

#### 5.3.3 Monitoring and Observability

**Component:** New monitoring setup

**Changes:**
- Queue monitoring dashboard (Flower)
- Metrics: Queue depth, worker count, job duration
- Alerts for queue buildup or worker failures

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic queue-based architecture operational

**Tasks:**

#### 1. [ ] Setup Redis
   - [✅] Add Redis service (Redis Cloud, AWS ElastiCache, or self-hosted)
   - [✅] Add `REDIS_URL` to environment variables
   - [✅] Test Redis connectivity

#### 2. [✅] Choose Queue System
   - [✅] **Selected: Celery** (more features, better for production scaling)
   - [✅] Add dependency: `celery>=5.3.0`
   - [✅] Add `redis>=5.0.0` dependency (already added)

#### 2.1. [✅] Configure Celery
   - [✅] Create `backend/celery_app.py` with Celery configuration
   - [✅] Configure broker (Redis) and result backend
   - [✅] Set task serialization (JSON recommended)
   - [✅] Configure task routing and queue names
   - [✅] Set worker concurrency and prefetch settings
   - [✅] Configure task retry policies and error handling
   - [✅] Add Celery Beat for scheduled tasks (optional)
   - [✅] Test Celery connection and basic task execution

#### 3. [✅] Refactor Crew Runner
   - [✅] Extract `_run_crew_worker()` logic to queue-compatible function (moved to tasks.py)
   - [✅] Remove threading code
   - [✅] Create `run_crew_task(job_id, inputs, bypass_cache)` function
   - [✅] Update `run_crew_async()` to enqueue Celery task
   - [✅] Update `cancel_crew_job()` to use Celery revoke
   - [✅] Test refactored crew runner (all tests passed)

#### 4. [✅] Update Job Submission
   - [✅] Replace `run_crew_async()` with queue enqueue (already done in step 3)
   - [✅] Update `main.py:140` to enqueue job (no changes needed - API compatible)
   - [ ] Test job submission flow with running worker

#### 5. [✅] Create Worker Process
   - [✅] Create worker startup script (`scripts/start_worker.sh`)
   - [✅] Create setup verification script (`scripts/verify_setup.sh`)
   - [✅] Create unified test script (`scripts/test.py` with CLI options)
   - [✅] Update Procfile for Railway deployment (added `worker:` process)
   - [✅] Update `.env.example` with `REDIS_URL` requirement
   - [✅] Update README.md with worker instructions
   - [✅] Organize all scripts into `scripts/` directory
   - [✅] Test worker initialization (verified successfully)

#### 6. [✅] Update Rate Limiting
   - [✅] Make Redis required or highly recommended
   - [✅] Update `rate_limiter.py` to require `REDIS_URL`
   - [✅] Test rate limiting across instances

**Deliverables:**
- ✅ Queue-based job processing implemented (Celery + Redis)
- ✅ Worker startup script and deployment configuration ready
- ✅ Backward-compatible API (no frontend changes needed)
- ✅ All tests passing (refactored runner + Celery config)
- ⏳ Rate limiting using Redis (existing, needs verification)
- ⏳ End-to-end testing with running worker (next step)

**Status:** Steps 1-5 complete! Ready for Phase 2.

**Risk Level:** Medium (core architecture change) - Mitigated through testing and backward compatibility

### Phase 2: Production Hardening (Week 2-3)

**Goal:** Production-ready queue system with error handling

**Tasks:**

#### 7. [ ] Error Handling
   - [ ] Implement job retry logic
   - [ ] Handle worker failures gracefully
   - [ ] Dead letter queue for permanently failed jobs
   - [ ] Improve error messages and logging

#### 8. [ ] Job Cancellation
   - [ ] Update cancellation to work with queue
   - [ ] Test cancellation in various states
   - [ ] Ensure proper cleanup

#### 9. [ ] Connection Management
   - [ ] Verify database connection pooling
   - [ ] Monitor connection usage
   - [ ] Add connection pool configuration if needed

#### 10. [ ] Deployment Configuration
   - [ ] Update deployment scripts/containers
   - [ ] Separate API and worker containers
   - [ ] Update environment variable documentation
   - [ ] Update `Procfile` or deployment config

#### 11. [ ] Monitoring Setup
   - [ ] Add queue monitoring (Flower)
   - [ ] Basic metrics collection
   - [ ] Logging improvements

**Deliverables:**
- Robust error handling
- Production deployment configuration
- Basic monitoring in place
- Documentation updated

**Risk Level:** Low (enhancements to Phase 1)

### Phase 3: Scaling and Optimization (Week 3-4)

**Goal:** Horizontal scaling capabilities

**Tasks:**

#### 12. [ ] Horizontal Scaling Setup
   - [ ] Load balancer configuration for API layer
   - [ ] Multiple worker instances
   - [ ] Auto-scaling policies (if using cloud)

#### 13. [ ] Performance Optimization
   - [ ] Database query optimization
   - [ ] Cache optimization
   - [ ] Connection pool tuning
   - [ ] Worker process optimization

#### 14. [ ] Advanced Features (Optional)
   - [ ] Job priorities
   - [ ] Scheduled jobs
   - [ ] Batch processing
   - [ ] Result backend optimization

#### 15. [ ] Load Testing
   - [ ] Stress testing with multiple workers
   - [ ] Test under various load patterns
   - [ ] Identify and fix bottlenecks
   - [ ] Performance benchmarking

**Deliverables:**
- Scalable deployment
- Load testing results
- Performance benchmarks
- Scaling documentation

**Risk Level:** Low (operational improvements)

---

## 7. Technology Choices

### 7.1 Task Queue: Celery

#### Option: Celery

**Pros:**
- More features (priorities, routing, scheduling)
- Better for complex workflows
- More mature ecosystem
- Better monitoring (Flower)

**Cons:**
- More complex setup and configuration
- Steeper learning curve
- May be overkill for current needs

**Package:** `celery>=5.3.0`


### 7.2 Redis Provider Options

#### Option: Redis Cloud (Recommended for small scale)
- Managed service
- Free tier available
- Easy setup
- Good for getting started

**Recommendation:** Starting with free tier

### 7.3 Deployment Platform Considerations

#### Railway (Current Platform)
- **API Instances:** Can scale horizontally
- **Worker Instances:** Need separate services
- **Redis:** External service required
- **Configuration:** Update Procfile for workers

#### Other Platforms
- **Heroku:** Similar to Railway, separate dynos for workers
- **AWS ECS/Fargate:** Good for containerized deployments
- **Kubernetes:** Most flexible, better for large scale
- **DigitalOcean App Platform:** Simple scaling, good middle ground

---

## 8. Cost Considerations

### 8.1 Infrastructure Costs (Estimated)

#### Current (Single Instance)
- API/Worker: $5-20/month (single instance)
- Database: Supabase free tier or paid
- **Total: ~$10-30/month**

#### Phase 1 (Basic Queue)
- API Instance: $5-10/month
- Worker Instance: $5-10/month
- Redis: $0-10/month (free tier or small instance)
- Database: Same as current
- **Total: ~$15-40/month**

#### Phase 2 (Moderate Scale)
- API Instances (2-3): $15-30/month
- Worker Instances (2-5): $15-50/month
- Redis: $10-30/month
- Database: Supabase paid tier if needed
- **Total: ~$50-150/month**

#### Phase 3 (High Scale)
- API Instances (5-10): $50-150/month
- Worker Instances (10-50): $100-500/month
- Redis: $30-100/month
- Database: Higher tier if needed
- Load Balancer: $10-50/month
- **Total: ~$200-800/month**

### 8.2 Cost Optimization Strategies

1. **Auto-scaling:** Scale workers based on queue depth
2. **Spot Instances:** Use cheaper compute for workers (if supported)
3. **Reserved Instances:** Commit to instances for predictable workloads
4. **Cache Hit Rate:** Maximize cache to reduce worker load
5. **Resource Right-sizing:** Monitor and adjust instance sizes

---

## 9. Monitoring and Metrics

### 9.1 Key Metrics to Track

#### Queue Metrics
- **Queue Depth:** Number of pending jobs
- **Job Duration:** Average and P95/P99 job execution time
- **Job Success Rate:** Percentage of successful completions
- **Job Failure Rate:** Percentage of failed jobs
- **Worker Count:** Active worker instances

#### API Metrics
- **Request Rate:** Requests per second
- **Response Time:** API endpoint latency
- **Error Rate:** 4xx and 5xx error rates
- **Rate Limit Hits:** Number of rate-limited requests

#### Resource Metrics
- **CPU Usage:** Per instance/worker
- **Memory Usage:** Per instance/worker
- **Database Connections:** Active connections
- **Redis Memory:** Memory usage and evictions

### 9.2 Monitoring Tools

#### Queue Monitoring
- **Flower:** Celery monitoring (if using Celery)
- **Custom Dashboard:** Build with queue metrics API

#### Application Monitoring
- **Logging:** Structured logging (already in place)
- **APM:** Consider Sentry, DataDog, or New Relic
- **Uptime Monitoring:** External service (UptimeRobot, Pingdom)

#### Infrastructure Monitoring
- **Platform Monitoring:** Railway/Heroku metrics
- **Redis Monitoring:** Redis Cloud or provider metrics
- **Database Monitoring:** Supabase dashboard

### 9.3 Alerting

**Critical Alerts:**
- Queue depth exceeds threshold (e.g., >100 jobs)
- Worker failure rate > 5%
- API error rate > 1%
- Redis unavailable
- Database connection errors

**Warning Alerts:**
- Queue depth > 50 jobs
- Average job duration increasing
- High memory usage
- Rate limit hit rate > 10%

---

## 10. Risk Assessment

### 10.1 Technical Risks

#### Risk: Queue System Failure
- **Impact:** High - Jobs cannot be processed
- **Probability:** Low - Redis is reliable
- **Mitigation:** Redis high availability, monitoring, backups

#### Risk: Worker Process Crashes
- **Impact:** Medium - Jobs may be lost or delayed
- **Probability:** Medium - Long-running processes can fail
- **Mitigation:** Job retries, worker health checks, auto-restart

#### Risk: Database Connection Exhaustion
- **Impact:** High - API and workers unable to access DB
- **Probability:** Medium - Under high load
- **Mitigation:** Connection pooling, connection limits, monitoring

#### Risk: Redis Memory Exhaustion
- **Impact:** High - Queue operations fail
- **Probability:** Low-Medium - Depends on queue depth
- **Mitigation:** Monitor Redis memory, set eviction policies, scale Redis

#### Risk: Migration Complexity
- **Impact:** Medium - Potential downtime or bugs
- **Probability:** Medium - Significant architecture change
- **Mitigation:** Thorough testing, phased rollout, feature flags

### 10.2 Operational Risks

#### Risk: Increased Operational Complexity
- **Impact:** Medium - More components to manage
- **Probability:** High - More moving parts
- **Mitigation:** Good documentation, automation, monitoring

#### Risk: Cost Overruns
- **Impact:** Medium - Higher infrastructure costs
- **Probability:** Medium - Scaling increases costs
- **Mitigation:** Cost monitoring, auto-scaling, resource optimization

#### Risk: Performance Regression
- **Impact:** High - Slower job processing
- **Probability:** Low - Queue adds minimal overhead
- **Mitigation:** Load testing, performance benchmarks, optimization

### 10.3 Mitigation Strategies

1. **Phased Rollout:** Implement in phases, test thoroughly
2. **Feature Flags:** Ability to revert to old system if needed
3. **Monitoring:** Comprehensive monitoring from day one
4. **Testing:** Load testing and stress testing
5. **Documentation:** Clear documentation for operations team
6. **Backup Plans:** Fallback procedures if issues arise

---

## 11. Appendix: Current Code Analysis

### 11.1 Critical Code Locations

#### Job Submission
**File:** `backend/main.py`
**Lines:** 92-156
**Current Behavior:** Creates job in DB, calls `run_crew_async()` immediately
**Change Required:** Enqueue job to queue instead

#### Job Execution
**File:** `backend/crew_runner.py`
**Lines:** 37-66 (threading), 87-306 (execution logic)
**Current Behavior:** Creates daemon thread, runs crew execution
**Change Required:** Move execution logic to queue worker task

#### Rate Limiting
**File:** `backend/rate_limiter.py`
**Lines:** 19-36
**Current Behavior:** Uses Redis if available, falls back to in-memory
**Change Required:** Require Redis, remove in-memory fallback (or dev-only)

#### Job Cancellation
**File:** `backend/crew_runner.py`
**Lines:** 69-84
**Current Behavior:** Cancels async task in thread
**Change Required:** Cancel job via queue API

#### Job Status Updates
**File:** `backend/jobs.py`
**Lines:** 75-122
**Current Behavior:** Direct database updates
**Change Required:** None (workers continue to update DB directly)

### 11.2 Dependencies to Add

```python
# requirements.txt additions
redis>=5.0.0          # Redis client
celery>=5.3.0         # Celery (if choosing Celery)
```

### 11.3 Environment Variables to Add

```bash
# Required
REDIS_URL=redis://localhost:6379/0  # Redis connection string

# Optional
CELERY_BROKER_URL=...               # If using Celery
CELERY_RESULT_BACKEND=...           # If using Celery
```

### 11.4 Deployment Configuration Changes

#### Procfile Changes

**Current:**
```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**New:**
```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
worker: celery -A backend.celery_app worker --loglevel=info
```

#### Docker Compose (if used)

```yaml
services:
  api:
    build: .
    command: uvicorn backend.main:app --host 0.0.0.0 --port 8000
    environment:
      - REDIS_URL=redis://redis:6379/0
  
  worker:
    build: .
    command: celery -A backend.celery_app worker --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## 12. Local Development vs Production Deployment

### 12.1 Local Development Setup

**Purpose:** Run the full stack locally for development and testing.

**Architecture:**
```
Terminal 1: API Server (with hot reload)
Terminal 2: Celery Worker (background job processor)
Terminal 3: Frontend Dev Server (React with Vite)
Redis: External service (Redis Cloud) or local Docker
```

**How to Run:**

```bash
# Terminal 1: API Server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Celery Worker
./scripts/start_worker.sh

# Terminal 3: Frontend
cd web && npm run dev
```

**Key Characteristics:**
- **Manual Start:** You manually start each process in separate terminals
- **Hot Reload:** API restarts on code changes (`--reload` flag)
- **Port 8000:** API runs on fixed port 8000 for local testing
- **Visibility:** See all logs in separate terminal windows
- **Environment:** Uses `.env` file for configuration
- **Redis:** Can use Redis Cloud free tier or local Redis in Docker

**When to Use:**
- Active development and debugging
- Running tests with `scripts/test.py`
- Experimenting with new features
- Local testing before pushing to production

---

### 12.2 Production Deployment (Railway)

**Purpose:** Run the full stack in production with automatic process management.

**Architecture:**
```
Railway Service (ScholarSource):
├── web process (from Procfile)
│   └── uvicorn backend.main:app --port $PORT
└── worker process (from Procfile)
    └── celery -A backend.celery_app worker

Redis: External Redis Cloud service
Frontend: Separate Cloudflare Pages deployment
```

**How it Works:**

1. **Procfile Defines Processes:**
   ```
   web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   worker: celery -A backend.celery_app worker --loglevel=info --queues=crew_jobs,default --concurrency=2
   ```

2. **Railway Auto-starts Both:**
   - Reads Procfile on deployment
   - Starts `web` process automatically (public HTTP endpoint)
   - Starts `worker` process automatically (background, no public port)

3. **Railway Manages:**
   - Assigns dynamic port via `$PORT` environment variable
   - Routes external traffic to the `web` process
   - Restarts processes if they crash
   - Handles scaling (add more instances)

**Key Characteristics:**
- **Automatic Start:** Railway starts both processes from Procfile
- **No Hot Reload:** Restart deployment to pick up code changes
- **Dynamic Port:** Railway assigns port via `$PORT` env var
- **Single View:** Logs combined in Railway dashboard
- **Environment:** Uses Railway environment variables (configured in dashboard)
- **Redis:** Must be external service (Redis Cloud recommended)

**When to Use:**
- Production traffic
- After code is tested locally
- When you need high availability
- When you need to scale horizontally

---

### 12.3 Comparison Table

| Aspect | Local Development | Production (Railway) |
|--------|------------------|---------------------|
| **Start Method** | Manual (3 terminal windows) | Automatic (Procfile) |
| **API Restart** | Auto (`--reload` flag) | Manual (redeploy) |
| **Port** | Fixed (8000) | Dynamic (`$PORT`) |
| **Worker Start** | `./scripts/start_worker.sh` | Auto from Procfile |
| **Logs** | Separate terminals | Railway dashboard |
| **Environment** | `.env` file | Railway env vars |
| **Redis** | Redis Cloud or local | Redis Cloud (required) |
| **Scaling** | 1 instance each | N instances (configurable) |
| **Purpose** | Development/testing | Production traffic |

---

## 13. Railway Deployment Guide

### 13.1 Prerequisites

Before deploying to Railway, ensure you have:

1. ✅ **Completed Phase 1 (Steps 1-5)** - Celery and worker setup complete
2. ✅ **Redis Cloud Account** - Free tier at https://redis.com/try-free/
3. ✅ **Railway Account** - Sign up at https://railway.app
4. ✅ **GitHub Repository** - Code pushed to GitHub
5. ✅ **All Environment Variables** - Have all required values ready

---

### 13.2 Step-by-Step Railway Deployment

#### Step 1: Create Redis Database

1. **Sign up for Redis Cloud** (if not already done):
   - Go to https://redis.com/try-free/
   - Create account and verify email
   - Select "Fixed plan" → "Free" (30MB, perfect for getting started)

2. **Create Redis Database:**
   - Click "New database"
   - Name: `scholarsource-queue`
   - Region: Choose closest to your Railway deployment region
   - Click "Activate"

3. **Get Redis Connection URL:**
   - Go to database configuration
   - Copy the "Public endpoint" connection string
   - Format: `redis://default:PASSWORD@HOST:PORT`
   - **Save this URL** - you'll need it for Railway environment variables

#### Step 2: Create Railway Project

1. **Create New Project:**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub account
   - Select your ScholarSource repository

2. **Initial Deployment:**
   - Railway will detect it's a Python project
   - It will attempt to deploy, but will likely fail (missing env vars)
   - This is expected - we'll configure environment variables next

#### Step 3: Configure Environment Variables

1. **Open Project Settings:**
   - Click on your deployed service
   - Go to "Variables" tab

2. **Add All Required Environment Variables:**

   ```bash
   # API Keys (required)
   OPENAI_API_KEY=sk-...
   SERPER_API_KEY=...

   # Supabase (required)
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=...

   # Redis (REQUIRED for production)
   REDIS_URL=redis://default:PASSWORD@HOST:PORT

   # Optional: Model Configuration
   COURSE_INTELLIGENCE_AGENT_MODEL=openai/gpt-4o
   RESOURCE_DISCOVERY_AGENT_MODEL=openai/gpt-4o-mini
   RESOURCE_VALIDATOR_AGENT_MODEL=openai/gpt-4o-mini
   OUTPUT_FORMATTER_AGENT_MODEL=openai/gpt-4o-mini

   # Optional: Cache TTL
   COURSE_ANALYSIS_TTL_DAYS=30
   RESOURCE_RESULTS_TTL_DAYS=7
   ```

3. **Click "Add" for each variable**

4. **Verify REDIS_URL:**
   - Double-check the Redis URL is correct
   - Format: `redis://default:PASSWORD@HOST:PORT`
   - Common mistake: Missing `redis://` prefix

#### Step 4: Enable Worker Process

Railway will automatically detect the `Procfile` and start both `web` and `worker` processes.

**Verify both processes are running:**

1. Go to "Deployments" tab
2. Click on latest deployment
3. You should see logs from both:
   - `web` process: Uvicorn startup messages
   - `worker` process: Celery worker startup messages

**Expected worker logs:**
```
celery@... v5.3.x (...)
[config]
.> app:         scholar_source:0x...
.> transport:   redis://...
.> results:     redis://...
.> concurrency: 2 (prefork)
.> task events: OFF

[queues]
.> crew_jobs        exchange=crew(direct) key=crew.jobs
.> default          exchange=default(direct) key=default

[tasks]
  . backend.tasks.run_crew_task

celery@... ready.
```

#### Step 5: Configure Scaling (Optional)

**Scale the Worker Process:**

By default, Railway runs 1 instance of each process. To scale:

1. Go to your service settings
2. Click on "Settings" tab
3. Under "Replicas", you can set:
   - **Horizontal scaling:** Number of instances (costs more)
   - **Vertical scaling:** CPU/Memory per instance

**Recommended Starter Configuration:**
- **Web instances:** 1 (scale up if API becomes slow)
- **Worker instances:** 1-2 (scale based on queue depth)
- **Memory:** 512MB - 1GB per instance
- **CPU:** Shared (upgrade to dedicated if needed)

**Auto-scaling (Pro plan):**
- Railway Pro supports auto-scaling based on CPU/memory
- Configure min/max instances
- Automatically scales workers based on load

#### Step 6: Update Frontend Configuration

Your frontend (Cloudflare Pages) needs to point to the Railway API.

1. **Get Railway API URL:**
   - Go to your Railway service
   - Click "Settings" → "Domains"
   - Copy the generated domain (e.g., `scholarsource-production.up.railway.app`)
   - Or add custom domain

2. **Update Frontend Environment Variable:**
   - Go to Cloudflare Pages project settings
   - Add/update environment variable:
   ```
   VITE_API_URL=https://your-railway-domain.up.railway.app
   ```
   - Redeploy frontend

#### Step 7: Verify Deployment

**Run Health Checks:**

1. **API Health Check:**
   ```bash
   curl https://your-railway-domain.up.railway.app/api/health
   ```
   Expected: `{"status":"healthy"}`

2. **Submit Test Job:**
   ```bash
   curl -X POST https://your-railway-domain.up.railway.app/api/submit \
     -H "Content-Type: application/json" \
     -d '{
       "course_name": "Test Course",
       "university_name": "Test University",
       "book_title": "Test Book",
       "book_author": "Test Author"
     }'
   ```
   Expected: Returns `job_id`

3. **Check Job Status:**
   ```bash
   curl https://your-railway-domain.up.railway.app/api/status/{job_id}
   ```
   Expected: Returns job status (`queued`, `running`, `completed`, or `failed`)

4. **Monitor Worker Logs:**
   - Go to Railway dashboard → Deployments → Latest
   - Filter logs by `worker` process
   - You should see Celery processing the job

**Check Redis Connection:**

In Railway logs, verify:
- ✅ No Redis connection errors
- ✅ Worker successfully connected to Redis
- ✅ Tasks are being enqueued and consumed

---

### 13.3 Common Deployment Issues

#### Issue 1: Worker Not Starting

**Symptoms:**
- Only see `web` process logs
- No Celery startup messages
- Jobs stay in `queued` status forever

**Causes:**
- Procfile not detected
- Worker process crashed during startup
- Missing dependencies

**Fixes:**
1. Verify `Procfile` exists in repository root
2. Check Railway deployment logs for errors
3. Ensure `celery` is in `requirements.txt`
4. Verify `REDIS_URL` is set correctly

#### Issue 2: Redis Connection Failed

**Symptoms:**
```
celery.exceptions.ImproperlyConfigured: CELERY_BROKER_URL is not set
```
or
```
redis.exceptions.ConnectionError: Error connecting to Redis
```

**Fixes:**
1. Verify `REDIS_URL` environment variable is set
2. Check Redis Cloud database is active
3. Verify Redis URL format: `redis://default:PASSWORD@HOST:PORT`
4. Check Redis Cloud firewall allows Railway IPs (usually not an issue)
5. Test Redis connection:
   ```bash
   railway run python -c "from redis import Redis; r=Redis.from_url('$REDIS_URL'); print(r.ping())"
   ```

#### Issue 3: Environment Variables Not Loading

**Symptoms:**
- Missing API keys errors
- Database connection failed
- Application crashes on startup

**Fixes:**
1. Go to Railway Variables tab
2. Verify all required variables are set
3. Check for typos in variable names
4. Redeploy after adding variables (click "Deploy" → "Redeploy")

#### Issue 4: Port Binding Error

**Symptoms:**
```
Error binding to 0.0.0.0:8000
```

**Cause:**
- Using hardcoded port instead of `$PORT`

**Fix:**
- Procfile should use `$PORT`, not `8000`:
  ```
  web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  ```

#### Issue 5: Jobs Not Being Processed

**Symptoms:**
- Jobs stuck in `queued` status
- Worker logs show "ready" but no task execution

**Fixes:**
1. Check worker logs for errors
2. Verify queue names match:
   - `backend/celery_app.py` defines queues
   - Procfile worker listens to correct queues
3. Manually test task:
   ```python
   from backend.tasks import run_crew_task
   result = run_crew_task.delay("test-job-id", {...})
   ```

---

### 13.4 Monitoring and Maintenance

#### Monitoring Checklist

**Daily:**
- [ ] Check Railway dashboard for any crashed processes
- [ ] Monitor error rate in logs
- [ ] Check queue depth (jobs waiting to be processed)

**Weekly:**
- [ ] Review worker processing times
- [ ] Check Redis memory usage
- [ ] Monitor Railway resource usage (CPU, memory)
- [ ] Review cost dashboard

**Monthly:**
- [ ] Optimize worker count based on traffic patterns
- [ ] Review and optimize database queries
- [ ] Update dependencies (`pip list --outdated`)

#### Key Metrics to Track

1. **Queue Depth:** How many jobs waiting
   - Check Redis: `LLEN crew_jobs` command
   - Goal: Keep under 10-20 for good latency

2. **Worker Utilization:** Are workers busy or idle?
   - Check Celery logs for task start/complete messages
   - Scale up if workers constantly busy
   - Scale down if workers mostly idle

3. **Job Duration:** How long jobs take
   - Add logging in `backend/tasks.py`
   - Track P50, P95, P99 durations
   - Optimize slow jobs

4. **Error Rate:** Failed jobs
   - Monitor Railway logs for exceptions
   - Check job status distribution in database
   - Investigate and fix failed job patterns

#### Useful Railway CLI Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# View logs (live)
railway logs

# View logs (worker only)
railway logs --filter worker

# Run command in Railway environment
railway run python scripts/test.py --redis

# SSH into Railway container (Pro plan)
railway shell
```

---

### 13.5 Scaling Strategy

#### When to Scale UP (More Resources per Instance)

**Symptoms:**
- High CPU usage (>80% sustained)
- High memory usage (>80%)
- API response times increasing
- Worker tasks timing out

**Actions:**
1. Go to Railway Settings → Resources
2. Increase CPU/Memory allocation
3. Monitor performance improvement

#### When to Scale OUT (More Instances)

**Symptoms:**
- Queue depth consistently high (>20 jobs)
- API response time high despite low CPU
- Workers can't keep up with job submissions

**Actions:**

**Scale Workers:**
1. Go to Railway service settings
2. Increase replica count for worker process
3. Start with +1 worker, monitor queue depth
4. Continue scaling until queue depth is healthy

**Scale API:**
1. Less common to need multiple API instances initially
2. Scale when API CPU/memory is high
3. Ensure Redis-backed rate limiting is active
4. Railway will load balance across API instances

#### Cost-Effective Scaling Tips

1. **Scale workers first** - Usually the bottleneck
2. **Use autoscaling** (Pro plan) - Only pay for what you need
3. **Monitor queue depth** - Scale based on data, not guesses
4. **Optimize job duration** - Faster jobs = need fewer workers
5. **Use caching** - Reduce redundant work
6. **Schedule heavy tasks** - Run during off-peak hours if possible

---

### 13.6 Deployment Checklist

Before going live with production traffic:

**Pre-Deployment:**
- [ ] All tests pass locally (`python scripts/test.py --all`)
- [ ] Redis Cloud database created and accessible
- [ ] All environment variables documented
- [ ] Frontend updated with Railway API URL
- [ ] CORS settings updated in `backend/main.py` (if needed)

**Deployment:**
- [ ] Railway project created from GitHub
- [ ] All environment variables set in Railway
- [ ] Both `web` and `worker` processes running
- [ ] Health check endpoint returns 200 OK
- [ ] Test job submission and completion works
- [ ] Redis connection successful (check logs)

**Post-Deployment:**
- [ ] Monitor logs for 1 hour for any errors
- [ ] Submit real test job and verify completion
- [ ] Check worker is processing jobs correctly
- [ ] Verify rate limiting works across requests
- [ ] Set up alerts for critical errors
- [ ] Document Railway dashboard access for team

**Ongoing:**
- [ ] Weekly: Review error logs and performance metrics
- [ ] Monthly: Check Railway costs and optimize
- [ ] As needed: Scale workers based on queue depth
- [ ] As needed: Update dependencies and redeploy

---

## Conclusion

Scaling ScholarSource requires migrating from a thread-based architecture to a queue-based distributed system. The primary changes are:

1. **Task Queue:** Implement Celery for job processing
2. **Worker Separation:** Move job execution to separate worker processes
3. **Redis Integration:** Use Redis for queue and rate limiting
4. **Horizontal Scaling:** Enable independent scaling of API and workers

The recommended approach is to start with **Celery** (chosen), implement in **phases**, and focus on **monitoring** from the beginning. This will enable the system to handle 10-100x more concurrent jobs while maintaining reliability and reasonable costs.

**Estimated Timeline:** 3-4 weeks for full implementation
**Estimated Cost Increase:** $10-50/month for Phase 1, scaling up with usage
**Risk Level:** Medium (significant architecture change, but well-understood patterns)

**Current Status:** Phase 1 Steps 1-5 Complete ✅
- Celery configured and tested
- Worker process created and tested
- Ready for Railway deployment

---

**Document Status:** Implementation in progress - Phase 1 near completion
