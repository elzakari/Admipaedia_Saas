"""refactor_messaging_notifications_attachments_fk

Revision ID: 20260610_1900_refactor_messaging_notifications_attachments_fk
Revises: 20260607_2200_polymorphic_academic_structure
Create Date: 2026-06-10 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '20260610_1900_refactor_messaging_notifications_attachments_fk'
down_revision = '20260607_2200_polymorphic_academic_structure'
branch_labels = None
depends_on = None

def _table_exists(connection, table):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :t"
        ),
        {"t": table}
    )
    return result.fetchone() is not None

def upgrade():
    connection = op.get_bind()
    
    # 1. Handle auto-increment sequence for messages.id and notifications.id on Postgres
    if connection.dialect.name == 'postgresql':
        # Ensure notifications sequence exists
        op.execute("CREATE SEQUENCE IF NOT EXISTS notifications_id_seq")
        op.execute("ALTER TABLE notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq')")
        
        # Ensure messages sequence exists
        op.execute("CREATE SEQUENCE IF NOT EXISTS messages_id_seq")
        op.execute("ALTER TABLE messages ALTER COLUMN id SET DEFAULT nextval('messages_id_seq')")
        op.execute("SELECT setval('messages_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM messages), false)")

    # 2. Create attachments table
    if not _table_exists(connection, 'attachments'):
        op.create_table(
            'attachments',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('filename', sa.String(255), nullable=False),
            sa.Column('file_path', sa.String(512), nullable=False),
            sa.Column('size', sa.Integer(), nullable=True),
            sa.Column('mime_type', sa.String(100), nullable=True),
            sa.Column('uploader_id', sa.Integer(), nullable=True),
            sa.Column('tenant_id', UUID(as_uuid=True), nullable=True),
            sa.Column('entity_type', sa.String(50), nullable=True),
            sa.Column('entity_id', sa.String(50), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['uploader_id'], ['users.id'], name='attachments_uploader_id_fkey'),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='attachments_tenant_id_fkey')
        )

def downgrade():
    connection = op.get_bind()
    if _table_exists(connection, 'attachments'):
        op.drop_table('attachments')
