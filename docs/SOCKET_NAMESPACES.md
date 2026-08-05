# Socket.IO Namespaces

## Overview
Real-time features use Socket.IO with dedicated namespaces for concerns.

**Authoritative Runtime (permanent, production hotfix → source of truth):**
- Flask-SocketIO `async_mode = threading` (explicit; NEVER auto-select eventlet just because the package is installed)
- Gunicorn worker for the socket-serving service: `--workers 1 --worker-class gthread --threads 16 --timeout 120 --graceful-timeout 30 --keepalive 5`
- `simple-websocket` package is required for polling-first → websocket upgrade path.
- Transport baseline: `transports: ['polling', 'websocket']`, `upgrade: true` (guarantees handshake through reverse proxies before native WebSocket is attempted)
- Horizontal scaling (future): multiple **single-worker** containers + sticky sessions + `SOCKETIO_MESSAGE_QUEUE=redis://...` Redis adapter. Never increase `--workers` inside one container instead of scaling containers.

## Namespaces
- `/dashboard`: administrative telemetry (counts, system_update event, refresh RPC) — see below for strict authorization.
- `/ws/teachers`: broadcasts create/update/delete events for teacher entities.
- `/ws/announcements`: streams announcements to role- or class-specific rooms.
- `/ws/notifications`: general notifications channel.

## `/dashboard` Namespace — Auth & Isolation Contract
The handler at `backend/app/websockets/dashboard_handler.py` enforces:

1. **Connect auth (strict)**:
   - `auth` must be a dict with a non-empty `token` (JWT access token).
   - JWT must decode correctly; expired/invalid/malformed → `ConnectionRefusedError`.
   - `sub` claim MUST be present, parseable as int user id; user row MUST exist and be active (not deleted, not disabled).
   - Role MUST be in the ADMIN_COMPATIBLE_ROLES set (centralized constant: `admin`, `school_admin`, `super_admin`, `superadmin`, `super_manager`). Any other role → unauthorized.
2. **Tenant isolation (server-derived or explicitly validated)**:
   - Platform-level roles (`super_admin`, `superadmin`, `super_manager`) may pass `tenant_id` to impersonate a tenant's telemetry view. If the id is syntactically invalid, the tenant row doesn't exist, or the tenant is *inactive* → connection is REJECTED (no silent fallback to global telemetry).
   - School-level roles derive `tenant_id` from server-side `TenantMembership` rows only. A browser-supplied tenant that differs from membership → cross-tenant access → REJECTED.
3. **Branch isolation**:
   - Branch id is always validated to exist, be active, and belong to the already-validated tenant.
   - User branch access is confirmed via `BranchMembership` rows; no cross-branch access.
4. **Trusted connection state**:
   - Connection is recorded into `_connected` registry **only after** every check above passes.
   - Registry stores only server-validated `{ user_id, role, tenant_id, branch_id, connected_at }`.
   - Registry access is guarded by `threading.Lock` (`_connections_lock`); snapshots are taken under lock before iteration.
5. **Telemetry emit scoping**:
   - `system_update` emits are per-SID via `socketio.emit(..., to=sid)`. No global broadcasts.
   - For tenant-scoped users, queries are filtered to the validated `tenant_id` and `branch_id`.
   - Global platform telemetry (all tenants, DB pool size etc.) is only reachable by platform roles with no explicit impersonation.
6. **Background task lifecycle**:
   - Exactly one background task per process, started via `socketio.start_background_task()` (never raw `threading.Thread`).
   - Task starts on first authorized client connect; stops when `len(_connected) == 0`; safely restarts on the next authorized connect.
   - Sleep uses `socketio.sleep(5)` (not `time.sleep`) to stay scheduler-aware.

## Client Integration (frontend)
- Use the centralized `WebSocketService` singleton (`frontend/src/services/websocketService.ts`) to manage one socket instance per namespace.
  - autoConnect: false — explicit `.connect()` call required.
  - reconnection: true (5 attempts, 1 s → 15 s exponential backoff, 20 s timeout).
  - `permanentlyDisconnected` flag blocks all reconnection attempts after `.disconnect()` (i.e. logout) until `.reconnect()` is explicitly called.
- Authenticate on connect via the `auth: (callback) => callback(buildSocketAuthPayload())` callback pattern so token refresh + tenant/branch changes re-read fresh context on every (re)handshake.
- Listeners are registered once per instance (`boundInternalListeners` guard) and cleared on destroy.
- `SocketContext` (`frontend/src/contexts/SocketContext.tsx`) mounts the service; it compares `storedTenantId` / `storedBranchId` on each render vs its `lastTenantRef` / `lastBranchRef` and calls `.reconnect()` on drift so the new scoped auth is re-sent. On role loss or logout it calls `.disconnect()`.

## Server Emission Patterns
- Services emit on successful mutations; avoid emitting on failed transactions.
- Use targeted rooms / per-SID for scoped updates to reduce broadcast volume.

## Reliability
- Enable bounded reconnection with backoff strategies on client (see above).
- Validate JWT + role + tenant + branch on connect; disconnect unauthenticated clients via `ConnectionRefusedError('unauthorized')`/return False.
- Emit only server-validated payloads. Never echo back browser-supplied `tenant_id` / `branch_id` without validation.

