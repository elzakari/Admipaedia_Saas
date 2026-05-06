"""Add missing class_id to enhanced_grades table

Revision ID: 4f8a9b2c1d3e
Revises: a63c99909932
Create Date: 2024-01-28 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '4f8a9b2c1d3e'
down_revision = 'a63c99909932'
branch_labels = None
depends_on = None

def upgrade():
    # Check if class_id column already exists to avoid DuplicateColumn error
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('enhanced_grades')]
    
    if 'class_id' not in columns:
        # Add missing class_id column to enhanced_grades
        op.add_column('enhanced_grades', sa.Column('class_id', sa.Integer(), nullable=True))
        
        # Add foreign key constraint for class_id with CASCADE delete
        op.create_foreign_key(
            'fk_enhanced_grades_class_id',
            'enhanced_grades', 'classes',
            ['class_id'], ['id'],
            ondelete='CASCADE'
        )
        
        # Populate class_id from student records
        op.execute("""
            UPDATE enhanced_grades 
            SET class_id = students.class_id 
            FROM students 
            WHERE enhanced_grades.student_id = students.id
            AND students.class_id IS NOT NULL
        """)
        
        # Make class_id non-nullable after populating data
        op.alter_column('enhanced_grades', 'class_id', nullable=False)

def downgrade():
    # Check if constraint exists before trying to drop it
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get foreign key constraints for enhanced_grades table
    foreign_keys = inspector.get_foreign_keys('enhanced_grades')
    constraint_names = [fk['name'] for fk in foreign_keys]
    
    # Only drop constraint if it exists
    if 'fk_enhanced_grades_class_id' in constraint_names:
        op.drop_constraint('fk_enhanced_grades_class_id', 'enhanced_grades', type_='foreignkey')
    
    # Check if class_id column exists before trying to drop it
    columns = [col['name'] for col in inspector.get_columns('enhanced_grades')]
    if 'class_id' in columns:
        op.drop_column('enhanced_grades', 'class_id')