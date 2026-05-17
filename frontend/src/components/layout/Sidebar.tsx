import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Building2,
  GraduationCap,
  BookOpen, 
  Calendar,
  CalendarDays,
  ClipboardList,
  BadgeCheck,
  Settings, 
  LogOut,
  Menu,
  X,
  Library,
  Bell,
  MessageSquare,
  CreditCard,
  Shield,
  Plus,
  FileDown,
  Printer,
  Share2,
  ChevronDown,
  FileText,
  BarChart3,
  FilePlus2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { log } from '../../utils/logger';

// Update the SidebarProps interface
interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  onCollapse?: (collapsed: boolean) => void; // Add this new optional prop
}

const Sidebar = ({ isOpen, toggleSidebar, onCollapse }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const isCasaos = theme === 'casaos';
  const { current } = useSaasTenant()

  const brandTitle =
    user?.role === 'super_admin'
      ? 'ADMIPEDIA'
      : (current?.tenant?.slug?.toUpperCase() || current?.tenant?.name || 'ADMIPEDIA')

  const brandLogoUrl = (user?.role === 'super_admin' || user?.role === 'super_manager') ? null : (current?.tenant?.logo_url || null)

  const toggleCollapse = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    // Call the onCollapse prop if provided
    if (onCollapse) {
      onCollapse(newCollapsedState);
    }
  };

  // First, let's define an interface for the navigation items
  interface NavItem {
    name: string;
    labelKey: string;
    path: string;
    icon: any;
  }

  const getNavItemLabel = (item: NavItem): string => {
    try {
      const translated = t(item.labelKey);
      if (!translated || translated === item.labelKey) {
        return item.name || item.labelKey || 'Menu Item';
      }
      return translated;
    } catch (e) {
      return item.name || item.labelKey || 'Menu Item';
    }
  };

  const dashboardPath =
    (user?.role === 'super_admin' || user?.role === 'super_manager') ? '/super-admin' :
    user?.role === 'admin' ? '/admin/dashboard' :
    user?.role === 'teacher' ? '/teacher/dashboard' :
    user?.role === 'student' ? '/student/dashboard' :
    user?.role === 'parent' ? '/parent/dashboard' :
    '/dashboard';

  const navItemsByRole: Record<string, NavItem[]> = {
    super_admin: [
      { name: 'Super Admin', labelKey: 'navigation.dashboard', path: '/super-admin', icon: <Shield size={20} /> },
      { name: 'Users', labelKey: 'navigation.users', path: '/super-admin/users', icon: <Users size={20} /> },
      { name: 'Schools', labelKey: 'navigation.schools', path: '/super-admin/schools', icon: <Building2 size={20} /> },
      { name: 'E-Registration Billing', labelKey: 'navigation.e_registration_billing', path: '/super-admin/e-registration-billing', icon: <CreditCard size={20} /> },
      { name: 'Financial Insights', labelKey: 'navigation.financial_oversight', path: '/super-admin/financial', icon: <BarChart3 size={20} /> },
      { name: 'Payment Settings', labelKey: 'navigation.payment_settings', path: '/super-admin/payment-settings', icon: <CreditCard size={20} /> },
      { name: 'Payments', labelKey: 'navigation.payments', path: '/super-admin/payments', icon: <CreditCard size={20} /> },
      { name: 'Plan Requests', labelKey: 'navigation.plan_requests', path: '/super-admin/plan-requests', icon: <Sparkles size={20} /> },
      { name: 'Plan Pricing', labelKey: 'navigation.plan_pricing', path: '/super-admin/plan-pricing', icon: <Sparkles size={20} /> },
      { name: 'Audit Logs', labelKey: 'navigation.audit_logs', path: '/super-admin/audit-logs', icon: <FileText size={20} /> },
      { name: 'Platform Settings', labelKey: 'navigation.system_settings', path: '/super-admin/settings', icon: <Settings size={20} /> },
    ],
    super_manager: [
      { name: 'Super Admin', labelKey: 'navigation.dashboard', path: '/super-admin', icon: <Shield size={20} /> },
      { name: 'Users', labelKey: 'navigation.users', path: '/super-admin/users', icon: <Users size={20} /> },
      { name: 'Schools', labelKey: 'navigation.schools', path: '/super-admin/schools', icon: <Building2 size={20} /> },
      { name: 'E-Registration Billing', labelKey: 'navigation.e_registration_billing', path: '/super-admin/e-registration-billing', icon: <CreditCard size={20} /> },
      { name: 'Financial Insights', labelKey: 'navigation.financial_oversight', path: '/super-admin/financial', icon: <BarChart3 size={20} /> },
      { name: 'Payment Settings', labelKey: 'navigation.payment_settings', path: '/super-admin/payment-settings', icon: <CreditCard size={20} /> },
      { name: 'Payments', labelKey: 'navigation.payments', path: '/super-admin/payments', icon: <CreditCard size={20} /> },
      { name: 'Plan Requests', labelKey: 'navigation.plan_requests', path: '/super-admin/plan-requests', icon: <Sparkles size={20} /> },
      { name: 'Plan Pricing', labelKey: 'navigation.plan_pricing', path: '/super-admin/plan-pricing', icon: <Sparkles size={20} /> },
      { name: 'Audit Logs', labelKey: 'navigation.audit_logs', path: '/super-admin/audit-logs', icon: <FileText size={20} /> },
      { name: 'Platform Settings', labelKey: 'navigation.system_settings', path: '/super-admin/settings', icon: <Settings size={20} /> },
    ],
    admin: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'Students', labelKey: 'navigation.students', path: '/students', icon: <GraduationCap size={20} /> },
      { name: 'Teachers', labelKey: 'navigation.teachers', path: '/teachers', icon: <Users size={20} /> },
      { name: 'Parents', labelKey: 'navigation.parents', path: '/parents', icon: <Users size={20} /> },
      { name: 'Academics', labelKey: 'navigation.academics', path: '/academics', icon: <BookOpen size={20} /> },
      { name: 'Attendance', labelKey: 'navigation.attendance', path: '/attendance', icon: <Calendar size={20} /> },
      { name: 'Exams', labelKey: 'navigation.exams', path: '/exams', icon: <FileText size={20} /> },
      { name: 'Reports', labelKey: 'navigation.reports', path: '/reports', icon: <BarChart3 size={20} /> },
      { name: 'Admissions', labelKey: 'navigation.admissions', path: '/admissions', icon: <FilePlus2 size={20} /> },
      { name: 'Invitations', labelKey: 'navigation.invitations', path: '/admin/invitations', icon: <Share2 size={20} /> },
      { name: 'Fees', labelKey: 'navigation.fees', path: '/fees', icon: <CreditCard size={20} /> },
      { name: 'Library', labelKey: 'navigation.library', path: '/library', icon: <Library size={20} /> },
      { name: 'Schedule', labelKey: 'navigation.schedule', path: '/schedule', icon: <Calendar size={20} /> },
      { name: 'Calendar', labelKey: 'navigation.calendar', path: '/calendar', icon: <CalendarDays size={20} /> },
      { name: 'Notifications', labelKey: 'navigation.notifications', path: '/notifications', icon: <Bell size={20} /> },
      { name: 'Messages', labelKey: 'navigation.messages', path: '/messages', icon: <MessageSquare size={20} /> },
      { name: 'Administration', labelKey: 'sidebar.administration', path: '/admin/administration', icon: <Shield size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    teacher: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'My Classes', labelKey: 'navigation.classes', path: '/teacher/classes', icon: <BookOpen size={20} /> },
      { name: 'Timetable', labelKey: 'navigation.timetable', path: '/teacher/timetable', icon: <Calendar size={20} /> },
      { name: 'Calendar', labelKey: 'navigation.calendar', path: '/teacher/calendar', icon: <CalendarDays size={20} /> },
      { name: 'Notifications', labelKey: 'navigation.notifications', path: '/teacher/notifications', icon: <Bell size={20} /> },
      { name: 'Messages', labelKey: 'navigation.messages', path: '/teacher/messages', icon: <MessageSquare size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    student: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'My Classes', labelKey: 'navigation.classes', path: '/student/classes', icon: <BookOpen size={20} /> },
      { name: 'Assignments', labelKey: 'navigation.assignments', path: '/student/assignments', icon: <ClipboardList size={20} /> },
      { name: 'Grades', labelKey: 'navigation.grades', path: '/student/grades', icon: <BadgeCheck size={20} /> },
      { name: 'Attendance', labelKey: 'navigation.attendance', path: '/student/attendance', icon: <Calendar size={20} /> },
      { name: 'Timetable', labelKey: 'navigation.timetable', path: '/student/timetable', icon: <Calendar size={20} /> },
      { name: 'Calendar', labelKey: 'navigation.calendar', path: '/student/calendar', icon: <CalendarDays size={20} /> },
      { name: 'Notifications', labelKey: 'navigation.notifications', path: '/student/notifications', icon: <Bell size={20} /> },
      { name: 'Messages', labelKey: 'navigation.messages', path: '/student/messages', icon: <MessageSquare size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    parent: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'My Children', labelKey: 'navigation.my_children', path: '/parent-portal', icon: <Users size={20} /> },
      { name: 'Admissions', labelKey: 'navigation.admissions', path: '/admissions', icon: <FilePlus2 size={20} /> },
      { name: 'Schedule', labelKey: 'navigation.schedule', path: '/parent/schedule', icon: <Calendar size={20} /> },
      { name: 'Calendar', labelKey: 'navigation.calendar', path: '/parent/calendar', icon: <CalendarDays size={20} /> },
      { name: 'Notifications', labelKey: 'navigation.notifications', path: '/notifications', icon: <Bell size={20} /> },
      { name: 'Messages', labelKey: 'navigation.messages', path: '/messages', icon: <MessageSquare size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ],
    user: [
      { name: 'Dashboard', labelKey: 'navigation.dashboard', path: dashboardPath, icon: <LayoutDashboard size={20} /> },
      { name: 'Settings', labelKey: 'common.settings', path: '/settings', icon: <Settings size={20} /> },
    ]
  };

  const { hasFeature, isLoading: entitlementsLoading } = useEntitlements()

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
    '/calendar': 'academics.timetable',
    '/parent/calendar': 'academics.timetable',
    '/notifications': 'messaging.in_app',
    '/messages': 'messaging.in_app',
    '/admin/administration': 'roles.basic'
  }

  const toLinkTarget = (to: string) => {
    const queryIndex = to.indexOf('?');
    if (queryIndex < 0) return to;
    return {
      pathname: to.slice(0, queryIndex),
      search: to.slice(queryIndex)
    };
  };

  const isActive = (to: string) => {
    const queryIndex = to.indexOf('?');

    if (queryIndex >= 0) {
      const toPath = to.slice(0, queryIndex);
      const required = new URLSearchParams(to.slice(queryIndex + 1));
      if (location.pathname !== toPath) return false;
      const current = new URLSearchParams(location.search);
      for (const [key, value] of required.entries()) {
        if (current.get(key) !== value) return false;
      }
      return true;
    }

    const pathOnly = to;

    if (pathOnly === '/dashboard') return location.pathname === '/dashboard';

    if (pathOnly === '/super-admin') return location.pathname === '/super-admin';

    if (pathOnly === '/admin/administration') {
      if (location.pathname === '/admin/administration') return true;
      if (!location.pathname.startsWith('/admin/administration/')) return false;
      return true;
    }

    return location.pathname.startsWith(pathOnly);
  };

  const baseNavItems: NavItem[] = navItemsByRole[user?.role || 'user'] ?? navItemsByRole.user ?? [];
  const filteredNavItems: NavItem[] = baseNavItems.filter((item) => {
    if (user?.role === 'super_admin' || user?.role === 'super_manager') return true
    const fk = featureByPath[item.path]
    if (!fk) return true
    if (entitlementsLoading) return true
    return hasFeature(fk)
  })

  // Quick action handlers
  const handleAddStudent = () => {
    log.info('Add student action triggered', {}, 'Sidebar');
    // Implementation for adding a new student
  };

  const handleExportData = () => {
    log.info('Export data action triggered', {}, 'Sidebar');
    navigate('/export');
  };

  const handlePrintList = () => {
    log.info('Print list action triggered', {}, 'Sidebar');
    // Implementation for printing list
  };

  const handleShare = () => {
    log.info('Share action triggered', {}, 'Sidebar');
    // Implementation for sharing
  };

  // In the collapsed view (mini sidebar)
  if (collapsed) {
    return (
      <>
        {/* Mobile menu button */}
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-indigo-600 text-white shadow-md"
          onClick={toggleSidebar}
          aria-label={isOpen ? t('common.close_menu', 'Close menu') : t('common.open_menu', 'Open menu')}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
  
        {/* Mini sidebar with just icons */}
        <aside className={cn(
          "fixed top-0 left-0 h-full w-16 shadow-lg z-40 flex flex-col items-center py-4",
          isCasaos ? "bg-slate-900/40 backdrop-blur-md border-r border-white/5" : "bg-slate-900"
        )}>
          {/* Logo */}
          <div className="mb-6">
            <Link to={dashboardPath}>
              <img
                src={brandLogoUrl || "/assets/images/Admipaedia_Logo.png"}
                alt={brandLogoUrl ? `${brandTitle} Logo` : "Admipaedia Logo"}
                className="h-8"
              />
            </Link>
          </div>
          
          {/* Toggle button to expand sidebar - MOVED TO TOP */}
          <Button 
            onClick={toggleCollapse}
            className="mb-6 h-10 w-10 rounded-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md hover:shadow-lg transition-all duration-300"
            aria-label={t('common.expand_sidebar', 'Expand sidebar')}
          >
            <ChevronDown size={20} className="transform -rotate-90" /> {/* INVERTED DIRECTION */}
          </Button>
          
          {/* Mini nav icons */}
          <div className="flex-1 flex flex-col items-center space-y-4 overflow-y-auto">
            {filteredNavItems.map((item: NavItem) => (
              <TooltipProvider key={item.path}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={toLinkTarget(item.path)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isActive(item.path) 
                          ? (isCasaos ? 'bg-blue-500/30 text-white' : 'bg-indigo-900/50 text-cyan-400')
                          : (isCasaos ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-300')
                      )}
                    >
                      <span className={cn(
                        isActive(item.path) 
                          ? (isCasaos ? 'text-white' : 'text-cyan-400')
                          : (isCasaos ? 'text-white/40' : 'text-slate-400')
                      )}>
                        {item.icon}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{getNavItemLabel(item)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
  
          {/* Floating Action Button - MOVED TO BOTTOM */}
          {user?.role === 'admin' && (
          <div className="mt-auto">
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        aria-label={t('common.quick_actions', 'Quick Actions')}
                      >
                        <Plus size={20} />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{t('common.quick_actions', 'Quick Actions')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl">
                <DropdownMenuItem onClick={handleAddStudent} className="flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                  <Users className="mr-2 h-5 w-5 text-indigo-500" />
                  <span>{t('quick_actions.create_student.label', 'Add New Student')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportData} className="flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                  <FileDown className="mr-2 h-5 w-5 text-indigo-500" />
                  <span>{t('common.export', 'Export')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintList} className="flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                  <Printer className="mr-2 h-5 w-5 text-indigo-500" />
                  <span>{t('common.print_list', 'Print List')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} className="flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                  <Share2 className="mr-2 h-5 w-5 text-indigo-500" />
                  <span>{t('common.share', 'Share')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          )}
        </aside>
      </>
    );
  }

  // In the expanded view
  // In the expanded view
  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-indigo-600 text-white shadow-md"
        onClick={toggleSidebar}
        aria-label={isOpen ? t('common.close_menu', 'Close menu') : t('common.open_menu', 'Open menu')}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
  
      {/* Sidebar backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
  
      {/* Main sidebar content (drawer) */}
      <aside className={cn(
        "fixed top-0 left-0 h-full transition-all duration-300 ease-in-out shadow-2xl z-40 flex flex-col",
        isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0 md:w-64",
        isCasaos ? "bg-[#0E1218] border-r border-white/5" : "bg-slate-900"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-4 mb-2">
            <Link to={dashboardPath} className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                {brandLogoUrl ? (
                  <img src={brandLogoUrl} alt={`${brandTitle} Logo`} className="h-5 w-5 object-contain" />
                ) : (
                  <GraduationCap className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  {brandTitle}
                </h1>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t('common.system_online', 'System Online')}
                  </span>
                </div>
              </div>
            </Link>
          </div>
  
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 no-scrollbar" aria-label={t('common.main_navigation', 'Main Navigation')}>
            <div className="px-7 mb-4">
              <div className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase opacity-80">{t('common.main_navigation', 'Main Navigation')}</div>
            </div>
            <ul className="space-y-1 px-4">
              {filteredNavItems.map((item: NavItem) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={toLinkTarget(item.path)}
                      className={cn(
                        "flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                        active
                          ? (isCasaos ? 'active-nav-pill text-white font-semibold' : 'bg-indigo-900/50 text-cyan-400 border-l-2 border-cyan-500')
                          : (isCasaos ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-300')
                      )}
                      onClick={window.innerWidth < 768 ? toggleSidebar : undefined}
                    >
                      <span className={cn(
                        "mr-3 transition-colors relative z-10",
                        active 
                          ? 'text-white' 
                          : (isCasaos ? 'text-slate-500 group-hover:text-white' : 'text-slate-400')
                      )}>
                        {item.icon}
                      </span>
                      <span className="relative z-10 text-[14px]">{getNavItemLabel(item)}</span>
                      {active && isCasaos && (
                        <motion.div
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 bg-blue-600 z-0"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
  
          {/* Footer with theme toggle and system status */}
          <div className="p-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 group cursor-default">
                <div className="relative">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping opacity-40"></div>
                </div>
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{t('common.system_online', 'System Online')}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                aria-label={
                  theme === 'dark'
                    ? t('common.switch_to_light_mode', 'Switch to light mode')
                    : t('common.switch_to_dark_mode', 'Switch to dark mode')
                }
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </Button>
            </div>
            
            {/* Power/Logout button at bottom */}
            <button 
              onClick={logout}
              className="flex items-center justify-center w-full py-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-[10px] font-bold tracking-[0.1em] uppercase"
            >
              <LogOut size={14} className="mr-2" />
              {t('common.logout_button', 'TERMINATE SESSION')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
