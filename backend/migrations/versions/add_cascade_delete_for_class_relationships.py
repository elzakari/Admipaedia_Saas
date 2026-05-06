"""Add cascade delete for class relationships

Revision ID: abc123def456
Revises: f001802c6950
Create Date: 2024-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'abc123def456'
down_revision = 'f001802c6950'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_constraint('students_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(None, 'classes', ['class_id'], ['id'], ondelete='SET NULL')


def downgrade():
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('students_class_id_fkey', 'classes', ['class_id'], ['id'])