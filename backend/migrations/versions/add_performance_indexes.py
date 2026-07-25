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

def _table_exists(connection, table_name):
    inspector = sa.inspect(connection)
    return table_name in inspector.get_table_names()


def _column_exists(connection, table_name, column_name):
    if not _table_exists(connection, table_name):
        return False
    inspector = sa.inspect(connection)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _index_exists(connection, table_name, index_name):
    if not _table_exists(connection, table_name):
        return False
    inspector = sa.inspect(connection)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _safe_create_index(connection, index_name, table_name, columns, **kwargs):
    actual_table = table_name
    if not _table_exists(connection, actual_table):
        if table_name == 'attendance' and _table_exists(connection, 'attendances'):
            actual_table = 'attendances'
        elif table_name == 'attendances' and _table_exists(connection, 'attendance'):
            actual_table = 'attendance'
        else:
            return
    if not all(_column_exists(connection, actual_table, col) for col in columns):
        return
    if _index_exists(connection, actual_table, index_name):
        return
    op.create_index(index_name, actual_table, columns, **kwargs)


def _safe_drop_index(connection, index_name, table_name=None):
    if table_name:
        actual_table = table_name
        if not _table_exists(connection, actual_table):
            if table_name == 'attendance' and _table_exists(connection, 'attendances'):
                actual_table = 'attendances'
            elif table_name == 'attendances' and _table_exists(connection, 'attendance'):
                actual_table = 'attendance'
            else:
                return
        if _index_exists(connection, actual_table, index_name):
            try:
                op.drop_index(index_name, table_name=actual_table)
            except Exception:
                pass
    else:
        inspector = sa.inspect(connection)
        for tbl in inspector.get_table_names():
            if any(idx.get("name") == index_name for idx in inspector.get_indexes(tbl)):
                try:
                    op.drop_index(index_name, table_name=tbl)
                except Exception:
                    pass
                return


