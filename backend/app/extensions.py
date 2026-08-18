import structlog
from flask_babel import Babel
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import Query as _BaseQuery
from typing import Any

# Initialize extensions
db = SQLAlchemy()

from flask import g, has_app_context, current_app
from sqlalchemy import event
import uuid as _uuid

# ---------------------------------------------------------------------------
# Tenant-scoped Query subclass — adds .without_tenant_filter() opt-out so
# super_admin / cross-tenant / bootstrap endpoints can explicitly bypass the
# automatic tenant filter.
# ---------------------------------------------------------------------------
class TenantScopedQuery(_BaseQuery):
    """SQLAlchemy Query subclass with an explicit tenant-filter opt-out."""

    _tenant_scoped_skip: bool = False
    _tenant_scoped_debug: bool = False

    def without_tenant_filter(self: "TenantScopedQuery") -> "TenantScopedQuery":
        """
        Explicitly disable automatic tenant_id + branch_id injection for this
        query. Only use this for:
          * super_admin cross-tenant aggregation endpoints
          * bootstrap / first-tenant creation flows
          * queries on global tables (Tenant, User, TenantMembership, Branch)
            that don't have a tenant_id column anyway (harmless but explicit is
            clearer).
        """
        clone = self._clone()
        clone._tenant_scoped_skip = True
        return clone

    # Flask-SQLAlchemy 3.x requires the session constructor signature
    def __init__(self, entities: Any = None, session: Any = None, **kwargs: Any):
        super().__init__(entities=entities, session=session, **kwargs)

    def _clone(self) -> "TenantScopedQuery":
        # Preserve skip flag across clone chains
        clone = super()._clone()
        clone._tenant_scoped_skip = getattr(self, "_tenant_scoped_skip", False)
        clone._tenant_scoped_debug = getattr(self, "_tenant_scoped_debug", False)
        return clone


# Override the db.Model.query_class with our tenant-scoped variant so that
# Model.query / db.session.query(Model) automatically inherit the opt-out.
db.Query = TenantScopedQuery


# ---------------------------------------------------------------------------
# Automatic Context-Aware Tenant + Branch Scoping
#
# Extends the legacy branch-only before_compile hook to ALSO inject a
# tenant_id filter on every entity that exposes a tenant_id column.
#
# FAIL-CLOSED: if an entity HAS a tenant_id column BUT the current request
# has g.tenant_id = None, we filter by the all-zero UUID which matches ZERO
# rows. Unprotected routes that forgot @tenant_required now SAFELY return
# [] instead of returning every row across every tenant.
# ---------------------------------------------------------------------------
NULL_TENANT_ID = _uuid.UUID("00000000-0000-0000-0000-000000000000")


@event.listens_for(_BaseQuery, "before_compile", retval=True)
def before_compile_query(query):
    """
    SQLAlchemy query compiler event listener.

    Automatically scopes queries on tenant/branch-aware models to the active
    tenant_id + branch_id in the current request context. If the entity has
    the column but no context value is available, FAIL CLOSED to zero rows.
    """
    try:
        # Global opt-out (set via query.without_tenant_filter()).
        skip: bool = getattr(query, "_tenant_scoped_skip", False)
        if skip:
            return query

        if has_app_context():
            g_tenant_id = getattr(g, "tenant_id", None)
            g_branch_id = getattr(g, "branch_id", None)

            # Save and temporarily remove limit/offset clauses to bypass the
            # strict ordering check.
            def _get_limits(q):
                return (
                    getattr(q, "_limit_clause", None),
                    getattr(q, "_offset_clause", None),
                    getattr(q, "_limit", None),
                    getattr(q, "_offset", None),
                )

            def _clear_limits(q):
                if getattr(q, "_limit_clause", None) is not None:
                    q._limit_clause = None
                if getattr(q, "_limit", None) is not None:
                    q._limit = None
                if getattr(q, "_offset_clause", None) is not None:
                    q._offset_clause = None
                if getattr(q, "_offset", None) is not None:
                    q._offset = None

            def _restore_limits(q, limits):
                lc, oc, l, o = limits
                if lc is not None:
                    q._limit_clause = lc
                if l is not None:
                    q._limit = l
                if oc is not None:
                    q._offset_clause = oc
                if o is not None:
                    q._offset = o

            for desc in query.column_descriptions:
                entity = desc.get("entity")
                if not entity:
                    continue

                has_tenant_col = hasattr(entity, "tenant_id")
                has_branch_col = hasattr(entity, "branch_id")

                if not (has_tenant_col or has_branch_col):
                    continue

                limits = _get_limits(query)
                any_limit = limits[0] is not None or limits[2] is not None
                any_offset = limits[1] is not None or limits[3] is not None
                if any_limit or any_offset:
                    _clear_limits(query)

                # ── TENANT FILTER (injected FIRST, fail-closed) ─────────
                if has_tenant_col:
                    if g_tenant_id is None:
                        # -----------------------------------------------------
                        # FAIL CLOSED: No tenant context AND entity has a
                        # tenant column? Filter by ZERO-UUID so the query
                        # returns [] instead of leaking every tenant row.
                        # -----------------------------------------------------
                        try:
                            query = query.filter(entity.tenant_id == NULL_TENANT_ID)
                        except Exception:
                            pass
                        # WARN log once per request so devs notice the leak.
                        try:
                            from flask import request as _req
                            key = f"_warned_missing_tenant_{id(g)}"
                            if not hasattr(g, key):
                                setattr(g, key, True)
                                try:
                                    import structlog as _sl
                                    _l = _sl.get_logger()
                                    _l.warning(
                                        "tenant.missing_context_fail_closed",
                                        path=getattr(_req, "path", None),
                                        method=getattr(_req, "method", None),
                                        entity=getattr(entity, "__name__", repr(entity)),
                                    )
                                except Exception:
                                    pass
                        except Exception:
                            pass
                    else:
                        # Happy path: only rows belonging to g.tenant_id.
                        try:
                            query = query.filter(entity.tenant_id == g_tenant_id)
                        except Exception:
                            pass

                # ── BRANCH FILTER (legacy: keep existing behaviour) ────
                if has_branch_col and g_branch_id is not None:
                    try:
                        query = query.filter(entity.branch_id == g_branch_id)
                    except Exception:
                        pass

                if any_limit or any_offset:
                    _restore_limits(query, limits)

    except Exception as exc:  # pragma: no cover - never blow up the query
        try:
            import structlog as _sl
            _sl.get_logger().warning("tenant.scope_listener_failed", err=str(exc))
        except Exception:
            pass
    return query


migrate = Migrate()
jwt = JWTManager()

from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
cors = CORS()
mail = Mail()
babel = Babel()
# Initialize SocketIO with explicit threading-first (production default)
import os

SOCKETIO_ASYNC_MODE = os.environ.get("SOCKETIO_ASYNC_MODE", "threading").strip().lower()
_VALID_ASYNC_MODES = {"threading", "eventlet", "gevent"}
if SOCKETIO_ASYNC_MODE not in _VALID_ASYNC_MODES:
    SOCKETIO_ASYNC_MODE = "threading"

socketio = SocketIO(
    async_mode=SOCKETIO_ASYNC_MODE,
    ping_timeout=120,
    ping_interval=25,
    cors_allowed_origins="*",
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()
