"""
Celery Application Configuration

This module configures Celery for distributed task queue processing.
It handles job execution, worker management, and task routing.
"""

import os
import ssl
from celery import Celery
from celery.signals import worker_ready
from kombu import Queue, Exchange
from backend.logging_config import get_logger, configure_logging

# Configure logging for Celery worker
configure_logging(log_level="INFO")
logger = get_logger(__name__)

# Get Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Validate Redis URL exists (critical for Railway)
if not REDIS_URL:
    raise ValueError("❌ CRITICAL: REDIS_URL environment variable is not set!")

# Log startup message with Redis URL (masked)
print(f"🚀 CELERY APP MODULE LOADED", flush=True)
print(f"📡 Broker URL: {REDIS_URL[:40]}...", flush=True)
logger.info("🚀 CELERY APP MODULE LOADED")
logger.info(f"Broker URL: {REDIS_URL[:40]}...")

# Initialize Celery app
app = Celery(
    "scholar_source",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["backend.tasks"]  # Module where tasks are defined
)

# Celery Configuration
app.conf.update(
    # Broker connection settings (CRITICAL for Railway)
    broker_connection_retry_on_startup=True,  # Retry on startup
    broker_connection_retry=True,  # Retry on connection loss
    broker_connection_max_retries=5,  # Max retries before giving up
    broker_pool_limit=3,  # Connection pool size

    # Task serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Result backend settings
    result_backend=REDIS_URL,
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,  # Store more task metadata

    # Task execution settings
    task_track_started=True,  # Track when tasks start
    task_time_limit=1800,  # Hard time limit: 30 min (kills task)
    task_soft_time_limit=1500,  # Soft time limit: 25 minutes (raises exception)
    task_acks_late=True,  # Acknowledge task after completion (important for reliability)
    task_reject_on_worker_lost=True,  # Reject task if worker dies

    # Worker settings
    worker_prefetch_multiplier=1,  # Only fetch one task at a time (important for long-running tasks)
    worker_max_tasks_per_child=50,  # Restart worker after 100 tasks (prevents memory leaks)
    worker_disable_rate_limits=False,
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s",

    # Retry settings (default for all tasks, can be overridden per task)
    task_default_retry_delay=60,  # Wait 60 seconds before retrying
    task_max_retries=3,  # Maximum 3 retries

    # Task routing
    task_routes={
        "backend.tasks.run_crew_task": {
            "queue": "crew_jobs",
            "routing_key": "crew.jobs",
        },
    },

    # Queue definitions
    task_queues=(
        Queue(
            "crew_jobs",
            Exchange("crew", type="direct"),
            routing_key="crew.jobs",
            queue_arguments={"x-max-priority": 10},  # Enable priority queue
        ),
        Queue(
            "default",
            Exchange("default", type="direct"),
            routing_key="default",
        ),
    ),

    # Task priority settings
    task_default_priority=5,  # Default priority (0-10, higher is more important)

    # Monitoring
    worker_send_task_events=True,  # Send task events for monitoring
    task_send_sent_event=True,
    
    # Error handling
    task_ignore_result=False,  # Store results even for failed tasks
    task_store_errors_even_if_ignored=True,

    # Security (in production, consider message signing)
    # task_serializer='json' already set above

    # Beat schedule (for periodic tasks - optional for now)
    beat_schedule={
        # Example: Clean up old results every hour
        # "cleanup-old-results": {
        #     "task": "backend.tasks.cleanup_old_results",
        #     "schedule": 3600.0,  # Every hour
        # },
    },
)

# app.conf.update(
#     broker_use_ssl={
#         'ssl_cert_reqs': ssl.CERT_NONE  # Railway's Redis uses self-signed certs
#     },
#     redis_backend_use_ssl={
#         'ssl_cert_reqs': ssl.CERT_NONE
#     }
# )

# Task error handler
@app.task(bind=True)
def error_handler(self, uuid):
    """
    Error handler for failed tasks.
    This will be called when a task fails after all retries.
    """
    from backend.logging_config import get_logger
    logger = get_logger(__name__)

    result = self.app.AsyncResult(uuid)
    logger.error(
        f"Task {uuid} failed: {result.result}",
        exc_info=result.traceback
    )

# Configure task base class for automatic retry on common exceptions
class BaseTask(app.Task):
    """
    Base task class with automatic retry logic for common exceptions.
    """
    autoretry_for = (
        Exception,  # Retry on any exception (can be more specific)
    )
    retry_kwargs = {
        "max_retries": 3,
        "countdown": 60,  # Wait 60 seconds before retry
    }
    retry_backoff = True  # Exponential backoff
    retry_backoff_max = 600  # Max 10 minutes backoff
    retry_jitter = True  # Add random jitter to backoff

# Update default task class
app.Task = BaseTask


# Signal handler for when worker is ready
@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    """Called when the Celery worker is ready to accept tasks."""
    print("=" * 60, flush=True)
    print("🚀 CELERY WORKER STARTED ON RAILWAY", flush=True)
    print(f"   Worker: {sender}", flush=True)
    print(f"   Redis URL: {REDIS_URL[:30]}...", flush=True)
    print("=" * 60, flush=True)
    logger.info("🚀 CELERY WORKER STARTED ON RAILWAY")
    logger.info(f"Worker ready: {sender}")


if __name__ == "__main__":
    # For testing: Start a worker with
    # celery -A backend.celery_app worker --loglevel=info
    app.start()
