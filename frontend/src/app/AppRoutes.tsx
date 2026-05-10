import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from './AppLayout';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import LazyLoadingWrapper from '../components/performance/LazyLoadingWrapper';

// Critical pages - loaded immediately (authentication and landing)
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ParentRegisterPage from '../pages/auth/ParentRegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import MFAVerifyPage from '../pages/auth/MFAVerifyPage';
import MFASetupPage from '../pages/auth/MFASetupPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import SchoolRegistrationPage from '../pages/saas/SchoolRegistrationPage';
import InviteAcceptPage from '../pages/auth/InviteAcceptPage';

import SuperAdminLoginPage from '../pages/super-admin/SuperAdminLoginPage';
import SuperAdminDashboardPage from '../pages/super-admin/SuperAdminDashboardPage';
import SuperAdminUsersPage from '../pages/super-admin/SuperAdminUsersPage';
import SuperAdminUserDetailsPage from '../pages/super-admin/SuperAdminUserDetailsPage';
import SuperAdminAuditLogsPage from '../pages/super-admin/SuperAdminAuditLogsPage';
import SuperAdminSchoolsPage from '../pages/super-admin/SuperAdminSchoolsPage';
import SuperAdminFinancialInsightsPage from '../pages/super-admin/SuperAdminFinancialInsightsPage';
import SuperAdminERegistrationBillingPage from '../pages/super-admin/SuperAdminERegistrationBillingPage';

// Lazy-loaded dashboard components (high priority)
const AdminDashboard = lazy(() => import('../pages/dashboard/AdminDashboard'));
const TeacherDashboard = lazy(() => import('../pages/dashboard/TeacherDashboard'));
const StudentDashboard = lazy(() => import('../pages/dashboard/StudentDashboard'));
const ParentDashboard = lazy(() => import('../pages/dashboard/ParentDashboard'));
const AdmissionsPage = lazy(() => import('../pages/portal/AdmissionsPage'));
const AdmissionFormPage = lazy(() => import('../pages/portal/AdmissionFormPage'));
const SystemSettingsPage = lazy(() => import('../pages/administration/SystemSettingsPage'));
const AdminERegistrationBillingPage = lazy(() => import('../pages/billing/AdminERegistrationBillingPage'));
const AdminInvitationsPage = lazy(() => import('../pages/administration/AdminInvitationsPage'));

// Lazy-loaded main pages (medium priority)
// Lazy imports
const StudentsPage = lazy(() => import('../pages/students/StudentsPage'));
// const StudentDetailPage = lazy(() => import('../pages/students/StudentDetailPage')); // Unused
const StudentProfilePage = lazy(() => import('../pages/students/StudentProfilePage'));
const StudentEditPage = lazy(() => import('../pages/students/StudentEditPage'));
const AcademicsPage = lazy(() => import('../pages/academics/AcademicsPage'));
const TeachersPage = lazy(() => import('../pages/teachers/TeachersPage'));
const ParentsPage = lazy(() => import('../pages/parents/ParentsPage'));
const ParentManagementPage = lazy(() => import('../pages/parents/ParentManagementPage'));

