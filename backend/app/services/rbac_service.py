"""
RBAC Service for managing roles, permissions, and access control
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

import structlog
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.rbac import (AccessControlList, PermissionGrant,
                             PermissionType, RBACPermission, RBACRole,
                             ResourceType, RoleTemplate, UserRoleAssignment,
                             role_permissions, user_role_assignments)
from app.models.user import User

logger = structlog.get_logger()


class RBACService:
    """Service for RBAC operations"""

    @staticmethod
    def initialize_default_permissions() -> bool:
        """Initialize default system permissions"""
        try:
            default_permissions = [
                # User Management
                {
                    "name": "user.create",
                    "display_name": "Create Users",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.CREATE,
                    "category": "user_management",
                },
                {
                    "name": "user.read",
                    "display_name": "View Users",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.READ,
                    "category": "user_management",
                },
                {
                    "name": "user.update",
                    "display_name": "Update Users",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.UPDATE,
                    "category": "user_management",
                },
                {
                    "name": "user.delete",
                    "display_name": "Delete Users",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.DELETE,
                    "category": "user_management",
                },
                {
                    "name": "user.manage_roles",
                    "display_name": "Manage User Roles",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.MANAGE,
                    "category": "user_management",
                },
                # Student Management
                {
                    "name": "student.create",
                    "display_name": "Create Students",
                    "resource_type": ResourceType.STUDENT,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "student.read",
                    "display_name": "View Students",
                    "resource_type": ResourceType.STUDENT,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "student.update",
                    "display_name": "Update Students",
                    "resource_type": ResourceType.STUDENT,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "student.delete",
                    "display_name": "Delete Students",
                    "resource_type": ResourceType.STUDENT,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                {
                    "name": "student.view_grades",
                    "display_name": "View Student Grades",
                    "resource_type": ResourceType.STUDENT,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "student.manage_grades",
                    "display_name": "Manage Student Grades",
                    "resource_type": ResourceType.STUDENT,
                    "permission_type": PermissionType.MANAGE,
                    "category": "academic",
                },
                # Teacher Management
                {
                    "name": "teacher.create",
                    "display_name": "Create Teachers",
                    "resource_type": ResourceType.TEACHER,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "teacher.read",
                    "display_name": "View Teachers",
                    "resource_type": ResourceType.TEACHER,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "teacher.update",
                    "display_name": "Update Teachers",
                    "resource_type": ResourceType.TEACHER,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "teacher.delete",
                    "display_name": "Delete Teachers",
                    "resource_type": ResourceType.TEACHER,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                # Staff Management
                {
                    "name": "staff.create",
                    "display_name": "Create Staff",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.CREATE,
                    "category": "administration",
                },
                {
                    "name": "staff.read",
                    "display_name": "View Staff",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.READ,
                    "category": "administration",
                },
                {
                    "name": "staff.update",
                    "display_name": "Update Staff",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.UPDATE,
                    "category": "administration",
                },
                {
                    "name": "staff.delete",
                    "display_name": "Delete Staff",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.DELETE,
                    "category": "administration",
                },
                {
                    "name": "class.create",
                    "display_name": "Create Classes",
                    "resource_type": ResourceType.CLASS,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "class.read",
                    "display_name": "View Classes",
                    "resource_type": ResourceType.CLASS,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "class.update",
                    "display_name": "Update Classes",
                    "resource_type": ResourceType.CLASS,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "class.delete",
                    "display_name": "Delete Classes",
                    "resource_type": ResourceType.CLASS,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                {
                    "name": "class.manage_students",
                    "display_name": "Manage Class Students",
                    "resource_type": ResourceType.CLASS,
                    "permission_type": PermissionType.MANAGE,
                    "category": "academic",
                },
                # Subject Management
                {
                    "name": "subject.create",
                    "display_name": "Create Subjects",
                    "resource_type": ResourceType.SUBJECT,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "subject.read",
                    "display_name": "View Subjects",
                    "resource_type": ResourceType.SUBJECT,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "subject.update",
                    "display_name": "Update Subjects",
                    "resource_type": ResourceType.SUBJECT,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "subject.delete",
                    "display_name": "Delete Subjects",
                    "resource_type": ResourceType.SUBJECT,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                {
                    "name": "subject.manage",
                    "display_name": "Manage Subjects",
                    "resource_type": ResourceType.SUBJECT,
                    "permission_type": PermissionType.MANAGE,
                    "category": "academic",
                },
                # Attendance Management
                {
                    "name": "attendance.create",
                    "display_name": "Record Attendance",
                    "resource_type": ResourceType.ATTENDANCE,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "attendance.read",
                    "display_name": "View Attendance",
                    "resource_type": ResourceType.ATTENDANCE,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "attendance.update",
                    "display_name": "Update Attendance",
                    "resource_type": ResourceType.ATTENDANCE,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "attendance.reports",
                    "display_name": "Generate Attendance Reports",
                    "resource_type": ResourceType.ATTENDANCE,
                    "permission_type": PermissionType.READ,
                    "category": "reports",
                },
                # Grade Management
                {
                    "name": "grade.create",
                    "display_name": "Create Grades",
                    "resource_type": ResourceType.GRADE,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "grade.read",
                    "display_name": "View Grades",
                    "resource_type": ResourceType.GRADE,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "grade.update",
                    "display_name": "Update Grades",
                    "resource_type": ResourceType.GRADE,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "grade.delete",
                    "display_name": "Delete Grades",
                    "resource_type": ResourceType.GRADE,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                {
                    "name": "grade.approve",
                    "display_name": "Approve Grades",
                    "resource_type": ResourceType.GRADE,
                    "permission_type": PermissionType.APPROVE,
                    "category": "academic",
                },
                # Exam Management
                {
                    "name": "exam.create",
                    "display_name": "Create Exams",
                    "resource_type": ResourceType.EXAM,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "exam.read",
                    "display_name": "View Exams",
                    "resource_type": ResourceType.EXAM,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "exam.update",
                    "display_name": "Update Exams",
                    "resource_type": ResourceType.EXAM,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "exam.delete",
                    "display_name": "Delete Exams",
                    "resource_type": ResourceType.EXAM,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                {
                    "name": "exam.manage",
                    "display_name": "Manage Exams",
                    "resource_type": ResourceType.EXAM,
                    "permission_type": PermissionType.MANAGE,
                    "category": "academic",
                },
                # Assignment Management
                {
                    "name": "assignment.create",
                    "display_name": "Create Assignments",
                    "resource_type": ResourceType.ASSIGNMENT,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "assignment.read",
                    "display_name": "View Assignments",
                    "resource_type": ResourceType.ASSIGNMENT,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "assignment.update",
                    "display_name": "Update Assignments",
                    "resource_type": ResourceType.ASSIGNMENT,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "assignment.delete",
                    "display_name": "Delete Assignments",
                    "resource_type": ResourceType.ASSIGNMENT,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                {
                    "name": "assignment.grade",
                    "display_name": "Grade Assignments",
                    "resource_type": ResourceType.ASSIGNMENT,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                # Announcement Management
                {
                    "name": "announcement.create",
                    "display_name": "Create Announcements",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.CREATE,
                    "category": "academic",
                },
                {
                    "name": "announcement.read",
                    "display_name": "View Announcements",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "announcement.update",
                    "display_name": "Update Announcements",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.UPDATE,
                    "category": "academic",
                },
                {
                    "name": "announcement.delete",
                    "display_name": "Delete Announcements",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.DELETE,
                    "category": "academic",
                },
                # Financial Management
                {
                    "name": "finance.read",
                    "display_name": "View Financial Data",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.READ,
                    "category": "finance",
                },
                {
                    "name": "finance.manage",
                    "display_name": "Manage Finances",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.MANAGE,
                    "category": "finance",
                },
                {
                    "name": "finance.reports",
                    "display_name": "Generate Financial Reports",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.READ,
                    "category": "reports",
                },
                # System Administration
                {
                    "name": "system.admin",
                    "display_name": "System Administration",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.ADMIN,
                    "category": "system",
                },
                {
                    "name": "system.settings",
                    "display_name": "Manage System Settings",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.MANAGE,
                    "category": "system",
                },
                {
                    "name": "system.backup",
                    "display_name": "System Backup",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.EXECUTE,
                    "category": "system",
                },
                {
                    "name": "system.logs",
                    "display_name": "View System Logs",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.READ,
                    "category": "system",
                },
                # Dashboard Access
                {
                    "name": "dashboard.admin",
                    "display_name": "Admin Dashboard",
                    "resource_type": ResourceType.DASHBOARD,
                    "permission_type": PermissionType.READ,
                    "category": "dashboard",
                },
                {
                    "name": "dashboard.teacher",
                    "display_name": "Teacher Dashboard",
                    "resource_type": ResourceType.DASHBOARD,
                    "permission_type": PermissionType.READ,
                    "category": "dashboard",
                },
                {
                    "name": "dashboard.student",
                    "display_name": "Student Dashboard",
                    "resource_type": ResourceType.DASHBOARD,
                    "permission_type": PermissionType.READ,
                    "category": "dashboard",
                },
                {
                    "name": "dashboard.parent",
                    "display_name": "Parent Dashboard",
                    "resource_type": ResourceType.DASHBOARD,
                    "permission_type": PermissionType.READ,
                    "category": "dashboard",
                },
                # Reports
                {
                    "name": "report.generate",
                    "display_name": "Generate Reports",
                    "resource_type": ResourceType.REPORT,
                    "permission_type": PermissionType.CREATE,
                    "category": "reports",
                },
                {
                    "name": "report.view",
                    "display_name": "View Reports",
                    "resource_type": ResourceType.REPORT,
                    "permission_type": PermissionType.READ,
                    "category": "reports",
                },
                {
                    "name": "report.export",
                    "display_name": "Export Reports",
                    "resource_type": ResourceType.REPORT,
                    "permission_type": PermissionType.EXECUTE,
                    "category": "reports",
                },
                # ===== ADMIPAEDIA EXPANDED MAJOR PERMISSION SET =========================
                # These rows are idempotently inserted (name-guarded) so existing tenants
                # get every new capability automatically on the next RBAC initialization,
                # and custom/admin-created permissions remain untouched.

                # Parents / guardians ------------------------------------------------
                {
                    "name": "parent.create",
                    "display_name": "Create Parents",
                    "description": "Register new parent/guardian accounts and link them to students.",
                    "resource_type": ResourceType.PARENT,
                    "permission_type": PermissionType.CREATE,
                    "category": "admissions",
                },
                {
                    "name": "parent.read",
                    "display_name": "View Parents",
                    "description": "Browse parent profiles, contact details and linked students.",
                    "resource_type": ResourceType.PARENT,
                    "permission_type": PermissionType.READ,
                    "category": "admissions",
                },
                {
                    "name": "parent.update",
                    "display_name": "Update Parents",
                    "description": "Edit parent profiles, contact information, and emergency contacts.",
                    "resource_type": ResourceType.PARENT,
                    "permission_type": PermissionType.UPDATE,
                    "category": "admissions",
                },
                {
                    "name": "parent.delete",
                    "display_name": "Delete Parents",
                    "description": "Remove parent/guardian accounts. Students linked to the parent remain.",
                    "resource_type": ResourceType.PARENT,
                    "permission_type": PermissionType.DELETE,
                    "category": "admissions",
                },

                # Admissions ----------------------------------------------------------
                {
                    "name": "admission.create",
                    "display_name": "Create Admission Applications",
                    "description": "Submit and register new admission applications / enrollment enquiries.",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.CREATE,
                    "category": "admissions",
                },
                {
                    "name": "admission.read",
                    "display_name": "View Admissions",
                    "description": "View application statuses, submitted documents and applicant profiles.",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.READ,
                    "category": "admissions",
                },
                {
                    "name": "admission.update",
                    "display_name": "Process Applications",
                    "description": "Update application stage, review notes, and move applicants through the pipeline.",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.UPDATE,
                    "category": "admissions",
                },
                {
                    "name": "admission.approve",
                    "display_name": "Approve / Reject Admissions",
                    "description": "Final decision authority: approve enrollment or reject/withdraw applications.",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.APPROVE,
                    "category": "admissions",
                },

                # Finance expanded ---------------------------------------------------
                {
                    "name": "finance.create",
                    "display_name": "Create Financial Records",
                    "description": "Create invoices, bills, fees, and manual finance journal entries.",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.CREATE,
                    "category": "finance",
                },
                {
                    "name": "finance.update",
                    "display_name": "Update Financial Records",
                    "description": "Edit invoices, fees, payment allocations and adjust ledger records.",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.UPDATE,
                    "category": "finance",
                },
                {
                    "name": "finance.delete",
                    "display_name": "Delete Financial Records",
                    "description": "Delete invoices, bills, or payment records. Usually restricted to Finance Admin.",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.DELETE,
                    "category": "finance",
                },
                {
                    "name": "finance.approve",
                    "display_name": "Approve Payments / Refunds",
                    "description": "Approve outgoing payments, refunds, reversals and manual journal approvals.",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.APPROVE,
                    "category": "finance",
                },
                {
                    "name": "finance.collections",
                    "display_name": "Manage Fee Collections",
                    "description": "Record payments, send payment reminders, and view arrears collections workbench.",
                    "resource_type": ResourceType.FINANCE,
                    "permission_type": PermissionType.MANAGE,
                    "category": "finance",
                },

                # Library ------------------------------------------------------------
                {
                    "name": "library.read",
                    "display_name": "View Library",
                    "description": "Browse the catalogue, view book details and availability.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.READ,
                    "category": "library",
                },
                {
                    "name": "library.manage",
                    "display_name": "Manage Library",
                    "description": "Add books, check out / check in items, manage holds and inventory.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.MANAGE,
                    "category": "library",
                },

                # Timetable / schedule -----------------------------------------------
                {
                    "name": "timetable.read",
                    "display_name": "View Timetables",
                    "description": "View class, teacher, room and examination timetables.",
                    "resource_type": ResourceType.EXAM,
                    "permission_type": PermissionType.READ,
                    "category": "academic",
                },
                {
                    "name": "timetable.manage",
                    "display_name": "Manage Timetables",
                    "description": "Create, edit and publish class, room, substitute and exam timetables.",
                    "resource_type": ResourceType.EXAM,
                    "permission_type": PermissionType.MANAGE,
                    "category": "academic",
                },

                # Calendar / events --------------------------------------------------
                {
                    "name": "calendar.read",
                    "display_name": "View Calendar",
                    "description": "View school events, holidays, exam periods and meetings.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.READ,
                    "category": "operations",
                },
                {
                    "name": "calendar.manage",
                    "display_name": "Manage Calendar",
                    "description": "Create school-wide events, term dates, exam windows and closures.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.MANAGE,
                    "category": "operations",
                },

                # Notifications / messaging -----------------------------------------
                {
                    "name": "notification.read",
                    "display_name": "View Notifications",
                    "description": "View in-app notifications, SMS/email delivery logs and statuses.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.READ,
                    "category": "communications",
                },
                {
                    "name": "notification.send",
                    "display_name": "Send Notifications",
                    "description": "Compose and send bulk email, SMS or in-app broadcast notifications.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.EXECUTE,
                    "category": "communications",
                },
                {
                    "name": "messages.read",
                    "display_name": "View Messages",
                    "description": "Read internal messages with parents, staff and students.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.READ,
                    "category": "communications",
                },
                {
                    "name": "messages.send",
                    "display_name": "Send Messages",
                    "description": "Compose and reply to internal / two-way messages.",
                    "resource_type": ResourceType.ANNOUNCEMENT,
                    "permission_type": PermissionType.CREATE,
                    "category": "communications",
                },

                # Integrations / AI / Analytics -------------------------------------
                {
                    "name": "analytics.read",
                    "display_name": "View Analytics Dashboards",
                    "description": "Access attendance, academic, behavioral and financial analytics dashboards.",
                    "resource_type": ResourceType.TEACHER_ANALYTICS,
                    "permission_type": PermissionType.READ,
                    "category": "reports",
                },
                {
                    "name": "analytics.export",
                    "display_name": "Export Analytics",
                    "description": "Export charts, CSVs and scheduled analytics reports.",
                    "resource_type": ResourceType.TEACHER_ANALYTICS,
                    "permission_type": PermissionType.EXECUTE,
                    "category": "reports",
                },
                {
                    "name": "teacher_analytics.read",
                    "display_name": "Teacher Analytics Dashboard",
                    "description": "View teacher performance, class coverage, grading and attendance analytics.",
                    "resource_type": ResourceType.TEACHER_ANALYTICS,
                    "permission_type": PermissionType.READ,
                    "category": "reports",
                },
                {
                    "name": "ai.use",
                    "display_name": "Use AI Assistants",
                    "description": "Use AI drafting, adaptive quizzes, tutoring and analytics features.",
                    "resource_type": ResourceType.TEACHER_ANALYTICS,
                    "permission_type": PermissionType.EXECUTE,
                    "category": "system",
                },
                {
                    "name": "integrations.manage",
                    "display_name": "Manage Integrations",
                    "description": "Configure SMS, email, SSO, payment and third-party integrations.",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.MANAGE,
                    "category": "system",
                },

                # Security, backup, audit -------------------------------------------
                {
                    "name": "security.manage",
                    "display_name": "Manage Security",
                    "description": "Manage 2FA, passwords policies, sessions, API keys and login audit.",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.MANAGE,
                    "category": "system",
                },
                {
                    "name": "audit.read",
                    "display_name": "View Audit Logs",
                    "description": "Read administration, permission and data change audit trails.",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.READ,
                    "category": "system",
                },

                # Attendance approval ------------------------------------------------
                {
                    "name": "attendance.approve",
                    "display_name": "Approve Attendance",
                    "description": "Approve submitted attendance registers, correct attendance and resolve disputes.",
                    "resource_type": ResourceType.ATTENDANCE,
                    "permission_type": PermissionType.APPROVE,
                    "category": "academic",
                },

                # Data import / export ----------------------------------------------
                {
                    "name": "data.import",
                    "display_name": "Import Data",
                    "description": "Bulk-import students, teachers, classes and subjects via CSV / Excel.",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.EXECUTE,
                    "category": "system",
                },
                {
                    "name": "data.export",
                    "display_name": "Export Data",
                    "description": "Bulk-export students, rosters, attendance, grades and finance data.",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.EXECUTE,
                    "category": "system",
                },

                # Tenant / branch ops -----------------------------------------------
                {
                    "name": "branch.manage",
                    "display_name": "Manage Branches / Campuses",
                    "description": "Create, edit and switch between branches, campuses and active academic years.",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.MANAGE,
                    "category": "administration",
                },
                {
                    "name": "tenancy.settings",
                    "display_name": "Manage Tenant Settings",
                    "description": "Manage branding, academic calendar, school-wide features and tenant configuration.",
                    "resource_type": ResourceType.SYSTEM,
                    "permission_type": PermissionType.MANAGE,
                    "category": "system",
                },

                # Custom / tenant-defined permissions capability flag --------------
                # Grants the holder the ability to create NEW permissions from the UI
                # (beyond this baked-in list).  Admins already have this via the
                # user.manage_roles + system.admin combination but a dedicated flag
                # lets us delegate it to a "Permissions Steward" role without
                # handing over the full user management / system admin keys.
                {
                    "name": "permissions.create_custom",
                    "display_name": "Create Custom Permissions",
                    "description": "Allows defining new tenant-specific permissions beyond the standard system list so you can attach them to custom roles.",
                    "resource_type": ResourceType.USER,
                    "permission_type": PermissionType.MANAGE,
                    "category": "user_management",
                },
            ]

            # Pass description along so rows inserted for the first time have the
            # human-readable text from the declarations above rather than NULL.
            for perm_data in default_permissions:
                existing = RBACPermission.query.filter_by(
                    name=perm_data["name"]
                ).first()
                if not existing:
                    permission = RBACPermission(
                        name=perm_data["name"],
                        display_name=perm_data["display_name"],
                        description=perm_data.get("description") or None,
                        resource_type=perm_data["resource_type"],
                        permission_type=perm_data["permission_type"],
                        category=perm_data["category"],
                        priority=perm_data.get("priority") or 0,
                        is_system=True,
                    )
                    db.session.add(permission)
                else:
                    # Keep existing permission rows up-to-date across deployments
                    # without touching any custom tenant-created permissions
                    # (is_system distinguishes them on the source side).  We only
                    # overwrite display/description/category/priority for existing
                    # system rows so new ship metadata propagates on the next init.
                    if existing.is_system:
                        changed = False
                        if existing.display_name != perm_data["display_name"]:
                            existing.display_name = perm_data["display_name"]
                            changed = True
                        next_desc = perm_data.get("description") or None
                        if (existing.description or None) != next_desc:
                            existing.description = next_desc
                            changed = True
                        if existing.category != perm_data["category"]:
                            existing.category = perm_data["category"]
                            changed = True
                        next_prio = perm_data.get("priority") or 0
                        if existing.priority != next_prio:
                            existing.priority = next_prio
                            changed = True
                        if changed:
                            db.session.add(existing)

            db.session.commit()
            logger.info(
                "default_permissions_initialized", count=len(default_permissions)
            )
            return True

        except Exception as e:
            db.session.rollback()
            logger.error("failed_to_initialize_permissions", error=str(e))
            return False

    @staticmethod
    def initialize_default_roles() -> bool:
        """Initialize default system roles"""
        try:
            # Define default roles with their permissions
            default_roles = [
                {
                    "name": "super_admin",
                    "display_name": "Super Administrator",
                    "description": "Full system access with all permissions",
                    "level": 0,
                    "color": "#DC2626",
                    "icon": "shield-check",
                    "permissions": [
                        "system.admin",
                        "system.settings",
                        "system.backup",
                        "system.logs",
                        "user.create",
                        "user.read",
                        "user.update",
                        "user.delete",
                        "user.manage_roles",
                    ],
                },
                {
                    "name": "super_manager",
                    "display_name": "Super Manager",
                    "description": "Full system access (except managing Super Managers)",
                    "level": 0,
                    "color": "#DC2626",
                    "icon": "shield-check",
                    "permissions": [
                        "system.admin",
                        "system.settings",
                        "system.backup",
                        "system.logs",
                        "user.create",
                        "user.read",
                        "user.update",
                        "user.delete",
                        "user.manage_roles",
                    ],
                },
                {
                    "name": "admin",
                    "display_name": "Administrator",
                    "description": "Administrative access to most system functions",
                    "level": 1,
                    "color": "#DC2626",
                    "icon": "user-shield",
                    "permissions": [
                        "dashboard.admin",
                        "user.create",
                        "user.read",
                        "user.update",
                        "user.manage_roles",
                        "student.create",
                        "student.read",
                        "student.update",
                        "teacher.create",
                        "teacher.read",
                        "teacher.update",
                        "class.create",
                        "class.read",
                        "class.update",
                        "class.manage_students",
                        "finance.read",
                        "finance.manage",
                        "report.generate",
                        "report.view",
                        "report.export",
                    ],
                },
                {
                    "name": "teacher",
                    "display_name": "Teacher",
                    "description": "Access to teaching and student management functions",
                    "level": 2,
                    "color": "#059669",
                    "icon": "academic-cap",
                    "permissions": [
                        "dashboard.teacher",
                        "student.read",
                        "student.view_grades",
                        "student.manage_grades",
                        "class.read",
                        "subject.read",
                        "attendance.create",
                        "attendance.read",
                        "attendance.update",
                        "grade.create",
                        "grade.read",
                        "grade.update",
                        "exam.create",
                        "exam.read",
                        "exam.update",
                        "assignment.create",
                        "assignment.read",
                        "assignment.update",
                        "assignment.grade",
                        "report.view",
                        "announcement.read",
                        "announcement.create",
                        "announcement.update",
                        "announcement.delete",
                    ],
                },
                {
                    "name": "student",
                    "display_name": "Student",
                    "description": "Access to personal academic information",
                    "level": 3,
                    "color": "#2563EB",
                    "icon": "user-graduate",
                    "permissions": [
                        "dashboard.student",
                        "assignment.read",
                        "grade.read",
                        "attendance.read",
                        "exam.read",
                    ],
                },
                {
                    "name": "parent",
                    "display_name": "Parent",
                    "description": "Access to child academic information",
                    "level": 3,
                    "color": "#7C3AED",
                    "icon": "users",
                    "permissions": [
                        "dashboard.parent",
                        "student.read",
                        "student.view_grades",
                        "attendance.read",
                        "grade.read",
                        "exam.read",
                        "finance.read",
                        "report.view",
                    ],
                },
                {
                    "name": "staff",
                    "display_name": "Staff",
                    "description": "General staff access",
                    "level": 4,
                    "color": "#F59E0B",
                    "icon": "briefcase",
                    "permissions": [
                        "student.read",
                        "teacher.read",
                        "class.read",
                        "subject.read",
                        "attendance.read",
                    ],
                },
            ]

            for role_data in default_roles:
                existing_role = RBACRole.query.filter_by(name=role_data["name"]).first()
                if not existing_role:
                    role = RBACRole(
                        name=role_data["name"],
                        display_name=role_data["display_name"],
                        description=role_data["description"],
                        level=role_data["level"],
                        color=role_data["color"],
                        icon=role_data["icon"],
                        is_system=True,
                        is_active=True,
                    )

                    # Add permissions to role
                    permissions = RBACPermission.query.filter(
                        RBACPermission.name.in_(role_data["permissions"])
                    ).all()
                    role.permissions.extend(permissions)

                    db.session.add(role)

            db.session.commit()
            logger.info("default_roles_initialized", count=len(default_roles))
            return True

        except Exception as e:
            db.session.rollback()
            logger.error("failed_to_initialize_roles", error=str(e))
            return False

    @staticmethod
    def assign_role_to_user(
        user_id: int,
        role_name: str,
        assigned_by: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Assign a role to a user"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"

            role = RBACRole.query.filter_by(name=role_name, is_active=True).first()
            if not role:
                return False, "Role not found"

            # Check if assignment already exists
            existing = UserRoleAssignment.query.filter_by(
                user_id=user_id, role_id=role.id, is_active=True
            ).first()

            if existing and existing.is_valid():
                return False, "User already has this role"

            # Create new assignment
            assignment = UserRoleAssignment(
                user_id=user_id,
                role_id=role.id,
                assigned_by=assigned_by,
                assigned_reason=reason,
                expires_at=expires_at,
                is_active=True,
            )

            db.session.add(assignment)
            db.session.commit()

            logger.info(
                "role_assigned",
                user_id=user_id,
                role=role_name,
                assigned_by=assigned_by,
            )
            return True, "Role assigned successfully"

        except Exception as e:
            db.session.rollback()
            logger.error(
                "failed_to_assign_role", user_id=user_id, role=role_name, error=str(e)
            )
            return False, str(e)

    @staticmethod
    def revoke_role_from_user(
        user_id: int,
        role_name: str,
        revoked_by: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Revoke a role from a user"""
        try:
            role = RBACRole.query.filter_by(name=role_name).first()
            if not role:
                return False, "Role not found"

            assignment = UserRoleAssignment.query.filter_by(
                user_id=user_id, role_id=role.id, is_active=True
            ).first()

            if not assignment:
                return False, "User does not have this role"

            assignment.is_active = False
            db.session.commit()

            logger.info("role_revoked", user_id=user_id, role=role_name)
            return True, "Role revoked successfully"

        except Exception as e:
            db.session.rollback()
            logger.error(
                "failed_to_revoke_role", user_id=user_id, role=role_name, error=str(e)
            )
            return False, str(e)

    @staticmethod
    def get_user_roles(
        user_id: int, include_expired: bool = False, return_models: bool = False
    ) -> Any:
        """Get all roles for a user"""
        try:
            query = UserRoleAssignment.query.filter_by(user_id=user_id, is_active=True)

            if not include_expired:
                query = query.filter(
                    or_(
                        UserRoleAssignment.expires_at.is_(None),
                        UserRoleAssignment.expires_at > datetime.utcnow(),
                    )
                )

            assignments = query.all()

            if return_models:
                return [
                    assignment.role for assignment in assignments if assignment.role
                ]

            return [
                {
                    "role": assignment.role.to_dict() if assignment.role else {},
                    "assigned_at": assignment.assigned_at.isoformat(),
                    "expires_at": (
                        assignment.expires_at.isoformat()
                        if assignment.expires_at
                        else None
                    ),
                    "is_valid": assignment.is_valid(),
                }
                for assignment in assignments
            ]

        except Exception as e:
            logger.error("failed_to_get_user_roles", user_id=user_id, error=str(e))
            return []

    @staticmethod
    def get_role_users(role_name: str) -> List[Dict[str, Any]]:
        """Get all users with a specific role"""
        try:
            role = RBACRole.query.filter_by(name=role_name).first()
            if not role:
                return []

            assignments = UserRoleAssignment.query.filter_by(
                role_id=role.id, is_active=True
            ).all()

            valid_assignments = [a for a in assignments if a.is_valid()]

            return [
                {
                    "user_id": assignment.user_id,
                    "username": assignment.user.username,
                    "email": assignment.user.email,
                    "assigned_at": assignment.assigned_at.isoformat(),
                    "expires_at": (
                        assignment.expires_at.isoformat()
                        if assignment.expires_at
                        else None
                    ),
                }
                for assignment in valid_assignments
            ]

        except Exception as e:
            logger.error("failed_to_get_role_users", role=role_name, error=str(e))
            return []

    @staticmethod
    def create_permission(
        name: str,
        display_name: str,
        resource_type: ResourceType,
        permission_type: PermissionType,
        **kwargs
    ) -> Tuple[Optional[RBACPermission], str]:
        """Create a new permission"""
        try:
            existing = RBACPermission.query.filter_by(name=name).first()
            if existing:
                return None, "Permission already exists"

            permission = RBACPermission(
                name=name,
                display_name=display_name,
                resource_type=resource_type,
                permission_type=permission_type,
                **kwargs
            )

            db.session.add(permission)
            db.session.commit()

            logger.info("permission_created", name=name)
            return permission, "Permission created successfully"

        except Exception as e:
            db.session.rollback()
            logger.error("failed_to_create_permission", name=name, error=str(e))
            return None, str(e)

    @staticmethod
    def create_role(
        name: str, display_name: str, permission_names: List[str] = None, **kwargs
    ) -> Tuple[Optional[RBACRole], str]:
        """Create a new role"""
        try:
            existing = RBACRole.query.filter_by(name=name).first()
            if existing:
                return None, "Role already exists"

            role = RBACRole(name=name, display_name=display_name, **kwargs)

            # Add permissions if provided
            if permission_names:
                permissions = RBACPermission.query.filter(
                    RBACPermission.name.in_(permission_names)
                ).all()
                role.permissions.extend(permissions)

            db.session.add(role)
            db.session.commit()

            logger.info("role_created", name=name, permissions=permission_names or [])
            return role, "Role created successfully"

        except Exception as e:
            db.session.rollback()
            logger.error("failed_to_create_role", name=name, error=str(e))
            return None, str(e)

    @staticmethod
    def get_all_permissions(category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all permissions, optionally filtered by category"""
        try:
            query = RBACPermission.query.filter_by(is_active=True)

            if category:
                query = query.filter_by(category=category)

            permissions = query.order_by(
                RBACPermission.category, RBACPermission.name
            ).all()

            return [perm.to_dict() for perm in permissions]

        except Exception as e:
            logger.error("failed_to_get_permissions", error=str(e))
            return []

    @staticmethod
    def get_all_roles() -> List[Dict[str, Any]]:
        """Get all active roles"""
        try:
            roles = (
                RBACRole.query.filter_by(is_active=True)
                .order_by(RBACRole.level, RBACRole.name)
                .all()
            )
            return [role.to_dict(include_permissions=True) for role in roles]

        except Exception as e:
            logger.error("failed_to_get_roles", error=str(e))
            return []
