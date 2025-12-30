# Rate Limiting Implementation Plan

## Overview

This document outlines the plan to implement rate limiting for the ScholarSource API to prevent abuse, control costs, and ensure fair resource usage across all users.

---

## ⚠️ CRITICAL: Multi-Instance Deployment Warning

**Current Setup:** Single Railway instance ✅

**IF you scale to multiple Railway instances (2+):**
- ❌ **In-memory rate limiting WILL NOT WORK**
- ❌ Rate limits will become ineffective (users can bypass by refreshing)
- ✅ **You MUST migrate to Redis BEFORE scaling**

**Migration is easy:**
1. Add Railway Redis service (~$5-10/month)
2. Set `REDIS_URL` environment variable
3. Code automatically switches to Redis (no code changes needed!)

See **"Future Enhancements → Redis Backend"** section for complete migration guide.

---

## Goals

1. **Prevent API Abuse**: Stop malicious actors from spamming expensive AI operations
2. **Control Costs**: Each job consumes OpenAI API credits - limit usage to prevent runaway costs
3. **Fair Access**: Ensure all users get reasonable access without monopolizing resources
4. **Good UX**: Allow legitimate use cases (iterations, retries) while blocking abuse

## Implementation Strategy

### 1. Library Choice: `slowapi`

**Why slowapi?**
- FastAPI-native rate limiting (built for FastAPI)
- Simple decorator-based syntax
- Automatic rate limit headers (`X-RateLimit-*`)
- Supports multiple storage backends (in-memory, Redis)
- Well-maintained and widely used

**Installation:**
```bash
# Add to requirements.txt
slowapi>=0.1.9
```

### 2. Storage Backend: In-Memory → Redis Migration Path

**Current Setup (Single Instance):**
- Railway deployment currently runs **1 instance** (single server)
- No horizontal scaling configured
- In-memory storage is sufficient for single-instance deployments

**Why In-Memory Now?**
- ✅ Zero dependencies (no Redis needed)
- ✅ Fast and simple
- ✅ Perfect for single-instance Railway deployments
- ✅ No additional infrastructure costs

**⚠️ CRITICAL: Multi-Instance Limitation**

**If you scale to multiple Railway instances, in-memory storage WILL NOT WORK correctly.**

With multiple instances, each instance has its own memory, so:
- ❌ Rate limits are **NOT shared** across instances
- ❌ 10/hour limit becomes effectively `N × 10/hour` (where N = number of instances)
- ❌ Users can bypass limits by refreshing (load balancer routes to different instance)
- ❌ Rate limiting becomes ineffective

**Example with 2 instances:**
```
User makes 10 requests → Load balancer routes 5 to Instance A, 5 to Instance B
Instance A: "5 requests counted" ✅ Within limit
Instance B: "5 requests counted" ✅ Within limit
Actual total: 10 requests (should have been blocked at request #10)
Result: Rate limit is 2× what you intended!
```

**When to Switch to Redis (REQUIRED for Multi-Instance):**
- ✅ **BEFORE** scaling to 2+ Railway instances (not optional!)
- When you need persistent rate limits across restarts
- When you implement user authentication (track by user ID)

### 3. Rate Limit Strategy

#### Per-Endpoint Limits

| Endpoint | Limit | Reasoning |
|----------|-------|-----------|
| **`POST /api/submit`** | `10/hour; 2/minute` | - Each job costs money (OpenAI API)<br>- Allow 10 jobs/hour (reasonable for students)<br>- Prevent burst spam (max 2/min)<br>- Students can iterate on searches |
| **`GET /api/status/{job_id}`** | `100/minute` | - Cheap operation (just database read)<br>- Frontend polls every 2-3 seconds<br>- Be generous to avoid false positives |
| **`POST /api/cancel/{job_id}`** | `20/hour` | - Rare operation<br>- Allow retries if needed<br>- Not expensive |
| **`GET /api/health`** | **No limit** | - Health checks should always work<br>- Used by Railway/monitoring systems |

#### Rate Limit Syntax Explained

**Format:** `"requests/timeperiod"`

- `"10/hour"` = 10 requests per hour
- `"2/minute"` = 2 requests per minute
- `"10/hour; 2/minute"` = **Combined limit**: Max 10/hour, but no more than 2 in any given minute

