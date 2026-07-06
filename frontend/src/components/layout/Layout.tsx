import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  BookOpen, 
  Users, 
  Library, 
  Calendar, 
  Bell, 
  Settings, 
  MessageSquare,
  FilePlus2,
  Menu, 
  LogOut, 
  User,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils'; // Add this import
import Footer from './Footer';
import SidebarNav from './Sidebar'; // Renamed to avoid conflict with the Sidebar icon from lucide-react
import LanguageSwitcher from '../common/LanguageSwitcher';
import ThemeToggle from '../common/ThemeToggle';
import { MobileBottomNavigation } from '../navigation/MobileBottomNavigation';
import { useMobileNavigation } from '../../hooks/useMobileNavigation';
import { useResponsive } from '../../hooks/useResponsive';
import { useHeader } from '../../contexts/HeaderContext';
import { useSaasTenant } from '../../hooks/useSaasTenant';
import OnboardingWizard from '../onboarding/OnboardingWizard';
import { resolveAvatarUrl } from '../../utils/avatar';

interface LayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

export function Layout({ children, hideHeader }: LayoutProps) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const location = useLocation();
  // Inside the Layout component
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { headerSearch, headerActions, hideGlobalHeader } = useHeader();
  const isCasaos = theme === 'casaos';
  
  const effectiveHideHeader = hideHeader || hideGlobalHeader;
  
  const { current, refresh: refreshTenant } = useSaasTenant();
  const isSchoolAdmin = user?.role === 'admin' || user?.role === 'school_admin';
  const showOnboarding = isSchoolAdmin && current && current.tenant && !current.tenant.is_setup_completed;
  
  const dashboardHref =
    (user?.role === 'super_admin' || user?.role === 'super_manager') ? '/super-admin' :
    user?.role === 'admin' ? '/admin/dashboard' :
    user?.role === 'teacher' ? '/teacher/dashboard' :
    user?.role === 'student' ? '/student/dashboard' :
    user?.role === 'parent' ? '/parent/dashboard' :
    '/dashboard';

  const navigation = useMemo(() => {
    switch (user?.role) {
      case 'super_admin':
        return [
          { name: 'Dashboard', labelKey: 'navigation.dashboard', href: dashboardHref, icon: Home },
          { name: 'Users', labelKey: 'navigation.users', href: '/super-admin/users', icon: Users },
          { name: 'Audit Logs', labelKey: 'navigation.audit_logs', href: '/super-admin/audit-logs', icon: FilePlus2 },
          { name: 'Settings', labelKey: 'navigation.settings', href: '/super-admin/settings', icon: Settings }
        ];
      case 'super_manager':
        return [
          { name: 'Dashboard', labelKey: 'navigation.dashboard', href: dashboardHref, icon: Home },
          { name: 'Users', labelKey: 'navigation.users', href: '/super-admin/users', icon: Users },
          { name: 'Audit Logs', labelKey: 'navigation.audit_logs', href: '/super-admin/audit-logs', icon: FilePlus2 },
          { name: 'Settings', labelKey: 'navigation.settings', href: '/super-admin/settings', icon: Settings }
        ];
      case 'parent':
        return [
          { name: 'Dashboard', labelKey: 'navigation.dashboard', href: dashboardHref, icon: Home },
          { name: 'My Children', labelKey: 'navigation.my_children', href: '/parent-portal', icon: Users },
          { name: 'Admissions', labelKey: 'navigation.admissions', href: '/admissions', icon: FilePlus2 },
          { name: 'Schedule', labelKey: 'navigation.schedule', href: '/parent/schedule', icon: Calendar },
          { name: 'Calendar', labelKey: 'navigation.calendar', href: '/parent/calendar', icon: Calendar },
          { name: 'Messages', labelKey: 'navigation.messages', href: '/messages', icon: MessageSquare },
          { name: 'Notifications', labelKey: 'navigation.notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', labelKey: 'navigation.settings', href: '/settings', icon: Settings }
        ];
      case 'student':
        return [
          { name: 'Dashboard', labelKey: 'navigation.dashboard', href: dashboardHref, icon: Home },
          { name: 'My Classes', labelKey: 'navigation.classes', href: '/student/classes', icon: BookOpen },
          { name: 'Assignments', labelKey: 'navigation.assignments', href: '/student/assignments', icon: FilePlus2 },
          { name: 'Grades', labelKey: 'navigation.grades', href: '/student/grades', icon: BookOpen },
          { name: 'Attendance', labelKey: 'navigation.attendance', href: '/student/attendance', icon: Calendar },
          { name: 'Timetable', labelKey: 'navigation.timetable', href: '/student/timetable', icon: Calendar },
          { name: 'Calendar', labelKey: 'navigation.calendar', href: '/student/calendar', icon: Calendar },
          { name: 'Messages', labelKey: 'navigation.messages', href: '/student/messages', icon: MessageSquare },
          { name: 'Notifications', labelKey: 'navigation.notifications', href: '/student/notifications', icon: Bell },
          { name: 'Settings', labelKey: 'navigation.settings', href: '/settings', icon: Settings }
        ];
      case 'teacher':
        return [
          { name: 'Dashboard', labelKey: 'navigation.dashboard', href: dashboardHref, icon: Home },
          { name: 'My Classes', labelKey: 'navigation.classes', href: '/teacher/classes', icon: BookOpen },
          { name: 'Timetable', labelKey: 'navigation.timetable', href: '/teacher/timetable', icon: Calendar },
          { name: 'Calendar', labelKey: 'navigation.calendar', href: '/teacher/calendar', icon: Calendar },
          { name: 'Messages', labelKey: 'navigation.messages', href: '/teacher/messages', icon: MessageSquare },
          { name: 'Notifications', labelKey: 'navigation.notifications', href: '/teacher/notifications', icon: Bell },
          { name: 'Settings', labelKey: 'navigation.settings', href: '/settings', icon: Settings }
        ];
      case 'admin':
      default:
        return [
          { name: 'Dashboard', labelKey: 'navigation.dashboard', href: dashboardHref, icon: Home },
          { name: 'Students', labelKey: 'navigation.students', href: '/students', icon: Users },
          { name: 'Teachers', labelKey: 'navigation.teachers', href: '/teachers', icon: Users },
          { name: 'Academics', labelKey: 'navigation.academics', href: '/academics', icon: BookOpen },
          { name: 'Library', labelKey: 'navigation.library', href: '/library', icon: Library },
          { name: 'Calendar', labelKey: 'navigation.calendar', href: '/calendar', icon: Calendar },
          { name: 'Messages', labelKey: 'navigation.messages', href: '/messages', icon: MessageSquare },
          { name: 'Notifications', labelKey: 'navigation.notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', labelKey: 'navigation.settings', href: '/settings', icon: Settings }
        ];
    }
  }, [dashboardHref, user?.role]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };
  
  function signOut(): void {
    logout(); // Use the logout function from useAuth
  }

  // Function to handle sidebar collapse state changes
  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  const { showBottomNav } = useMobileNavigation();
  const { isMobile } = useResponsive();

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    const exactTitleKeys: Record<string, { key: string; fallback: string }> = {
      '/super-admin': { key: 'navigation.dashboard', fallback: 'Dashboard' },
      '/super-admin/users': { key: 'navigation.users', fallback: 'Users' },
      '/super-admin/schools': { key: 'navigation.schools', fallback: 'Schools' },
      '/super-admin/e-registration-billing': { key: 'navigation.e_registration_billing', fallback: 'E-Registration Billing' },
      '/super-admin/financial': { key: 'navigation.financial_oversight', fallback: 'Financial Insights' },
      '/super-admin/payment-settings': { key: 'navigation.payment_settings', fallback: 'Payment Settings' },
      '/super-admin/payments': { key: 'navigation.payments', fallback: 'Payments' },
      '/super-admin/plan-requests': { key: 'navigation.plan_requests', fallback: 'Plan Requests' },
      '/super-admin/plan-pricing': { key: 'navigation.plan_pricing', fallback: 'Plan Pricing' },
      '/super-admin/audit-logs': { key: 'navigation.audit_logs', fallback: 'Audit Logs' },
      '/super-admin/settings': { key: 'navigation.system_settings', fallback: 'Platform Settings' },
    };

    if (path.startsWith('/super-admin/users/')) return t('profile.user_details', 'User Details');
    const exact = exactTitleKeys[path];
    if (exact) return t(exact.key, exact.fallback);
    if (path.endsWith('/dashboard')) return t('navigation.dashboard', 'Dashboard');
    const last = path.split('/').filter(Boolean).pop() || 'Dashboard';
    return last
      .split('-')
      .map((s) => (s.length ? s[0].toUpperCase() + s.slice(1) : s))
      .join(' ');
  }, [location.pathname, t]);

  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileDropdownOpen) return;
      const target = event.target as Node;
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [profileDropdownOpen]);

  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  // Remove this placeholder function:
  // function cn(arg0: string, arg1: string): string | undefined {
  //   throw new Error('Function not implemented.');
  // }

  return (
    <div className={cn(
      "h-screen flex overflow-hidden",
      isCasaos && "bg-transparent"
    )}>
      {showOnboarding ? (
        <div className="w-full h-full overflow-y-auto">
          <OnboardingWizard tenant={current.tenant} onComplete={refreshTenant} />
        </div>
      ) : (
        <>
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black bg-opacity-30 backdrop-blur-sm md:hidden" 
              onClick={toggleSidebar}
            ></div>
          )}

          {/* Sidebar wrapper div with dynamic width based on collapsed state */}
          <div 
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out",
              sidebarCollapsed ? 'w-0 md:w-20' : 'w-0 md:w-64',
              isCasaos && "bg-transparent"
            )}
          >
            {/* Use the SidebarNav component with onCollapse handler */}
            <SidebarNav 
              isOpen={sidebarOpen} 
              toggleSidebar={toggleSidebar} 
              onCollapse={handleSidebarCollapse} 
            />
          </div>

          {/* Main content with dynamic margin/padding based on sidebar state */}
          <div 
            className={cn(
              "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
              isMobile ? 'content-with-bottom-nav' : '',
              isCasaos && "bg-transparent"
            )}
          >
            {/* Header - Conditionally rendered */}
            {!effectiveHideHeader && (
              <header
                className={cn(
                  "h-14 shrink-0 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6",
                  isCasaos
                    ? "bg-[#0E1218]/40 backdrop-blur-xl border-b border-white/5"
                    : "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800"
                )}
              >
                {/* Left Side: Mobile Menu Trigger and Left-aligned Search Wrapper */}
                <div className="flex items-center flex-1 gap-4 min-w-0">
                  <button
                    className={cn(
                      "md:hidden shrink-0 rounded-xl h-9 w-9 inline-flex items-center justify-center transition-colors",
                      isCasaos ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    )}
                    onClick={toggleSidebar}
                    aria-label={t('common.open_navigation', 'Open navigation')}
                  >
                    <Menu size={18} />
                  </button>

                  {/* Left-aligned Desktop Global Search */}
                  <div className="hidden md:flex flex-1 max-w-2xl">
                    {headerSearch ? (
                      <div className="w-full">{headerSearch}</div>
                    ) : (
                      <div className="w-full">
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7-0 11-14 0 7 7-0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder={t('common.search_placeholder', 'Search anything... (Ctrl+K)')}
                            className={cn(
                              "block w-full h-10 pl-10 pr-3 rounded-2xl text-sm transition-all",
                              isCasaos
                                ? "bg-white/5 border-none text-white placeholder-slate-500 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/40"
                                : "bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/30"
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Commands, Language, and Profile Badge */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex items-center gap-2">
                    {headerActions ? (
                      headerActions
                    ) : (
                      <>
                        <button
                          className={cn(
                            "px-3 h-10 rounded-xl text-sm font-semibold transition-all",
                            isCasaos ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          )}
                        >
                          {t('common.commands', 'Commands')}
                        </button>
                      </>
                    )}
                  </div>

                  <LanguageSwitcher />
                  <ThemeToggle />
                  <div className="w-px h-6 bg-slate-200/60 dark:bg-white/10 hidden sm:block" />

                  <div className="relative shrink-0" ref={profileDropdownRef}>
                    <button
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0",
                        isCasaos
                          ? "bg-white/5 hover:bg-white/10 text-white"
                          : "bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900"
                      )}
                      onClick={toggleProfileDropdown}
                      aria-expanded={profileDropdownOpen}
                      aria-label={t('common.user_menu', 'User menu')}
                    >
                      <div className="h-8 w-8 rounded-xl overflow-hidden bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-[11px] font-black text-white">
                        {resolveAvatarUrl(user?.avatar_url) ? (
                          <img
                            src={resolveAvatarUrl(user?.avatar_url)}
                            alt={user?.username || 'User'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user?.username?.substring(0, 2).toUpperCase() || 'AD'
                        )}
                      </div>
                      <span className={cn(
                        "text-sm font-semibold hidden sm:inline-block",
                        isCasaos ? "text-white" : "text-slate-800 dark:text-slate-100"
                      )}>
                        {user?.username || 'admin'}
                      </span>
                      <ChevronDown size={14} className={isCasaos ? "text-slate-500" : "text-slate-500"} />
                    </button>

                    {profileDropdownOpen && (
                      <div
                        className={cn(
                          "absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden",
                          isCasaos ? "bg-[#1A1F26] border border-white/5" : "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700"
                        )}
                      >
                        <Link
                          to="/profile"
                          className={cn(
                            "flex items-center px-4 py-2.5 text-sm font-medium transition-colors",
                            isCasaos ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <User size={18} className="mr-3 text-slate-500" />
                          {t('common.profile', 'Profile')}
                        </Link>
                        <div className={cn("h-px mx-2 my-1", isCasaos ? "bg-white/5" : "bg-slate-200/60 dark:bg-slate-700")} />
                        <button
                          onClick={signOut}
                          className={cn(
                            "flex items-center w-full text-left px-4 py-2.5 text-sm font-medium transition-colors",
                            isCasaos ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          )}
                        >
                          <LogOut size={18} className="mr-3" />
                          {t('common.logout', 'Logout')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>
            )}

            {/* Main content area with dynamic padding */}
            <main className={cn(
              "flex-1 overflow-y-auto",
              !effectiveHideHeader && "px-3 py-4 sm:p-4 lg:p-6",
              sidebarCollapsed ? 'md:pl-4' : 'md:pl-6',
              isCasaos && "bg-transparent"
            )}>
              {children}
            </main>

            {/* Footer */}
            {!isCasaos && <Footer />}
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNavigation 
            className={cn(
              'transition-transform duration-300 ease-in-out',
              showBottomNav ? 'translate-y-0' : 'translate-y-full',
              isCasaos && "bg-slate-900/80 backdrop-blur-xl border-t border-white/10"
            )}
          />
        </>
      )}
    </div>
  );
}

export default Layout;
