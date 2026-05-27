"""add_tenant_id_to_system_settings_config

Revision ID: 20260527_add_tenant_id_to_system_settings_config
Revises: 171c6e2c9ef4
Create Date: 2026-05-27 00:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260527_add_tenant_id_to_system_settings_config'
down_revision = '171c6e2c9ef4'
branch_labels = None
depends_on = None

def column_exists(conn, table: str, column: str) -> bool:
    """Return True if *column* already exists in *table*."""
    if conn.dialect.name == 'postgresql':
        result = conn.execute(sa.text("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name   = :table
              AND column_name  = :column
        """), {"table": table, "column": column})
        return result.scalar() > 0
    else:
        # SQLite or other DB: check via pragma or reflection
        try:
            inspector = sa.inspect(conn)
            columns = [col['name'] for col in inspector.get_columns(table)]
            return column in columns
        except Exception:
            return False

def upgrade():
    bind = op.get_bind()
    
    if not column_exists(bind, 'system_settings_config', 'tenant_id'):
        # Add column tenant_id
        if bind.dialect.name == 'postgresql':
            op.add_column('system_settings_config', sa.Column('tenant_id', sa.UUID(as_uuid=True), nullable=True))
            # Create FK constraint and index
            op.create_foreign_key(
                'fk_system_settings_config_tenant_id',
                'system_settings_config', 'tenants',
                ['tenant_id'], ['id'],
                ondelete='CASCADE'
            )
            op.create_index(
                op.f('ix_system_settings_config_tenant_id'),
                'system_settings_config', ['tenant_id'],
                unique=False
            )
        else:
            # SQLite does not support adding constraints directly or type UUID
            op.add_column('system_settings_config', sa.Column('tenant_id', sa.String(36), nullable=True))

def downgrade():
    bind = op.get_bind()
    
    if column_exists(bind, 'system_settings_config', 'tenant_id'):
        if bind.dialect.name == 'postgresql':
            op.drop_index(op.f('ix_system_settings_config_tenant_id'), table_name='system_settings_config')
            op.drop_constraint('fk_system_settings_config_tenant_id', 'system_settings_config', type_='foreignkey')
            op.drop_column('system_settings_config', 'tenant_id')
        else:
            op.drop_column('system_settings_config', 'tenant_id')
