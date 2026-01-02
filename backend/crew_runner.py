"""
CrewAI Runner

Runs the ScholarSource crew using Celery task queue for distributed job processing.
Replaces the old threading-based approach with a scalable queue-based architecture.
"""

import sys
from pathlib import Path
from typing import Dict, Optional

# Add src to path to import ScholarSource
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from backend.jobs import update_job_status, get_job
from backend.logging_config import get_logger

# Get logger for this module
logger = get_logger(__name__)


def run_crew_async(job_id: str, inputs: Dict[str, str], bypass_cache: bool = False) -> str:
    """
    Enqueue a ScholarSource crew job to the Celery task queue.

    This function replaces the old threading-based approach with Celery task queue.
    The actual job execution happens in a separate worker process via the run_crew_task Celery task.

    This function:
    1. Validates the job exists and is in pending status
    2. Enqueues the job to Celery task queue
    3. Updates job metadata with Celery task ID
    4. Returns the Celery task ID for tracking

    Args:
        job_id: UUID of the job to run
        inputs: Dictionary of course input parameters
        bypass_cache: If True, bypass cache and get fresh results

    Returns:
        str: Celery task ID for the enqueued task

    Raises:
        ValueError: If job doesn't exist or is not in pending status
    """
    # Import here to avoid circular dependency
    from backend.tasks import run_crew_task

    # Verify job exists and is in correct status
    job = get_job(job_id)
    if not job:
        raise ValueError(f"Job {job_id} does not exist")

    job_status = job.get("status")
    if job_status not in ["pending", "queued"]:
        logger.warning(
            f"Job {job_id} is in status '{job_status}', expected 'pending' or 'queued'. "
            f"Proceeding with enqueue anyway."
        )

    # Enqueue the task to Celery
    logger.info(f"Enqueueing job {job_id} to Celery task queue")
    celery_result = run_crew_task.apply_async(
        args=[job_id, inputs, bypass_cache],
        task_id=None,  # Let Celery generate task ID
        queue="crew_jobs",  # Use the crew_jobs queue
        priority=5,  # Default priority (can be adjusted based on user tier, etc.)
    )

    celery_task_id = celery_result.id
    logger.info(f"Job {job_id} enqueued with Celery task ID: {celery_task_id}")

    # Update job status to queued with task ID
    update_job_status(
        job_id,
        status="queued",
        status_message="Job queued for processing",
        metadata={
            "celery_task_id": celery_task_id,
            "bypass_cache": bypass_cache
        }
    )

    return celery_task_id


def cancel_crew_job(job_id: str) -> bool:
    """
    Cancel an active crew job by revoking its Celery task.

    This function:
    1. Retrieves the job and its Celery task ID from the database
    2. Revokes the Celery task (terminates if running, removes if queued)
    3. Updates the job status to 'cancelled'

    Args:
        job_id: UUID of the job to cancel

    Returns:
        bool: True if task was found and revoked, False otherwise
    """
    from backend.celery_app import app

    # Get the job to find the Celery task ID
    job = get_job(job_id)
    if not job:
        logger.warning(f"Cannot cancel job {job_id}: Job not found")
        return False

    # Get Celery task ID from job metadata
    metadata = job.get("metadata", {})
    celery_task_id = metadata.get("celery_task_id")

    if not celery_task_id:
        logger.warning(f"Cannot cancel job {job_id}: No Celery task ID found in metadata")
        # Still update job status to cancelled for consistency
        update_job_status(
            job_id,
            status="cancelled",
            status_message="Job cancelled by user",
            error="Job was cancelled (no active task found)"
        )
        return False

    # Revoke the Celery task
    # terminate=True will kill the worker processing the task (if it's running)
    # signal='SIGTERM' is a graceful termination signal
    logger.info(f"Revoking Celery task {celery_task_id} for job {job_id}")
    app.control.revoke(celery_task_id, terminate=True, signal='SIGTERM')

    # Update job status to cancelled
    update_job_status(
        job_id,
        status="cancelled",
        status_message="Job cancelled by user",
        error="Job was cancelled before completion"
    )

    logger.info(f"Successfully cancelled job {job_id} (Celery task: {celery_task_id})")
    return True


def validate_crew_inputs(inputs: Dict[str, str]) -> bool:
    """
    Validate that crew inputs meet minimum requirements.

    At least one of the following must be provided:
    - (course_name OR university_name) OR course_url
    - (book_title AND book_author) OR isbn
    - book_pdf_path
    - book_url

    Args:
        inputs: Dictionary of course inputs

    Returns:
        bool: True if inputs are valid, False otherwise
    """
    # Check for course information
    has_course_info = bool(
        inputs.get('course_name') or
        inputs.get('university_name') or
        inputs.get('course_url')
    )

    # Check for book identification
    has_book_info = bool(
        (inputs.get('book_title') and inputs.get('book_author')) or
        inputs.get('isbn')
    )

    # Check for book file or link
    has_book_file = bool(inputs.get('book_pdf_path'))
    has_book_link = bool(inputs.get('book_url'))

    # At least one combination must be satisfied
    return has_course_info or has_book_info or has_book_file or has_book_link
