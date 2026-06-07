import structlog
from sqlalchemy import inspect, text
from app.extensions import db

logger = structlog.get_logger()

class SchemaGuard:
    """
    Schema Guard utility to detect database model drift and orphaned records.
    """

    @staticmethod
    def check_notifications_id_drift():
        """
        Detects if notifications.id has drifted from Integer to VARCHAR/String.
        Returns:
            bool: True if drift detected, False otherwise.
        """
        try:
            inspector = inspect(db.engine)
            columns = inspector.get_columns('notifications')
            for col in columns:
                if col['name'] == 'id':
                    col_type = str(col['type']).upper()
                    # If type contains VARCHAR, CHAR, TEXT, or similar non-integer types
                    if any(t in col_type for t in ('VARCHAR', 'CHAR', 'TEXT', 'UUID', 'STRING')):
                        logger.warning("schema_guard_notifications_id_drift_detected", actual_type=col_type)
                        return True
                    return False
        except Exception as e:
            logger.error("schema_guard_notifications_id_check_failed", error=str(e))
        return False

    @staticmethod
    def check_message_recipient_orphan_rows():
        """
        Detects if there are messages with recipient_id values that do not exist in users.id.
        Returns:
            list: List of orphaned message dicts, or empty list if none.
        """
        try:
            result = db.session.execute(text(
                "SELECT m.id, m.recipient_id FROM messages m "
                "LEFT JOIN users u ON m.recipient_id = u.id "
                "WHERE u.id IS NULL"
            )).fetchall()
            if result:
                orphans = [{"id": r[0], "recipient_id": r[1]} for r in result]
                logger.warning("schema_guard_message_recipient_orphans_detected", orphans_count=len(orphans))
                return orphans
        except Exception as e:
            logger.error("schema_guard_orphan_rows_check_failed", error=str(e))
        return []
