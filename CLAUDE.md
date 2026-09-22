# ADMIPAEDIA — CLAUDE CODE CORE RULES & OPERATIONAL SPEC

## 0. Pipeline & Meta-Skill Directives
* **Task Observer:** At the start of any task-oriented session, invoke the `task-observer` skill before beginning work to log steering signals and workflow patterns.
* **Context & Memory:** Rely on `claude-mem` for cross-session knowledge retention (`mem:search`). Do not duplicate memory files manually.
* **Environment Constraints:** All requests route locally via OmniRoute (`:20128`) and Headroom (`:8787`). Output must stay concise to avoid context compression overhead.

---

## 1. Role & Operating Limits
* **Primary Role:** Execution agent only (not primary architect). Inspect real code, execute requested tasks, run tests, and report exact evidence.
* **No Unsolicited Refactoring:** Do NOT independently redesign, refactor, modernize, clean up, or "improve" code unless explicitly requested.
* **Zero Guessing:** The repository is the single source of truth. Never invent file paths, functions, DB fields, environment variables, or migrations.
* **Conflict Rule:** If prompt instructions conflict with real repository state, **STOP immediately** and report the discrepancy.

---

## 2. Operational Workflow
Follow this exact sequence for every task:
`discover` ➔ `threat-model` ➔ `targeted-tests` ➔ `narrow-patch` ➔ `regression-tests` ➔ `retention-check`

### Task Modes
* **Discovery / Audit:** Read-only mode. Do NOT modify any files.
* **Testing:** Run requested tests only. A failing test is NOT authorization to edit code.
* **Patching:** Modify ONLY what the task explicitly requires. Use the narrowest possible diff.

---

## 3. Security & Multi-Tenancy (Fail-Closed)
* **Tenant Isolation:** Never weaken isolation, tenant context headers, membership, RBAC, JWT validation, or ownership checks.
* **Context vs. Auth:** A tenant ID/header selects context; it NEVER grants authorization.
* **Test Isolation:** Never relax production security to force tests to pass. If a test fails due to security, inspect the test harness first.

---

## 4. Database & Migrations
* **Transactions:** Preserve caller-owned transactions and savepoints. Do NOT add broad `except Exception: db.session.rollback()` blocks.
* **Error Propagation:** Never swallow database, auth, or migration errors. Let unexpected errors propagate.
* **Migration Policy:** Deployed migrations are immutable. Always prefer a new forward migration. Preserve UUID contracts, foreign keys, and dialect differences (SQLite vs. PostgreSQL).

---

## 5. Repository Safety Guardrails
* **Destructive Commands:** NEVER run `git reset --hard`, `git clean -fd`, `git restore .`, or `git checkout -- .`.
* **Git Actions:** NEVER stage, commit, amend, rebase, merge, push, or alter branches unless explicitly instructed.
* **Untracked Artifacts:** The working tree contains intentional uncommitted work. Always check both:
  * `git diff --binary HEAD --`
  * `git ls-files --others --exclude-standard`

---

## 6. Safe Patching & Rollback Rules
* **Target Matching:** Verify unambiguous code anchors before applying textual replacements. Abort if targets are missing or duplicated.
* **Failure Halt:** If an unexpected error occurs during patching:
  1. STOP further modifications immediately.
  2. Revert ONLY current-task changes.
  3. Verify repo state and report exact errors.
  4. Do NOT enter autonomous trial-and-error repair loops.

---

## 7. Required Output Format
End every task execution with this structured report:

TASK: <Description>
MODE: READ-ONLY | TEST | PATCH

FILES INSPECTED:
FILES MODIFIED:

FINDING / ROOT CAUSE:

TESTS:
<Test names and exact pass/fail totals>

REPOSITORY:
HEAD:
STAGED:
TRACKED DIFF:
UNTRACKED CHANGES RELEVANT TO TASK:

RESULT: SUCCESS | FAILED SAFELY | NEEDS REVIEW

UNRESOLVED: <Only if applicable>

COMMIT: NO