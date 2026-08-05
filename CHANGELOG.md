# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Security (High Priority: Socket.IO Multi-Tenant Auth & Isolation)
- **Permanent fix for the production websocket upgrade `AttributeError: 'Response' object has no attribute 'status_code'` incident**: Flask-SocketIO `async_mode` is now **explicitly** `threading` by default (`backend/app/extensions.py`). Eventlet/gevent are never auto-selected merely because the package is installed; only `threading|eventlet|gevent` are whitelisted, anything else (or unset) → `threading`.
- **`/dashboard` namespace hardened**: `backend/app/websockets/dashboard_handler.py` now rejects unauthenticated, missing-token, invalid/expired/malformed-JWT, missing-sub, malformed-sub, nonexistent-user, inactive-user, disabled-user, and unauthorized-role connections before any connection state is recorded or any background telemetry is started. Uses centralized `ADMIN_COMPATIBLE_ROLES` (admin/school_admin/super_admin/superadmin/super_manager). Unauthorized role is never logged-in but always rejected.
- **Tenant isolation for `/dashboard` connections**:
  - School-level roles derive tenant_id **only** from server-side `TenantMembership` rows. Cross-tenant browser-supplied ids are rejected (no silent fallback).
  - Platform roles (super_admin/superadmin/super_manager) can impersonate a tenant id; syntactically invalid/nonexistent/inactive tenant ids are now **rejected** instead of silently falling back to global telemetry view.
- **Branch isolation for `/dashboard` connections**: branch id validated to exist, active, owned by validated tenant, and the user's `BranchMembership` grants access. Rejects invalid_branch / nonexistent_branch / inactive_branch / branch_outside_tenant / branch_without_tenant.
- **Connection registry & concurrency safety**: `_connected` dict is now guarded by `threading.Lock`; snapshots are taken under the lock before emit loops; active_connections count is now derived from `len(_connected)` under lock (never negative, never out-of-sync). Background task exactly one per process, started with `socketio.start_background_task`, sleeps via `socketio.sleep(5)` instead of `time.sleep`, stops cleanly when 0 authorized clients remain, and restarts safely.
- **Telemetry scoping**: `system_update` emits are per-SID (`socketio.emit(..., to=sid)`) not broadcast; tenant- and branch-scoped users only see their validated server-side scope data.
- **Structured logging**: handler uses structlog with 24 safe reason codes (`missing_sid..dashboard_background_task_stopped`). Tokens, passwords, cookies, secrets and PII are never logged.
- **Backend role constant**: centralized `ADMIN_COMPATIBLE_ROLES` set includes the backward-compatible `superadmin` (no underscore) alias so existing tokens still authenticate.

### Fixed — Production Runtime (Socket.IO, Gunicorn, Dependencies)
- **Gunicorn `backend-socket` service authoritative config** (in `docker-compose.prod.yml` + `backend/Dockerfile.prod` + `backend/.env.example`):
  `--workers 1 --worker-class gthread --threads 16 --timeout 120 --graceful-timeout 30 --keepalive 5 --max-requests 1000 --max-requests-jitter 100`. Overridable via `GUNICORN_WORKERS / GUNICORN_THREADS / GUNICORN_TIMEOUT`. Documented why 1 worker is mandatory in current architecture (in-process connection registry, single background telemetry task, no cross-worker Engine.IO session sharing without Redis Adapter + sticky sessions).
- Added **`simple-websocket==1.0.0`** as an explicit backend production dependency so polling-first → websocket upgrade works with `threading` async mode. Eventlet and gevent remain in requirements.txt annotated as *removable technical debt: unused after this repair — do not re-enable as default async mode* (they are not removed blindly to avoid breaking any future experimental path, but will never be selected).
- REST-only `backend-api` compose service explicitly sets `SOCKETIO_ASYNC_MODE=disabled` so it never advertises Engine.IO endpoints.
- `docker compose -f docker-compose.prod.yml config` renders expected env values; emergency override compose file is no longer necessary post-deploy.

