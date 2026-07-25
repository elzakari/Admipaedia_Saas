"""Add RBAC system tables

Revision ID: add_rbac_system
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_rbac_system'
down_revision = None  # Update this to the latest migration
branch_labels = None
depends_on = None


def _table_exists(connection, table_name):
    inspector = sa.inspect(connection)
    return table_name in inspector.get_table_names()


def _enum_exists(connection, name):
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :n"),
        {"n": name}
    )
    return result.fetchone() is not None


def upgrade():
    connection = op.get_bind()

    # Create enums if they don't exist
    enums = [
        ('resourcetype', "('user', 'student', 'teacher', 'class', 'subject', 'grade', 'attendance', 'exam', 'assignment', 'report', 'system')"),
        ('permissiontype', "('read', 'write', 'delete', 'execute', 'admin')"),
        ('accesstype', "('allow', 'deny')"),
        ('subjecttype', "('user', 'role', 'group')"),
    ]
    for enum_name, enum_values in enums:
        if not _enum_exists(connection, enum_name):
            op.execute(f"CREATE TYPE {enum_name} AS ENUM {enum_values}")

    # Create rbac_permissions table
    if not _table_exists(connection, 'rbac_permissions'):
        op.create_table('rbac_permissions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('display_name', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('resource_type', postgresql.ENUM('user', 'student', 'teacher', 'class', 'subject', 'grade', 'attendance', 'exam', 'assignment', 'report', 'system', name='resourcetype', create_type=False), nullable=False),
            sa.Column('permission_type', postgresql.ENUM('read', 'write', 'delete', 'execute', 'admin', name='permissiontype', create_type=False), nullable=False),
            sa.Column('scope', sa.String(length=50), nullable=False, server_default='global'),
            sa.Column('conditions', sa.JSON(), nullable=True),
            sa.Column('metadata', sa.JSON(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_rbac_permissions_name', 'rbac_permissions', ['name'], unique=True)
        op.create_index('ix_rbac_permissions_resource_type', 'rbac_permissions', ['resource_type'])
        op.create_index('ix_rbac_permissions_permission_type', 'rbac_permissions', ['permission_type'])

    # Create rbac_roles table
    if not _table_exists(connection, 'rbac_roles'):
        op.create_table('rbac_roles',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('display_name', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('hierarchy_level', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('department_id', sa.Integer(), nullable=True),
            sa.Column('max_users', sa.Integer(), nullable=True),
            sa.Column('auto_assignment_conditions', sa.JSON(), nullable=True),
            sa.Column('metadata', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL')
        )
        op.create_index('ix_rbac_roles_name', 'rbac_roles', ['name'], unique=True)
        op.create_index('ix_rbac_roles_hierarchy_level', 'rbac_roles', ['hierarchy_level'])

    # Create role_permissions association table
    if not _table_exists(connection, 'role_permissions'):
        op.create_table('role_permissions',
            sa.Column('role_id', sa.Integer(), nullable=False),
            sa.Column('permission_id', sa.Integer(), nullable=False),
            sa.Column('granted_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('granted_by', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['role_id'], ['rbac_roles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['permission_id'], ['rbac_permissions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['granted_by'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('role_id', 'permission_id')
        )

    # Create user_role_assignments table
    if not _table_exists(connection, 'user_role_assignments'):
        op.create_table('user_role_assignments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('role_id', sa.Integer(), nullable=False),
            sa.Column('assigned_by', sa.Integer(), nullable=True),
            sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('context', sa.JSON(), nullable=True),
            sa.Column('metadata', sa.JSON(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['role_id'], ['rbac_roles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL')
        )
        op.create_index('ix_user_role_assignments_user_id', 'user_role_assignments', ['user_id'])
        op.create_index('ix_user_role_assignments_role_id', 'user_role_assignments', ['role_id'])
        op.create_index('ix_user_role_assignments_active', 'user_role_assignments', ['is_active'])

    # Create role_hierarchy table
    if not _table_exists(connection, 'role_hierarchy'):
        op.create_table('role_hierarchy',
            sa.Column('parent_role_id', sa.Integer(), nullable=False),
            sa.Column('child_role_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['parent_role_id'], ['rbac_roles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['child_role_id'], ['rbac_roles.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('parent_role_id', 'child_role_id')
        )

    # Create permission_grants table
    if not _table_exists(connection, 'permission_grants'):
        op.create_table('permission_grants',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('permission_id', sa.Integer(), nullable=False),
            sa.Column('resource_id', sa.String(length=100), nullable=True),
            sa.Column('granted_by', sa.Integer(), nullable=True),
            sa.Column('granted_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('is_denied', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('context', sa.JSON(), nullable=True),
            sa.Column('metadata', sa.JSON(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['permission_id'], ['rbac_permissions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['granted_by'], ['users.id'], ondelete='SET NULL')
        )
        op.create_index('ix_permission_grants_user_id', 'permission_grants', ['user_id'])
        op.create_index('ix_permission_grants_permission_id', 'permission_grants', ['permission_id'])
        op.create_index('ix_permission_grants_resource_id', 'permission_grants', ['resource_id'])

    # Create access_control_lists table
    if not _table_exists(connection, 'access_control_lists'):
        op.create_table('access_control_lists',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('resource_type', postgresql.ENUM('user', 'student', 'teacher', 'class', 'subject', 'grade', 'attendance', 'exam', 'assignment', 'report', 'system', name='resourcetype', create_type=False), nullable=False),
            sa.Column('resource_id', sa.String(length=100), nullable=False),
            sa.Column('subject_type', postgresql.ENUM('user', 'role', 'group', name='subjecttype', create_type=False), nullable=False),
            sa.Column('subject_id', sa.Integer(), nullable=False),
            sa.Column('access_type', postgresql.ENUM('allow', 'deny', name='accesstype', create_type=False), nullable=False),
            sa.Column('permissions', sa.JSON(), nullable=False),
            sa.Column('conditions', sa.JSON(), nullable=True),
            sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('effective_from', sa.DateTime(), nullable=True),
            sa.Column('effective_until', sa.DateTime(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL')
        )
        op.create_index('ix_acl_resource', 'access_control_lists', ['resource_type', 'resource_id'])
        op.create_index('ix_acl_subject', 'access_control_lists', ['subject_type', 'subject_id'])

    # Create role_templates table
    if not _table_exists(connection, 'role_templates'):
        op.create_table('role_templates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('display_name', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('category', sa.String(length=50), nullable=True),
            sa.Column('permission_ids', sa.JSON(), nullable=False),
            sa.Column('default_properties', sa.JSON(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL')
        )
        op.create_index('ix_role_templates_name', 'role_templates', ['name'], unique=True)
        op.create_index('ix_role_templates_category', 'role_templates', ['category'])


def downgrade():
    connection = op.get_bind()
    tables = [
        'role_templates',
        'access_control_lists',
        'permission_grants',
        'role_hierarchy',
        'user_role_assignments',
        'role_permissions',
        'rbac_roles',
        'rbac_permissions',
    ]
    for tbl in tables:
        if _table_exists(connection, tbl):
            op.drop_table(tbl)
            
    enums = ['subjecttype', 'accesstype', 'permissiontype', 'resourcetype']
    for enm in enums:
        op.execute(f"DROP TYPE IF EXISTS {enm}")