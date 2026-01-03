web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT 2>&1
worker: PYTHONUNBUFFERED=1 celery -A backend.celery_app worker --loglevel=info --queues=crew_jobs,default --concurrency=2 2>&1