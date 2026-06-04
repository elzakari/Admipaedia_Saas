"""harmonize_production_schema

Revision ID: 20260604_2015_harmonize_production_schema
Revises: 20260604_bfa_apc
Create Date: 2026-06-04 20:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260604_2015_harmonize_production_schema'
down_revision = '20260604_bfa_apc'
branch_labels = None
depends_on = None

def upgrade():
    connection = op.get_bind()
    
    # 1. Classes.code safely appended
    result = connection.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'code'"))
    if not result.fetchone():
        op.add_column('classes', sa.Column('code', sa.String(length=50), nullable=True))

    # 2. Class_teacher_mappings table configuration
    result = connection.execute(sa.text("SELECT table_name FROM information_schema.tables WHERE table_name = 'class_teacher_mappings'"))
    if not result.fetchone():
        op.create_table('class_teacher_mappings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('class_id', sa.Integer(), nullable=False),
            sa.Column('teacher_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('class_id', 'teacher_id', name='class_teacher_mappings_class_teacher_key')
        )
    else:
        # Check and add unique constraint if missing
        result_uc = connection.execute(sa.text("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'class_teacher_mappings' AND constraint_name = 'class_teacher_mappings_class_teacher_key'"))
        if not result_uc.fetchone():
            op.create_unique_constraint(
                'class_teacher_mappings_class_teacher_key',
                'class_teacher_mappings',
                ['class_id', 'teacher_id']
            )

    # Legacy dataset backfill insert query
    op.execute("""
        INSERT INTO class_teacher_mappings (class_id, teacher_id)
        SELECT c.id, t.user_id
        FROM classes c
        JOIN teachers t ON c.teacher_id = t.id
        ON CONFLICT (class_id, teacher_id) DO NOTHING
    """)

    # 3. Class_subjects.id sequence and column assignment
    op.execute("CREATE SEQUENCE IF NOT EXISTS class_subjects_id_seq")
    result_id = connection.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = 'class_subjects' AND column_name = 'id'"))
    if not result_id.fetchone():
        op.add_column('class_subjects', sa.Column('id', sa.Integer(), nullable=True))
        op.execute("UPDATE class_subjects SET id = nextval('class_subjects_id_seq') WHERE id IS NULL")
        op.alter_column('class_subjects', 'id', nullable=False, server_default=sa.text("nextval('class_subjects_id_seq')"))

    # 4. Notifications.recipient_id cast validation and FK setup
    # Fail aggressively if there are any non-numeric records in recipient_id
    result_non_numeric = connection.execute(sa.text("SELECT id, recipient_id FROM notifications WHERE recipient_id IS NOT NULL AND recipient_id::text !~ '^[0-9]+$'")).fetchall()
    if result_non_numeric:
        raise ValueError(f"CRITICAL DATA CORRUPTION PREVENTED: Non-numeric values found in notifications.recipient_id, unable to cast: {result_non_numeric}")

    # Check if recipient_id is already an integer
    res_type = connection.execute(sa.text("SELECT data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id'")).fetchone()
    if res_type and res_type[0].lower() != 'integer':
        # Drop existing FK constraints if they exist
        op.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_recipient_id")
        op.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey")

        # Alter column type to INTEGER
        op.execute("ALTER TABLE notifications ALTER COLUMN recipient_id TYPE INTEGER USING (recipient_id::integer)")

    # Bind new FK constraint
    # First drop it to prevent duplicates
    op.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_recipient_id")
    op.create_foreign_key(
        'fk_notifications_recipient_id',
        'notifications',
        'users',
        ['recipient_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    pass