**Why Combined Limits?**
- Prevents burst attacks: `"10/hour"` alone allows 10 requests in 10 seconds, then nothing
- `"10/hour; 2/minute"` allows 2 requests/min up to 10 total/hour
- Better for legitimate users who make requests over time

### 4. Error Responses

When a rate limit is exceeded, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please wait 45 seconds before trying again.",
  "retry_after": 45,
  "limit": "10 per hour"
}
```

**HTTP Status:** `429 Too Many Requests`

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
```

### 5. Frontend Handling

**Current Behavior:**
- API errors are caught and displayed to the user
- No special handling for 429 errors yet

**Recommended Future Enhancement:**
```javascript
// In web/src/api/client.js
if (response.status === 429) {
  const data = await response.json();
  throw new Error(
    `Rate limit exceeded. Please wait ${data.retry_after} seconds before trying again.`
  );
}
```

The frontend already displays error messages, so this will work immediately.

## Implementation Files

### 1. `backend/rate_limiter.py` (NEW)

```python
"""
Rate Limiting Configuration

Implements rate limiting for API endpoints using slowapi.
Automatically uses Redis if REDIS_URL is set, otherwise falls back to in-memory.

⚠️  IMPORTANT: In-memory storage only works for single-instance deployments!
    If you scale to multiple Railway instances, you MUST use Redis.
"""

import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from starlette.responses import JSONResponse


# Check for Redis connection string (for multi-instance deployments)
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    # Multi-instance: Use Redis for shared rate limiting across instances
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=REDIS_URL,
        default_limits=["1000/hour"]
    )
    print("✅ Rate limiting: Redis (multi-instance mode)")
else:
    # Single instance: Use in-memory storage
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["1000/hour"]
    )
    print("⚠️  Rate limiting: In-memory (single instance only)")


def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors.

    Returns a user-friendly JSON response with retry information.

    Args:
        request: The FastAPI request object
        exc: The RateLimitExceeded exception

    Returns:
        JSONResponse with 429 status and helpful error message
    """
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": f"Too many requests. Please wait {exc.retry_after} seconds before trying again.",
            "retry_after": exc.retry_after,
            "limit": exc.detail
        }
    )
```

**Key Points:**
- ✅ **Redis-ready from day 1**: Automatically uses Redis if `REDIS_URL` is set
- ✅ **Zero-config migration**: Just add `REDIS_URL` env var when scaling
- ✅ **Startup logging**: Shows which backend is active (Redis vs in-memory)
- ✅ **Single instance safe**: Works perfectly with in-memory for 1 instance
- ⚠️  **Multi-instance warning**: If you scale, you MUST add Redis (see "Future Enhancements" section)
- Uses IP address for rate limiting (`get_remote_address`)
- Global fallback: 1000 requests/hour for any endpoint
- Custom error handler provides helpful messages

### 2. `backend/main.py` (MODIFICATIONS)

**Changes Required:**

```python
# Add imports at top of file
from backend.rate_limiter import limiter, rate_limit_handler
from slowapi.errors import RateLimitExceeded

# After app initialization (line ~37)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Modify endpoint signatures to include Request parameter
# and add rate limit decorators

@app.post("/api/submit", response_model=JobSubmitResponse, tags=["Jobs"])
@limiter.limit("10/hour; 2/minute")
async def submit_job(request: Request, course_input: CourseInputRequest):
    # ... existing code unchanged ...

@app.get("/api/status/{job_id}", response_model=JobStatusResponse, tags=["Jobs"])
@limiter.limit("100/minute")
async def get_job_status(request: Request, job_id: str):
    # ... existing code unchanged ...

@app.post("/api/cancel/{job_id}", tags=["Jobs"])
@limiter.limit("20/hour")
async def cancel_job(request: Request, job_id: str):
    # ... existing code unchanged ...

# Health endpoint: NO rate limit (leave as-is)
@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    # ... existing code unchanged ...
```

**Summary of Changes:**
1. Import rate limiting components
2. Register limiter with app state
3. Add exception handler for 429 errors
4. Add `Request` parameter to rate-limited endpoints
5. Add `@limiter.limit()` decorators with appropriate limits

### 3. `requirements.txt` (MODIFICATION)

**Add:**
```
slowapi>=0.1.9
```

## Testing

See **TESTING_PLAN.md** for comprehensive testing strategy, including:
- Unit tests for rate limiting logic
- Integration tests for API endpoints
- Manual testing procedures
- CI/CD integration

## Monitoring & Observability

### Logging

