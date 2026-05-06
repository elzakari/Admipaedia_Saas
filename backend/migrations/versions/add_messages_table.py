"""Add messages table

Revision ID: add_messages_table
Revises: 
Create Date: 2024-01-20 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_messages_table'
down_revision = None  # This should be set to the latest migration
branch_labels = None
depends_on = None

def upgrade():
    # Create messages table
    # op.create_table('messages',
    #    sa.Column('id', sa.Integer(), nullable=False),
    #    sa.Column('sender_id', sa.Integer(), nullable=False),
    #    sa.Column('sender_type', sa.String(length=20), nullable=False),
    #    sa.Column('recipient_id', sa.Integer(), nullable=False),
    #    sa.Column('recipient_type', sa.String(length=20), nullable=False),
    #    sa.Column('subject', sa.String(length=255), nullable=False),
    #    sa.Column('content', sa.Text(), nullable=False),
    #    sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
    #    sa.Column('is_deleted_by_sender', sa.Boolean(), nullable=False, default=False),
    #    sa.Column('is_deleted_by_recipient', sa.Boolean(), nullable=False, default=False),
    #    sa.Column('attachments', sa.JSON(), nullable=True),
    #    sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
    #    sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now()),
    #    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
    #    sa.PrimaryKeyConstraint('id')
    # )
    
    # Create indexes for better performance
    # op.create_index('ix_messages_sender_id', 'messages', ['sender_id'])
    # op.create_index('ix_messages_recipient_id', 'messages', ['recipient_id'])
    # op.create_index('ix_messages_created_at', 'messages', ['created_at'])
    # op.create_index('ix_messages_is_read', 'messages', ['is_read'])
    pass

def downgrade():
    # Drop indexes
    op.drop_index('ix_messages_is_read', table_name='messages')
    op.drop_index('ix_messages_created_at', table_name='messages')
    op.drop_index('ix_messages_recipient_id', table_name='messages')
    op.drop_index('ix_messages_sender_id', table_name='messages')
    
    # Drop table
    op.drop_table('messages')