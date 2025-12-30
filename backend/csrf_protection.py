"""
CSRF Protection Module

Provides Origin header validation for state-changing requests.
This is a defense-in-depth measure to prevent cross-origin POST requests
even without authentication/session management.
"""

import os
from fastapi import Request, HTTPException
from backend.logging_config import get_logger

logger = get_logger(__name__)

# Get allowed origins from environment or use defaults
# Should match CORS configuration in main.py
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Vite dev server (legacy port)
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Standard Vite port
    "http://127.0.0.1:5173",
    "https://scholar-source.pages.dev",  # Cloudflare Pages
    # Add custom domain when configured via environment variable
]

# Allow additional origins from environment variable (comma-separated)
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    ALLOWED_ORIGINS.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])


def validate_origin(request: Request) -> None:
    """
    Validate Origin header for state-changing requests.
    
    This prevents cross-origin POST requests by checking that the Origin
    header matches one of the allowed origins. This is a defense-in-depth
    measure that works even without authentication.
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: If Origin header is missing or invalid
    """
    # Skip validation for read-only requests
    if request.method in ["GET", "OPTIONS", "HEAD"]:
        return
    
    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    
    # Check Origin header first (most reliable)
    if origin:
        # Normalize origin (remove trailing slash, handle http/https)
        normalized_origin = origin.rstrip("/")
        for allowed in ALLOWED_ORIGINS:
            normalized_allowed = allowed.rstrip("/")
            if normalized_origin == normalized_allowed:
                logger.debug(f"Origin validation passed: {origin}")
                return
    
    # Fallback to Referer header if Origin is missing
    # (Some browsers/requests may not send Origin)
    if referer:
        try:
            # Extract origin from referer URL
            # Format: http://domain:port/path -> http://domain:port
            if "://" in referer:
                # Parse URL more robustly
                parts = referer.split("://", 1)
                if len(parts) == 2:
                    scheme = parts[0]  # http or https
                    rest = parts[1]  # domain:port/path
                    # Get domain:port (everything before first /)
                    domain_port = rest.split("/")[0]
                    referer_origin = f"{scheme}://{domain_port}"
                    normalized_referer = referer_origin.rstrip("/")
                    for allowed in ALLOWED_ORIGINS:
                        normalized_allowed = allowed.rstrip("/")
                        if normalized_referer == normalized_allowed:
                            logger.debug(f"Referer validation passed: {referer_origin}")
                            return
        except (IndexError, ValueError) as e:
            logger.warning(f"Failed to parse Referer header: {referer}, error: {e}")
    
    # Reject request if no valid origin found
    logger.warning(
        f"Origin validation failed - Origin: {origin}, Referer: {referer}, "
        f"Method: {request.method}, Path: {request.url.path}"
    )
    raise HTTPException(
        status_code=403,
        detail={
            "error": "Invalid origin",
            "message": "Request origin not allowed. This request must come from an authorized domain."
        }
    )