**Add to rate_limiter.py:**
```python
from backend.logging_config import get_logger

logger = get_logger(__name__)

def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    # Log rate limit violations for monitoring
    client_ip = get_remote_address(request)
    logger.warning(
        f"Rate limit exceeded for IP {client_ip} on {request.url.path}. "
        f"Limit: {exc.detail}, Retry after: {exc.retry_after}s"
    )
    # ... rest of handler ...
```

### Metrics to Monitor

- Rate limit violations per endpoint
- Top IPs hitting rate limits
- False positive rate (legitimate users getting blocked)
- Average requests per IP

### Railway Dashboard

Railway provides basic metrics. Look for:
- Spike in 429 responses
- Patterns in blocked IPs (same IP repeatedly)

## Future Enhancements

### 1. Redis Backend (REQUIRED for Multi-Instance)

**⚠️ CRITICAL: This is NOT optional if you scale to multiple instances!**

**When to implement:**
- ✅ **IMMEDIATELY before** scaling to 2+ Railway instances
- When you need persistent limits across restarts
- When you want rate limits to survive deployments

---

## Step-by-Step Redis Migration Guide

### Step 1: Add Railway Redis Service

**In Railway Dashboard:**
1. Go to your project
2. Click **"+ New"** → **"Database"** → **"Add Redis"**
3. Railway will provision a Redis instance (~$5-10/month)
4. Copy the `REDIS_URL` connection string

**Alternative: Use Upstash Redis (Serverless)**
- Free tier available (10K requests/day)
- More cost-effective for low traffic
- https://upstash.com/

### Step 2: Update Rate Limiter Code

**Modify `backend/rate_limiter.py`:**

```python
"""
Rate Limiting Configuration

Implements rate limiting for API endpoints using slowapi.
Automatically uses Redis if REDIS_URL is set, otherwise falls back to in-memory.
"""

import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from starlette.responses import JSONResponse


# Check for Redis connection string
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    # Multi-instance: Use Redis for shared rate limiting across instances
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=REDIS_URL,
        default_limits=["1000/hour"]
    )
    print("✅ Rate limiting: Redis (multi-instance mode)")
else:
    # Single instance: Use in-memory storage
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["1000/hour"]
    )
    print("⚠️  Rate limiting: In-memory (single instance only)")


def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors.

    Returns a user-friendly JSON response with retry information.

    Args:
        request: The FastAPI request object
        exc: The RateLimitExceeded exception

    Returns:
        JSONResponse with 429 status and helpful error message
    """
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": f"Too many requests. Please wait {exc.retry_after} seconds before trying again.",
            "retry_after": exc.retry_after,
            "limit": exc.detail
        }
    )
```

**Key Changes:**
- ✅ Automatically detects Redis via `REDIS_URL` env var
- ✅ Falls back to in-memory if Redis not configured
- ✅ Prints startup message showing which backend is active
- ✅ Zero code changes needed when adding Redis - just set the env var!

### Step 3: Set Environment Variable in Railway

**In Railway Dashboard:**
1. Go to your backend service
2. Click **"Variables"** tab
3. Click **"+ New Variable"**
4. Add:
   - **Name:** `REDIS_URL`
   - **Value:** `redis://default:password@red-xxxxx.railway.app:6379` (from Step 1)
5. Click **"Deploy"**

Railway will automatically restart your service with Redis enabled.

### Step 4: Verify Redis Connection

**Check your deployment logs:**
```
✅ Rate limiting: Redis (multi-instance mode)
```

If you see this message, Redis is working correctly.

**If you see an error:**
```python
# Test Redis connection manually
import redis
r = redis.from_url(os.getenv("REDIS_URL"))
r.ping()  # Should return True
```

### Step 5: Add Redis Dependency (if needed)

**If slowapi needs Redis driver:**
```bash
# Add to requirements.txt
redis>=4.5.0
```

Railway will install it automatically on next deploy.

---

## Redis Configuration Options

### Option A: Railway Redis (Recommended)

**Pros:**
- ✅ Integrated with Railway
- ✅ Automatic backups
- ✅ Same datacenter as your app (low latency)

**Cons:**
- ❌ Costs ~$5-10/month
- ❌ No free tier

**Best for:** Production deployments with multiple instances

### Option B: Upstash Redis (Serverless)

**Pros:**
- ✅ Free tier (10K requests/day)
- ✅ Pay-per-use pricing
- ✅ Global edge caching

