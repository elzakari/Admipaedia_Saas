from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_awards_achievements_column'
down_revision = 'e9f135f4101a'  # This points to the most recent migration
branch_labels = None
depends_on = None

def upgrade():
    # Add the missing column to students table
    op.add_column('students', sa.Column('awards_achievements', sa.Text(), nullable=True))

def downgrade():
    # Remove column if needed to rollback
    op.drop_column('students', 'awards_achievements')