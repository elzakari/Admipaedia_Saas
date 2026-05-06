# RBAC Coverage Audit (Sprint)

## Scope
Sensitive endpoints audited: Attendances, Students, Grades, Messages. The goal is to validate decorator coverage and propose consistent permission checks.

## Attendances (`backend/app/api/v1/attendances/routes.py`)
- GET `/` (lines 18–60): `@require_permission('attendance.read')` — covered
- GET `/{id}` (lines 62–75): `@require_permission('attendance.read')` — covered
- POST `/` (lines 77–101): `@jwt_required()` + `@teacher_required` — proposal: add `@require_permission('attendance.create')`
- PUT `/{id}` (lines 102–126): `@jwt_required()` + `@teacher_required` — proposal: add `@require_permission('attendance.update')`
- DELETE `/{id}` (lines 127–140): `@admin_required` — proposal: add `@require_permission('attendance.delete')`
- POST `/bulk` (lines 142–169): `@jwt_required()` + `@teacher_required` — proposal: add `@require_permission('attendance.create')`

## Students (routes path: `backend/app/api/v1/students/routes.py`)
- Verify presence of `@require_permission('student.read')` for GETs, `student.create` for POST, `student.update` for PUT, `student.delete` for DELETE.
- Proposal: align all CRUD operations to resource-specific permissions and role checks consistently.

## Grades (routes path: `backend/app/api/v1/grades/routes.py`)
- Proposal: ensure `grade.read`, `grade.create`, `grade.update`, `grade.delete` are enforced on relevant endpoints and that department/role scopes are respected.

## Messages (routes path: `backend/app/api/v1/messages/routes.py`)
- Proposal: enforce `message.read` on list/detail, `message.create` on POST, `message.delete` on DELETE, with role-based access for senders/recipients.

## Standardized Response Envelope
- Ensure `{success, message, data}` or `{success, errors}` response envelopes are used consistently across audited endpoints.

## Recommendations
1. Add resource-specific `require_permission` decorators to all modifying operations (POST/PUT/DELETE).
2. Maintain `teacher_required`/`admin_required` where role-tier checks are essential, in addition to permission checks.
3. Centralize error/response formatting using shared helpers.
4. Document permission taxonomy in `backend/docs/RBAC_SYSTEM.md` and keep aligned with service logic.

## References
- Attendances: `backend/app/api/v1/attendances/routes.py:18–169`
- RBAC docs: `backend/docs/RBAC_SYSTEM.md`
- Services: `backend/app/services/rbac_service.py`
