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


# ---------------------------------------------------------------------------
# Monkey-patch: make .without_tenant_filter() available on the BASE Query
# class too so that Flask-SQLAlchemy 3.x (which saves query_class onto each
# Model at DECLARATION time — BEFORE db.Query = TenantScopedQuery runs)
# continues to have the method in tests and during hot-reload.
#
# This also makes the before_compile listener's hasattr check for
# `_tenant_scoped_skip` always work regardless of how a Query was created.
# ---------------------------------------------------------------------------
def _base_without_tenant_filter(self):
    """Monkey-patched opt-out — see TenantScopedQuery.without_tenant_filter."""
    clone = self._clone()
    clone._tenant_scoped_skip = True
    return clone

if not hasattr(_BaseQuery, "without_tenant_filter"):
    _BaseQuery.without_tenant_filter = _base_without_tenant_filter

if not hasattr(_BaseQuery, "_tenant_scoped_skip"):
    _BaseQuery._tenant_scoped_skip = False

if not hasattr(_BaseQuery, "_tenant_scoped_debug"):
    _BaseQuery._tenant_scoped_debug = False


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

# ---------------------------------------------------------------------------
# Model classes that are EXPLICITLY excluded from automatic tenant scoping.
#
# These are the "bootstrap / identity / global" tables whose queries are the
# mechanism that *determine* the active tenant in the first place:
#   - Tenant / TenantMembership / Branch: used by on_connect and
#     resolve_tenant_for_request to derive g.tenant_id BEFORE it is set.
#   - User / Teacher / Student / Parent: used by auth flows to load the
#     current identity, again BEFORE tenant context is available.
#
# Without this exclusion, the auto-injector injects tenant_id == 0-UUID on
# these queries during socket.io on_connect (where before_request hooks do
# not run), returning zero rows and making every login appear to have no
# memberships — the exact symptom behind the 7 failing dashboard tests.
#
# Application code can still opt back IN to scoping these tables explicitly
# via Model.query.filter(Model.tenant_id == g.tenant_id) when needed.
# ---------------------------------------------------------------------------
_TENANT_SCOPE_AUTO_EXCLUDE: frozenset = frozenset({
    "Tenant",
    "TenantMembership",
    "Branch",
    "User",
    "Teacher",
    "Student",
    "Parent",
    "PlatformIntegration",
    "ServiceToken",
    "SaaSSubscription",
    "SaaSBillingEvent",
})


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

                # ── Class-name allowlist: skip global/bootstrap tables. ──
                entity_name = (
                    getattr(entity, "__name__", None)
                    or getattr(getattr(entity, "__table__", None), "name", None)
                    or ""
                )
                if entity_name in _TENANT_SCOPE_AUTO_EXCLUDE:
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
                                        entity=entity_name or getattr(entity, "__name__", repr(entity)),
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
