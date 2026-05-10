"""invitation_links

Revision ID: 20260509_invitation_links_001
Revises: 20260509_multi_country_payments_001
Create Date: 2026-05-09 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260509_invitation_links_001'
down_revision = '20260509_multi_country_payments_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    uuid_type = sa.String(36)
    json_type = sa.JSON()
    inet_type = sa.String(45)
    if dialect == 'postgresql':
        uuid_type = postgresql.UUID(as_uuid=True)
        json_type = postgresql.JSONB()
        inet_type = postgresql.INET()

    op.create_table(
        'invitation_links',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('tenant_id', uuid_type, nullable=False),
        sa.Column('invitee_type', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='active'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('nonce_hash', sa.String(length=64), nullable=False),
        sa.Column('sig_hash', sa.String(length=64), nullable=False),
        sa.Column('created_by_user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')), 
        sa.Column('consumed_by_user_id', sa.Integer(), nullable=True),
        sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_by_user_id', sa.Integer(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_invitation_links_tenant_id'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name='fk_invitation_links_created_by_user_id'),
        sa.ForeignKeyConstraint(['consumed_by_user_id'], ['users.id'], name='fk_invitation_links_consumed_by_user_id'),
        sa.ForeignKeyConstraint(['revoked_by_user_id'], ['users.id'], name='fk_invitation_links_revoked_by_user_id'),
    )

    op.create_index('idx_invitation_links_tenant_status', 'invitation_links', ['tenant_id', 'status'], unique=False)
    op.create_index('idx_invitation_links_expires_at', 'invitation_links', ['expires_at'], unique=False)
    op.create_index('ix_invitation_links_tenant_id', 'invitation_links', ['tenant_id'], unique=False)
    op.create_index('ix_invitation_links_created_by_user_id', 'invitation_links', ['created_by_user_id'], unique=False)

    op.create_table(
        'invitation_events',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('invite_id', uuid_type, nullable=False),
        sa.Column('event_type', sa.String(length=32), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('tenant_id', uuid_type, nullable=True),
        sa.Column('ip_address', inet_type, nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('metadata_json', json_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['invite_id'], ['invitation_links.id'], name='fk_invitation_events_invite_id'),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], name='fk_invitation_events_actor_user_id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_invitation_events_tenant_id'),
    )

    op.create_index('idx_invitation_events_invite_id', 'invitation_events', ['invite_id'], unique=False)
    op.create_index('idx_invitation_events_created_at', 'invitation_events', ['created_at'], unique=False)


def downgrade():
    op.drop_index('idx_invitation_events_created_at', table_name='invitation_events')
    op.drop_index('idx_invitation_events_invite_id', table_name='invitation_events')
    op.drop_table('invitation_events')

    op.drop_index('ix_invitation_links_created_by_user_id', table_name='invitation_links')
    op.drop_index('ix_invitation_links_tenant_id', table_name='invitation_links')
    op.drop_index('idx_invitation_links_expires_at', table_name='invitation_links')
    op.drop_index('idx_invitation_links_tenant_status', table_name='invitation_links')
    op.drop_table('invitation_links')
