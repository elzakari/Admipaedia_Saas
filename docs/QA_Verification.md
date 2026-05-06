# QA Verification: ClassFormModal

## Scenarios
- Create new class with optional fields omitted (teacher: none; no room_number, capacity)
- Update existing class; verify teacher selection updates and persistence
- Academic year formats: `YYYY/YYYY` and `YYYY-YYYY` where end year = start year + 1
- Capacity bounds: accept 1–1000; reject invalid or >1000
- Room number payload: ensure field sent as `room_number`

## Steps & Expected Results
1. Open modal and create class with required fields only
   - Expect success toast and API payload excludes optional fields
2. Select “No Teacher Assigned” and submit
   - Expect payload without `teacher_id`
3. Enter academic year `2024/2025` and `2024-2025`
   - Expect validation passes; mismatched ranges rejected
4. Set capacity to `0`, `-1`, `abc` and `1001`
   - Expect validation errors; normal values accepted
5. Set room number with allowed characters (letters, numbers, hyphens, spaces, periods)
   - Expect valid; invalid characters rejected

## References
- Component: `frontend/src/components/classes/ClassFormModal.tsx`
- Backend classes routes: `backend/app/api/v1/classes/routes.py`
