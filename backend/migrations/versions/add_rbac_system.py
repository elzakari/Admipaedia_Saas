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


def upgrade():
    # Create enums
    op.execute("CREATE TYPE resourcetype AS ENUM ('user', 'student', 'teacher', 'class', 'subject', 'grade', 'attendance', 'exam', 'assignment', 'report', 'system')")
    op.execute("CREATE TYPE permissiontype AS ENUM ('read', 'write', 'delete', 'execute', 'admin')")
    op.execute("CREATE TYPE accesstype AS ENUM ('allow', 'deny')")
    op.execute("CREATE TYPE subjecttype AS ENUM ('user', 'role', 'group')")

    # Create rbac_permissions table
    op.create_table('rbac_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('resource_type', postgresql.ENUM('user', 'student', 'teacher', 'class', 'subject', 'grade', 'attendance', 'exam', 'assignment', 'report', 'system', name='resourcetype'), nullable=False),
        sa.Column('permission_type', postgresql.ENUM('read', 'write', 'delete', 'execute', 'admin', name='permissiontype'), nullable=False),
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
    op.create_table('role_hierarchy',
        sa.Column('parent_role_id', sa.Integer(), nullable=False),
        sa.Column('child_role_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['parent_role_id'], ['rbac_roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['child_role_id'], ['rbac_roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('parent_role_id', 'child_role_id')
    )

    # Create permission_grants table
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
    op.create_table('access_control_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_type', postgresql.ENUM('user', 'student', 'teacher', 'class', 'subject', 'grade', 'attendance', 'exam', 'assignment', 'report', 'system', name='resourcetype'), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=False),
        sa.Column('subject_type', postgresql.ENUM('user', 'role', 'group', name='subjecttype'), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('access_type', postgresql.ENUM('allow', 'deny', name='accesstype'), nullable=False),
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
    # Drop tables in reverse order
    op.drop_table('role_templates')
    op.drop_table('access_control_lists')
    op.drop_table('permission_grants')
    op.drop_table('role_hierarchy')
    op.drop_table('user_role_assignments')
    op.drop_table('role_permissions')
    op.drop_table('rbac_roles')
    op.drop_table('rbac_permissions')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS subjecttype")
    op.execute("DROP TYPE IF EXISTS accesstype")
    op.execute("DROP TYPE IF EXISTS permissiontype")
    op.execute("DROP TYPE IF EXISTS resourcetype")