// Lazy-loaded feature pages (lower priority)
const LibraryPage = lazy(() => import('../pages/Library/LibraryPage'));
const SchedulePage = lazy(() => import('../pages/Schedules/SchedulePage'));
const NotificationsPage = lazy(() => import('../pages/Notifications/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const MessagesPage = lazy(() => import('../pages/Messages/MessagesPage').then(module => ({ default: module.MessagesPage })));
const FeesPage = lazy(() => import('../pages/Fees/FeesPage').then(module => ({ default: module.FeesPage })));
const AdministrationPage = lazy(() => import('../pages/administration/AdministrationPage'));
const AttendancePage = lazy(() => import('../pages/attendance/AttendancePage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const ExamsPage = lazy(() => import('../pages/exams/ExamsPage'));
const ClassesPage = lazy(() => import('../pages/classes/ClassesPage'));
const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage'));
const ExportPage = lazy(() => import('../pages/export/ExportPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const AnnouncementsPage = lazy(() => import('../pages/Announcements/AnnouncementsPage'));
const HelpPage = lazy(() => import('../pages/help/HelpPage'));
const GuidesPage = lazy(() => import('../pages/help/GuidesPage'));
const TermsPage = lazy(() => import('../pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/legal/PrivacyPage'));

// SaaS pages
const SaasOnboardingPage = lazy(() => import('../pages/saas/SaasOnboardingPage'));
const SchoolPortalDashboardPage = lazy(() => import('../pages/saas/SchoolPortalDashboardPage'));
const SchoolProfilePage = lazy(() => import('../pages/saas/SchoolProfilePage'));
const TeamRolesPage = lazy(() => import('../pages/saas/TeamRolesPage'));
const BillingInvoicesPage = lazy(() => import('../pages/saas/BillingInvoicesPage'));
const BillingPaymentsPage = lazy(() => import('../pages/saas/BillingPaymentsPage'));

// Student Portal pages
const StudentClassesPage = lazy(() => import('@/pages/student/StudentClassesPage'));
const StudentClassDetailPage = lazy(() => import('@/pages/student/StudentClassDetailPage'));
const StudentAssignmentsPage = lazy(() => import('@/pages/student/StudentAssignmentsPage'));
const StudentAssignmentDetailPage = lazy(() => import('@/pages/student/StudentAssignmentDetailPage'));
const StudentGradesPage = lazy(() => import('@/pages/student/StudentGradesPage'));
const StudentAttendancePage = lazy(() => import('@/pages/student/StudentAttendancePage'));
const StudentTimetablePage = lazy(() => import('@/pages/student/StudentTimetablePage'));
const StudentCalendarPage = lazy(() => import('@/pages/student/StudentCalendarPage'));
const StudentMessagesPage = lazy(() => import('@/pages/student/StudentMessagesPage'));
const StudentNotificationsPage = lazy(() => import('@/pages/student/StudentNotificationsPage'));

// Teacher Portal pages
const TeacherClassesPage = lazy(() => import('@/pages/teacher/TeacherClassesPage'));
const TeacherClassDetailPage = lazy(() => import('@/pages/teacher/TeacherClassDetailPage'));
const TeacherMessagesPage = lazy(() => import('@/pages/teacher/TeacherMessagesPage'));
const TeacherNotificationsPage = lazy(() => import('@/pages/teacher/TeacherNotificationsPage'));
const TeacherTimetablePage = lazy(() => import('@/pages/teacher/TeacherTimetablePage'));
const TeacherCalendarPage = lazy(() => import('@/pages/teacher/TeacherCalendarPage'));

// Enhanced loading fallback component
const LoadingFallback: React.FC<{ componentName?: string }> = ({ componentName }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-indigo-400 rounded-full animate-pulse mx-auto"></div>
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold text-gray-700">Loading {componentName || 'Page'}...</p>
        <p className="text-sm text-gray-500">Optimizing your experience</p>
      </div>
      <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Enhanced Protected Route with performance monitoring
function ProtectedRoute({ element, allowedRoles = [], componentName, hideHeader }: {
  element: React.ReactElement;
  allowedRoles?: Array<'super_admin' | 'admin' | 'teacher' | 'student' | 'parent' | 'user'>;
  componentName?: string;
  hideHeader?: boolean;
}) {
  const { user, isAuthenticated, isLoading, refreshToken } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isAuthenticated) {
      try {
        const payloadPart = token.split('.')[1];
        if (payloadPart) {
          const tokenData = JSON.parse(atob(payloadPart));
          const expirationTime = tokenData.exp * 1000;
          const currentTime = Date.now();
          const timeUntilExpiry = expirationTime - currentTime;
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            refreshToken();
          }
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    }
  }, [isAuthenticated, refreshToken]);

  if (isLoading) {
    return <LoadingFallback componentName="Authentication" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <AppLayout hideHeader={hideHeader ?? false}>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback componentName={componentName || 'Page'} />}>
          <LazyLoadingWrapper>
            {element}
          </LazyLoadingWrapper>
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}

function BareProtectedRoute({ element, allowedRoles = [], componentName }: {
  element: React.ReactElement;
  allowedRoles?: Array<'super_admin' | 'admin' | 'teacher' | 'student' | 'parent' | 'user'>;
  componentName?: string;
}) {
  const { user, isAuthenticated, isLoading, refreshToken } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isAuthenticated) {
      try {
        const payloadPart = token.split('.')[1];
        if (payloadPart) {
          const tokenData = JSON.parse(atob(payloadPart));
          const expirationTime = tokenData.exp * 1000;
          const currentTime = Date.now();
          const timeUntilExpiry = expirationTime - currentTime;
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            refreshToken();
          }
        }
      } catch (e) {
        void e;
      }
    }
  }, [isAuthenticated, refreshToken]);

  if (isLoading) {
    return <LoadingFallback componentName={componentName || 'Loading'} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback componentName={componentName || 'Page'} />}>
        <LazyLoadingWrapper>
          {element}
        </LazyLoadingWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}

// Remove the LazyRoute component definition as it's no longer needed

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes - no lazy loading for critical auth flows */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/parent-register" element={<ParentRegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/school/register" element={<SchoolRegistrationPage />} />
      <Route path="/invite/:inviteId" element={<InviteAcceptPage />} />
      <Route path="/auth/mfa/verify" element={<MFAVerifyPage />} />

      <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
      <Route
        path="/super-admin"
        element={<ProtectedRoute element={<SuperAdminDashboardPage />} allowedRoles={['super_admin']} componentName="Super Admin" />}
      />
      <Route
        path="/super-admin/schools"
        element={<ProtectedRoute element={<SuperAdminSchoolsPage />} allowedRoles={['super_admin']} componentName="Schools" />}
      />
      <Route
        path="/super-admin/financial"
        element={<ProtectedRoute element={<SuperAdminFinancialInsightsPage />} allowedRoles={['super_admin']} componentName="Financial Insights" />}
      />
      <Route
        path="/super-admin/users"
        element={<ProtectedRoute element={<SuperAdminUsersPage />} allowedRoles={['super_admin']} componentName="Users" />}
      />
      <Route
        path="/super-admin/users/:id"
        element={<ProtectedRoute element={<SuperAdminUserDetailsPage />} allowedRoles={['super_admin']} componentName="User Details" />}
      />
      <Route
        path="/super-admin/audit-logs"
        element={<ProtectedRoute element={<SuperAdminAuditLogsPage />} allowedRoles={['super_admin']} componentName="Audit Logs" />}
      />
      <Route
        path="/super-admin/e-registration-billing"
        element={<ProtectedRoute element={<SuperAdminERegistrationBillingPage />} allowedRoles={['super_admin']} componentName="E-Registration Billing" />}
      />

      <Route
        path="/app/onboarding"
        element={<BareProtectedRoute element={<SaasOnboardingPage />} allowedRoles={['super_admin']} componentName="School Onboarding" />}
      />
      <Route
        path="/app"
        element={<BareProtectedRoute element={<SchoolPortalDashboardPage />} componentName="School Portal" />}
      />
      <Route
        path="/app/school"
        element={<BareProtectedRoute element={<SchoolProfilePage />} componentName="School Profile" />}
      />
      <Route
        path="/app/team"
        element={<BareProtectedRoute element={<TeamRolesPage />} componentName="Team & Roles" />}
      />
      <Route
        path="/app/billing/invoices"
        element={<BareProtectedRoute element={<BillingInvoicesPage />} componentName="Invoices" />}
      />
      <Route
        path="/app/billing/payments"
        element={<BareProtectedRoute element={<BillingPaymentsPage />} componentName="Payments" />}
      />

      <Route
        path="/platform"
        element={<Navigate to="/super-admin/schools" replace />}
      />
      <Route
        path="/platform/financial"
        element={<Navigate to="/super-admin/financial" replace />}
      />
      
      <Route 
        path="/auth/mfa/setup" 
        element={
          <ProtectedRoute 
            element={<MFASetupPage />} 
            allowedRoles={['admin', 'teacher', 'student', 'parent']}
            componentName="MFA Setup"
          />
        } 
      />

      {/* Dashboard routes - high priority lazy loading */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute 
            element={<AdminDashboard />} 
            allowedRoles={['admin']}
            componentName="Admin Dashboard"
          />
        } 
      />

      <Route
        path="/admin/e-registration-billing"
        element={
          <ProtectedRoute
            element={<AdminERegistrationBillingPage />}
            allowedRoles={['admin']}
            componentName="Billing & E-Registration Plan"
          />
        }
      />

      <Route
        path="/admin/invitations"
        element={
          <ProtectedRoute
            element={<AdminInvitationsPage />}
            allowedRoles={['admin']}
            componentName="Invitations"
          />
        }
      />
      
      <Route 
        path="/teacher/dashboard" 
        element={
          <ProtectedRoute 
            element={<TeacherDashboard />} 
            allowedRoles={['teacher']}
            componentName="Teacher Dashboard"
          />
        } 
      />

      {/* Teacher Portal routes */}
      <Route
        path="/teacher/classes"
        element={
          <ProtectedRoute
            element={<TeacherClassesPage />}
            allowedRoles={['teacher']}
            componentName="My Classes"
          />
        }
      />

      <Route
        path="/teacher/classes/:classId"
        element={
          <ProtectedRoute
            element={<TeacherClassDetailPage />}
            allowedRoles={['teacher']}
            componentName="Class Workspace"
          />
        }
      />

      <Route
        path="/teacher/messages"
        element={
          <ProtectedRoute
            element={<TeacherMessagesPage />}
            allowedRoles={['teacher']}
            componentName="Messages"
          />
        }
      />

      <Route
        path="/teacher/notifications"
        element={
          <ProtectedRoute
            element={<TeacherNotificationsPage />}
            allowedRoles={['teacher']}
            componentName="Notifications"
          />
        }
      />

      <Route
        path="/teacher/timetable"
        element={
          <ProtectedRoute
            element={<TeacherTimetablePage />}
            allowedRoles={['teacher']}
            componentName="Timetable"
          />
        }
      />

      <Route
        path="/teacher/calendar"
        element={
          <ProtectedRoute
            element={<TeacherCalendarPage />}
            allowedRoles={['teacher']}
            componentName="Calendar"
          />
        }
      />
      
      <Route 
        path="/student/dashboard" 
        element={
          <ProtectedRoute 
            element={<StudentDashboard />} 
            allowedRoles={['student']}
            componentName="Student Dashboard"
          />
        } 
      />

      {/* Student Portal routes */}
      <Route
        path="/student/classes"
        element={
          <ProtectedRoute
            element={<StudentClassesPage />}
            allowedRoles={['student']}
            componentName="My Classes"
          />
        }
      />

      <Route
        path="/student/classes/:classId"
        element={
          <ProtectedRoute
            element={<StudentClassDetailPage />}
            allowedRoles={['student']}
            componentName="Class Details"
          />
        }
      />

      <Route
        path="/student/assignments"
        element={
          <ProtectedRoute
            element={<StudentAssignmentsPage />}
            allowedRoles={['student']}
            componentName="Assignments"
          />
        }
      />

      <Route
        path="/student/assignments/:assignmentId"
        element={
          <ProtectedRoute
            element={<StudentAssignmentDetailPage />}
            allowedRoles={['student']}
            componentName="Assignment"
          />
        }
      />

      <Route
        path="/student/grades"
        element={
          <ProtectedRoute
            element={<StudentGradesPage />}
            allowedRoles={['student']}
            componentName="Grades & Results"
          />
        }
      />

      <Route
        path="/student/attendance"
        element={
          <ProtectedRoute
            element={<StudentAttendancePage />}
            allowedRoles={['student']}
            componentName="Attendance"
          />
        }
      />

      <Route
        path="/student/timetable"
        element={
          <ProtectedRoute
            element={<StudentTimetablePage />}
            allowedRoles={['student']}
            componentName="Timetable"
          />
        }
      />

      <Route
        path="/student/calendar"
        element={
          <ProtectedRoute
            element={<StudentCalendarPage />}
            allowedRoles={['student']}
            componentName="Calendar"
          />
        }
      />

      <Route
        path="/student/messages"
        element={
          <ProtectedRoute
            element={<StudentMessagesPage />}
            allowedRoles={['student']}
            componentName="Messages"
          />
        }
      />

      <Route
        path="/student/notifications"
        element={
          <ProtectedRoute
            element={<StudentNotificationsPage />}
            allowedRoles={['student']}
            componentName="Notifications"
          />
        }
      />
      
      <Route 
        path="/parent/dashboard" 
        element={
          <ProtectedRoute 
            element={<ParentDashboard />} 
            allowedRoles={['parent']}
            componentName="Parent Dashboard"
          />
        } 
      />

      <Route 
        path="/admissions" 
        element={
          <ProtectedRoute 
            element={<AdmissionsPage />} 
            allowedRoles={['parent', 'admin']}
            componentName="Admissions"
          />
        } 
      />

      <Route 
        path="/admissions/form/:id" 
        element={
          <ProtectedRoute 
            element={<AdmissionFormPage />} 
            allowedRoles={['parent', 'admin']}
            componentName="Admission Form"
          />
        } 
      />

      {/* Main feature routes - medium priority lazy loading */}
      <Route 
        path="/academics" 
        element={
          user?.role === 'teacher'
            ? <Navigate to="/teacher/classes" replace />
            : (
              <ProtectedRoute 
                element={<AcademicsPage />} 
                allowedRoles={['admin']}
                componentName="Academics"
              />
            )
        } 
      />
      
      <Route 
        path="/students" 
        element={
          user?.role === 'teacher'
            ? <Navigate to="/teacher/classes" replace />
            : (
              <ProtectedRoute 
                element={<StudentsPage />} 
                allowedRoles={['admin']}
                componentName="Students Management"
              />
            )
        } 
      />
      
      <Route 
        path="/students/:id" 
        element={
          <ProtectedRoute 
            element={<StudentProfilePage />} 
            allowedRoles={['admin']}
            componentName="Student Profile"
          />
        } 
      />
      
      <Route 
        path="/students/:id/edit" 
        element={
          <ProtectedRoute 
            element={<StudentEditPage />} 
            allowedRoles={['admin']}
            componentName="Edit Student"
          />
        } 
      />
      
      <Route 
        path="/teachers" 
        element={
          <ProtectedRoute 
            element={<TeachersPage />} 
            allowedRoles={['admin']}
            componentName="Teachers Management"
          />
        } 
      />
      
      <Route 
        path="/parents" 
        element={
          <ProtectedRoute 
            element={<ParentManagementPage />} 
            allowedRoles={['admin']}
            componentName="Parents Management"
          />
        } 
      />
      
      <Route 
        path="/parent-portal" 
        element={
          <ProtectedRoute 
            element={<ParentsPage />} 
            allowedRoles={['parent']}
            componentName="Parent Portal"
          />
        } 
      />

      {/* Feature pages - lower priority lazy loading */}
      <Route 
        path="/attendance" 
        element={
          user?.role === 'teacher'
            ? <Navigate to="/teacher/classes" replace />
            : (
              <ProtectedRoute 
                element={<AttendancePage />} 
                allowedRoles={['admin']}
                componentName="Attendance"
              />
            )
        } 
      />
      
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute 
            element={<ReportsPage />} 
            allowedRoles={['admin']}
            componentName="Reports"
          />
        } 
      />

      <Route 
        path="/exams" 
        element={
          user?.role === 'teacher'
            ? <Navigate to="/teacher/classes" replace />
            : (
              <ProtectedRoute 
                element={<ExamsPage />} 
                allowedRoles={['admin']}
                componentName="Exams"
              />
            )
        } 
      />

      <Route 
        path="/classes" 
        element={
          user?.role === 'teacher'
            ? <Navigate to="/teacher/classes" replace />
            : (
              <ProtectedRoute 
                element={<ClassesPage />} 
                allowedRoles={['admin']}
                componentName="Classes"
              />
            )
        } 
      />

      <Route 
        path="/calendar" 
        element={
          user?.role === 'student'
            ? <Navigate to="/student/calendar" replace />
            : user?.role === 'teacher'
              ? <Navigate to="/teacher/calendar" replace />
            : (
              <ProtectedRoute 
                element={<CalendarPage />} 
                allowedRoles={['admin', 'parent']}
                componentName="Calendar"
              />
            )
        }
      />

      <Route 
        path="/export" 
        element={
          <ProtectedRoute 
            element={<ExportPage />} 
            allowedRoles={['admin']}
            componentName="Data Export"
          />
        } 
      />
      
      <Route 
        path="/library" 
        element={
          user?.role === 'teacher'
            ? <Navigate to="/teacher/classes" replace />
            : (
              <ProtectedRoute 
                element={<LibraryPage />} 
                allowedRoles={['admin']}
                componentName="Library"
              />
            )
        } 
      />
      
      <Route 
        path="/schedule" 
        element={
          user?.role === 'student'
            ? <Navigate to="/student/timetable" replace />
            : user?.role === 'teacher'
              ? <Navigate to="/teacher/timetable" replace />
            : (
              <ProtectedRoute 
                element={<SchedulePage />} 
                allowedRoles={['admin', 'parent']}
                componentName="Schedule"
              />
            )
        }
      />
      
      <Route 
        path="/notifications" 
        element={
          user?.role === 'student'
            ? <Navigate to="/student/notifications" replace />
            : user?.role === 'teacher'
              ? <Navigate to="/teacher/notifications" replace />
            : (
              <ProtectedRoute 
                element={<NotificationsPage />} 
                allowedRoles={['admin', 'parent']}
                componentName="Notifications"
              />
            )
        }
      />
      
      <Route 
        path="/messages" 
        element={
          user?.role === 'student'
            ? <Navigate to="/student/messages" replace />
            : user?.role === 'teacher'
              ? <Navigate to="/teacher/messages" replace />
            : (
              <ProtectedRoute 
                element={<MessagesPage />} 
                allowedRoles={['admin', 'parent']}
                componentName="Messages"
              />
            )
        }
      />
      
      <Route 
        path="/fees" 
        element={
          <ProtectedRoute 
            element={<FeesPage />} 
            allowedRoles={['admin']}
            componentName="Fees Management"
          />
        } 
      />
      
      <Route 
        path="/administration" 
        element={
          <ProtectedRoute 
            element={<AdministrationPage />} 
            allowedRoles={['admin']}
            componentName="Administration"
          />
        } 
      />

      <Route 
        path="/administration/settings" 
        element={
          user?.role === 'super_admin'
            ? (
              <ProtectedRoute
                element={<SystemSettingsPage />}
                allowedRoles={['super_admin']}
                componentName="System Settings"
              />
            )
            : <Navigate to="/settings" replace />
        } 
      />

      <Route
        path="/super-admin/settings"
        element={
          <ProtectedRoute
            element={<SystemSettingsPage />}
            allowedRoles={['super_admin']}
            componentName="System Settings"
          />
        }
      />
      
      <Route 
        path="/settings" 
        element={
          user?.role === 'super_admin'
            ? <Navigate to="/super-admin/settings" replace />
            : (
              <ProtectedRoute 
                element={<SettingsPage />} 
                allowedRoles={['admin', 'teacher', 'student', 'parent']}
                componentName="Settings"
              />
            )
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoute 
            element={<ProfilePage />} 
            allowedRoles={['super_admin', 'admin', 'teacher', 'student', 'parent']}
            componentName="Profile"
          />
        } 
      />
      
      <Route 
        path="/announcements" 
        element={
          user?.role === 'student'
            ? <Navigate to="/student/notifications" replace />
            : user?.role === 'teacher'
              ? <Navigate to="/teacher/notifications" replace />
            : (
              <ProtectedRoute 
                element={<AnnouncementsPage />} 
                allowedRoles={['admin', 'parent']}
                componentName="Announcements"
              />
            )
        }
      />

      <Route 
        path="/help" 
        element={
          <ProtectedRoute 
            element={<HelpPage />} 
            allowedRoles={['super_admin', 'admin', 'teacher', 'student', 'parent']}
            componentName="Help Center"
          />
        } 
      />

      <Route 
        path="/guides" 
        element={
          <ProtectedRoute 
            element={<GuidesPage />} 
            allowedRoles={['super_admin', 'admin', 'teacher', 'student', 'parent']}
            componentName="User Documentation"
          />
        } 
      />

      <Route 
        path="/terms" 
        element={
          <ProtectedRoute 
            element={<TermsPage />} 
            allowedRoles={['super_admin', 'admin', 'teacher', 'student', 'parent']}
            componentName="Terms of Service"
          />
        } 
      />

      <Route 
        path="/privacy" 
        element={
          <ProtectedRoute 
            element={<PrivacyPage />} 
            allowedRoles={['super_admin', 'admin', 'teacher', 'student', 'parent']}
            componentName="Privacy Policy"
          />
        } 
      />

      {/* Utility routes */}
      <Route 
        path="/dashboard" 
        element={
          <Navigate
            to={
              user?.role === 'super_admin'
                ? '/super-admin'
                : user?.role
                  ? `/${user.role}/dashboard`
                  : '/login'
            }
            replace
          />
        } 
      />

      {/* Unauthorized access page */}
      <Route 
        path="/unauthorized" 
        element={
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center space-y-4">
              <div className="text-6xl text-red-500 mb-4">🚫</div>
              <h1 className="text-3xl font-bold text-gray-800">Access Denied</h1>
              <p className="text-gray-600">You don't have permission to access this page.</p>
              <button 
                onClick={() => window.history.back()}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        } 
      />

      {/* 404 Not Found */}
      <Route 
        path="*" 
        element={
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center space-y-4">
              <div className="text-6xl text-gray-400 mb-4">404</div>
              <h1 className="text-3xl font-bold text-gray-800">Page Not Found</h1>
              <p className="text-gray-600">The page you're looking for doesn't exist.</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        } 
      />
    </Routes>
  );
};

export default AppRoutes;
        
