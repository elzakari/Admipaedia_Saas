"""add_notification_user_states

Revision ID: 20260623_1200_add_notification_user_states
Revises: 20260610_1900_refactor_messaging_notifications_attachments_fk
Create Date: 2026-06-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260623_1200_add_notification_user_states'
down_revision = '20260610_1900_refactor_messaging_notifications_attachments_fk'
branch_labels = None
depends_on = None


def _table_exists(connection, table_name):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :table_name"
        ),
        {"table_name": table_name}
    )
    return result.fetchone() is not None


def _index_exists(connection, table_name, index_name):
    if connection.dialect.name == 'sqlite':
        result = connection.execute(sa.text(f"PRAGMA index_list('{table_name}')"))
        return any(row[1] == index_name for row in result.fetchall())

    result = connection.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes "
            "WHERE tablename = :table_name AND indexname = :index_name"
        ),
        {"table_name": table_name, "index_name": index_name}
    )
    return result.fetchone() is not None


def upgrade():
    connection = op.get_bind()

    if not _table_exists(connection, 'notification_user_states'):
        op.create_table(
            'notification_user_states',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('notification_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('read_at', sa.DateTime(), nullable=True),
            sa.Column('is_starred', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('starred_at', sa.DateTime(), nullable=True),
            sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('archived_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('deleted_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], name='fk_notification_user_states_notification_id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_notification_user_states_user_id'),
            sa.UniqueConstraint('notification_id', 'user_id', name='uq_notification_user_states_notification_user')
        )

    if not _index_exists(connection, 'notification_user_states', 'ix_notification_user_states_user_id'):
        op.create_index(
            'ix_notification_user_states_user_id',
            'notification_user_states',
            ['user_id'],
            unique=False
        )

    if not _index_exists(connection, 'notification_user_states', 'ix_notification_user_states_notification_id'):
        op.create_index(
            'ix_notification_user_states_notification_id',
            'notification_user_states',
            ['notification_id'],
            unique=False
        )


def downgrade():
    connection = op.get_bind()
    if _table_exists(connection, 'notification_user_states'):
        if _index_exists(connection, 'notification_user_states', 'ix_notification_user_states_notification_id'):
            op.drop_index('ix_notification_user_states_notification_id', table_name='notification_user_states')
        if _index_exists(connection, 'notification_user_states', 'ix_notification_user_states_user_id'):
            op.drop_index('ix_notification_user_states_user_id', table_name='notification_user_states')
        op.drop_table('notification_user_states')
