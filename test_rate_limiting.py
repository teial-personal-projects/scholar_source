#!/usr/bin/env python3
"""
Rate Limiting Test Script

Tests that rate limiting is working correctly on API endpoints.
"""

import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def test_submit_rate_limit():
    """Test /api/submit rate limit: 10/hour; 2/minute"""
    print("\n🧪 Testing /api/submit rate limit (2/minute)...")

    # Test data
    payload = {
        "course_name": "Introduction to Python",
        "university_name": "Test University"
    }

    # Make 3 rapid requests (should get rate limited on 3rd)
    for i in range(3):
        response = requests.post(f"{BASE_URL}/api/submit", json=payload)
        print(f"Request {i+1}: Status {response.status_code}")

        if response.status_code == 429:
            print("✅ Rate limit working! Got 429 on request", i+1)
            data = response.json()
            print(f"   Error: {data.get('error')}")
            print(f"   Message: {data.get('message')}")
            print(f"   Retry after: {data.get('retry_after')} seconds")
            print(f"   Limit: {data.get('limit')}")
            return True
        elif response.status_code == 400:
            # Expected for invalid course (no inputs provided properly)
            print(f"   Got 400 (validation error - expected)")
        else:
            print(f"   Response: {response.text[:100]}")

    print("❌ No rate limit triggered after 3 rapid requests")
    return False


def test_status_rate_limit():
    """Test /api/status/{job_id} rate limit: 100/minute"""
    print("\n🧪 Testing /api/status rate limit (100/minute)...")

    # This is a high limit, so just verify it doesn't block normal usage
    for i in range(5):
        response = requests.get(f"{BASE_URL}/api/status/test-job-id")
        if response.status_code == 429:
            print(f"❌ Unexpected rate limit on request {i+1}")
            return False

    print("✅ No rate limit on 5 status checks (expected - limit is 100/min)")
    return True


def test_cancel_rate_limit():
    """Test /api/cancel/{job_id} rate limit: 20/hour"""
    print("\n🧪 Testing /api/cancel rate limit...")

    # Make a few requests
    for i in range(3):
        response = requests.post(f"{BASE_URL}/api/cancel/test-job-id")
        print(f"Request {i+1}: Status {response.status_code}")

        if response.status_code == 429:
            print("✅ Rate limit working!")
            return True
        elif response.status_code == 404:
            print(f"   Got 404 (job not found - expected)")

    print("✅ No rate limit on 3 cancel requests (limit is 20/hour)")
    return True


def test_health_no_limit():
    """Test /api/health has no rate limit"""
    print("\n🧪 Testing /api/health (no rate limit)...")

    # Make many requests rapidly
    for i in range(10):
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 429:
            print(f"❌ Unexpected rate limit on health check!")
            return False

    print("✅ No rate limit on 10 health checks (expected)")
    return True


def main():
    """Run all rate limiting tests"""
    print("=" * 60)
    print("Rate Limiting Test Suite")
    print("=" * 60)

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=2)
        if response.status_code != 200:
            print("❌ Server is not responding correctly")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running on port 8000?")
        print("   Start with: uvicorn backend.main:app --host 0.0.0.0 --port 8000")
        sys.exit(1)

    print("✅ Server is running\n")

    # Run tests
    results = []

    # Test health endpoint (no limit)
    results.append(("Health endpoint", test_health_no_limit()))

    # Test status endpoint (high limit)
    results.append(("Status endpoint", test_status_rate_limit()))

    # Test cancel endpoint
    results.append(("Cancel endpoint", test_cancel_rate_limit()))

    # Test submit endpoint (strictest limit - test last to avoid blocking other tests)
    results.append(("Submit endpoint", test_submit_rate_limit()))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")

    all_passed = all(result[1] for result in results)

    if all_passed:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
