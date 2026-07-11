import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StatisticsGrid from '../../components/dashboard/StatisticsGrid';
import CalendarWidget from '../../components/dashboard/CalendarWidget';
import NotificationList from '../../components/dashboard/NotificationList';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ResponsiveLayout from '../../components/layout/ResponsiveLayout';
import SidebarNav from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useEnhancedNavigation } from '../../hooks/useEnhancedNavigation';
import { Card } from '../../components/ui/card';
import { Plus, Activity, Download, Calendar, ArrowRight } from 'lucide-react';

interface DashboardPageProps {}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [greeting, setGreeting] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobileViewport = useMediaQuery('(max-width: 820px)');

  const { executeAction, quickActions } = useEnhancedNavigation();

  const handleQuickActionClick = (actionId: string) => {
    const action = quickActions.find(a => a.id === actionId);
    if (action) {
      executeAction(action);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    let greetingText = '';
    
    if (hour < 12) {
      greetingText = t('common.greetings.morning', 'Good morning');
    } else if (hour < 18) {
      greetingText = t('common.greetings.afternoon', 'Good afternoon');
    } else {
      greetingText = t('common.greetings.evening', 'Good evening');
    }
    
    // Use username as the display name
    const displayName = user?.username || 'User';
    setGreeting(`${greetingText}, ${displayName}`);
  }, [user, t]);

  const activeUser = {
    name: user?.username || 'User',
    role: user?.role || 'Admin',
    initials: user?.username?.substring(0, 2).toUpperCase() || 'AD'
  };

  if (authLoading) {
    if (isMobileViewport) {
      return (
        <div className="adm-phone-viewport-only">
          <DashboardShell
            isMenuOpen={isMenuOpen}
            toggleMenu={toggleMenu}
            handleLogout={logout}
            activeUser={activeUser}
          >
            <div className="dashboard-container animate-pulse">
              <div className="mb-8">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              
              <div className="mb-8">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-4 sm:p-5 h-24"></div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 bg-white rounded-lg shadow h-64"></div>
                <div className="bg-white rounded-lg shadow h-64"></div>
              </div>
            </div>
          </DashboardShell>
        </div>
      );
    }

    return (
      <ResponsiveLayout
        headerContent={<Header />}
        sidebarContent={<SidebarNav isOpen={false} toggleSidebar={function (): void {
          throw new Error('Function not implemented.');
        } } />}
        footerContent={<Footer />}
      >
        <div className="dashboard-container animate-pulse">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          
          <div className="mb-8">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-4 sm:p-5 h-24"></div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow h-64"></div>
            <div className="bg-white rounded-lg shadow h-64"></div>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  if (isMobileViewport) {
    return (
      <div className="adm-phone-viewport-only">
        <DashboardShell
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          handleLogout={logout}
          activeUser={activeUser}
        >
          <div className="dashboard-container">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{greeting}</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">{t('dashboard.greeting_subtitle', "Here's what's happening in your school today.")}</p>
            </div>
            
            <div className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('common.overview', 'Overview')}</h2>
              <StatisticsGrid />
            </div>

            {/* Quick Actions Card */}
            <Card className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl mb-6 sm:mb-8 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('common.quick_actions', 'Quick Actions')}
                </h2>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                  {t('dashboard.quick_actions.shortcuts', 'Shortcuts to frequent tasks')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => handleQuickActionClick('create-student')}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-blue-100 dark:hover:border-blue-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-xl group-hover:scale-105 transition-transform">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {t('quick_actions.create_student.label', 'Add New Student')}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {t('quick_actions.create_student.description', 'Create student profile')}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => handleQuickActionClick('view-attendance')}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-emerald-100 dark:hover:border-emerald-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-xl group-hover:scale-105 transition-transform">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {t('quick_actions.view_attendance.label', 'View Attendance')}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {t('quick_actions.view_attendance.description', 'Check daily records')}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => handleQuickActionClick('generate-report')}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-purple-100 dark:hover:border-purple-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 text-purple-500 rounded-xl group-hover:scale-105 transition-transform">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {t('quick_actions.generate_report.label', 'Generate Report')}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {t('quick_actions.generate_report.description', 'Create custom exports')}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => handleQuickActionClick('open-calendar')}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-amber-100 dark:hover:border-amber-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-xl group-hover:scale-105 transition-transform">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {t('quick_actions.open_calendar.label', 'Open Calendar')}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {t('quick_actions.open_calendar.description', 'View events & schedules')}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
                </button>
              </div>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <CalendarWidget />
              </div>
              <div>
                <NotificationList />
              </div>
            </div>
          </div>
        </DashboardShell>
      </div>
    );
  }

  return (
    <ResponsiveLayout
      headerContent={<Header />}
      sidebarContent={<SidebarNav isOpen={false} toggleSidebar={function (): void {
        throw new Error('Function not implemented.');
      } } />}
      footerContent={<Footer />}
      showResponsiveHelper={process.env.NODE_ENV === 'development'}
    >
      <div className="dashboard-container">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{greeting}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t('dashboard.greeting_subtitle', "Here's what's happening in your school today.")}</p>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('common.overview', 'Overview')}</h2>
          <StatisticsGrid />
        </div>

        {/* Quick Actions Card */}
        <Card className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl mb-6 sm:mb-8 transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t('common.quick_actions', 'Quick Actions')}
            </h2>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
              {t('dashboard.quick_actions.shortcuts', 'Shortcuts to frequent tasks')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleQuickActionClick('create-student')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-blue-100 dark:hover:border-blue-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-xl group-hover:scale-105 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {t('quick_actions.create_student.label', 'Add New Student')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.create_student.description', 'Create student profile')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleQuickActionClick('view-attendance')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-emerald-100 dark:hover:border-emerald-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-xl group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {t('quick_actions.view_attendance.label', 'View Attendance')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.view_attendance.description', 'Check daily records')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleQuickActionClick('generate-report')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-purple-100 dark:hover:border-purple-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 text-purple-500 rounded-xl group-hover:scale-105 transition-transform">
                <Download className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {t('quick_actions.generate_report.label', 'Generate Report')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.generate_report.description', 'Create custom exports')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleQuickActionClick('open-calendar')}
              className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white border border-slate-100 dark:border-slate-700/50 hover:border-amber-100 dark:hover:border-amber-900/50 rounded-xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-xl group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {t('quick_actions.open_calendar.label', 'Open Calendar')}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t('quick_actions.open_calendar.description', 'View events & schedules')}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
            </button>
          </div>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <CalendarWidget />
          </div>
          <div>
            <NotificationList />
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default DashboardPage;