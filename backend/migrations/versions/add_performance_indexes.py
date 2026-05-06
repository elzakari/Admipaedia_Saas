"""Add performance indexes for frequently queried fields

Revision ID: add_performance_indexes
Revises: 2505e0eb938c
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = '2505e0eb938c'  # Latest migration from the list
branch_labels = None
depends_on = None

def upgrade():
    """Add strategic indexes for performance optimization"""
    
    # === USER MODEL INDEXES ===
    # Frequently queried for authentication and user lookups
    op.create_index('idx_users_username', 'users', ['username'])
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_status', 'users', ['status'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_last_login', 'users', ['last_login'])
    
    # === STUDENT MODEL INDEXES ===
    # Critical for student lookups and relationships
    op.create_index('idx_students_user_id', 'students', ['user_id'])
    op.create_index('idx_students_admission_number', 'students', ['admission_number'])
    op.create_index('idx_students_class_id', 'students', ['class_id'])
    op.create_index('idx_students_parent_id', 'students', ['parent_id'])
    op.create_index('idx_students_first_name', 'students', ['first_name'])
    op.create_index('idx_students_last_name', 'students', ['last_name'])
    op.create_index('idx_students_date_of_birth', 'students', ['date_of_birth'])
    op.create_index('idx_students_gender', 'students', ['gender'])
    
    # === TEACHER MODEL INDEXES ===
    # Essential for teacher lookups and assignments
    op.create_index('idx_teachers_user_id', 'teachers', ['user_id'])
    op.create_index('idx_teachers_employee_id', 'teachers', ['employee_id'])
    op.create_index('idx_teachers_status', 'teachers', ['status'])
    op.create_index('idx_teachers_first_name', 'teachers', ['first_name'])
    op.create_index('idx_teachers_last_name', 'teachers', ['last_name'])
    
    # === CLASS MODEL INDEXES ===
    # Important for class-based queries
    op.create_index('idx_classes_teacher_id', 'classes', ['teacher_id'])
    op.create_index('idx_classes_academic_year', 'classes', ['academic_year'])
    op.create_index('idx_classes_grade_level', 'classes', ['grade_level'])
    op.create_index('idx_classes_status', 'classes', ['status'])
    op.create_index('idx_classes_educational_level_id', 'classes', ['educational_level_id'])
    
    # === ATTENDANCE MODEL INDEXES ===
    # Critical for attendance tracking and reports
    op.create_index('idx_attendances_student_id', 'attendances', ['student_id'])
    op.create_index('idx_attendances_class_id', 'attendances', ['class_id'])
    op.create_index('idx_attendances_subject_id', 'attendances', ['subject_id'])
    op.create_index('idx_attendances_date', 'attendances', ['date'])
    op.create_index('idx_attendances_status', 'attendances', ['status'])
    op.create_index('idx_attendances_recorded_by', 'attendances', ['recorded_by'])
    # Composite indexes for common query patterns
    op.create_index('idx_attendances_student_date', 'attendances', ['student_id', 'date'])
    op.create_index('idx_attendances_class_date', 'attendances', ['class_id', 'date'])
    op.create_index('idx_attendances_date_status', 'attendances', ['date', 'status'])
    
    # === GRADE MODEL INDEXES ===
    # Essential for grade tracking and analytics
    op.create_index('idx_grades_student_id', 'grades', ['student_id'])
    op.create_index('idx_grades_exam_id', 'grades', ['exam_id'])
    op.create_index('idx_grades_subject_id', 'grades', ['subject_id'])
    op.create_index('idx_grades_class_id', 'grades', ['class_id'])
    op.create_index('idx_grades_graded_by', 'grades', ['graded_by'])
    op.create_index('idx_grades_term', 'grades', ['term'])
    op.create_index('idx_grades_academic_year', 'grades', ['academic_year'])
    op.create_index('idx_grades_assessment_type', 'grades', ['assessment_type'])
    op.create_index('idx_grades_is_final', 'grades', ['is_final'])
    # Composite indexes for analytics queries
    op.create_index('idx_grades_student_term_year', 'grades', ['student_id', 'term', 'academic_year'])
    op.create_index('idx_grades_class_subject_term', 'grades', ['class_id', 'subject_id', 'term'])
    
    # === EXAM MODEL INDEXES ===
    # Important for exam scheduling and management
    op.create_index('idx_exams_class_id', 'exams', ['class_id'])
    op.create_index('idx_exams_subject_id', 'exams', ['subject_id'])
    op.create_index('idx_exams_created_by', 'exams', ['created_by'])
    op.create_index('idx_exams_exam_date', 'exams', ['exam_date'])
    op.create_index('idx_exams_status', 'exams', ['status'])
    # Composite index for upcoming exams queries
    op.create_index('idx_exams_date_status', 'exams', ['exam_date', 'status'])
    op.create_index('idx_exams_class_date', 'exams', ['class_id', 'exam_date'])
    
    # === NOTIFICATION MODEL INDEXES ===
    # Critical for notification delivery and management
    op.create_index('idx_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('idx_notifications_read', 'notifications', ['read'])
    op.create_index('idx_notifications_type', 'notifications', ['type'])
    op.create_index('idx_notifications_time', 'notifications', ['time'])
    op.create_index('idx_notifications_created_at', 'notifications', ['created_at'])
    # Composite indexes for notification queries
    op.create_index('idx_notifications_user_read', 'notifications', ['user_id', 'read'])
    op.create_index('idx_notifications_user_time', 'notifications', ['user_id', 'time'])
    
    # === PARENT MODEL INDEXES ===
    # Important for parent-student relationships
    op.create_index('idx_parents_user_id', 'parents', ['user_id'])
    
    # === ASSIGNMENT MODEL INDEXES ===
    # Essential for assignment management
    op.create_index('idx_assignments_class_id', 'assignments', ['class_id'])
    op.create_index('idx_assignments_subject_id', 'assignments', ['subject_id'])
    op.create_index('idx_assignments_teacher_id', 'assignments', ['teacher_id'])
    op.create_index('idx_assignments_due_date', 'assignments', ['due_date'])
    op.create_index('idx_assignments_status', 'assignments', ['status'])
    op.create_index('idx_assignments_assignment_type', 'assignments', ['assignment_type'])
    
    # === ASSIGNMENT SUBMISSION INDEXES ===
    # Critical for submission tracking
    op.create_index('idx_assignment_submissions_assignment_id', 'assignment_submissions', ['assignment_id'])
    op.create_index('idx_assignment_submissions_student_id', 'assignment_submissions', ['student_id'])
    op.create_index('idx_assignment_submissions_status', 'assignment_submissions', ['status'])
    op.create_index('idx_assignment_submissions_graded_by', 'assignment_submissions', ['graded_by'])
    op.create_index('idx_assignment_submissions_submission_date', 'assignment_submissions', ['submission_date'])
    
    # === ANNOUNCEMENT MODEL INDEXES ===
    # Important for announcement delivery
    op.create_index('idx_announcements_class_id', 'announcements', ['class_id'])
    op.create_index('idx_announcements_teacher_id', 'announcements', ['teacher_id'])
    # op.create_index('idx_announcements_is_published', 'announcements', ['is_published'])
    # op.create_index('idx_announcements_scheduled_date', 'announcements', ['scheduled_date'])
    # op.create_index('idx_announcements_target_roles', 'announcements', ['target_roles'])
    
    # === MESSAGE MODEL INDEXES ===
    # Critical for messaging system
    op.create_index('idx_messages_sender_id', 'messages', ['sender_id'])
    op.create_index('idx_messages_recipient_id', 'messages', ['recipient_id'])
    op.create_index('idx_messages_sender_type', 'messages', ['sender_type'])
    op.create_index('idx_messages_recipient_type', 'messages', ['recipient_type'])
    op.create_index('idx_messages_is_read', 'messages', ['is_read'])
    op.create_index('idx_messages_created_at', 'messages', ['created_at'])
    # Composite indexes for message queries
    op.create_index('idx_messages_recipient_read', 'messages', ['recipient_id', 'is_read'])
    op.create_index('idx_messages_sender_created', 'messages', ['sender_id', 'created_at'])
    
    # === LOGIN HISTORY INDEXES ===
    # Important for security and analytics
    op.create_index('idx_login_history_user_id', 'login_history', ['user_id'])
    op.create_index('idx_login_history_login_timestamp', 'login_history', ['login_timestamp'])
    op.create_index('idx_login_history_success', 'login_history', ['success'])
    op.create_index('idx_login_history_ip_address', 'login_history', ['ip_address'])
    
    # === ASSOCIATION TABLE INDEXES ===
    # Critical for many-to-many relationships
    op.create_index('idx_user_roles_user_id', 'user_roles', ['user_id'])
    op.create_index('idx_user_roles_role_id', 'user_roles', ['role_id'])
    op.create_index('idx_teacher_subjects_teacher_id', 'teacher_subjects', ['teacher_id'])
    op.create_index('idx_teacher_subjects_subject_id', 'teacher_subjects', ['subject_id'])
    op.create_index('idx_class_subjects_class_id', 'class_subjects', ['class_id'])
    op.create_index('idx_class_subjects_subject_id', 'class_subjects', ['subject_id'])
    
    # === LIBRARY MODEL INDEXES ===
    # Important for library management
    op.create_index('idx_books_title', 'books', ['title'])
    op.create_index('idx_books_author', 'books', ['author'])
    op.create_index('idx_books_isbn', 'books', ['isbn'])
    op.create_index('idx_books_category', 'books', ['category'])
    op.create_index('idx_books_status', 'books', ['status'])
    op.create_index('idx_library_members_member_id', 'library_members', ['member_id'])
    op.create_index('idx_library_members_user_id', 'library_members', ['user_id'])
    op.create_index('idx_library_members_is_active', 'library_members', ['is_active'])
    op.create_index('idx_borrow_records_book_id', 'borrow_records', ['book_id'])
    op.create_index('idx_borrow_records_member_id', 'borrow_records', ['member_id'])
    op.create_index('idx_borrow_records_status', 'borrow_records', ['status'])
    op.create_index('idx_borrow_records_due_date', 'borrow_records', ['due_date'])
    op.create_index('idx_borrow_records_return_date', 'borrow_records', ['return_date'])
    
    # === ADMINISTRATION MODEL INDEXES ===
    # Important for financial and facility management
    op.create_index('idx_transactions_transaction_type', 'transactions', ['transaction_type'])
    op.create_index('idx_transactions_transaction_date', 'transactions', ['transaction_date'])
    op.create_index('idx_transactions_created_by', 'transactions', ['created_by'])
    op.create_index('idx_transactions_reference_number', 'transactions', ['reference_number'])
    op.create_index('idx_fee_structures_grade_level', 'fee_structures', ['grade_level'])
    op.create_index('idx_fee_structures_academic_year', 'fee_structures', ['academic_year'])
    op.create_index('idx_fee_structures_term', 'fee_structures', ['term'])
    op.create_index('idx_fee_structures_is_active', 'fee_structures', ['is_active'])
    
    # === TIMESTAMP INDEXES ===
    # Important for audit trails and data management
    op.create_index('idx_students_created_at', 'students', ['created_at'])
    op.create_index('idx_teachers_created_at', 'teachers', ['created_at'])
    op.create_index('idx_classes_created_at', 'classes', ['created_at'])
    op.create_index('idx_grades_created_at', 'grades', ['created_at'])
    op.create_index('idx_exams_created_at', 'exams', ['created_at'])
    
    print("✅ Performance indexes created successfully!")

def downgrade():
    """Remove all performance indexes"""
    
    # === USER MODEL INDEXES ===
    op.drop_index('idx_users_username', 'users')
    op.drop_index('idx_users_email', 'users')
    op.drop_index('idx_users_status', 'users')
    op.drop_index('idx_users_role', 'users')
    op.drop_index('idx_users_last_login', 'users')
    
    # === STUDENT MODEL INDEXES ===
    op.drop_index('idx_students_user_id', 'students')
    op.drop_index('idx_students_admission_number', 'students')
    op.drop_index('idx_students_class_id', 'students')
    op.drop_index('idx_students_parent_id', 'students')
    op.drop_index('idx_students_first_name', 'students')
    op.drop_index('idx_students_last_name', 'students')
    op.drop_index('idx_students_date_of_birth', 'students')
    op.drop_index('idx_students_gender', 'students')
    
    # === TEACHER MODEL INDEXES ===
    op.drop_index('idx_teachers_user_id', 'teachers')
    op.drop_index('idx_teachers_employee_id', 'teachers')
    op.drop_index('idx_teachers_status', 'teachers')
    op.drop_index('idx_teachers_first_name', 'teachers')
    op.drop_index('idx_teachers_last_name', 'teachers')
    
    # === CLASS MODEL INDEXES ===
    op.drop_index('idx_classes_teacher_id', 'classes')
    op.drop_index('idx_classes_academic_year', 'classes')
    op.drop_index('idx_classes_grade_level', 'classes')
    op.drop_index('idx_classes_status', 'classes')
    op.drop_index('idx_classes_educational_level_id', 'classes')
    
    # === ATTENDANCE MODEL INDEXES ===
    op.drop_index('idx_attendances_student_id', 'attendances')
    op.drop_index('idx_attendances_class_id', 'attendances')
    op.drop_index('idx_attendances_subject_id', 'attendances')
    op.drop_index('idx_attendances_date', 'attendances')
    op.drop_index('idx_attendances_status', 'attendances')
    op.drop_index('idx_attendances_recorded_by', 'attendances')
    op.drop_index('idx_attendances_student_date', 'attendances')
    op.drop_index('idx_attendances_class_date', 'attendances')
    op.drop_index('idx_attendances_date_status', 'attendances')
    
    # === GRADE MODEL INDEXES ===
    op.drop_index('idx_grades_student_id', 'grades')
    op.drop_index('idx_grades_exam_id', 'grades')
    op.drop_index('idx_grades_subject_id', 'grades')
    op.drop_index('idx_grades_class_id', 'grades')
    op.drop_index('idx_grades_graded_by', 'grades')
    op.drop_index('idx_grades_term', 'grades')
    op.drop_index('idx_grades_academic_year', 'grades')
    op.drop_index('idx_grades_assessment_type', 'grades')
    op.drop_index('idx_grades_is_final', 'grades')
    op.drop_index('idx_grades_student_term_year', 'grades')
    op.drop_index('idx_grades_class_subject_term', 'grades')
    
    # === EXAM MODEL INDEXES ===
    op.drop_index('idx_exams_class_id', 'exams')
    op.drop_index('idx_exams_subject_id', 'exams')
    op.drop_index('idx_exams_created_by', 'exams')
    op.drop_index('idx_exams_exam_date', 'exams')
    op.drop_index('idx_exams_status', 'exams')
    op.drop_index('idx_exams_date_status', 'exams')
    op.drop_index('idx_exams_class_date', 'exams')
    
    # === NOTIFICATION MODEL INDEXES ===
    op.drop_index('idx_notifications_user_id', 'notifications')
    op.drop_index('idx_notifications_read', 'notifications')
    op.drop_index('idx_notifications_type', 'notifications')
    op.drop_index('idx_notifications_time', 'notifications')
    op.drop_index('idx_notifications_created_at', 'notifications')
    op.drop_index('idx_notifications_user_read', 'notifications')
    op.drop_index('idx_notifications_user_time', 'notifications')
    
    # === PARENT MODEL INDEXES ===
    op.drop_index('idx_parents_user_id', 'parents')
    
    # === ASSIGNMENT MODEL INDEXES ===
    op.drop_index('idx_assignments_class_id', 'assignments')
    op.drop_index('idx_assignments_subject_id', 'assignments')
    op.drop_index('idx_assignments_teacher_id', 'assignments')
    op.drop_index('idx_assignments_due_date', 'assignments')
    op.drop_index('idx_assignments_status', 'assignments')
    op.drop_index('idx_assignments_assignment_type', 'assignments')
    
    # === ASSIGNMENT SUBMISSION INDEXES ===
    op.drop_index('idx_assignment_submissions_assignment_id', 'assignment_submissions')
    op.drop_index('idx_assignment_submissions_student_id', 'assignment_submissions')
    op.drop_index('idx_assignment_submissions_status', 'assignment_submissions')
    op.drop_index('idx_assignment_submissions_graded_by', 'assignment_submissions')
    op.drop_index('idx_assignment_submissions_submission_date', 'assignment_submissions')
    
    # === ANNOUNCEMENT MODEL INDEXES ===
    op.drop_index('idx_announcements_class_id', 'announcements')
    op.drop_index('idx_announcements_teacher_id', 'announcements')
    # op.drop_index('idx_announcements_is_published', 'announcements')
    # op.drop_index('idx_announcements_scheduled_date', 'announcements')
    # op.drop_index('idx_announcements_target_roles', 'announcements')
    
    # === MESSAGE MODEL INDEXES ===
    op.drop_index('idx_messages_sender_id', 'messages')
    op.drop_index('idx_messages_recipient_id', 'messages')
    op.drop_index('idx_messages_sender_type', 'messages')
    op.drop_index('idx_messages_recipient_type', 'messages')
    op.drop_index('idx_messages_is_read', 'messages')
    op.drop_index('idx_messages_created_at', 'messages')
    op.drop_index('idx_messages_recipient_read', 'messages')
    op.drop_index('idx_messages_sender_created', 'messages')
    
    # === LOGIN HISTORY INDEXES ===
    op.drop_index('idx_login_history_user_id', 'login_history')
    op.drop_index('idx_login_history_login_timestamp', 'login_history')
    op.drop_index('idx_login_history_success', 'login_history')
    op.drop_index('idx_login_history_ip_address', 'login_history')
    
    # === ASSOCIATION TABLE INDEXES ===
    op.drop_index('idx_user_roles_user_id', 'user_roles')
    op.drop_index('idx_user_roles_role_id', 'user_roles')
    op.drop_index('idx_teacher_subjects_teacher_id', 'teacher_subjects')
    op.drop_index('idx_teacher_subjects_subject_id', 'teacher_subjects')
    op.drop_index('idx_class_subjects_class_id', 'class_subjects')
    op.drop_index('idx_class_subjects_subject_id', 'class_subjects')
    
    # === LIBRARY MODEL INDEXES ===
    op.drop_index('idx_books_title', 'books')
    op.drop_index('idx_books_author', 'books')
    op.drop_index('idx_books_isbn', 'books')
    op.drop_index('idx_books_category', 'books')
    op.drop_index('idx_books_status', 'books')
    op.drop_index('idx_library_members_member_id', 'library_members')
    op.drop_index('idx_library_members_user_id', 'library_members')
    op.drop_index('idx_library_members_is_active', 'library_members')
    op.drop_index('idx_borrow_records_book_id', 'borrow_records')
    op.drop_index('idx_borrow_records_member_id', 'borrow_records')
    op.drop_index('idx_borrow_records_status', 'borrow_records')
    op.drop_index('idx_borrow_records_due_date', 'borrow_records')
    op.drop_index('idx_borrow_records_return_date', 'borrow_records')
    
    # === ADMINISTRATION MODEL INDEXES ===
    op.drop_index('idx_transactions_transaction_type', 'transactions')
    op.drop_index('idx_transactions_transaction_date', 'transactions')
    op.drop_index('idx_transactions_created_by', 'transactions')
    op.drop_index('idx_transactions_reference_number', 'transactions')
    op.drop_index('idx_fee_structures_grade_level', 'fee_structures')
    op.drop_index('idx_fee_structures_academic_year', 'fee_structures')
    op.drop_index('idx_fee_structures_term', 'fee_structures')
    op.drop_index('idx_fee_structures_is_active', 'fee_structures')
    
    # === TIMESTAMP INDEXES ===
    op.drop_index('idx_students_created_at', 'students')
    op.drop_index('idx_teachers_created_at', 'teachers')
    op.drop_index('idx_classes_created_at', 'classes')
    op.drop_index('idx_grades_created_at', 'grades')
    op.drop_index('idx_exams_created_at', 'exams')
    
    print("✅ Performance indexes removed successfully!")