from celery import Celery
from celery.schedules import crontab
from app.config import Config

def create_celery_app(app=None):
    celery = Celery(
        'admipaedia',
        broker=Config.REDIS_URL,
        backend=Config.REDIS_URL,
        include=['app.tasks.notifications']
    )
    
    # Configure Celery
    celery.conf.update(
        result_expires=3600,  # Results expire after 1 hour
        worker_hijack_root_logger=False,  # Don't hijack the root logger
        worker_prefetch_multiplier=1,  # Prefetch one task at a time
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
    )
    
    # Configure periodic tasks
    celery.conf.beat_schedule = {
        'generate-attendance-notifications-daily': {
            'task': 'app.tasks.notifications.generate_attendance_notifications',
            'schedule': crontab(hour=8, minute=0),  # Run daily at 8:00 AM
            'options': {'expires': 3600}
        },
        'generate-grade-notifications-hourly': {
            'task': 'app.tasks.notifications.generate_grade_notifications',
            'schedule': crontab(minute=0),  # Run hourly at minute 0
            'options': {'expires': 3600}
        },
    }
    
    # If we have an app context, use it
    if app:
        class ContextTask(celery.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)
        
        celery.Task = ContextTask
    
    return celery

# Create the Celery app
celery_app = create_celery_app()