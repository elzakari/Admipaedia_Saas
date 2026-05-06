# ADMIPAEDIA School Management System - Backend

## Running the Application

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Set up environment variables in `.env` file

3. Run the Flask application:
   ```
   flask run
   ```

## Running Background Tasks

The application uses Celery for background tasks such as generating notifications. You need to run both the Celery worker and beat scheduler:

1. Start Redis (required for Celery):
   ```
   redis-server
   ```

2. Start the Celery worker:
   ```
   python celery_worker.py
   ```

3. Start the Celery beat scheduler:
   ```
   python celery_beat.py
   ```

## Scheduled Tasks

The following tasks are scheduled to run automatically:

- `generate_attendance_notifications`: Runs daily at 8:00 AM to notify parents of absent students
- `generate_grade_notifications`: Runs hourly to notify students and parents of new grades

## Manual Task Execution

You can manually trigger tasks for testing:

```python
from app.tasks.notifications import generate_attendance_notifications, generate_grade_notifications

# Run attendance notifications task
generate_attendance_notifications.delay()

# Run grade notifications task
generate_grade_notifications.delay()
```