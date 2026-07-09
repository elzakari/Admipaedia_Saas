[OPEN] Backend settings import crash

## Session
- Session ID: `backend-settings-import`
- Started: 2026-07-08
- Symptom: Backend container exits during Gunicorn startup with `ModuleNotFoundError: No module named 'app.models.settings'`
- Impact: `/api/` returns `502`, backend restart loop blocks deploy health checks

## Evidence Collected
- Production logs show crash in `/app/app/services/finance/service.py` on `from app.models.settings import SchoolSettings`
- Server repo at `/opt/admipaedia/app` is on commit `504f6a0`
- Server file dump from `backend/app/services/finance/service.py` still contains the stale import
- Manual image rebuild still packages code that contains the stale import
- After pulling to `b918b42`, the settings import is gone, but backend still restarts due to a SyntaxError in `app/api/v1/library/routes.py` (print report HTML builder).

## Falsifiable Hypotheses
1. The server repo never received the hotfix commits, so Docker is correctly building stale source from `/opt/admipaedia/app`.
2. The hotfix was created locally but was never actually committed and pushed to `origin/main`.
3. The server is pulling from the correct repo, but Docker compose is building backend from a different context than `/opt/admipaedia/app/backend`.
4. The server branch or remote is pinned to an older ref, preventing `git pull` from advancing to the hotfix commit.
5. There is a second stale import path elsewhere in startup, but the current first-failure line in `finance/service.py` masks it.

## Next Checks
- Verify local repo history for the supposed hotfix commits
- Verify local `backend/app/services/finance/service.py` content
- Compare local HEAD with `origin/main`
- If missing locally, implement and push the minimal fix
- If present locally, verify server remote/branch/build context mismatch
- Fix SyntaxError in library routes and redeploy
