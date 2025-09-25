from .celery_app import celery_app  # type: ignore[import-untyped]
# import tasks
from .tasks import make_a_prompt
from celery.schedules import crontab   # type: ignore[import-untyped]


celery_app.conf.beat_schedule = {
    "make_a_prompt_task": {
        "task": "tasks_scheduling.tasks.make_a_prompt",
        "schedule": crontab(minute="*/5"),  # Run every 5 minutes
        "args": ("user",)  # Arguments to pass to the task
    }
}