def upgrade():
    """Add strategic indexes for performance optimization"""
    connection = op.get_bind()
    
    # === USER MODEL INDEXES ===
    _safe_create_index(connection, 'idx_users_username', 'users', ['username'])
    _safe_create_index(connection, 'idx_users_email', 'users', ['email'])
    _safe_create_index(connection, 'idx_users_status', 'users', ['status'])
    _safe_create_index(connection, 'idx_users_role', 'users', ['role'])
    _safe_create_index(connection, 'idx_users_last_login', 'users', ['last_login'])
    
    # === STUDENT MODEL INDEXES ===
    _safe_create_index(connection, 'idx_students_user_id', 'students', ['user_id'])
    _safe_create_index(connection, 'idx_students_admission_number', 'students', ['admission_number'])
    _safe_create_index(connection, 'idx_students_class_id', 'students', ['class_id'])
    _safe_create_index(connection, 'idx_students_parent_id', 'students', ['parent_id'])
    _safe_create_index(connection, 'idx_students_first_name', 'students', ['first_name'])
    _safe_create_index(connection, 'idx_students_last_name', 'students', ['last_name'])
    _safe_create_index(connection, 'idx_students_date_of_birth', 'students', ['date_of_birth'])
    _safe_create_index(connection, 'idx_students_gender', 'students', ['gender'])
    
    # === TEACHER MODEL INDEXES ===
    _safe_create_index(connection, 'idx_teachers_user_id', 'teachers', ['user_id'])
    _safe_create_index(connection, 'idx_teachers_employee_id', 'teachers', ['employee_id'])
    _safe_create_index(connection, 'idx_teachers_status', 'teachers', ['status'])
    _safe_create_index(connection, 'idx_teachers_first_name', 'teachers', ['first_name'])
    _safe_create_index(connection, 'idx_teachers_last_name', 'teachers', ['last_name'])
    
    # === CLASS MODEL INDEXES ===
    _safe_create_index(connection, 'idx_classes_teacher_id', 'classes', ['teacher_id'])
    _safe_create_index(connection, 'idx_classes_academic_year', 'classes', ['academic_year'])
    _safe_create_index(connection, 'idx_classes_grade_level', 'classes', ['grade_level'])
    _safe_create_index(connection, 'idx_classes_status', 'classes', ['status'])
    _safe_create_index(connection, 'idx_classes_educational_level_id', 'classes', ['educational_level_id'])
    
    # === ATTENDANCE MODEL INDEXES ===
    _safe_create_index(connection, 'idx_attendances_student_id', 'attendances', ['student_id'])
    _safe_create_index(connection, 'idx_attendances_class_id', 'attendances', ['class_id'])
    _safe_create_index(connection, 'idx_attendances_subject_id', 'attendances', ['subject_id'])
    _safe_create_index(connection, 'idx_attendances_date', 'attendances', ['date'])
    _safe_create_index(connection, 'idx_attendances_status', 'attendances', ['status'])
    _safe_create_index(connection, 'idx_attendances_recorded_by', 'attendances', ['recorded_by'])
    _safe_create_index(connection, 'idx_attendances_student_date', 'attendances', ['student_id', 'date'])
    _safe_create_index(connection, 'idx_attendances_class_date', 'attendances', ['class_id', 'date'])
    _safe_create_index(connection, 'idx_attendances_date_status', 'attendances', ['date', 'status'])
    
    # === GRADE MODEL INDEXES ===
    grade_index_specs = [
        ('idx_grades_student_id', ['student_id']),
        ('idx_grades_exam_id', ['exam_id']),
        ('idx_grades_subject_id', ['subject_id']),
        ('idx_grades_class_id', ['class_id']),
        ('idx_grades_graded_by', ['graded_by']),
        ('idx_grades_term', ['term']),
        ('idx_grades_academic_year', ['academic_year']),
        ('idx_grades_assessment_type', ['assessment_type']),
        ('idx_grades_is_final', ['is_final']),
        ('idx_grades_student_term_year', ['student_id', 'term', 'academic_year']),
        ('idx_grades_class_subject_term', ['class_id', 'subject_id', 'term']),
    ]
    for index_name, columns in grade_index_specs:
        _safe_create_index(connection, index_name, 'grades', columns)
    
    # === EXAM MODEL INDEXES ===
    _safe_create_index(connection, 'idx_exams_class_id', 'exams', ['class_id'])
    _safe_create_index(connection, 'idx_exams_subject_id', 'exams', ['subject_id'])
    _safe_create_index(connection, 'idx_exams_created_by', 'exams', ['created_by'])
    _safe_create_index(connection, 'idx_exams_exam_date', 'exams', ['exam_date'])
    _safe_create_index(connection, 'idx_exams_status', 'exams', ['status'])
    _safe_create_index(connection, 'idx_exams_date_status', 'exams', ['exam_date', 'status'])
    _safe_create_index(connection, 'idx_exams_class_date', 'exams', ['class_id', 'exam_date'])
    
    # === NOTIFICATION MODEL INDEXES ===
    _safe_create_index(connection, 'idx_notifications_user_id', 'notifications', ['user_id'])
    _safe_create_index(connection, 'idx_notifications_read', 'notifications', ['read'])
    _safe_create_index(connection, 'idx_notifications_type', 'notifications', ['type'])
    _safe_create_index(connection, 'idx_notifications_time', 'notifications', ['time'])
    _safe_create_index(connection, 'idx_notifications_created_at', 'notifications', ['created_at'])
    _safe_create_index(connection, 'idx_notifications_user_read', 'notifications', ['user_id', 'read'])
    _safe_create_index(connection, 'idx_notifications_user_time', 'notifications', ['user_id', 'time'])
    
    # === PARENT MODEL INDEXES ===
    _safe_create_index(connection, 'idx_parents_user_id', 'parents', ['user_id'])
    
    # === ASSIGNMENT MODEL INDEXES ===
    _safe_create_index(connection, 'idx_assignments_class_id', 'assignments', ['class_id'])
    _safe_create_index(connection, 'idx_assignments_subject_id', 'assignments', ['subject_id'])
    _safe_create_index(connection, 'idx_assignments_teacher_id', 'assignments', ['teacher_id'])
    _safe_create_index(connection, 'idx_assignments_due_date', 'assignments', ['due_date'])
    _safe_create_index(connection, 'idx_assignments_status', 'assignments', ['status'])
    _safe_create_index(connection, 'idx_assignments_assignment_type', 'assignments', ['assignment_type'])
    
    # === ASSIGNMENT SUBMISSION INDEXES ===
    _safe_create_index(connection, 'idx_assignment_submissions_assignment_id', 'assignment_submissions', ['assignment_id'])
    _safe_create_index(connection, 'idx_assignment_submissions_student_id', 'assignment_submissions', ['student_id'])
    _safe_create_index(connection, 'idx_assignment_submissions_status', 'assignment_submissions', ['status'])
    _safe_create_index(connection, 'idx_assignment_submissions_graded_by', 'assignment_submissions', ['graded_by'])
    _safe_create_index(connection, 'idx_assignment_submissions_submission_date', 'assignment_submissions', ['submission_date'])
    
    # === ANNOUNCEMENT MODEL INDEXES ===
    _safe_create_index(connection, 'idx_announcements_class_id', 'announcements', ['class_id'])
    _safe_create_index(connection, 'idx_announcements_teacher_id', 'announcements', ['teacher_id'])
    
    # === MESSAGE MODEL INDEXES ===
    _safe_create_index(connection, 'idx_messages_sender_id', 'messages', ['sender_id'])
    _safe_create_index(connection, 'idx_messages_recipient_id', 'messages', ['recipient_id'])
    _safe_create_index(connection, 'idx_messages_sender_type', 'messages', ['sender_type'])
    _safe_create_index(connection, 'idx_messages_recipient_type', 'messages', ['recipient_type'])
    _safe_create_index(connection, 'idx_messages_is_read', 'messages', ['is_read'])
    _safe_create_index(connection, 'idx_messages_created_at', 'messages', ['created_at'])
    _safe_create_index(connection, 'idx_messages_recipient_read', 'messages', ['recipient_id', 'is_read'])
    _safe_create_index(connection, 'idx_messages_sender_created', 'messages', ['sender_id', 'created_at'])
    
    # === LOGIN HISTORY INDEXES ===
    _safe_create_index(connection, 'idx_login_history_user_id', 'login_history', ['user_id'])
    _safe_create_index(connection, 'idx_login_history_login_timestamp', 'login_history', ['login_timestamp'])
    _safe_create_index(connection, 'idx_login_history_success', 'login_history', ['success'])
    _safe_create_index(connection, 'idx_login_history_ip_address', 'login_history', ['ip_address'])
    
    # === ASSOCIATION TABLE INDEXES ===
    _safe_create_index(connection, 'idx_user_roles_user_id', 'user_roles', ['user_id'])
    _safe_create_index(connection, 'idx_user_roles_role_id', 'user_roles', ['role_id'])
    _safe_create_index(connection, 'idx_teacher_subjects_teacher_id', 'teacher_subjects', ['teacher_id'])
    _safe_create_index(connection, 'idx_teacher_subjects_subject_id', 'teacher_subjects', ['subject_id'])
    _safe_create_index(connection, 'idx_class_subjects_class_id', 'class_subjects', ['class_id'])
    _safe_create_index(connection, 'idx_class_subjects_subject_id', 'class_subjects', ['subject_id'])
    
    # === LIBRARY MODEL INDEXES ===
    _safe_create_index(connection, 'idx_books_title', 'books', ['title'])
    _safe_create_index(connection, 'idx_books_author', 'books', ['author'])
    _safe_create_index(connection, 'idx_books_isbn', 'books', ['isbn'])
    _safe_create_index(connection, 'idx_books_category', 'books', ['category'])
    _safe_create_index(connection, 'idx_books_status', 'books', ['status'])
    _safe_create_index(connection, 'idx_library_members_member_id', 'library_members', ['member_id'])
    _safe_create_index(connection, 'idx_library_members_user_id', 'library_members', ['user_id'])
    _safe_create_index(connection, 'idx_library_members_is_active', 'library_members', ['is_active'])
    _safe_create_index(connection, 'idx_borrow_records_book_id', 'borrow_records', ['book_id'])
    _safe_create_index(connection, 'idx_borrow_records_member_id', 'borrow_records', ['member_id'])
    _safe_create_index(connection, 'idx_borrow_records_status', 'borrow_records', ['status'])
    _safe_create_index(connection, 'idx_borrow_records_due_date', 'borrow_records', ['due_date'])
    _safe_create_index(connection, 'idx_borrow_records_return_date', 'borrow_records', ['return_date'])
    
    # === ADMINISTRATION MODEL INDEXES ===
    _safe_create_index(connection, 'idx_transactions_transaction_type', 'transactions', ['transaction_type'])
    _safe_create_index(connection, 'idx_transactions_transaction_date', 'transactions', ['transaction_date'])
    _safe_create_index(connection, 'idx_transactions_created_by', 'transactions', ['created_by'])
    _safe_create_index(connection, 'idx_transactions_reference_number', 'transactions', ['reference_number'])
    _safe_create_index(connection, 'idx_fee_structures_grade_level', 'fee_structures', ['grade_level'])
    _safe_create_index(connection, 'idx_fee_structures_academic_year', 'fee_structures', ['academic_year'])
    _safe_create_index(connection, 'idx_fee_structures_term', 'fee_structures', ['term'])
    _safe_create_index(connection, 'idx_fee_structures_is_active', 'fee_structures', ['is_active'])
    
    # === TIMESTAMP INDEXES ===
    _safe_create_index(connection, 'idx_students_created_at', 'students', ['created_at'])
    _safe_create_index(connection, 'idx_teachers_created_at', 'teachers', ['created_at'])
    _safe_create_index(connection, 'idx_classes_created_at', 'classes', ['created_at'])
    _safe_create_index(connection, 'idx_grades_created_at', 'grades', ['created_at'])
    _safe_create_index(connection, 'idx_exams_created_at', 'exams', ['created_at'])


