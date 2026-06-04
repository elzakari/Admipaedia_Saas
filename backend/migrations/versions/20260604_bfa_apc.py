"""bfa_apc permanent fixes

Revision ID: 20260604_bfa_apc
Revises: 2505e0eb938c, 3a413a7447b6
Create Date: 2026-06-04 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260604_bfa_apc'
down_revision = ('2505e0eb938c', '3a413a7447b6')
branch_labels = None
depends_on = None

def upgrade():
    connection = op.get_bind()
    
    # 1. Enforce classes.code VARCHAR(50)
    result = connection.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'code'"))
    if not result.fetchone():
        op.add_column('classes', sa.Column('code', sa.String(length=50), nullable=True))

    # 2. Enforce class_teacher_mappings table
    result = connection.execute(sa.text("SELECT table_name FROM information_schema.tables WHERE table_name = 'class_teacher_mappings'"))
    if not result.fetchone():
        op.create_table('class_teacher_mappings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('class_id', sa.Integer(), nullable=False),
            sa.Column('teacher_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    # 3. Cast notification IDs to pure INTEGER formats
    # Truncate notifications table to avoid UUID conversion errors
    op.execute("TRUNCATE TABLE notifications CASCADE")
    
    # Drop primary key constraint
    op.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_pkey")
    
    # Alter column type to INTEGER
    op.execute("ALTER TABLE notifications ALTER COLUMN id TYPE INTEGER USING (id::integer)")
    
    # Create sequence and set default value
    op.execute("CREATE SEQUENCE IF NOT EXISTS notifications_id_seq")
    op.execute("ALTER TABLE notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq')")
    
    # Re-add primary key constraint
    op.execute("ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id)")


def downgrade():
    pass
