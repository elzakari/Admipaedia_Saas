"""fix_all_class_foreign_key_constraints

Revision ID: a63c99909932
Revises: 0b4b9763b6ff
Create Date: 2025-08-28 13:19:25.264893

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a63c99909932'
down_revision = '0b4b9763b6ff'
branch_labels = None
depends_on = None


def upgrade():
    # Fix students.class_id - should be SET NULL (students can exist without a class)
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_constraint('students_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('students_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='SET NULL')
    
    # Fix attendances.class_id - should be CASCADE (attendance records are meaningless without a class)
    with op.batch_alter_table('attendances', schema=None) as batch_op:
        batch_op.drop_constraint('attendances_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('attendances_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix exams.class_id - should be CASCADE (exams are class-specific)
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.drop_constraint('exams_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('exams_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix grades.class_id - should be CASCADE (grades are tied to class context)
    # NOTE: The actual constraint name is 'fk_grades_class_id', not 'grades_class_id_fkey'
    with op.batch_alter_table('grades', schema=None) as batch_op:
        batch_op.drop_constraint('fk_grades_class_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_grades_class_id', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix assignments.class_id - should be CASCADE (assignments are class-specific)
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.drop_constraint('assignments_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('assignments_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Fix class_subjects association table - should be CASCADE
    with op.batch_alter_table('class_subjects', schema=None) as batch_op:
        batch_op.drop_constraint('class_subjects_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('class_subjects_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # Note: The following tables were not found in the current database constraints:
    # - character_assessments, assessment_tasks, rubric_assessments, enhanced_grades, final_grades, stem_resource_bookings
    # These might not exist yet or have different names. Commenting them out for now.
    
    # # Fix character_assessments.class_id - should be CASCADE
    # with op.batch_alter_table('character_assessments', schema=None) as batch_op:
    #     batch_op.drop_constraint('character_assessments_class_id_fkey', type_='foreignkey')
    #     batch_op.create_foreign_key('character_assessments_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # # Fix assessment_tasks.class_id - should be CASCADE
    # with op.batch_alter_table('assessment_tasks', schema=None) as batch_op:
    #     batch_op.drop_constraint('assessment_tasks_class_id_fkey', type_='foreignkey')
    #     batch_op.create_foreign_key('assessment_tasks_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # # Fix rubric_assessments.class_id - should be CASCADE
    # with op.batch_alter_table('rubric_assessments', schema=None) as batch_op:
    #     batch_op.drop_constraint('rubric_assessments_class_id_fkey', type_='foreignkey')
    #     batch_op.create_foreign_key('rubric_assessments_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # # Fix enhanced_grades.class_id - should be CASCADE
    # with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
    #     batch_op.drop_constraint('enhanced_grades_class_id_fkey', type_='foreignkey')
    #     batch_op.create_foreign_key('enhanced_grades_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # # Fix final_grades.class_id - should be CASCADE
    # with op.batch_alter_table('final_grades', schema=None) as batch_op:
    #     batch_op.drop_constraint('final_grades_class_id_fkey', type_='foreignkey')
    #     batch_op.create_foreign_key('final_grades_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='CASCADE')
    
    # # Fix stem_resource_bookings.class_id - should be SET NULL (bookings can exist without class)
    # with op.batch_alter_table('stem_resource_bookings', schema=None) as batch_op:
    #     batch_op.drop_constraint('stem_resource_bookings_class_id_fkey', type_='foreignkey')
    #     batch_op.create_foreign_key('stem_resource_bookings_class_id_fkey', 'classes', ['class_id'], ['id'], ondelete='SET NULL')


def downgrade():
    # Reverse all the changes by removing ondelete clauses
    # Note: Only reversing the constraints that actually exist
    
    with op.batch_alter_table('class_subjects', schema=None) as batch_op:
        batch_op.drop_constraint('class_subjects_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('class_subjects_class_id_fkey', 'classes', ['class_id'], ['id'])
    
    with op.batch_alter_table('assignments', schema=None) as batch_op:
        batch_op.drop_constraint('assignments_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('assignments_class_id_fkey', 'classes', ['class_id'], ['id'])
    
    with op.batch_alter_table('grades', schema=None) as batch_op:
        batch_op.drop_constraint('fk_grades_class_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_grades_class_id', 'classes', ['class_id'], ['id'])
    
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.drop_constraint('exams_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('exams_class_id_fkey', 'classes', ['class_id'], ['id'])
    
    with op.batch_alter_table('attendances', schema=None) as batch_op:
        batch_op.drop_constraint('attendances_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('attendances_class_id_fkey', 'classes', ['class_id'], ['id'])
    
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_constraint('students_class_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key('students_class_id_fkey', 'classes', ['class_id'], ['id'])
