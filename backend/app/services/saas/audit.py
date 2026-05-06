from app.extensions import db
from app.models.tenant import PlatformAuditLog


def audit(action: str, actor_id, tenant_id=None, resource_type=None, resource_id=None, details=None, ip_address=None):
    entry = PlatformAuditLog(
        tenant_id=tenant_id,
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address
    )
    db.session.add(entry)