**Cons:**
- ❌ Higher latency (external service)
- ❌ Free tier limits may not be enough for high traffic

**Best for:** Low-traffic apps or development/staging

**Setup:**
1. Sign up at https://upstash.com/
2. Create a Redis database
3. Copy the REST URL
4. Set `REDIS_URL` in Railway

### Option C: Redis Labs (Cloud)

**Pros:**
- ✅ Free tier (30MB)
- ✅ Managed service
- ✅ High availability options

**Cons:**
- ❌ External service (latency)
- ❌ Small free tier

**Best for:** Teams already using Redis Labs

---

## Testing Redis Integration

### Test 1: Verify Storage Backend

```python
# Add to backend/rate_limiter.py (temporary)
def test_rate_limit_storage():
    """Test which storage backend is active"""
    import os
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        print(f"✅ Using Redis: {redis_url[:30]}...")
    else:
        print("⚠️  Using in-memory (not suitable for multi-instance)")

test_rate_limit_storage()
```

### Test 2: Verify Rate Limits Work Across Instances

**If you have 2+ instances running:**

1. Make 5 requests to `/api/submit` from one IP
2. Check response headers:
   ```
   X-RateLimit-Limit: 10
   X-RateLimit-Remaining: 5
   ```
3. Make 5 more requests
4. Should get 429 on request #11 (not #21)

**If limits are working:**
- ✅ You get 429 at request #11 → Redis is sharing state correctly

**If limits are NOT working:**
- ❌ You can make 20+ requests → In-memory, not Redis (each instance has separate count)

---

## Rollback Plan (If Redis Breaks)

**If Redis causes issues, roll back immediately:**

1. **Remove REDIS_URL from Railway:**
   - Go to Variables tab
   - Delete `REDIS_URL`
   - Click "Deploy"

2. **App automatically falls back to in-memory:**
   ```
   ⚠️  Rate limiting: In-memory (single instance only)
   ```

3. **Scale down to 1 instance temporarily** until Redis is fixed

---

## Cost Estimation

**Railway Redis:**
- ~$5-10/month for basic tier
- Scales with memory usage
- Included in Railway bill

**Upstash Redis (Free Tier):**
- 10K requests/day free
- $0.20 per 100K requests after
- Separate billing

**Estimated Monthly Cost:**
- Single instance + in-memory: **$0** (current)
- 2-3 instances + Railway Redis: **~$5-10/month**
- 2-3 instances + Upstash: **$0-5/month** (depends on traffic)

---

## Migration Checklist

**Before Scaling to Multiple Instances:**

- [ ] Step 1: Add Railway Redis service
- [ ] Step 2: Update `backend/rate_limiter.py` (already done in initial implementation)
- [ ] Step 3: Set `REDIS_URL` environment variable
- [ ] Step 4: Deploy and verify logs show "Redis (multi-instance mode)"
- [ ] Step 5: Test rate limiting works across instances
- [ ] Step 6: **THEN** scale to 2+ instances in Railway

**⚠️ DO NOT scale to multiple instances before completing Steps 1-5!**

---

## Environment Variable Reference

```bash
# .env.local (development - optional)
REDIS_URL=redis://localhost:6379

# Railway Production (set in dashboard)
REDIS_URL=redis://default:password@red-xxxxx.railway.app:6379

# Upstash (alternative)
REDIS_URL=rediss://default:password@region.upstash.io:6379
```

**Note:** Railway Redis uses `redis://` (no TLS), Upstash uses `rediss://` (with TLS)

### 2. Per-User Rate Limiting (With Authentication)

**Future:** If you add user authentication

```python
def get_user_identifier(request: Request):
    """
    Get user ID from JWT token, fallback to IP address.
    """
    # Try to get user from JWT token
    token = request.headers.get("Authorization")
    if token:
        try:
            user_id = decode_jwt(token)
            return f"user:{user_id}"
        except:
            pass

    # Fallback to IP
    return f"ip:{get_remote_address(request)}"

limiter = Limiter(key_func=get_user_identifier)
```

### 3. Dynamic Limits (Advanced)

```python
# Different limits for authenticated vs anonymous users
def dynamic_limit(request: Request):
    if request.state.user.is_authenticated:
        return "20/hour; 3/minute"  # More generous
    return "10/hour; 2/minute"      # Stricter

@limiter.limit(dynamic_limit)
async def submit_job(...):
    ...
```

