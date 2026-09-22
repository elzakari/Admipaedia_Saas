import structlog

from app.extensions import db
from app.models.dashboard import Notification
from app.models.parent import Parent
from app.models.student import Student

logger = structlog.get_logger()


class NotificationFanoutService:
    """Service to handle transactional notification fanout to class audiences."""

    @staticmethod
    def enqueue_class_fanout(
        class_id,
        title,
        message,
        notification_type="info",
    ):
        """
        Fail closed while Notification lacks durable tenant ownership.

        This lower-level guard prevents direct callers from bypassing
        the announcement fanout containment boundary.
        """
        logger.warning(
            "notification_fanout_suppressed_pending_tenant_ownership",
            class_id=class_id,
        )
        return False


def execute_durable_audience_fanout(class_id, title, message):
    """
    Fail closed while Notification lacks durable tenant ownership.

    Class announcements remain available, but persisted notification
    fanout is suppressed until notifications are tenant-owned.
    """
    logger.warning(
        "notification_fanout_suppressed_pending_tenant_ownership",
        class_id=class_id,
    )
    return False
