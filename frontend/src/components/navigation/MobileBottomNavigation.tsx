import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useSaasTenant } from '@/hooks/useSaasTenant';
import { canAccessAdministration } from '@/lib/administrationAccess';
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  CreditCard,
  Shield,
  FileText,
  BarChart3,
  FilePlus2,
  Settings,
  Plus,
  UserCheck,
  Bell,
} from 'lucide-react';

interface MobileBottomNavigationProps {
  className?: string;
}

interface NavItem {
  name: string;
  labelKey: string;
  path: string;
  icon: React.ReactNode;
}

interface QuickActionItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  colorClass: string;
  hoverClass: string;
}

const featureByPath: Record<string, string> = {
  '/students': 'students.manage',
  '/teachers': 'teachers.manage',
  '/parents': 'parents.manage',
  '/academics': 'academics.classes',
  '/attendance': 'attendance.basic',
  '/exams': 'exams.basic',
  '/reports': 'reports.standard',
  '/admissions': 'admissions.basic',
  '/fees': 'fees.basic',
  '/library': 'library.basic',
  '/schedule': 'academics.timetable',
  '/parent/schedule': 'academics.timetable',
  '/teacher/timetable': 'academics.timetable',
  '/student/timetable': 'academics.timetable',
  '/calendar': 'academics.timetable',
  '/parent/calendar': 'academics.timetable',
  '/teacher/calendar': 'academics.timetable',
  '/student/calendar': 'academics.timetable',
  '/notifications': 'messaging.in_app',
  '/teacher/notifications': 'messaging.in_app',
  '/student/notifications': 'messaging.in_app',
  '/messages': 'messaging.in_app',
  '/teacher/messages': 'messaging.in_app',
  '/student/messages': 'messaging.in_app',
  '/admin/invitations': 'messaging.in_app',
  '/super-admin/payment-settings': 'billing.platform',
  '/super-admin/payments': 'billing.platform',
  '/super-admin/e-registration-billing': 'billing.platform',
  '/super-admin/financial': 'billing.platform',
  '/admin/administration': 'roles.basic',
};