def downgrade():
    """Remove all performance indexes"""
    connection = op.get_bind()
    indexes = [
        ('idx_users_username', 'users'),
        ('idx_users_email', 'users'),
        ('idx_users_status', 'users'),
        ('idx_users_role', 'users'),
        ('idx_users_last_login', 'users'),
        ('idx_students_user_id', 'students'),
        ('idx_students_admission_number', 'students'),
        ('idx_students_class_id', 'students'),
        ('idx_students_parent_id', 'students'),
        ('idx_students_first_name', 'students'),
        ('idx_students_last_name', 'students'),
        ('idx_students_date_of_birth', 'students'),
        ('idx_students_gender', 'students'),
        ('idx_teachers_user_id', 'teachers'),
        ('idx_teachers_employee_id', 'teachers'),
        ('idx_teachers_status', 'teachers'),
        ('idx_teachers_first_name', 'teachers'),
        ('idx_teachers_last_name', 'teachers'),
        ('idx_classes_teacher_id', 'classes'),
        ('idx_classes_academic_year', 'classes'),
        ('idx_classes_grade_level', 'classes'),
        ('idx_classes_status', 'classes'),
        ('idx_classes_educational_level_id', 'classes'),
        ('idx_attendances_student_id', 'attendances'),
        ('idx_attendances_class_id', 'attendances'),
        ('idx_attendances_subject_id', 'attendances'),
        ('idx_attendances_date', 'attendances'),
        ('idx_attendances_status', 'attendances'),
        ('idx_attendances_recorded_by', 'attendances'),
        ('idx_attendances_student_date', 'attendances'),
        ('idx_attendances_class_date', 'attendances'),
        ('idx_attendances_date_status', 'attendances'),
        ('idx_grades_student_id', 'grades'),
        ('idx_grades_exam_id', 'grades'),
        ('idx_grades_subject_id', 'grades'),
        ('idx_grades_class_id', 'grades'),
        ('idx_grades_graded_by', 'grades'),
        ('idx_grades_term', 'grades'),
        ('idx_grades_academic_year', 'grades'),
        ('idx_grades_assessment_type', 'grades'),
        ('idx_grades_is_final', 'grades'),
        ('idx_grades_student_term_year', 'grades'),
        ('idx_grades_class_subject_term', 'grades'),
        ('idx_exams_class_id', 'exams'),
        ('idx_exams_subject_id', 'exams'),
        ('idx_exams_created_by', 'exams'),
        ('idx_exams_exam_date', 'exams'),
        ('idx_exams_status', 'exams'),
        ('idx_exams_date_status', 'exams'),
        ('idx_exams_class_date', 'exams'),
        ('idx_notifications_user_id', 'notifications'),
        ('idx_notifications_read', 'notifications'),
        ('idx_notifications_type', 'notifications'),
        ('idx_notifications_time', 'notifications'),
        ('idx_notifications_created_at', 'notifications'),
        ('idx_notifications_user_read', 'notifications'),
        ('idx_notifications_user_time', 'notifications'),
        ('idx_parents_user_id', 'parents'),
        ('idx_assignments_class_id', 'assignments'),
        ('idx_assignments_subject_id', 'assignments'),
        ('idx_assignments_teacher_id', 'assignments'),
        ('idx_assignments_due_date', 'assignments'),
        ('idx_assignments_status', 'assignments'),
        ('idx_assignments_assignment_type', 'assignments'),
        ('idx_assignment_submissions_assignment_id', 'assignment_submissions'),
        ('idx_assignment_submissions_student_id', 'assignment_submissions'),
        ('idx_assignment_submissions_status', 'assignment_submissions'),
        ('idx_assignment_submissions_graded_by', 'assignment_submissions'),
        ('idx_assignment_submissions_submission_date', 'assignment_submissions'),
        ('idx_announcements_class_id', 'announcements'),
        ('idx_announcements_teacher_id', 'announcements'),
        ('idx_messages_sender_id', 'messages'),
        ('idx_messages_recipient_id', 'messages'),
        ('idx_messages_sender_type', 'messages'),
        ('idx_messages_recipient_type', 'messages'),
        ('idx_messages_is_read', 'messages'),
        ('idx_messages_created_at', 'messages'),
        ('idx_messages_recipient_read', 'messages'),
        ('idx_messages_sender_created', 'messages'),
        ('idx_login_history_user_id', 'login_history'),
        ('idx_login_history_login_timestamp', 'login_history'),
        ('idx_login_history_success', 'login_history'),
        ('idx_login_history_ip_address', 'login_history'),
        ('idx_user_roles_user_id', 'user_roles'),
        ('idx_user_roles_role_id', 'user_roles'),
        ('idx_teacher_subjects_teacher_id', 'teacher_subjects'),
        ('idx_teacher_subjects_subject_id', 'teacher_subjects'),
        ('idx_class_subjects_class_id', 'class_subjects'),
        ('idx_class_subjects_subject_id', 'class_subjects'),
        ('idx_books_title', 'books'),
        ('idx_books_author', 'books'),
        ('idx_books_isbn', 'books'),
        ('idx_books_category', 'books'),
        ('idx_books_status', 'books'),
        ('idx_library_members_member_id', 'library_members'),
        ('idx_library_members_user_id', 'library_members'),
        ('idx_library_members_is_active', 'library_members'),
        ('idx_borrow_records_book_id', 'borrow_records'),
        ('idx_borrow_records_member_id', 'borrow_records'),
        ('idx_borrow_records_status', 'borrow_records'),
        ('idx_borrow_records_due_date', 'borrow_records'),
        ('idx_borrow_records_return_date', 'borrow_records'),
        ('idx_transactions_transaction_type', 'transactions'),
        ('idx_transactions_transaction_date', 'transactions'),
        ('idx_transactions_created_by', 'transactions'),
        ('idx_transactions_reference_number', 'transactions'),
        ('idx_fee_structures_grade_level', 'fee_structures'),
        ('idx_fee_structures_academic_year', 'fee_structures'),
        ('idx_fee_structures_term', 'fee_structures'),
        ('idx_fee_structures_is_active', 'fee_structures'),
        ('idx_students_created_at', 'students'),
        ('idx_teachers_created_at', 'teachers'),
        ('idx_classes_created_at', 'classes'),
        ('idx_grades_created_at', 'grades'),
        ('idx_exams_created_at', 'exams'),
    ]
    for idx_name, tbl_name in indexes:
        _safe_drop_index(connection, idx_name, tbl_name)
    print("✅ Performance indexes removed successfully!")