### Fixed — Frontend WebSocket Service & Context
- `frontend/src/services/websocketService.ts`: singleton per namespace; corrected `reconnection: true` with bounded `reconnectionAttempts:5, reconnectionDelay:1000, reconnectionDelayMax:15000, timeout:20000, autoConnect:false` (old `reconnection:false` + `reconnectionAttempts:10` was internally inconsistent). Transport order `['polling','websocket']` + `upgrade:true` (matches production hotfix that successfully returned HTTP 101 upgrade). Connect auth uses callback `(cb) => cb(buildSocketAuthPayload())` so token refresh / tenant-switch / branch-switch re-read context on every (re)handshake. New `permanentlyDisconnected` flag suppresses reconnect storms after explicit logout/disconnect until `.reconnect()` is explicitly called. `boundInternalListeners` guard prevents duplicate listener registration.
- `frontend/src/contexts/SocketContext.tsx`: now correctly reads `storedTenantId/storedBranchId` at render time and includes them in effect dependencies so tenant/branch changes (without user.role change) still trigger reconnect. Initial mount no longer mis-fires `.reconnect()` instead of `.connect()` (uses `mountedOnceRef` + explicit "did stored context actually change from a previously-known value" check). Backward-compatible `'superadmin'` alias added to dashboard role set. Exposes `reconnectDashboard()` helper on context.
- Removed ALL temporary debug instrumentation strings from ALL source & generated bundles:
  `127.0.0.1:7777 | localhost:7777 | timetable-socket-timeout | runId:"pre-fix" | #region debug-point` (files: `backend/app/services/timetable/service.py`, `frontend/src/services/timetableService.ts`, `frontend/src/services/websocketService.ts`, `frontend/src/components/academics/TimeSlotFormModal.tsx`; deleted local-only markdown/env artifacts: `debug-timetable-socket-timeout.md`, `.dbg/timetable-socket-timeout.env`). Post-build grep scan confirms zero matches in `frontend/dist`.

### Tests (Added)
- Backend: `backend/tests/unit/test_dashboard_namespace_auth.py` — **31 passing tests** covering every auth rejection category, user-state rejections (inactive/disabled/nonexistent), tenant isolation (platform invalid impersonation, cross-tenant access, no membership), branch isolation (invalid branch, branch outside tenant, inactive tenant, missing membership), connection registry (unknown sid disconnect safe, count never negative, max 1 entry per sid), background task (starts once, singleton across two consecutive connects). Combined with existing `test_message_websocket_auth.py` → **33 socket-related unit tests passing**.
- Frontend socket service tests (`frontend/src/services/__tests__/websocketService.test.ts`): 10 passing — singleton, namespace/path/transport config, token callback without console leakage, bounded reconnect policy, explicit disconnect suppresses reconnect, one-time listener binding, connect_error status, skip-connect-when-no-payload, fresh-auth-per-handshake.
- Frontend SocketContext tests (`frontend/src/contexts/SocketContext.test.tsx`): 7 passing — superadmin alias connect, all 5 dashboard roles connect, student/teacher/parent no connect + disconnect called, logout disconnects dashboard+chat, tenant-change triggers reconnect, branch-change triggers reconnect, unchanged context does not reconnect, unchanged rerender does not trigger reconnect.

### Docs (Updated)
- `backend/.env.example`: added `SOCKETIO_*` and `GUNICORN_*` sections with 1-worker rationale + sticky-sessions/Redis adapter scaling guidance.
- `docs/ENV_Configuration.md`: new section **Socket.IO / Realtime Runtime** enumerates SOCKETIO_ASYNC_MODE, GUNICORN_* vars, reasoning, and future horizontal scaling recipe.
- `docs/SOCKET_NAMESPACES.md`: authoritative runtime section (threading default, gunicorn worker config, transports), added `/dashboard` to namespaces list, detailed `/dashboard` Auth & Isolation Contract (11-item list: JWT gates, role whitelist, tenant/branch rules, trusted-state registry, scoped emit rules, background task lifecycle), updated Client Integration describing `WebSocketService`, reconnect policy, auth callback pattern, `SocketContext` tenant/branch driven reconnect, and Reliability section.

### Security
- Enforced resource-specific RBAC permissions on critical endpoints:
  - Attendance: create, update, delete, bulk (`backend/app/api/v1/attendances/routes.py`)
  - Students: create, update, delete, assign-class, link-parent (`backend/app/api/v1/students/routes.py`)
  - Messages: read, create, update, delete, attachments (`backend/app/api/v1/messages/routes.py`)
  - Grades: read, create (calculate-final, bulk, import/export) (`backend/app/api/v1/grades/routes.py`)
- Security middleware compatibility updates:
  - Rate limiter burst and blocking semantics aligned with tests
  - CSRF decorators guard against missing request context and mocked sessions
  - Input sanitization helpers: sanitize_html, validate_input, escape_user_input, sanitize_nested_data
  - Security headers decorator ensures Response headers for strings/tuples

