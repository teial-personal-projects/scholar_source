"""
FastAPI Backend

Main FastAPI application for ScholarSource web interface.
Handles job submission and status polling.
"""

import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.models import (
    CourseInputRequest,
    JobSubmitResponse,
    JobStatusResponse,
    HealthResponse
)
from backend.jobs import create_job, get_job
from backend.crew_runner import run_crew_async, validate_crew_inputs
from backend.logging_config import configure_logging, get_logger

# Configure centralized logging (console only, no log file)
configure_logging(
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    log_file=None,
    console_output=True
)

# Get logger for this module
logger = get_logger(__name__)
logger.info("Starting ScholarSource API...")

# Initialize FastAPI app
app = FastAPI(
    title="ScholarSource API",
    description="Backend API for discovering educational resources aligned with course textbooks",
    version="0.1.0"
)

# CORS configuration - allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Vite dev server (legacy port)
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Standard Vite port
        "http://127.0.0.1:5173",
        "https://scholar-source.pages.dev",  # Cloudflare Pages
        # Add custom domain when configured:
        # "https://yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # OPTIONS required for CORS preflight
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information"""
    return {
        "message": "ScholarSource API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns API status and database connectivity.
    """
    # Simplified health check for Railway startup
    # Database check can cause timeout during container startup
    return {
        "status": "healthy",
        "version": "0.1.0",
        "database": "skipped"
    }


@app.post("/api/submit", response_model=JobSubmitResponse, tags=["Jobs"])
async def submit_job(request: CourseInputRequest):
    """
    Submit a new job to find educational resources.

    Validates inputs, creates a background job, and returns a job_id
    for status polling.

    Args:
        request: Course input parameters (at least one field required)

    Returns:
        JobSubmitResponse: Job ID and status

    Raises:
        HTTPException: If inputs are invalid or job creation fails
    """
    # Convert request to dict
    inputs = request.model_dump()

    # Validate that at least one input is provided
    if not validate_crew_inputs(inputs):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid inputs",
                "message": "You must provide at least one of the following: "
                          "course information (course_name, university_name, or course_url), "
                          "book information (book_title + book_author, or ISBN), "
                          "book file (book_pdf_path), or book URL (book_url)"
            }
        )

    try:
        # Extract force_refresh from inputs (don't store in job inputs)
        force_refresh = inputs.pop('force_refresh', False)

        logger.info(f"Creating new job with inputs: {inputs}")

        # Create job in database
        job_id = create_job(inputs)
        logger.info(f"Job created with ID: {job_id}")

        # Start background crew execution (pass force_refresh separately)
        run_crew_async(job_id, inputs, force_refresh=force_refresh)

        return {
            "job_id": job_id,
            "status": "pending",
            "message": "Job created successfully. Use job_id to poll for status."
        }

    except Exception as e:
        logger.error(f"Job creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Job creation failed",
                "message": str(e)
            }
        )


@app.get("/api/status/{job_id}", response_model=JobStatusResponse, tags=["Jobs"])
async def get_job_status(job_id: str):
    """
    Get the current status of a job.

    Poll this endpoint to check job progress and retrieve results
    when the job completes.

    Args:
        job_id: UUID of the job

    Returns:
        JobStatusResponse: Current job status and results (if completed)

    Raises:
        HTTPException: If job is not found
    """
    job = get_job(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Job not found",
                "message": f"No job found with ID: {job_id}"
            }
        )

    # Extract relevant input fields for display
    inputs = job.get("inputs", {})
    
    return {
        "job_id": job["id"],
        "status": job["status"],
        "status_message": job.get("status_message"),
        "search_title": job.get("search_title"),
        "results": job.get("results"),
        "raw_output": job.get("raw_output"),
        "error": job.get("error"),
        "metadata": job.get("metadata"),
        "course_name": inputs.get("course_name") or None,
        "book_title": inputs.get("book_title") or None,
        "book_author": inputs.get("book_author") or None,
        "created_at": job["created_at"],
        "completed_at": job.get("completed_at")
    }


@app.post("/api/cancel/{job_id}", tags=["Jobs"])
async def cancel_job(job_id: str):
    """
    Cancel a running or pending job.

    Note: CrewAI jobs cannot be forcefully terminated mid-execution.
    This endpoint marks the job as cancelled in the database. If the job
    is still running, it will complete but the results will be marked as cancelled.

    Args:
        job_id: UUID of the job to cancel

    Returns:
        dict: Cancellation confirmation

    Raises:
        HTTPException: If job is not found or cannot be cancelled
    """
    job = get_job(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Job not found",
                "message": f"No job found with ID: {job_id}"
            }
        )

    current_status = job.get("status")

    # Can only cancel pending or running jobs
    if current_status in ["completed", "failed", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Cannot cancel job",
                "message": f"Job is already {current_status}"
            }
        )

    # Attempt to cancel the running crew task
    try:
        from backend.crew_runner import cancel_crew_job
        from backend.jobs import update_job_status

        # Try to cancel the async task
        task_cancelled = cancel_crew_job(job_id)

        # Mark job as cancelled in database
        update_job_status(
            job_id,
            status="cancelled",
            status_message="Job cancelled by user",
            error="Job was cancelled before completion"
        )

        if task_cancelled:
            message = "Job cancelled successfully. The crew execution has been stopped."
        else:
            message = "Job marked as cancelled. The crew task was not actively running."

        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": message
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Cancellation failed",
                "message": str(e)
            }
        )


# Development server command:
# uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
