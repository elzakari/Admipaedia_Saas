# Academic Calendar models
from app.models.academic_calendar import AcademicYear, Term
# AcademicCycle is superseded by AcademicStructure(structure_type=CYCLE).
# Kept imported here for backward compat. Migrate callers over time.
from app.models.academic_cycle import AcademicCycle  # noqa: F401 - deprecated
# Admission & Applications
from app.models.admission import AdmissionApplication
# Assessment methods
from app.models.assessment_methods import (AssessmentAnalytics,
                                           AssessmentFramework, AssessmentMode,
                                           AssessmentRubric, AssessmentScore,
                                           AssessmentSubmission,
                                           AssessmentTask, AssessmentType,
                                           ContinuousAssessmentRecord,
                                           DifferentiatedAssessment,
                                           DifferentiationStrategy,
                                           SchoolBasedAssessment)
# Only import once
from app.models.associations import class_subjects, teacher_subjects
from app.models.attachment import Attachment
from app.models.attendance import Attendance
from app.models.billing import (PendingInvoiceAdjustment, Plan, PlanFeature,
                                PlanLimit, PlanPricingTier,
                                SchoolFeatureOverride, SchoolLimitOverride,
                                SchoolPlanSubscription,
                                StudentTermRegistration,
                                SubscriptionChangeRequest)
# Character development models
from app.models.character_development import (ActivityImplementation,
                                              AssessmentFrequency,
                                              CharacterActivity,
                                              CharacterAssessment,
                                              CharacterDevelopmentPlan,
                                              CharacterDomain, CharacterTrait,
                                              ValuesEducationResource)
from app.models.class_ import Class, ClassTeacherMapping
# Core competencies framework
from app.models.competency_framework import (CompetencyDomain,
                                             CompetencyEvidence,
                                             CompetencyIndicator,
                                             CompetencyLearningActivity,
                                             ProficiencyLevel,
                                             StudentCompetencyProfile)
# In app/models/__init__.py
from app.models.department import \
    Department  # backward-compat alias for AcademicStructure
from app.models.department import (AcademicStructure, AcademicStructureType,
                                   department_staff)
# New Ghana Educational Service models
from app.models.educational_level import (CoreCompetency, EducationalLevel,
                                          KeyPhase,
                                          StudentCompetencyAssessment)
from app.models.educational_system import (EducationalSystemConfig,
                                           EducationalSystemTemplate,
                                           GradeLevel)
from app.models.email_verification import EmailVerificationToken
from app.models.exam import Exam
# External exams
from app.models.external_exams import (ExamSession, ExternalExamImportLog,
                                       ExternalExamination,
                                       ExternalExamRegistration,
                                       ExternalExamResult, ExternalExamType,
                                       ResultStatus)
# Finance & Fee Management models
from app.models.finance import (FeeCategory, FeeDiscount, FeeStructure,
                                Payment, PaymentAllocation, StudentFee)
from app.models.grade import Grade
from app.models.grade_track import GradeTrack
from app.models.grading_system import (AssessmentType, EnhancedGrade,
                                       FinalGrade, GradeBoundary,
                                       GradingScheme, GradingStandard)
# Library system models
from app.models.lesson import Lesson
from app.models.lesson_acknowledgement import LessonAcknowledgement
from app.models.lesson_attachment import LessonAttachment
from app.models.lesson_broadcast import LessonBroadcast
from app.models.lesson_comment import LessonComment
from app.models.lesson_homework_submission import LessonHomeworkSubmission
from app.models.library import (Book, BookCategory, BookReservation,
                                BookStatus, BorrowRecord, BorrowStatus,
                                FineRecord, LibraryMember, LibrarySettings,
                                MemberType)
# Communication system models
from app.models.message import Message
# Messaging Notifications
from app.models.notification_log import NotificationLog
from app.models.parent import Parent, ParentChildSetupTask
from app.models.polymorphic_grading_scale import PolymorphicGradingScale
# Progression tracking
from app.models.progression_tracking import (ProgressionCriteria,
                                             PromotionStatus,
                                             StudentProgression)
# Security models - MISSING IMPORT
from app.models.security import (APIKey, LoginAttempt, PasswordHistory,
                                 SecurityEvent)
# Platform integrations & token distribution
from app.models.service_tokens import (PlatformServiceProviderConfig,
                                       TenantServiceProviderOverride,
                                       TenantServiceToken,
                                       TenantServiceTokenEvent,
                                       TenantServiceTokenUsage)
# Session token management
from app.models.session_token import SessionToken
from app.models.staff import Staff
from app.models.staff_enhanced import (LeaveStatus, LeaveType, StaffAttendance,
                                       StaffLeave)
# STEM-focused curriculum models
from app.models.stem_curriculum import (LearningApproach, STEMAssessment,
                                        STEMAssessmentResult, STEMDomain,
                                        STEMLearningModule, STEMProject,
                                        STEMProjectSubmission,
                                        STEMResourceBooking,
                                        STEMResourceCenter, STEMSubject)
from app.models.student import Student
from app.models.subject import Subject
# System Settings
from app.models.system_setting import SystemSetting, SystemSettings
from app.models.teacher import Teacher
from app.models.teacher_attendance import TeacherAttendance
# SaaS / Multi-tenancy models
from app.models.tenant import (TENANT_MEMBER_ROLES, Branch, PlatformAuditLog,
                               PlatformInvoice, PlatformPayment, Subscription,
                               Tenant, TenantInvitation, TenantMembership)
from app.models.tenant_academic_settings import TenantAcademicSettings
# Timetable & Scheduling models
from app.models.timetable import Period, TimetableSlot
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.models.user_profile import UserProfile
