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


def upgrade():
    for table_name in ('students', 'teachers', 'staff', 'parents', 'classes', 'subjects', 'departments'):
        op.add_column(table_name, sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
        op.create_index(f'ix_{table_name}_tenant_id', table_name, ['tenant_id'], unique=False)
        op.create_foreign_key(
            f'fk_{table_name}_tenant_id',
            table_name,
            'tenants',
            ['tenant_id'],
            ['id']
        )

    op.execute('ALTER TABLE students DROP CONSTRAINT IF EXISTS students_admission_number_key')
    op.execute('ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_employee_id_key')
    op.execute('ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_employee_id_key')
    op.execute('ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_code_key')
    op.execute('ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key')
    op.execute('ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_code_key')

    op.create_unique_constraint(
        'uq_students_tenant_admission_number',
        'students',
        ['tenant_id', 'admission_number']
    )
    op.create_unique_constraint(
        'uq_teachers_tenant_employee_id',
        'teachers',
        ['tenant_id', 'employee_id']
    )
    op.create_unique_constraint(
        'uq_staff_tenant_employee_id',
        'staff',
        ['tenant_id', 'employee_id']
    )
    op.create_unique_constraint(
        'uq_subjects_tenant_code',
        'subjects',
        ['tenant_id', 'code']
    )
    op.create_unique_constraint(
        'uq_departments_tenant_name',
        'departments',
        ['tenant_id', 'name']
    )
    op.create_unique_constraint(
        'uq_departments_tenant_code',
        'departments',
        ['tenant_id', 'code']
    )

    op.execute(
        """
DO $$
DECLARE default_tenant uuid;
BEGIN
  SELECT id INTO default_tenant FROM public.tenants ORDER BY created_at NULLS LAST LIMIT 1;

  IF default_tenant IS NULL THEN
    INSERT INTO public.tenants (slug, name, country_code, schema_name)
    VALUES ('legacy-school', 'Legacy School', 'GH', 'tenant_legacy_school')
    RETURNING id INTO default_tenant;
  END IF;

  UPDATE students SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE teachers SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE staff SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE parents SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE classes SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE subjects SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE departments SET tenant_id = default_tenant WHERE tenant_id IS NULL;
END $$;
        """
    )

    for table_name in ('students', 'teachers', 'staff', 'parents', 'classes', 'subjects', 'departments'):
        op.alter_column(table_name, 'tenant_id', nullable=False)


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
