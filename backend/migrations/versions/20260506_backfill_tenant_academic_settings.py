"""backfill_tenant_academic_settings

Revision ID: 20260506_backfill_acad_settings_001
Revises: 20260506_tenant_grading_schemes_001
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import json
import uuid


revision = '20260506_backfill_acad_settings_001'
down_revision = '20260506_tenant_grading_schemes_001'
branch_labels = None
depends_on = None


def _load_system_setting_json(conn, key: str):
    row = conn.execute(sa.text("SELECT value, setting_type FROM system_settings WHERE key = :k"), {"k": key}).fetchone()
    if not row:
        return None
    value, setting_type = row[0], row[1]
    if setting_type != 'json':
        return None
    try:
        decoded = json.loads(value or '{}')
    except Exception:
        return None
    return decoded if isinstance(decoded, dict) else None


def _load_system_setting_value(conn, key: str):
    row = conn.execute(sa.text("SELECT value, setting_type FROM system_settings WHERE key = :k"), {"k": key}).fetchone()
    if not row:
        return None
    value, setting_type = row[0], row[1]
    if setting_type == 'int':
        try:
            return int(value)
        except Exception:
            return value
    if setting_type == 'float':
        try:
            return float(value)
        except Exception:
            return value
    if setting_type == 'boolean':
        try:
            return str(value).lower() in ('true', '1', 't', 'y', 'yes')
        except Exception:
            return value
    return value


def upgrade():
    conn = op.get_bind()

    legacy_blob = _load_system_setting_json(conn, 'academic.settings') or {}
    legacy_school = {
        'academicYear': _load_system_setting_value(conn, 'school.academicYear'),
        'currentTerm': _load_system_setting_value(conn, 'school.currentTerm'),
        'gradingSystem': _load_system_setting_value(conn, 'school.gradingSystem'),
        'passingGrade': _load_system_setting_value(conn, 'school.passingGrade'),
        'maxGrade': _load_system_setting_value(conn, 'school.maxGrade'),
        'maxStudentsPerClass': _load_system_setting_value(conn, 'school.maxStudentsPerClass'),
    }
    legacy_school = {k: v for k, v in legacy_school.items() if v is not None}

    seed_settings = {}
    if isinstance(legacy_blob, dict):
        seed_settings.update(legacy_blob)
    seed_settings.update(legacy_school)

    if not seed_settings:
        return

    tenant_rows = conn.execute(sa.text("SELECT id FROM tenants")).fetchall()
    if not tenant_rows:
        return

    for (tenant_id,) in tenant_rows:
        exists = conn.execute(
            sa.text("SELECT 1 FROM tenant_academic_settings WHERE tenant_id = :t LIMIT 1"),
            {"t": tenant_id},
        ).fetchone()
        if exists:
            continue

        new_id = uuid.uuid4()
        if conn.dialect.name == 'postgresql':
            conn.execute(
                sa.text(
                    "INSERT INTO tenant_academic_settings (id, tenant_id, settings, created_at, updated_at) "
                    "VALUES (:id, :tenant_id, CAST(:settings AS jsonb), now(), now())"
                ),
                {"id": new_id, "tenant_id": tenant_id, "settings": json.dumps(seed_settings)},
            )
        else:
            conn.execute(
                sa.text(
                    "INSERT INTO tenant_academic_settings (id, tenant_id, settings, created_at, updated_at) "
                    "VALUES (:id, :tenant_id, :settings, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                ),
                {"id": str(new_id), "tenant_id": tenant_id, "settings": json.dumps(seed_settings)},
            )


def downgrade():
    pass
