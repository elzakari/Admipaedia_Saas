from app.celery_app import celery_app
from app.services.announcement_service import AnnouncementService
import structlog

logger = structlog.get_logger()

@celery_app.task
def publish_scheduled_announcements():
    """Publish scheduled announcements whose scheduled date has passed."""
    try:
        count = AnnouncementService.publish_scheduled_announcements()
        logger.info(f"Published {count} scheduled announcements")
        return count
    except Exception as e:
        logger.error("Failed to publish scheduled announcements", error=str(e))
        return 0