### 4. Cloudflare Rate Limiting (Edge-Level)

**Best practice for production:**
- Add Cloudflare in front of Railway deployment
- Use Cloudflare's WAF and rate limiting
- Provides DDoS protection at the edge
- Reduces load on your backend

## Rollout Plan

### Phase 1: Implementation (Week 1)
1. ✅ Create `backend/rate_limiter.py`
2. ✅ Update `backend/main.py` with decorators
3. ✅ Add `slowapi` to `requirements.txt`
4. ✅ Deploy to Railway
5. ✅ Monitor for 1 week

### Phase 2: Monitoring (Week 2)
1. Review logs for rate limit violations
2. Check for false positives (legitimate users blocked)
3. Adjust limits if needed based on real usage

### Phase 3: Refinement (Week 3+)
1. Fine-tune limits based on usage patterns
2. Add monitoring dashboards
3. Consider Redis if scaling to multiple instances

## Configuration Reference

### Recommended Limits (Current)

```python
# Production-ready limits
LIMITS = {
    "submit": "10/hour; 2/minute",
    "status": "100/minute",
    "cancel": "20/hour",
    "health": None  # No limit
}
```

### Conservative Alternative (If Abuse Occurs)

```python
# Stricter limits if needed
LIMITS = {
    "submit": "5/hour; 1/minute",
    "status": "60/minute",
    "cancel": "10/hour",
    "health": None
}
```

### Generous Alternative (For Testing)

```python
# More permissive for development/testing
LIMITS = {
    "submit": "20/hour; 5/minute",
    "status": "200/minute",
    "cancel": "50/hour",
    "health": None
}
```

## Risks & Mitigations

### Risk 1: False Positives (Blocking Legitimate Users)

**Risk:** Students behind shared NAT (dorm, library) share the same IP

**Mitigation:**
- Start with generous limits (10/hour vs 5/hour)
- Monitor logs for patterns
- Provide clear error messages with retry time
- Consider authentication in future (per-user limits)

### Risk 2: VPN/Proxy Evasion

**Risk:** Malicious actors use VPNs to bypass IP-based limits

**Mitigation:**
- Accept this risk initially (better than nothing)
- Add authentication later for per-user limits
- Use Cloudflare for more sophisticated detection
- Monitor for unusual patterns

### Risk 3: In-Memory Limits Reset on Deploy

**Risk:** Railway restarts reset rate limit counters

**Mitigation:**
- Accept this risk for now (small window)
- Deployments are infrequent
- Add Redis if this becomes a problem

## Success Metrics

### Week 1 Goals
- ✅ Zero false positives in logs
- ✅ Rate limiting blocking obvious spam patterns
- ✅ No user complaints about being blocked

### Month 1 Goals
- 📊 <1% of requests returning 429
- 📊 Average 2-3 jobs per unique IP per day
- 📊 Zero cost overruns from abuse

## Questions & Answers

**Q: Why not use Railway's built-in rate limiting?**
A: Railway doesn't provide application-level rate limiting. They handle infrastructure, not API logic.

**Q: Can users bypass this with a VPN?**
A: Yes, but it still prevents casual abuse and scripts. More sophisticated protection requires authentication.

**Q: What if a student legitimately needs more than 10 jobs/hour?**
A: Monitor logs first. Can adjust limits or add authentication for power users later.

**Q: Will this affect development?**
A: No. Use different limits for local dev or bypass rate limiting in development mode.

## Development Mode Exception

**Optional: Disable rate limiting in development**

```python
# backend/rate_limiter.py
import os

ENABLE_RATE_LIMITING = os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"

if ENABLE_RATE_LIMITING:
    limiter = Limiter(key_func=get_remote_address, default_limits=["1000/hour"])
else:
    # No-op limiter for development
    from slowapi import Limiter as NoOpLimiter
    limiter = NoOpLimiter(enabled=False)
```

```bash
# .env.local (development)
ENABLE_RATE_LIMITING=false
```

## Summary

This implementation provides:
- ✅ **Simple**: In-memory, zero dependencies
- ✅ **Effective**: Prevents abuse without Redis complexity
- ✅ **Scalable**: Easy migration to Redis when needed
- ✅ **User-Friendly**: Clear error messages with retry times
- ✅ **Maintainable**: Well-documented, easy to adjust limits

Ready to implement after your review and approval! 🚀
