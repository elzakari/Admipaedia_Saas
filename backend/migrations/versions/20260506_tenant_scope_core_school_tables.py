"""tenant_scope_core_school_tables

Revision ID: 20260506_tenant_core_001
Revises: saas_init_002
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260506_tenant_core_001'
down_revision = 'saas_init_002'
branch_labels = None
depends_on = None


def _table_exists(connection, table_name):
    try:
        inspector = sa.inspect(connection)
        return table_name in inspector.get_table_names()
    except Exception:
        return False


def _column_exists(connection, table_name, column_name):
    try:
        if not _table_exists(connection, table_name):
            return False
        inspector = sa.inspect(connection)
        return any(column["name"] == column_name for column in inspector.get_columns(table_name))
    except Exception:
        return False


def _exec_safe(connection, fn, *args, **kwargs):
    try:
        nested = connection.begin_nested()
        try:
            fn(*args, **kwargs)
            nested.commit()
        except Exception:
            nested.rollback()
    except Exception:
        try:
            fn(*args, **kwargs)
        except Exception:
            pass


def upgrade():
    connection = op.get_bind()

    for table_name in ('students', 'teachers', 'staff', 'parents', 'classes', 'subjects', 'departments'):
        if _table_exists(connection, table_name):
            if not _column_exists(connection, table_name, 'tenant_id'):
                _exec_safe(connection, op.add_column, table_name, sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
            _exec_safe(connection, op.create_index, f'ix_{table_name}_tenant_id', table_name, ['tenant_id'], unique=False)
            _exec_safe(connection, op.create_foreign_key, f'fk_{table_name}_tenant_id', table_name, 'tenants', ['tenant_id'], ['id'])

    for stmt in (
        'ALTER TABLE IF EXISTS students DROP CONSTRAINT IF EXISTS students_admission_number_key',
        'ALTER TABLE IF EXISTS teachers DROP CONSTRAINT IF EXISTS teachers_employee_id_key',
        'ALTER TABLE IF EXISTS staff DROP CONSTRAINT IF EXISTS staff_employee_id_key',
        'ALTER TABLE IF EXISTS subjects DROP CONSTRAINT IF EXISTS subjects_code_key',
        'ALTER TABLE IF EXISTS departments DROP CONSTRAINT IF EXISTS departments_name_key',
        'ALTER TABLE IF EXISTS departments DROP CONSTRAINT IF EXISTS departments_code_key'
    ):
        _exec_safe(connection, op.execute, stmt)

    if _table_exists(connection, 'students'):
        _exec_safe(connection, op.create_unique_constraint, 'uq_students_tenant_admission_number', 'students', ['tenant_id', 'admission_number'])
    if _table_exists(connection, 'teachers'):
        _exec_safe(connection, op.create_unique_constraint, 'uq_teachers_tenant_employee_id', 'teachers', ['tenant_id', 'employee_id'])
    if _table_exists(connection, 'staff'):
        _exec_safe(connection, op.create_unique_constraint, 'uq_staff_tenant_employee_id', 'staff', ['tenant_id', 'employee_id'])
    if _table_exists(connection, 'subjects'):
        _exec_safe(connection, op.create_unique_constraint, 'uq_subjects_tenant_code', 'subjects', ['tenant_id', 'code'])
    if _table_exists(connection, 'departments'):
        _exec_safe(connection, op.create_unique_constraint, 'uq_departments_tenant_name', 'departments', ['tenant_id', 'name'])
        _exec_safe(connection, op.create_unique_constraint, 'uq_departments_tenant_code', 'departments', ['tenant_id', 'code'])

    updates = []
    for t in ('students', 'teachers', 'staff', 'parents', 'classes', 'subjects', 'departments'):
        if _table_exists(connection, t) and _column_exists(connection, t, 'tenant_id'):
            updates.append(f"UPDATE {t} SET tenant_id = default_tenant WHERE tenant_id IS NULL;")

    if updates:
        sql = f"""
DO $$
DECLARE default_tenant uuid;
BEGIN
  SELECT id INTO default_tenant FROM public.tenants ORDER BY created_at NULLS LAST LIMIT 1;

  IF default_tenant IS NULL THEN
    INSERT INTO public.tenants (slug, name, country_code, schema_name)
    VALUES ('legacy-school', 'Legacy School', 'GH', 'tenant_legacy_school')
    RETURNING id INTO default_tenant;
  END IF;

  {' '.join(updates)}
END $$;
        """
        _exec_safe(connection, op.execute, sql)

    for table_name in ('students', 'teachers', 'staff', 'parents', 'classes', 'subjects', 'departments'):
        if _table_exists(connection, table_name) and _column_exists(connection, table_name, 'tenant_id'):
            _exec_safe(connection, op.alter_column, table_name, 'tenant_id', nullable=False)


def downgrade():
    op.drop_constraint('uq_departments_tenant_code', 'departments', type_='unique')
    op.drop_constraint('uq_departments_tenant_name', 'departments', type_='unique')
    op.drop_constraint('uq_subjects_tenant_code', 'subjects', type_='unique')
    op.drop_constraint('uq_staff_tenant_employee_id', 'staff', type_='unique')
    op.drop_constraint('uq_teachers_tenant_employee_id', 'teachers', type_='unique')
    op.drop_constraint('uq_students_tenant_admission_number', 'students', type_='unique')

    for table_name in ('students', 'teachers', 'staff', 'parents', 'classes', 'subjects', 'departments'):
        op.drop_constraint(f'fk_{table_name}_tenant_id', table_name, type_='foreignkey')
        op.drop_index(f'ix_{table_name}_tenant_id', table_name=table_name)
        op.drop_column(table_name, 'tenant_id')
