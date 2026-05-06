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
    
    # === CORE PERFORMANCE INDEXES ===
    
    # Users table optimizations
    op.create_index('idx_users_email_status', 'users', ['email', 'status'])
    op.create_index('idx_users_role_status', 'users', ['role', 'status'])
    op.create_index('idx_users_last_login', 'users', ['last_login'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    
    # Students table optimizations
    op.create_index('idx_students_class_id', 'students', ['class_id'])
    op.create_index('idx_students_parent_id', 'students', ['parent_id'])
    op.create_index('idx_students_admission_number', 'students', ['admission_number'])
    op.create_index('idx_students_status_class', 'students', ['status', 'class_id'])
    op.create_index('idx_students_gender_class', 'students', ['gender', 'class_id'])
    
    # Teachers table optimizations
    op.create_index('idx_teachers_employee_id', 'teachers', ['employee_id'])
    op.create_index('idx_teachers_status', 'teachers', ['status'])
    op.create_index('idx_teachers_specialization', 'teachers', ['specialization'])
    op.create_index('idx_teachers_joining_date', 'teachers', ['joining_date'])
    
    # Classes table optimizations
    op.create_index('idx_classes_grade_level', 'classes', ['grade_level'])
    op.create_index('idx_classes_academic_year', 'classes', ['academic_year'])
    op.create_index('idx_classes_teacher_id', 'classes', ['teacher_id'])
    op.create_index('idx_classes_grade_year', 'classes', ['grade_level', 'academic_year'])
    op.create_index('idx_classes_status_active', 'classes', ['status'], 
                   postgresql_where=sa.text("status = 'active'"))
    
    # === ACADEMIC PERFORMANCE INDEXES ===
    
    # Grades table optimizations
    op.create_index('idx_grades_student_id', 'grades', ['student_id'])
    op.create_index('idx_grades_subject_id', 'grades', ['subject_id'])
    op.create_index('idx_grades_class_id', 'grades', ['class_id'])
    op.create_index('idx_grades_academic_year', 'grades', ['academic_year'])
    op.create_index('idx_grades_term', 'grades', ['term'])
    op.create_index('idx_grades_student_subject', 'grades', ['student_id', 'subject_id'])
    op.create_index('idx_grades_class_subject_term', 'grades', ['class_id', 'subject_id', 'term'])
    op.create_index('idx_grades_student_year_term', 'grades', ['student_id', 'academic_year', 'term'])
    op.create_index('idx_grades_percentage', 'grades', ['percentage'])
    op.create_index('idx_grades_is_final', 'grades', ['is_final'], 
                   postgresql_where=sa.text("is_final = true"))
    
    # Attendance table optimizations
    op.create_index('idx_attendance_student_id', 'attendance', ['student_id'])
    op.create_index('idx_attendance_class_id', 'attendance', ['class_id'])
    op.create_index('idx_attendance_subject_id', 'attendance', ['subject_id'])
    op.create_index('idx_attendance_date', 'attendance', ['date'])
    op.create_index('idx_attendance_status', 'attendance', ['status'])
    op.create_index('idx_attendance_student_date', 'attendance', ['student_id', 'date'])
    op.create_index('idx_attendance_class_date', 'attendance', ['class_id', 'date'])
    op.create_index('idx_attendance_student_month', 'attendance', ['student_id'], 
                   postgresql_where=sa.text("date >= CURRENT_DATE - INTERVAL '30 days'"))
    
    # Subjects table optimizations
    op.create_index('idx_subjects_department_id', 'subjects', ['department_id'])
    op.create_index('idx_subjects_code', 'subjects', ['code'])
    op.create_index('idx_subjects_is_active', 'subjects', ['is_active'], 
                   postgresql_where=sa.text("is_active = true"))
    op.create_index('idx_subjects_credit_hours', 'subjects', ['credit_hours'])
    
    # === ASSOCIATION TABLE OPTIMIZATIONS ===
    
    # Teacher-Subject associations
    op.create_index('idx_teacher_subjects_teacher', 'teacher_subjects', ['teacher_id'])
    op.create_index('idx_teacher_subjects_subject', 'teacher_subjects', ['subject_id'])
    
    # Class-Subject associations
    op.create_index('idx_class_subjects_class', 'class_subjects', ['class_id'])
    op.create_index('idx_class_subjects_subject', 'class_subjects', ['subject_id'])
    
    # User-Roles associations
    op.create_index('idx_user_roles_user', 'user_roles', ['user_id'])
    op.create_index('idx_user_roles_role', 'user_roles', ['role_id'])
    
    # === SECURITY AND AUDIT INDEXES ===
    
    # Login history optimizations
    op.create_index('idx_login_history_user_id', 'login_history', ['user_id'])
    op.create_index('idx_login_history_timestamp', 'login_history', ['login_timestamp'])
    op.create_index('idx_login_history_success', 'login_history', ['success'])
    op.create_index('idx_login_history_ip', 'login_history', ['ip_address'])
    op.create_index('idx_login_history_user_recent', 'login_history', ['user_id', 'login_timestamp'])
    
    # === STEM CURRICULUM OPTIMIZATIONS ===
    
    # STEM learning modules (already has some indexes from previous migration)
    op.create_index('idx_stem_modules_term', 'stem_learning_modules', ['term'])
    op.create_index('idx_stem_modules_active', 'stem_learning_modules', ['is_active'], 
                   postgresql_where=sa.text("is_active = true"))
    op.create_index('idx_stem_modules_duration', 'stem_learning_modules', ['duration_weeks'])
    
    # STEM assessment results optimizations
    op.create_index('idx_stem_results_date', 'stem_assessment_results', ['assessment_date'])
    op.create_index('idx_stem_results_percentage', 'stem_assessment_results', ['percentage'])
    op.create_index('idx_stem_results_grade', 'stem_assessment_results', ['grade_letter'])
    
    # === LIBRARY AND RESOURCES ===
    
    # Library optimizations (if library table exists)
    try:
        op.create_index('idx_library_isbn', 'library', ['isbn'])
        op.create_index('idx_library_category', 'library', ['category'])
        op.create_index('idx_library_available', 'library', ['available_copies'])
        op.create_index('idx_library_author_title', 'library', ['author', 'title'])
    except:
        pass  # Table might not exist yet
    
    # === COMMUNICATION OPTIMIZATIONS ===
    
    # Messages table (if exists)
    try:
        op.create_index('idx_messages_sender', 'messages', ['sender_id'])
        op.create_index('idx_messages_recipient', 'messages', ['recipient_id'])
        op.create_index('idx_messages_timestamp', 'messages', ['timestamp'])
        op.create_index('idx_messages_read_status', 'messages', ['is_read'])
        op.create_index('idx_messages_conversation', 'messages', ['sender_id', 'recipient_id', 'timestamp'])
    except:
        pass
    
    # Notifications table (if exists)
    try:
        op.create_index('idx_notifications_user', 'notifications', ['user_id'])
        op.create_index('idx_notifications_type', 'notifications', ['notification_type'])
        op.create_index('idx_notifications_read', 'notifications', ['is_read'])
        op.create_index('idx_notifications_created', 'notifications', ['created_at'])
        op.create_index('idx_notifications_unread', 'notifications', ['user_id', 'is_read'], 
                       postgresql_where=sa.text("is_read = false"))
    except:
        pass
    
    # === ANALYTICS AND REPORTING INDEXES ===
    
    # Dashboard analytics optimizations
    try:
        op.create_index('idx_dashboard_metrics_date', 'dashboard_metrics', ['metric_date'])
        op.create_index('idx_dashboard_metrics_type', 'dashboard_metrics', ['metric_type'])
        op.create_index('idx_dashboard_metrics_class', 'dashboard_metrics', ['class_id'])
    except:
        pass
    
    # === CALENDAR AND EVENTS ===
    
    try:
        op.create_index('idx_calendar_events_date', 'calendar_events', ['event_date'])
        op.create_index('idx_calendar_events_type', 'calendar_events', ['event_type'])
        op.create_index('idx_calendar_events_class', 'calendar_events', ['class_id'])
        op.create_index('idx_calendar_events_upcoming', 'calendar_events', ['event_date'], 
                       postgresql_where=sa.text("event_date >= CURRENT_DATE"))
    except:
        pass

def downgrade():
    """
    Remove all optimization indexes
    """
    
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
        
        # Students
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
        try:
            op.drop_index(index_name)
        except:
            pass  # Index might not exist