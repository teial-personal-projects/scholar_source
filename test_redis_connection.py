# -*- coding: utf-8 -*-
"""
Quick test script to verify Redis connection.
Run this after setting REDIS_URL in your environment.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

if not REDIS_URL:
    print("[ERROR] REDIS_URL not found in environment variables")
    print("   Please set REDIS_URL in your .env file")
    exit(1)

# Hide password in output
redis_url_display = REDIS_URL.split('@')[0] + '@***'
print(f"[OK] Found REDIS_URL: {redis_url_display}")

try:
    import redis
    
    # Try to connect
    r = redis.from_url(REDIS_URL)
    
    # Test connection with a ping
    response = r.ping()
    
    if response:
        print("[OK] Redis connection successful!")
        
        # Test basic operations
        r.set("test_key", "test_value", ex=10)  # Set with 10 second expiration
        value = r.get("test_key")
        print(f"[OK] Test write/read successful: {value.decode()}")
        
        # Clean up
        r.delete("test_key")
        print("[OK] Redis is ready to use!")
    else:
        print("[ERROR] Redis ping failed")
        
except ImportError:
    print("[ERROR] redis package not installed")
    print("   Install it with: pip install redis")
    exit(1)
except redis.ConnectionError as e:
    print(f"[ERROR] Redis connection failed: {e}")
    print("   Check your REDIS_URL and Redis Cloud database status")
    exit(1)
except Exception as e:
    print(f"[ERROR] Error: {e}")
    exit(1)

