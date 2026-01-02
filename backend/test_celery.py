"""
Celery Test Script

Quick script to test Celery configuration and task execution.
"""

import os
import time
from backend.celery_app import app
from backend.tasks import health_check

def test_celery_configuration():
    """Test that Celery is configured correctly."""
    print("=" * 60)
    print("Testing Celery Configuration")
    print("=" * 60)

    print(f"\n✓ App name: {app.main}")
    print(f"✓ Broker URL: {app.conf.broker_url}")
    print(f"✓ Result backend: {app.conf.result_backend}")
    print(f"✓ Task serializer: {app.conf.task_serializer}")
    print(f"✓ Result serializer: {app.conf.result_serializer}")

    print("\nConfigured queues:")
    for queue in app.conf.task_queues:
        print(f"  - {queue.name} (routing_key: {queue.routing_key})")

    print("\nRegistered tasks:")
    for task_name in sorted(app.tasks.keys()):
        if not task_name.startswith('celery.'):
            print(f"  - {task_name}")


def test_redis_connection():
    """Test Redis connection."""
    print("\n" + "=" * 60)
    print("Testing Redis Connection")
    print("=" * 60)

    try:
        from redis import Redis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        redis_client = Redis.from_url(redis_url)

        # Test basic operations
        redis_client.ping()
        print("✓ Redis PING successful")

        # Test set/get
        test_key = "celery_test_key"
        test_value = "celery_test_value"
        redis_client.set(test_key, test_value, ex=10)
        retrieved = redis_client.get(test_key)
        assert retrieved.decode() == test_value
        print("✓ Redis SET/GET successful")
        redis_client.delete(test_key)

        print("\n✅ Redis connection is working properly")
        return True

    except Exception as e:
        print(f"\n❌ Redis connection failed: {e}")
        return False


def test_task_enqueue():
    """Test enqueueing a task (requires worker to be running)."""
    print("\n" + "=" * 60)
    print("Testing Task Enqueue")
    print("=" * 60)

    print("\nEnqueueing health_check task...")
    result = health_check.delay()

    print(f"✓ Task enqueued with ID: {result.id}")
    print(f"✓ Task state: {result.state}")

    print("\nNote: Task will only execute if a Celery worker is running.")
    print("Start a worker with:")
    print("  celery -A backend.celery_app worker --loglevel=info")

    print("\nWaiting 5 seconds to check if worker picks up the task...")
    for i in range(5):
        time.sleep(1)
        state = result.state
        print(f"  {i+1}s: Task state = {state}")

        if state == "SUCCESS":
            print(f"\n✅ Task completed successfully!")
            print(f"Result: {result.result}")
            return True
        elif state == "FAILURE":
            print(f"\n❌ Task failed!")
            print(f"Error: {result.result}")
            return False

    if result.state == "PENDING":
        print("\n⚠️  Task is still pending - worker might not be running")
        print("This is expected if no worker is active.")

    return result.state in ["SUCCESS", "PENDING"]


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("CELERY CONFIGURATION TEST")
    print("=" * 60)

    # Test configuration
    test_celery_configuration()

    # Test Redis
    redis_ok = test_redis_connection()
    if not redis_ok:
        print("\n❌ Cannot proceed without Redis connection")
        return

    # Test task enqueue
    test_task_enqueue()

    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)
    print("\nTo run the Celery worker:")
    print("  celery -A backend.celery_app worker --loglevel=info --queues=crew_jobs,default")
    print("\nTo monitor tasks with Flower:")
    print("  pip install flower")
    print("  celery -A backend.celery_app flower")
    print()


if __name__ == "__main__":
    main()
