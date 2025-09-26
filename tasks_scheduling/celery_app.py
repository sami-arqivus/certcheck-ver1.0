from celery import Celery
from dotenv import load_dotenv
import os
import ssl

load_dotenv()  # Load environment variables from .env file


# Use environment variables for Redis connection
# For local development with SSH tunneling, set CELERY_BROKER_URL to use host.docker.internal:6379
# For production, use the AWS Valkey cluster directly
broker_url = os.getenv('CELERY_BROKER_URL', 'rediss://celery-admin:Celery_admin_12345@master.celery-mqb-disabled.crs459.use1.cache.amazonaws.com:6379/0?ssl_cert_reqs=required&ssl_ca_certs=/etc/ssl/certs/aws-global-bundle.pem&ssl_check_hostname=false')
result_backend = os.getenv('CELERY_RESULT_BACKEND', 'rediss://celery-admin:Celery_admin_12345@master.celery-mqb-disabled.crs459.use1.cache.amazonaws.com:6379/0?ssl_cert_reqs=required&ssl_ca_certs=/etc/ssl/certs/aws-global-bundle.pem&ssl_check_hostname=false')

# Debug: Print URLs (commented out for production)
# print(f"Celery Broker URL: {broker_url}")
# print(f"Celery Result Backend: {result_backend}")
celery_app = Celery(
    'tasks_scheduling',
    broker=broker_url,
    backend=result_backend,
    include=["tasks"]
)


# Optimize Celery settings
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    task_default_queue=os.getenv('CELERY_TASK_DEFAULT_QUEUE', 'default'),
    worker_prefetch_multiplier=int(os.getenv('CELERY_PREFETCH_MULTIPLIER', '1')),
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=3600,
    timezone=os.getenv('CELERY_TIMEZONE', 'UTC'),
    enable_utc=True,
    broker_pool_limit=int(os.getenv('CELERY_BROKER_POOL_LIMIT', '10')),
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
    beat_schedule_filename='/app/celerybeat-schedule',
    worker_send_task_events=True,  # Enables task events
    task_send_sent_event=True,  # Enables sent events
    task_track_started=True,  # Optional: Tracks when tasks start
    result_extended=True,
    worker_concurrency=int(os.getenv('CELERY_WORKER_CONCURRENCY', '5')),  # New: Default to 5 concurrent greenlets; override via env for 10+
    worker_max_tasks_per_child=int(os.getenv('CELERY_MAX_TASKS_PER_CHILD', '10')),  # New: Restart child workers after 100 tasks to prevent memory leaks in long-running scrapers
    broker_heartbeat=60,
)

celery_app.conf.beat_schedule = {
    'cleanup-stale-keys-every-10-minutes': {
        'task': 'tasks.cleanup_stale_task_keys',
        'schedule': 1200,  # Run every 20 minutes
    },
}