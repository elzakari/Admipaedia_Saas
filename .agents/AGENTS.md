# Admipaedia Agent Rules

## Migration Safety Protocol

The following rules apply to **all** Alembic migration work on this project. Violating these rules can cause CI failures, broken production databases, or data loss.

### 1. Check heads before creating any migration
Always run `alembic heads` before generating a new revision. Never create a new migration if multiple heads exist.

```bash
alembic heads
```

If `alembic heads` returns more than one entry, **stop and report** — do not proceed until the user resolves the split.

### 2. Maintain a strictly linear revision history
**DO NOT use `alembic merge heads`**. This project requires a single-head linear chain. If multiple heads are detected, trace back through the `down_revision` graph to identify where the branch diverged and correct the offending migration files manually so the chain is linear again.

### 3. Verify foreign key dependencies exist before referencing them
When writing raw SQL DDL that includes `REFERENCES <table>(id)`, explicitly confirm that `<table>` is created in an earlier migration in the `down_revision` chain. If the referenced table may not exist on fresh installs, guard the operation with a `table_exists()` check and make the FK conditional:

```python
def _table_exists(conn, table_name: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = ''public'' AND table_name = :t"
    ), {"t": table_name}).fetchone()
    return result is not None

# In upgrade():
fk_clause = "REFERENCES branches(id) ON DELETE SET NULL" if _table_exists(conn, ''branches'') else ""
```

### 4. Keep all `revision` and `down_revision` IDs <= 32 characters
The `alembic_version.version_num` column is `VARCHAR(32)`. Any revision ID longer than 32 characters will cause a `StringDataRightTruncation` error at migration time. Use short, descriptive aliases:

- OK:  `20260506_acad_settings_001` (26 chars)
- BAD: `20260506_tenant_academic_settings_001` (38 chars)

### 5. Guard all data migrations against missing tables
Any migration that queries or mutates a table that may not exist on a fresh CI database must guard with `table_exists()` or `information_schema` checks. Never assume a table exists based on application models alone.

```python
if not _table_exists(conn, ''system_settings''):
    return  # Nothing to backfill on a fresh install
```

### 6. Test migrations locally with a fresh database before finalizing
Before marking any migration work complete, verify locally that `flask db upgrade` completes cleanly against a fresh (empty) PostgreSQL database with no prior migrations applied.

### 7. Git push policy
NEVER run `git push` unless the user explicitly requests it. All commits must remain local until the user says "push".
