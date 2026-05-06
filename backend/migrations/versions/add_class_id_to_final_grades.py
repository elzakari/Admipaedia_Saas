"""Add class_id to final_grades and fix column schema mismatch

Revision ID: add_class_id_final
Revises: 226fabe1098f
Create Date: 2025-01-28 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_class_id_final'
down_revision = '226fabe1098f'  # Fixed: was 'migrate_departments'
branch_labels = None
depends_on = None

def upgrade():
    # Step 1: Add new columns with correct names
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('final_grades')]
    
    with op.batch_alter_table('final_grades', schema=None) as batch_op:
        # Add the new columns that the model expects (only if they don't exist)
        if 'class_score_average' not in existing_columns:
            batch_op.add_column(sa.Column('class_score_average', sa.Float(), nullable=True))
        if 'external_exam_score' not in existing_columns:
            batch_op.add_column(sa.Column('external_exam_score', sa.Float(), nullable=True))
        if 'final_percentage' not in existing_columns:
            batch_op.add_column(sa.Column('final_percentage', sa.Float(), nullable=True))
        if 'final_grade_symbol' not in existing_columns:
            batch_op.add_column(sa.Column('final_grade_symbol', sa.String(5), nullable=True))
        if 'final_grade_points' not in existing_columns:
            batch_op.add_column(sa.Column('final_grade_points', sa.Float(), nullable=True))
        if 'is_passing' not in existing_columns:
            batch_op.add_column(sa.Column('is_passing', sa.Boolean(), nullable=True))
        if 'class_rank' not in existing_columns:
            batch_op.add_column(sa.Column('class_rank', sa.Integer(), nullable=True))
        if 'subject_rank' not in existing_columns:
            batch_op.add_column(sa.Column('subject_rank', sa.Integer(), nullable=True))
        if 'conduct_grade' not in existing_columns:
            batch_op.add_column(sa.Column('conduct_grade', sa.String(5), nullable=True))
        if 'interest_grade' not in existing_columns:
            batch_op.add_column(sa.Column('interest_grade', sa.String(5), nullable=True))
        if 'teacher_remarks' not in existing_columns:
            batch_op.add_column(sa.Column('teacher_remarks', sa.Text(), nullable=True))
        if 'computed_at' not in existing_columns:
            batch_op.add_column(sa.Column('computed_at', sa.DateTime(), nullable=True))
        if 'computed_by' not in existing_columns:
            batch_op.add_column(sa.Column('computed_by', sa.Integer(), nullable=True))
    
    # Step 2: Copy data from old columns to new columns (only if old columns exist)
    if 'class_score' in existing_columns:
        op.execute("""
            UPDATE final_grades SET 
                class_score_average = class_score,
                external_exam_score = external_score,
                final_percentage = final_score,
                final_grade_symbol = final_grade,
                final_grade_points = grade_point,
                is_passing = CASE WHEN final_score >= 50 THEN true ELSE false END,
                computed_at = COALESCE(updated_at, created_at, NOW()),
                computed_by = 1
        """)
    
    # Step 3: Make critical columns non-nullable
    with op.batch_alter_table('final_grades', schema=None) as batch_op:
        if 'final_percentage' in existing_columns or 'final_percentage' in [col['name'] for col in inspector.get_columns('final_grades')]:
            batch_op.alter_column('final_percentage', nullable=False)
        if 'final_grade_symbol' in existing_columns or 'final_grade_symbol' in [col['name'] for col in inspector.get_columns('final_grades')]:
            batch_op.alter_column('final_grade_symbol', nullable=False)
        if 'is_passing' in existing_columns or 'is_passing' in [col['name'] for col in inspector.get_columns('final_grades')]:
            batch_op.alter_column('is_passing', nullable=False)
        if 'computed_at' in existing_columns or 'computed_at' in [col['name'] for col in inspector.get_columns('final_grades')]:
            batch_op.alter_column('computed_at', nullable=False)
    
    # Step 4: Drop old columns (only if they exist)
    updated_columns = [col['name'] for col in inspector.get_columns('final_grades')]
    with op.batch_alter_table('final_grades', schema=None) as batch_op:
        if 'class_score' in updated_columns:
            batch_op.drop_column('class_score')
        if 'external_score' in updated_columns:
            batch_op.drop_column('external_score')
        if 'final_score' in updated_columns:
            batch_op.drop_column('final_score')
        if 'final_grade' in updated_columns:
            batch_op.drop_column('final_grade')
        if 'grade_point' in updated_columns:
            batch_op.drop_column('grade_point')
    
    # Step 5: Add foreign key constraint for computed_by
    foreign_keys = inspector.get_foreign_keys('final_grades')
    constraint_names = [fk['name'] for fk in foreign_keys]
    
    with op.batch_alter_table('final_grades', schema=None) as batch_op:
        if 'fk_final_grades_computed_by' not in constraint_names:
            batch_op.create_foreign_key('fk_final_grades_computed_by', 'users', ['computed_by'], ['id'], ondelete='SET NULL')

def downgrade():
    # Check if constraint exists before trying to drop it
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get foreign key constraints for final_grades table
    foreign_keys = inspector.get_foreign_keys('final_grades')
    constraint_names = [fk['name'] for fk in foreign_keys]
    
    # Get existing columns
    existing_columns = [col['name'] for col in inspector.get_columns('final_grades')]
    
    # Reverse the operations
    with op.batch_alter_table('final_grades', schema=None) as batch_op:
        # Only drop foreign key constraint if it exists
        if 'fk_final_grades_computed_by' in constraint_names:
            batch_op.drop_constraint('fk_final_grades_computed_by', type_='foreignkey')
        
        # Add back old columns (only if they don't exist)
        if 'class_score' not in existing_columns:
            batch_op.add_column(sa.Column('class_score', sa.Float(), nullable=True))
        if 'external_score' not in existing_columns:
            batch_op.add_column(sa.Column('external_score', sa.Float(), nullable=True))
        if 'final_score' not in existing_columns:
            batch_op.add_column(sa.Column('final_score', sa.Float(), nullable=False))
        if 'final_grade' not in existing_columns:
            batch_op.add_column(sa.Column('final_grade', sa.String(5), nullable=False))
        if 'grade_point' not in existing_columns:
            batch_op.add_column(sa.Column('grade_point', sa.Float(), nullable=True))
    
    # Copy data back (only if new columns exist)
    if 'class_score_average' in existing_columns:
        op.execute("""
            UPDATE final_grades SET 
                class_score = class_score_average,
                external_score = external_exam_score,
                final_score = final_percentage,
                final_grade = final_grade_symbol,
                grade_point = final_grade_points
        """)
    
    # Drop new columns (only if they exist)
    updated_columns = [col['name'] for col in inspector.get_columns('final_grades')]
    with op.batch_alter_table('final_grades', schema=None) as batch_op:
        if 'computed_by' in updated_columns:
            batch_op.drop_column('computed_by')
        if 'computed_at' in updated_columns:
            batch_op.drop_column('computed_at')
        if 'teacher_remarks' in updated_columns:
            batch_op.drop_column('teacher_remarks')
        if 'interest_grade' in updated_columns:
            batch_op.drop_column('interest_grade')
        if 'conduct_grade' in updated_columns:
            batch_op.drop_column('conduct_grade')
        if 'subject_rank' in updated_columns:
            batch_op.drop_column('subject_rank')
        if 'class_rank' in updated_columns:
            batch_op.drop_column('class_rank')
        if 'is_passing' in updated_columns:
            batch_op.drop_column('is_passing')
        if 'final_grade_points' in updated_columns:
            batch_op.drop_column('final_grade_points')
        if 'final_grade_symbol' in updated_columns:
            batch_op.drop_column('final_grade_symbol')
        if 'final_percentage' in updated_columns:
            batch_op.drop_column('final_percentage')
        if 'external_exam_score' in updated_columns:
            batch_op.drop_column('external_exam_score')
        if 'class_score_average' in updated_columns:
            batch_op.drop_column('class_score_average')