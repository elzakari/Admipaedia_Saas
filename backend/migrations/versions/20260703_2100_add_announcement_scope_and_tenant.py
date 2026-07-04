"""add_announcement_scope_and_tenant

Revision ID: 20260703_2100_add_announcement_scope_and_tenant
Revises: 20260623_1200_add_notification_user_states
Create Date: 2026-07-03 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260703_2100_add_announcement_scope_and_tenant'
down_revision = '20260623_1200_add_notification_user_states'
branch_labels = None
depends_on = None


def _column_exists(connection, table_name, column_name):
    if connection.dialect.name == 'sqlite':
        result = connection.execute(sa.text(f"PRAGMA table_info('{table_name}')"))
        return any(row[1] == column_name for row in result.fetchall())

    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :table_name AND column_name = :column_name"
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    return result.fetchone() is not None


def upgrade():
    connection = op.get_bind()

    if not _column_exists(connection, 'announcements', 'scope'):
        op.add_column('announcements', sa.Column('scope', sa.String(length=20), nullable=True, server_default='class_bound'))

    if not _column_exists(connection, 'announcements', 'tenant_id'):
        if connection.dialect.name == 'postgresql':
            op.add_column('announcements', sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
            op.create_foreign_key(
                'fk_announcements_tenant_id',
                'announcements',
                'tenants',
                ['tenant_id'],
                ['id'],
            )
        else:
            op.add_column('announcements', sa.Column('tenant_id', sa.String(length=36), nullable=True))

    if connection.dialect.name == 'postgresql':
        connection.execute(sa.text(
            "UPDATE announcements a "
            "SET scope = COALESCE(a.scope, 'class_bound'), "
            "tenant_id = COALESCE(a.tenant_id, c.tenant_id) "
            "FROM classes c "
            "WHERE a.class_id = c.id"
        ))
        connection.execute(sa.text(
            "UPDATE announcements "
            "SET scope = COALESCE(scope, 'class_bound') "
            "WHERE scope IS NULL OR scope = ''"
        ))
    else:
        connection.execute(sa.text(
            "UPDATE announcements "
            "SET scope = COALESCE(scope, 'class_bound') "
            "WHERE scope IS NULL OR scope = ''"
        ))
        connection.execute(sa.text(
            "UPDATE announcements "
            "SET tenant_id = (SELECT classes.tenant_id FROM classes WHERE classes.id = announcements.class_id) "
            "WHERE tenant_id IS NULL AND class_id IS NOT NULL"
        ))

    with op.batch_alter_table('announcements') as batch_op:
        batch_op.alter_column('scope', existing_type=sa.String(length=20), nullable=False, server_default='class_bound')
        batch_op.alter_column('class_id', existing_type=sa.Integer(), nullable=True)


def downgrade():
    connection = op.get_bind()

    with op.batch_alter_table('announcements') as batch_op:
        batch_op.alter_column('class_id', existing_type=sa.Integer(), nullable=False)

    if _column_exists(connection, 'announcements', 'tenant_id'):
        if connection.dialect.name == 'postgresql':
            try:
                op.drop_constraint('fk_announcements_tenant_id', 'announcements', type_='foreignkey')
            except Exception:
                pass
        op.drop_column('announcements', 'tenant_id')

    if _column_exists(connection, 'announcements', 'scope'):
        op.drop_column('announcements', 'scope')
