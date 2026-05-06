from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.user_preferences import UserPreferences
from app.models.grade import Grade
from app.models.exam import Exam
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.attendance import Attendance
from app.models.teacher_attendance import TeacherAttendance
# Only import once
from app.models.associations import teacher_subjects, class_subjects
# In app/models/__init__.py
from app.models.department import Department, department_staff
# Session token management
from app.models.session_token import SessionToken
# Security models - MISSING IMPORT
from app.models.security import LoginAttempt, SecurityEvent, PasswordHistory, APIKey
# Library system models
from app.models.library import (
    Book, LibraryMember, BorrowRecord, BookReservation, 
    FineRecord, LibrarySettings, BookStatus, BookCategory, 
    BorrowStatus, MemberType
)
# New Ghana Educational Service models
from app.models.educational_level import EducationalLevel, KeyPhase, CoreCompetency, StudentCompetencyAssessment
from app.models.grading_system import (
    GradingScheme, 
    GradeBoundary, 
    EnhancedGrade, 
    FinalGrade, 
    GradingStandard, 
    AssessmentType
)
# Core competencies framework
from app.models.competency_framework import (
    CompetencyDomain,
    ProficiencyLevel,
    CompetencyIndicator,
    StudentCompetencyProfile,
    CompetencyEvidence,
    CompetencyLearningActivity
)
# STEM-focused curriculum models
from app.models.stem_curriculum import (
    STEMDomain,
    LearningApproach,
    STEMSubject,
    STEMLearningModule,
    STEMProject,
    STEMAssessment,
    STEMProjectSubmission,
    STEMAssessmentResult,
    STEMResourceCenter,
    STEMResourceBooking
)
# Character development models
from app.models.character_development import (
    CharacterDomain,
    AssessmentFrequency,
    CharacterTrait,
    CharacterAssessment,
    CharacterActivity,
    ActivityImplementation,
    CharacterDevelopmentPlan,
    ValuesEducationResource
)
# Assessment methods
from app.models.assessment_methods import (
    AssessmentType,
    AssessmentMode,
    DifferentiationStrategy,
    AssessmentFramework,
    AssessmentTask,
    AssessmentRubric,
    AssessmentSubmission,
    AssessmentScore,
    ContinuousAssessmentRecord,
    SchoolBasedAssessment,
    DifferentiatedAssessment,
    AssessmentAnalytics
)
# Progression tracking
from app.models.progression_tracking import (
    PromotionStatus,
    ProgressionCriteria,
    StudentProgression
)
# External exams
from app.models.external_exams import (
    ExternalExamType,
    ExamSession,
    ResultStatus,
    ExternalExamination,
    ExternalExamRegistration,
    ExternalExamResult,
    ExternalExamImportLog
)
# Communication system models
from app.models.message import Message
from app.models.staff import Staff
from app.models.staff_enhanced import LeaveType, StaffLeave, StaffAttendance, LeaveStatus

# SaaS / Multi-tenancy models
from app.models.tenant import (
    Tenant,
    Subscription,
    PlatformAuditLog,
    TenantMembership,
    TenantInvitation,
    PlatformInvoice,
    PlatformPayment,
    TENANT_MEMBER_ROLES
)
from app.models.educational_system import EducationalSystemTemplate, EducationalSystemConfig, GradeLevel
from app.models.tenant_academic_settings import TenantAcademicSettings

# Finance & Fee Management models
from app.models.finance import (
    FeeCategory,
    FeeStructure,
    FeeDiscount,
    StudentFee,
    Payment,
    PaymentAllocation
)

# Timetable & Scheduling models
from app.models.timetable import Period, TimetableSlot

# Admission & Applications
from app.models.admission import AdmissionApplication

# System Settings
from app.models.system_setting import SystemSetting

# Academic Calendar models
from app.models.academic_calendar import AcademicYear, Term