const simpleFeatureByPath: Record<string, string[]> = {
  '/students': ['students', 'student_management'],
  '/teachers': ['teachers'],
  '/parents': ['parents'],
  '/academics': ['academics', 'classes', 'subjects'],
  '/attendance': ['attendance'],
  '/exams': ['exams'],
  '/reports': ['reports'],
  '/admissions': ['admissions'],
  '/fees': ['fees'],
  '/library': ['library'],
  '/schedule': ['schedule', 'classes'],
  '/parent/schedule': ['schedule', 'classes'],
  '/teacher/timetable': ['schedule', 'classes'],
  '/student/timetable': ['schedule', 'classes'],
  '/calendar': ['calendar', 'schedule', 'classes'],
  '/parent/calendar': ['calendar', 'schedule', 'classes'],
  '/teacher/calendar': ['calendar', 'schedule', 'classes'],
  '/student/calendar': ['calendar', 'schedule', 'classes'],
  '/notifications': ['messaging', 'notifications'],
  '/teacher/notifications': ['messaging', 'notifications'],
  '/student/notifications': ['messaging', 'notifications'],
  '/messages': ['messaging', 'messages'],
  '/teacher/messages': ['messaging', 'messages'],
  '/student/messages': ['messaging', 'messages'],
  '/admin/invitations': ['messaging', 'notifications'],
  '/admin/administration': ['administration'],
};

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({ className }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const { current } = useSaasTenant();
  const { hasFeature, isLoading: entitlementsLoading } = useEntitlements();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const userRole = user?.role === 'school_admin' ? 'admin' : (user?.role || 'user');

  // Dynamic Dashboard path based on user role context
  const dashboardPath =
    user?.role === 'super_admin' || user?.role === 'super_manager' ? '/super-admin' :
    userRole === 'admin' ? '/admin/dashboard' :
    userRole === 'teacher' ? '/teacher/dashboard' :
    userRole === 'student' ? '/student/dashboard' :
    userRole === 'parent' ? '/parent/dashboard' :
    '/dashboard';

  const navItemsByRole: Record<string, NavItem[]> = {
    super_admin: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <Shield size={20} /> },
      { name: 'Users', labelKey: 'navigation.users', path: '/super-admin/users', icon: <Users size={20} /> },
      { name: 'Schools', labelKey: 'navigation.schools', path: '/super-admin/schools', icon: <Building2 size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/super-admin/settings', icon: <Settings size={20} /> },
    ],
    super_manager: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <Shield size={20} /> },
      { name: 'Users', labelKey: 'navigation.users', path: '/super-admin/users', icon: <Users size={20} /> },
      { name: 'Schools', labelKey: 'navigation.schools', path: '/super-admin/schools', icon: <Building2 size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/super-admin/settings', icon: <Settings size={20} /> },
    ],
    admin: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'Students', labelKey: 'navigation.students', path: '/students', icon: <GraduationCap size={20} /> },
      { name: 'Academics', labelKey: 'navigation.academics', path: '/academics', icon: <BookOpen size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    teacher: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'Classes', labelKey: 'navigation.classes', path: '/teacher/classes', icon: <BookOpen size={20} /> },
      { name: 'Timetable', labelKey: 'navigation.timetable', path: '/teacher/timetable', icon: <Calendar size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    student: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'Classes', labelKey: 'navigation.classes', path: '/student/classes', icon: <BookOpen size={20} /> },
      { name: 'Grades', labelKey: 'navigation.grades', path: '/student/grades', icon: <ClipboardList size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    parent: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'My Children', labelKey: 'navigation.my_children', path: '/parent-portal', icon: <Users size={20} /> },
      { name: 'Schedule', labelKey: 'navigation.schedule', path: '/parent/schedule', icon: <Calendar size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    user: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
  };

  const quickActionsByRole: Record<string, QuickActionItem[]> = {
    super_admin: [
      { name: 'Manage Users', path: '/super-admin/users', icon: <Users className="h-6 w-6 text-white" />, colorClass: 'bg-blue-500', hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
      { name: 'Manage Schools', path: '/super-admin/schools', icon: <Building2 className="h-6 w-6 text-white" />, colorClass: 'bg-emerald-500', hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
      { name: 'Payments', path: '/super-admin/payments', icon: <CreditCard className="h-6 w-6 text-white" />, colorClass: 'bg-orange-500', hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-950/20' },
      { name: 'Audit Review', path: '/super-admin/audit-logs', icon: <FileText className="h-6 w-6 text-white" />, colorClass: 'bg-purple-500', hoverClass: 'hover:bg-purple-50 dark:hover:bg-purple-950/20' },
    ],
    super_manager: [
      { name: 'Manage Users', path: '/super-admin/users', icon: <Users className="h-6 w-6 text-white" />, colorClass: 'bg-blue-500', hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
      { name: 'Manage Schools', path: '/super-admin/schools', icon: <Building2 className="h-6 w-6 text-white" />, colorClass: 'bg-emerald-500', hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
      { name: 'Payments', path: '/super-admin/payments', icon: <CreditCard className="h-6 w-6 text-white" />, colorClass: 'bg-orange-500', hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-950/20' },
      { name: 'Audit Review', path: '/super-admin/audit-logs', icon: <FileText className="h-6 w-6 text-white" />, colorClass: 'bg-purple-500', hoverClass: 'hover:bg-purple-50 dark:hover:bg-purple-950/20' },
    ],
    admin: [
      { name: 'Mark Attendance', path: '/attendance', icon: <UserCheck className="h-6 w-6 text-white" />, colorClass: 'bg-green-500', hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
      { name: 'Manage Exams', path: '/exams', icon: <FileText className="h-6 w-6 text-white" />, colorClass: 'bg-blue-500', hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
      { name: 'Admissions', path: '/admissions', icon: <FilePlus2 className="h-6 w-6 text-white" />, colorClass: 'bg-orange-500', hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-950/20' },
      { name: 'Notify Users', path: '/notifications', icon: <Bell className="h-6 w-6 text-white" />, colorClass: 'bg-purple-500', hoverClass: 'hover:bg-purple-50 dark:hover:bg-purple-950/20' },
    ],
    teacher: [
      { name: 'My Classes', path: '/teacher/classes', icon: <BookOpen className="h-6 w-6 text-white" />, colorClass: 'bg-blue-500', hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
      { name: 'Timetable', path: '/teacher/timetable', icon: <Calendar className="h-6 w-6 text-white" />, colorClass: 'bg-green-500', hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
      { name: 'Messages', path: '/teacher/messages', icon: <MessageSquare className="h-6 w-6 text-white" />, colorClass: 'bg-orange-500', hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-950/20' },
      { name: 'Notifications', path: '/teacher/notifications', icon: <Bell className="h-6 w-6 text-white" />, colorClass: 'bg-purple-500', hoverClass: 'hover:bg-purple-50 dark:hover:bg-purple-950/20' },
    ],
    student: [
      { name: 'Assignments', path: '/student/assignments', icon: <ClipboardList className="h-6 w-6 text-white" />, colorClass: 'bg-green-500', hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
      { name: 'Grades', path: '/student/grades', icon: <GraduationCap className="h-6 w-6 text-white" />, colorClass: 'bg-blue-500', hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
      { name: 'Attendance', path: '/student/attendance', icon: <UserCheck className="h-6 w-6 text-white" />, colorClass: 'bg-orange-500', hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-950/20' },
      { name: 'Messages', path: '/student/messages', icon: <MessageSquare className="h-6 w-6 text-white" />, colorClass: 'bg-purple-500', hoverClass: 'hover:bg-purple-50 dark:hover:bg-purple-950/20' },
    ],
    parent: [
      { name: 'My Children', path: '/parent-portal', icon: <Users className="h-6 w-6 text-white" />, colorClass: 'bg-blue-500', hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
      { name: 'Schedule', path: '/parent/schedule', icon: <Calendar className="h-6 w-6 text-white" />, colorClass: 'bg-green-500', hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
      { name: 'Calendar', path: '/parent/calendar', icon: <CalendarDays className="h-6 w-6 text-white" />, colorClass: 'bg-orange-500', hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-950/20' },
      { name: 'Notifications', path: '/notifications', icon: <Bell className="h-6 w-6 text-white" />, colorClass: 'bg-purple-500', hoverClass: 'hover:bg-purple-50 dark:hover:bg-purple-950/20' },
    ],
    user: [],
  };

  const canAccessPath = useMemo(() => {
    return (path: string) => {
      if (!path) return false;

      if (path === '/admin/administration') {
        return canAccessAdministration({
          role: user?.role,
          planSlug: current?.tenant?.plan || null,
          enabledFeatures: current?.tenant?.enabled_features || [],
        });
      }

      if (user?.role === 'super_admin' || user?.role === 'super_manager') {
        return true;
      }

      const directFeatures = simpleFeatureByPath[path];
      if (directFeatures && current?.tenant?.enabled_features) {
        const hasDirect = directFeatures.some((feature) => current.tenant.enabled_features?.includes(feature));
        if (hasDirect) {
          return true;
        }
      }

      const featureKey = featureByPath[path];
      if (!featureKey) {
        return true;
      }

      if (entitlementsLoading) {
        return true;
      }

      return hasFeature(featureKey);
    };
  }, [current?.tenant?.enabled_features, current?.tenant?.plan, entitlementsLoading, hasFeature, user?.role]);

  const mobileNavItems = useMemo(() => {
    const baseItems = navItemsByRole[userRole] ?? navItemsByRole.user;
    return baseItems.filter((item) => canAccessPath(item.path));
  }, [canAccessPath, navItemsByRole, userRole]);

  const quickActions = useMemo(() => {
    const baseActions = quickActionsByRole[userRole] ?? quickActionsByRole.user;
    return baseActions.filter((item) => canAccessPath(item.path));
  }, [canAccessPath, quickActionsByRole, userRole]);

  const leftNavItems = mobileNavItems.slice(0, Math.ceil(mobileNavItems.length / 2));
  const rightNavItems = mobileNavItems.slice(Math.ceil(mobileNavItems.length / 2));

  // Active state matching hooks
  const isActive = (path: string) => {
    const basePath = path.split('?')[0];
    if (location.pathname === basePath) return true;
    if ([dashboardPath, '/dashboard', '/admin/dashboard', '/teacher/dashboard', '/student/dashboard', '/parent/dashboard', '/super-admin'].includes(basePath)) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(basePath);
  };

  // Don't render on desktop viewports
  if (!isMobile) {
    return null;
  }

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.path}
      to={item.path}
      className={cn(
        'flex flex-col items-center justify-center min-w-0 flex-1 py-1 rounded-xl transition-all duration-200',
        isActive(item.path)
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
      )}
    >
      <div className={cn('flex items-center justify-center w-6 h-6 mb-1 transition-transform', isActive(item.path) && 'scale-110')}>
        {item.icon}
      </div>
      <span className="text-[10px] font-semibold tracking-tight text-center">{t(item.labelKey, item.name)}</span>
    </Link>
  );

  return (
    <>
      <nav 
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-safe pt-2',
          className
        )}
        role="navigation"
        aria-label={t('common.mobile_bottom_navigation', 'Mobile bottom navigation')}
      >
        <div className="flex items-center justify-between px-3 relative gap-2">
          <div className="flex flex-1 items-center justify-around gap-1 min-w-0">
            {leftNavItems.map(renderNavItem)}
          </div>

          <div className="relative -mt-5 shrink-0">
            {quickActions.length > 0 ? (
              <button
                onClick={() => setIsActionsOpen(true)}
                className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-white dark:border-slate-900 active:scale-95 transition-all duration-200"
                aria-label={t('common.quick_actions', 'Quick Actions')}
              >
                <Plus size={28} className="text-white" />
              </button>
            ) : (
              <div className="w-14 h-14" aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-1 items-center justify-around gap-1 min-w-0">
            {rightNavItems.map(renderNavItem)}
            {rightNavItems.length === 0 && <div className="flex-1" aria-hidden="true" />}
          </div>
        </div>
      </nav>

      {/* Slide-up Quick Actions Modal Sheet */}
      <AnimatePresence>
        {isActionsOpen && quickActions.length > 0 && (
          <>
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsActionsOpen(false)}
              className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Modal Sheet container */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-[101] bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10 shadow-2xl border-t border-slate-200/60 dark:border-slate-800"
            >
              {/* Drag/Indicator Handle */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('common.quick_actions', 'Quick Actions')}</h3>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              {/* Grid actions */}
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => {
                      setIsActionsOpen(false);
                      navigate(action.path);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all group',
                      action.hoverClass
                    )}
                  >
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md', action.colorClass)}>
                      {action.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200 text-center">{t(action.name, action.name)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileBottomNavigation;
