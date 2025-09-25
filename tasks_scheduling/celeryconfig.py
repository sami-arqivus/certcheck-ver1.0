import ssl

# Broker and backend URLs (use host.docker.internal for local SSH tunnel)
broker_url = 'rediss://celery-admin:Celery_admin_12345@host.docker.internal:6379/0'
result_backend = 'rediss://celery-admin:Celery_admin_12345@host.docker.internal:6379/0'

# SSL configuration for broker (disables hostname check)
broker_use_ssl = {
    'ca_certs': '/etc/ssl/certs/aws-global-bundle.pem',
    'cert_reqs': ssl.CERT_REQUIRED,
    'check_hostname': False
}

# SSL configuration for result backend (disables hostname check)
redis_backend_use_ssl = {
    'ca_certs': '/etc/ssl/certs/aws-global-bundle.pem',
    'cert_reqs': ssl.CERT_REQUIRED,
    'check_hostname': False
}

# Other Celery settings (match your existing config)
task_serializer = 'json'
accept_content = ['json']
result_serializer = 'json'
task_default_queue = 'default'
worker_prefetch_multiplier = 1
task_acks_late = True
task_reject_on_worker_lost = True
result_expires = 3600
timezone = 'UTC'
enable_utc = True
broker_pool_limit = 1
broker_connection_retry_on_startup = True
broker_connection_max_retries = 10
beat_schedule_filename = '/app/celerybeat-schedule'
worker_send_task_events = True
task_send_sent_event = True
task_track_started = True
result_extended = True