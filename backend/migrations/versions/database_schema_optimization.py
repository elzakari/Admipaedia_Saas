"""Database Schema Optimization

Revision ID: database_schema_optimization
Revises: add_advanced_stem_tables
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'database_schema_optimization'
down_revision = 'add_advanced_stem_tables'
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
        else:
            return
    if not all(_column_exists(connection, actual_table, col) for col in columns):
        return
    if _index_exists(connection, actual_table, index_name):
        return
    op.create_index(index_name, actual_table, columns, **kwargs)


def upgrade():
    """
    Database Schema Optimization Implementation
    
    This migration implements comprehensive database optimizations including:
    1. Performance indexes for frequently queried columns
    2. Composite indexes for multi-column queries
    3. Partial indexes for filtered queries
    4. Foreign key constraint optimizations
    5. Query performance improvements
    """
    connection = op.get_bind()
    
    # === CORE PERFORMANCE INDEXES ===
    
    # Users table optimizations
    _safe_create_index(connection, 'idx_users_email_status', 'users', ['email', 'status'])
    _safe_create_index(connection, 'idx_users_role_status', 'users', ['role', 'status'])
    _safe_create_index(connection, 'idx_users_last_login', 'users', ['last_login'])
    _safe_create_index(connection, 'idx_users_created_at', 'users', ['created_at'])
    
    # Students table optimizations
    _safe_create_index(connection, 'idx_students_class_id', 'students', ['class_id'])
    _safe_create_index(connection, 'idx_students_parent_id', 'students', ['parent_id'])
    _safe_create_index(connection, 'idx_students_admission_number', 'students', ['admission_number'])
    _safe_create_index(connection, 'idx_students_status_class', 'students', ['status', 'class_id'])
    _safe_create_index(connection, 'idx_students_gender_class', 'students', ['gender', 'class_id'])
    
    # Teachers table optimizations
    _safe_create_index(connection, 'idx_teachers_employee_id', 'teachers', ['employee_id'])
    _safe_create_index(connection, 'idx_teachers_status', 'teachers', ['status'])
    _safe_create_index(connection, 'idx_teachers_specialization', 'teachers', ['specialization'])
    _safe_create_index(connection, 'idx_teachers_joining_date', 'teachers', ['joining_date'])
    
    # Classes table optimizations
    _safe_create_index(connection, 'idx_classes_grade_level', 'classes', ['grade_level'])
    _safe_create_index(connection, 'idx_classes_academic_year', 'classes', ['academic_year'])
    _safe_create_index(connection, 'idx_classes_teacher_id', 'classes', ['teacher_id'])
    _safe_create_index(connection, 'idx_classes_grade_year', 'classes', ['grade_level', 'academic_year'])
    _safe_create_index(connection, 'idx_classes_status_active', 'classes', ['status'], 
                       postgresql_where=sa.text("status = 'active'"))
    
    # === ACADEMIC PERFORMANCE INDEXES ===
    
    # Grades table optimizations
    grade_index_specs = [
        ('idx_grades_student_id', ['student_id'], {}),
        ('idx_grades_subject_id', ['subject_id'], {}),
        ('idx_grades_class_id', ['class_id'], {}),
        ('idx_grades_academic_year', ['academic_year'], {}),
        ('idx_grades_term', ['term'], {}),
        ('idx_grades_student_subject', ['student_id', 'subject_id'], {}),
        ('idx_grades_class_subject_term', ['class_id', 'subject_id', 'term'], {}),
        ('idx_grades_student_year_term', ['student_id', 'academic_year', 'term'], {}),
        ('idx_grades_percentage', ['percentage'], {}),
        ('idx_grades_is_final', ['is_final'], {'postgresql_where': sa.text("is_final = true")}),
    ]
    for index_name, columns, kwargs in grade_index_specs:
        _safe_create_index(connection, index_name, 'grades', columns, **kwargs)
    
    # Attendance table optimizations (table is named 'attendances')
    attendance_index_specs = [
        ('idx_attendance_student_id', ['student_id'], {}),
        ('idx_attendance_class_id', ['class_id'], {}),
        ('idx_attendance_subject_id', ['subject_id'], {}),
        ('idx_attendance_date', ['date'], {}),
        ('idx_attendance_status', ['status'], {}),
        ('idx_attendance_student_date', ['student_id', 'date'], {}),
        ('idx_attendance_class_date', ['class_id', 'date'], {}),
        ('idx_attendance_student_month', ['student_id'], {'postgresql_where': sa.text("date >= CURRENT_DATE - INTERVAL '30 days'")}),
    ]
    for index_name, columns, kwargs in attendance_index_specs:
        _safe_create_index(connection, index_name, 'attendances', columns, **kwargs)
    
    # Subjects table optimizations
    _safe_create_index(connection, 'idx_subjects_department_id', 'subjects', ['department_id'])
    _safe_create_index(connection, 'idx_subjects_code', 'subjects', ['code'])
    _safe_create_index(connection, 'idx_subjects_is_active', 'subjects', ['is_active'], 
                       postgresql_where=sa.text("is_active = true"))
    _safe_create_index(connection, 'idx_subjects_credit_hours', 'subjects', ['credit_hours'])
    
    # === ASSOCIATION TABLE OPTIMIZATIONS ===
    
    # Teacher-Subject associations
    _safe_create_index(connection, 'idx_teacher_subjects_teacher', 'teacher_subjects', ['teacher_id'])
    _safe_create_index(connection, 'idx_teacher_subjects_subject', 'teacher_subjects', ['subject_id'])
    
    # Class-Subject associations
    _safe_create_index(connection, 'idx_class_subjects_class', 'class_subjects', ['class_id'])
    _safe_create_index(connection, 'idx_class_subjects_subject', 'class_subjects', ['subject_id'])
    
    # User-Roles associations
    _safe_create_index(connection, 'idx_user_roles_user', 'user_roles', ['user_id'])
    _safe_create_index(connection, 'idx_user_roles_role', 'user_roles', ['role_id'])
    
    # === SECURITY AND AUDIT INDEXES ===
    
    # Login history optimizations
    _safe_create_index(connection, 'idx_login_history_user_id', 'login_history', ['user_id'])
    _safe_create_index(connection, 'idx_login_history_timestamp', 'login_history', ['login_timestamp'])
    _safe_create_index(connection, 'idx_login_history_success', 'login_history', ['success'])
    _safe_create_index(connection, 'idx_login_history_ip', 'login_history', ['ip_address'])
    _safe_create_index(connection, 'idx_login_history_user_recent', 'login_history', ['user_id', 'login_timestamp'])
    
    # === STEM CURRICULUM OPTIMIZATIONS ===
    
    # STEM learning modules
    _safe_create_index(connection, 'idx_stem_modules_term', 'stem_learning_modules', ['term'])
    _safe_create_index(connection, 'idx_stem_modules_active', 'stem_learning_modules', ['is_active'], 
                       postgresql_where=sa.text("is_active = true"))
    _safe_create_index(connection, 'idx_stem_modules_duration', 'stem_learning_modules', ['duration_weeks'])
    
    # STEM assessment results
    _safe_create_index(connection, 'idx_stem_results_date', 'stem_assessment_results', ['assessment_date'])
    _safe_create_index(connection, 'idx_stem_results_percentage', 'stem_assessment_results', ['percentage'])
    _safe_create_index(connection, 'idx_stem_results_grade', 'stem_assessment_results', ['grade_letter'])
    
    # === LIBRARY AND RESOURCES ===
    _safe_create_index(connection, 'idx_library_isbn', 'library', ['isbn'])
    _safe_create_index(connection, 'idx_library_category', 'library', ['category'])
    _safe_create_index(connection, 'idx_library_available', 'library', ['available_copies'])
    _safe_create_index(connection, 'idx_library_author_title', 'library', ['author', 'title'])
    
    # === COMMUNICATION OPTIMIZATIONS ===
    _safe_create_index(connection, 'idx_messages_sender', 'messages', ['sender_id'])
    _safe_create_index(connection, 'idx_messages_recipient', 'messages', ['recipient_id'])
    _safe_create_index(connection, 'idx_messages_timestamp', 'messages', ['timestamp'])
    _safe_create_index(connection, 'idx_messages_read_status', 'messages', ['is_read'])
    _safe_create_index(connection, 'idx_messages_conversation', 'messages', ['sender_id', 'recipient_id', 'timestamp'])
    
    _safe_create_index(connection, 'idx_notifications_user', 'notifications', ['user_id'])
    _safe_create_index(connection, 'idx_notifications_type', 'notifications', ['notification_type'])
    _safe_create_index(connection, 'idx_notifications_read', 'notifications', ['is_read'])
    _safe_create_index(connection, 'idx_notifications_created', 'notifications', ['created_at'])
    _safe_create_index(connection, 'idx_notifications_unread', 'notifications', ['user_id', 'is_read'], 
                       postgresql_where=sa.text("is_read = false"))
    
    # === ANALYTICS AND REPORTING INDEXES ===
    _safe_create_index(connection, 'idx_dashboard_metrics_date', 'dashboard_metrics', ['metric_date'])
    _safe_create_index(connection, 'idx_dashboard_metrics_type', 'dashboard_metrics', ['metric_type'])
    _safe_create_index(connection, 'idx_dashboard_metrics_class', 'dashboard_metrics', ['class_id'])
    
    # === CALENDAR AND EVENTS ===
    _safe_create_index(connection, 'idx_calendar_events_date', 'calendar_events', ['event_date'])
    _safe_create_index(connection, 'idx_calendar_events_type', 'calendar_events', ['event_type'])
    _safe_create_index(connection, 'idx_calendar_events_class', 'calendar_events', ['class_id'])
    _safe_create_index(connection, 'idx_calendar_events_upcoming', 'calendar_events', ['event_date'], 
                       postgresql_where=sa.text("event_date >= CURRENT_DATE"))


def downgrade():
    """
    Remove all optimization indexes
    """
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    
    existing_indexes = {}
    for table_name in inspector.get_table_names():
        for idx in inspector.get_indexes(table_name):
            if idx.get("name"):
                existing_indexes[idx["name"]] = table_name

    # Drop all created indexes in reverse order
    indexes_to_drop = [
        # Calendar and Events
        'idx_calendar_events_upcoming',
        'idx_calendar_events_class',
        'idx_calendar_events_type',
        'idx_calendar_events_date',
        
        # Analytics
        'idx_dashboard_metrics_class',
        'idx_dashboard_metrics_type',
        'idx_dashboard_metrics_date',
        
        # Communication
        'idx_notifications_unread',
        'idx_notifications_created',
        'idx_notifications_read',
        'idx_notifications_type',
        'idx_notifications_user',
        'idx_messages_conversation',
        'idx_messages_read_status',
        'idx_messages_timestamp',
        'idx_messages_recipient',
        'idx_messages_sender',
        
        # Library
        'idx_library_author_title',
        'idx_library_available',
        'idx_library_category',
        'idx_library_isbn',
        
        # STEM
        'idx_stem_results_grade',
        'idx_stem_results_percentage',
        'idx_stem_results_date',
        'idx_stem_modules_duration',
        'idx_stem_modules_active',
        'idx_stem_modules_term',
        
        # Security
        'idx_login_history_user_recent',
        'idx_login_history_ip',
        'idx_login_history_success',
        'idx_login_history_timestamp',
        'idx_login_history_user_id',
        
        # Associations
        'idx_user_roles_role',
        'idx_user_roles_user',
        'idx_class_subjects_subject',
        'idx_class_subjects_class',
        'idx_teacher_subjects_subject',
        'idx_teacher_subjects_teacher',
        
        # Subjects
        'idx_subjects_credit_hours',
        'idx_subjects_is_active',
        'idx_subjects_code',
        'idx_subjects_department_id',
        
        # Attendance
        'idx_attendance_student_month',
        'idx_attendance_class_date',
        'idx_attendance_student_date',
        'idx_attendance_status',
        'idx_attendance_date',
        'idx_attendance_subject_id',
        'idx_attendance_class_id',
        'idx_attendance_student_id',
        
        # Grades
        'idx_grades_is_final',
        'idx_grades_percentage',
        'idx_grades_student_year_term',
        'idx_grades_class_subject_term',
        'idx_grades_student_subject',
        'idx_grades_term',
        'idx_grades_academic_year',
        'idx_grades_class_id',
        'idx_grades_subject_id',
        'idx_grades_student_id',
        
        # Classes
        'idx_classes_status_active',
        'idx_classes_grade_year',
        'idx_classes_teacher_id',
        'idx_classes_academic_year',
        'idx_classes_grade_level',
        
        # Teachers
        'idx_teachers_joining_date',
        'idx_teachers_specialization',
        'idx_teachers_status',
        'idx_teachers_employee_id',
        'idx_students_gender_class',
        'idx_students_status_class',
        'idx_students_admission_number',
        'idx_students_parent_id',
        'idx_students_class_id',
        
        # Users
        'idx_users_created_at',
        'idx_users_last_login',
        'idx_users_role_status',
        'idx_users_email_status',
    ]
    
    for index_name in indexes_to_drop:
        if index_name in existing_indexes:
            try:
                op.drop_index(index_name, table_name=existing_indexes[index_name])
            except Exception:
                pass
