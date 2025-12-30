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
    # Calculate retry_after based on the limit
    # Extract time window from limit string (e.g., "2 per 1 minute")
    limit_str = str(exc.limit.limit) if exc.limit else exc.detail

    # Simple retry_after calculation based on common patterns
    retry_after = 60  # Default to 60 seconds
    if "minute" in limit_str:
        retry_after = 60
    elif "hour" in limit_str:
        retry_after = 3600
    elif "second" in limit_str:
        retry_after = 1

    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": f"Too many requests. Please try again in {retry_after} seconds.",
            "retry_after": retry_after,
            "limit": exc.detail
        },
        headers={
            "Retry-After": str(retry_after)
        }
    )