### Docs
- Expanded API documentation with schemas for Students, Attendances, and Messages (`docs/api_documentation.md`)
- Added Competencies section with endpoints, schemas, and error envelopes (`docs/api_documentation.md`)
- Added RBAC coverage audit and proposals (`docs/RBAC_Audit.md`)
- Added Migrations Guide with validation checklist (`docs/Migrations_Guide.md`)
- Added Environment Configuration guide (`docs/ENV_Configuration.md`)
- Added Sprint Tracking and QA Verification documents (`docs/Sprint_Tracking.md`, `docs/QA_Verification.md`)

## [v2.0.0] - 2024-12-19

### Added - Comprehensive Roadmap Implementation
- **NEW ROADMAP v2.0**: Complete project roadmap with detailed phases, tasks, and timelines
- **Real-time Progress Tracking**: Live status updates for all development tasks
- **Detailed Task Breakdown**: Comprehensive task descriptions with estimated hours and dependencies
- **Phase-based Development**: Structured approach across 4 major phases
- **Clear Version Control**: Systematic documentation of all changes and updates

**Estimated Hours**: 120 hours total across all phases
**Status**: COMPLETED ✅

### Fixed - Critical Path Tasks

#### 1. Teacher Name Display Fix
- **Issue**: Inconsistent teacher name formatting across components
- **Solution**: Standardized `formatTeacherName` function with proper fallback logic
- **Files Updated**: 
  - `frontend/src/pages/teachers/components/TeachersList.tsx`
  - `frontend/src/pages/teachers/components/TeacherProfile.tsx`
- **Logic**: Prioritizes `full_name` → `firstName`/`lastName` → `first_name`/`last_name` → 'Unknown Teacher'
- **Estimated Hours**: 4 hours
- **Status**: COMPLETED ✅

#### 2. API Response Standardization
- **Issue**: Inconsistent API response formats causing 308 redirects and data handling issues
- **Solution**: Implemented comprehensive `ApiResponseStandardizer` class
- **Features**:
  - Standardized single and paginated response formats
  - Consistent error handling across all services
  - Fixed 308 redirect issues in `teacherService.ts`
  - Enhanced response validation and transformation
- **Files Created**: 
  - `frontend/src/lib/apiResponseStandardizer.ts`
- **Files Updated**: 
  - `frontend/src/services/teacherService.ts`
- **Estimated Hours**: 8 hours
- **Status**: COMPLETED ✅

#### 3. TypeScript Interface Alignment
- **Issue**: Interface mismatches between services and standardized API responses
- **Solution**: Comprehensive TypeScript interface standardization
- **Features**:
  - Updated main types index with standardized interfaces
  - Aligned all service files with `StandardApiResponse` and `StandardPaginatedResponse`
  - Maintained backward compatibility with legacy interfaces
  - Enhanced type safety across the application
- **Files Updated**:
  - `frontend/src/types/index.ts`
  - `frontend/src/services/classService.ts`
  - `frontend/src/services/studentService.ts`
  - `frontend/src/services/communicationService.ts`
  - `frontend/src/services/assignmentService.ts`
- **Estimated Hours**: 6 hours
- **Status**: COMPLETED ✅

## Previous Entries

### [v1.8.0] - 2024-12-18

### Fixed
- Fixed TypeScript errors in multiple components
- Corrected incorrect import in `teacherService.ts` causing 308 redirect errors when fetching teacher data
- Resolved interface mismatches in teacher-related components

### Added
- **Announcement Broadcasting System**: Complete system for creating and managing school-wide announcements
  - Admin dashboard for announcement management
  - Real-time broadcasting to all user types (students, teachers, parents)
  - Priority levels and expiration dates
  - Target audience selection
  - Rich text editor support

- **New UI Components**: Enhanced user interface components
  - Modern card layouts with improved spacing
  - Responsive grid systems
  - Enhanced form controls with validation
  - Loading states and error handling
  - Accessibility improvements

- **Dark/Light Theme Support**: Complete theming system
  - Toggle between dark and light modes
  - Persistent theme preferences
  - Smooth transitions between themes
  - Consistent color schemes across all components

- **Parent Dashboard with Real-time Data**: Comprehensive parent portal
  - Real-time student performance tracking
  - Live attendance monitoring
  - Assignment and exam notifications
  - Communication with teachers
  - Fee payment status and history

- **Parent-Teacher Messaging System**: Direct communication platform
  - Real-time messaging between parents and teachers
  - File attachment support
  - Message history and search
  - Notification system for new messages
  - Group messaging for class-wide communications

### Enhanced
- Improved error handling across all API services
- Better loading states and user feedback
- Enhanced responsive design for mobile devices
- Optimized performance for large datasets
