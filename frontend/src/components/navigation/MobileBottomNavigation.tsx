import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Settings,
  Plus,
  UserCheck,
  FileEdit,
  Bell
} from 'lucide-react';

interface MobileBottomNavigationProps {
  className?: string;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({ className }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const canViewStudents = user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'teacher' || user?.role === 'super_admin';
  const canViewAcademics = user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'super_admin';
  const canManageAttendance = user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'teacher' || user?.role === 'super_admin';
  const canManageTemplates = user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'super_admin';
  const canSendNotifications = user?.role === 'admin' || user?.role === 'school_admin' || user?.role === 'teacher' || user?.role === 'super_admin';

  // Dynamic Dashboard path based on user role context
  const getDashboardPath = () => {
    return user?.role === 'super_admin' ? '/super-admin' :
           (user?.role === 'admin' || user?.role === 'school_admin') ? '/admin/dashboard' :
           user?.role === 'teacher' ? '/teacher/dashboard' :
           user?.role === 'student' ? '/student/dashboard' :
           user?.role === 'parent' ? '/parent/dashboard' :
           '/dashboard';
  };

  // Active state matching hooks
  const isActive = (path: string) => {
    const basePath = path.split('?')[0];
    if (basePath === '/admin/dashboard' && location.pathname === '/admin/dashboard') return true;
    if (basePath === '/teacher/dashboard' && location.pathname === '/teacher/dashboard') return true;
    if (basePath === '/student/dashboard' && location.pathname === '/student/dashboard') return true;
    if (basePath === '/parent/dashboard' && location.pathname === '/parent/dashboard') return true;
    if (basePath === '/dashboard' && location.pathname === '/dashboard') return true;
    
    return (
      basePath !== '/dashboard' && 
      basePath !== '/admin/dashboard' && 
      basePath !== '/teacher/dashboard' && 
      basePath !== '/student/dashboard' && 
      basePath !== '/parent/dashboard' && 
      location.pathname.startsWith(basePath)
    );
  };

  // Don't render on desktop viewports
  if (!isMobile) {
    return null;
  }

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
        <div className="flex items-center justify-between px-4 relative">
          
          {/* Index 0: Dashboard */}
          <Link
            to={getDashboardPath()}
            className={cn(
              'flex flex-col items-center justify-center min-w-0 flex-1 py-1 rounded-xl transition-all duration-200',
              isActive(getDashboardPath())
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <div className={cn('flex items-center justify-center w-6 h-6 mb-1 transition-transform', isActive(getDashboardPath()) && 'scale-110')}>
              <LayoutDashboard size={20} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">{t('navigation.dashboard', 'Dashboard')}</span>
          </Link>

          {/* Index 1: Students */}
          {canViewStudents ? (
            <Link
              to="/students"
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 py-1 rounded-xl transition-all duration-200',
                isActive('/students')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <div className={cn('flex items-center justify-center w-6 h-6 mb-1 transition-transform', isActive('/students') && 'scale-110')}>
                <GraduationCap size={20} />
              </div>
              <span className="text-[10px] font-semibold tracking-tight">{t('navigation.students', 'Students')}</span>
            </Link>
          ) : (
            <div className="flex-1" aria-hidden="true" />
          )}

          {/* Index 2: Primary '+' Action Trigger */}
          <div className="flex-1 flex justify-center relative -mt-5">
            <button
              onClick={() => setIsActionsOpen(true)}
              className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-white dark:border-slate-900 active:scale-95 transition-all duration-200"
              aria-label="Quick Actions"
            >
              <Plus size={28} className="text-white" />
            </button>
          </div>

          {/* Index 3: Academics */}
          {canViewAcademics ? (
            <Link
              to="/academics"
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 py-1 rounded-xl transition-all duration-200',
                isActive('/academics')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <div className={cn('flex items-center justify-center w-6 h-6 mb-1 transition-transform', isActive('/academics') && 'scale-110')}>
                <BookOpen size={20} />
              </div>
              <span className="text-[10px] font-semibold tracking-tight">{t('navigation.academics', 'Academics')}</span>
            </Link>
          ) : (
            <div className="flex-1" aria-hidden="true" />
          )}

          {/* Index 4: Settings */}
          <Link
            to="/settings"
            className={cn(
              'flex flex-col items-center justify-center min-w-0 flex-1 py-1 rounded-xl transition-all duration-200',
              isActive('/settings')
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <div className={cn('flex items-center justify-center w-6 h-6 mb-1 transition-transform', isActive('/settings') && 'scale-110')}>
              <Settings size={20} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">{t('navigation.settings', 'Settings')}</span>
          </Link>

        </div>
      </nav>

      {/* Slide-up Quick Actions Modal Sheet */}
      <AnimatePresence>
        {isActionsOpen && (
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
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Actions</h3>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              {/* Grid actions */}
              <div className="grid grid-cols-2 gap-4">
                {canManageAttendance && (
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      window.location.href = '/attendance';
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-green-500/20">
                      <UserCheck className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">Mark Attendance</span>
                  </button>
                )}

                {canViewAcademics && (
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      window.location.href = '/academics';
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-blue-500/20">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">Add Grade</span>
                  </button>
                )}

                {canManageTemplates && (
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      window.location.href = '/settings';
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-orange-500/20">
                      <FileEdit className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">New Template</span>
                  </button>
                )}

                {canSendNotifications && (
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      window.location.href = '/notifications';
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-purple-500/20">
                      <Bell className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">Send Notification</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileBottomNavigation;
