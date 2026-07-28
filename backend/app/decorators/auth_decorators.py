from app.utils.rbac_decorators import require_permission
from app.utils.rbac_decorators import require_role as role_required

__all__ = ["role_required", "require_permission"]
