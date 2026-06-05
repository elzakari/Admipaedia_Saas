"""fix_notifications_id

Revision ID: 20260605_2300_fix_notifications_id
Revises: 20260604_2015_harmonize_production_schema
Create Date: 2026-06-05 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260605_2300_fix_notifications_id'
down_revision = '20260604_2015_harmonize_production_schema'
branch_labels = None
depends_on = None

def upgrade():
    connection = op.get_bind()
    
    # Check for non-numeric IDs first
    if connection.dialect.name == 'postgresql':
        res_type = connection.execute(sa.text(
            "SELECT data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'id'"
        )).fetchone()
        
        if res_type:
            column_type = res_type[0].lower()
            if column_type not in ('integer', 'int', 'int4'):
                # Check for non-numeric IDs
                non_numeric = connection.execute(sa.text(
                    "SELECT id FROM notifications WHERE id IS NOT NULL AND id::text !~ '^[0-9]+$'"
                )).fetchall()
                if non_numeric:
                    raise Exception("MANUAL_MIGRATION_REQUIRED: Non-numeric existing notifications.id values detected. Manual intervention is required.")
                
                # Perform conversion
                op.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_pkey")
                op.execute("ALTER TABLE notifications ALTER COLUMN id TYPE INTEGER USING (NULLIF(id, '')::INTEGER)")
                op.execute("CREATE SEQUENCE IF NOT EXISTS notifications_id_seq")
                op.execute("ALTER TABLE notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq')")
                op.execute("ALTER SEQUENCE notifications_id_seq OWNED BY notifications.id")
                op.execute("SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM notifications), false)")
                op.execute("ALTER TABLE notifications ADD PRIMARY KEY (id)")
            else:
                # Already integer, but ensure sequence and default are set up
                op.execute("CREATE SEQUENCE IF NOT EXISTS notifications_id_seq")
                res_default = connection.execute(sa.text(
                    "SELECT column_default FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'id'"
                )).fetchone()
                if not res_default or not res_default[0]:
                    op.execute("ALTER TABLE notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq')")
                op.execute("ALTER SEQUENCE notifications_id_seq OWNED BY notifications.id")
                op.execute("SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM notifications), false)")
    else:
        # SQLite or other DB
        try:
            result = connection.execute(sa.text("SELECT id FROM notifications")).fetchall()
            non_numeric = [r[0] for r in result if not str(r[0]).isdigit()]
            if non_numeric:
                raise Exception("MANUAL_MIGRATION_REQUIRED: Non-numeric existing notifications.id values detected. Manual intervention is required.")
        except sa.exc.OperationalError as e:
            if "no such table" in str(e).lower():
                pass
            else:
                raise e
        except Exception as e:
            if "MANUAL_MIGRATION_REQUIRED" in str(e):
                raise e

def downgrade():
    pass
