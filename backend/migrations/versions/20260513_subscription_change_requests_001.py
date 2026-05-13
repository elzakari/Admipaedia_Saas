"""subscription_change_requests

Revision ID: 20260513_subscription_change_requests_001
Revises: 20260513_trial_plan_entitlements_001
Create Date: 2026-05-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '20260513_subscription_change_requests_001'
down_revision = '20260513_trial_plan_entitlements_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if insp.has_table('subscription_change_requests'):
        return

    op.create_table(
        'subscription_change_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('requested_plan_id', sa.Integer(), sa.ForeignKey('plans.id'), nullable=False),
        sa.Column('request_type', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('effective_academic_term_id', sa.Integer(), sa.ForeignKey('academic_terms.id'), nullable=True),
        sa.Column('effective_date', sa.Date(), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('decision_note', sa.Text(), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    op.create_index('idx_subscription_change_school_status', 'subscription_change_requests', ['school_id', 'status'])
    op.create_index('idx_subscription_change_status_created', 'subscription_change_requests', ['status', 'created_at'])


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if not insp.has_table('subscription_change_requests'):
        return
    op.drop_index('idx_subscription_change_status_created', table_name='subscription_change_requests')
    op.drop_index('idx_subscription_change_school_status', table_name='subscription_change_requests')
    op.drop_table('subscription_change_requests')

