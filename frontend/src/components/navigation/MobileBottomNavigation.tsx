import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BadgeCheck,
  Calendar,
  FilePlus2,
  Bell,
  MessageSquare,
  CreditCard,
  Settings,
  Library,
  FileText,
  BarChart3
} from 'lucide-react';

interface NavItem {
  name: string;
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface MobileBottomNavigationProps {
  className?: string;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({ className }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  // Define navigation items with role-based filtering
  const allNavItems: NavItem[] = [
    {
      name: 'Dashboard',
      labelKey: 'navigation.dashboard',
      path: user?.role === 'super_admin' ? '/super-admin' :
            user?.role === 'admin' ? '/admin/dashboard' :
            user?.role === 'teacher' ? '/teacher/dashboard' :
            user?.role === 'student' ? '/student/dashboard' :
            user?.role === 'parent' ? '/parent/dashboard' :
            '/dashboard',
      icon: <LayoutDashboard size={20} />
    },
    {
      name: 'Users',
      labelKey: 'navigation.users',
      path: '/super-admin/users',
      icon: <Users size={20} />,
      roles: ['super_admin']
    },
    {
      name: 'Audit Logs',
      labelKey: 'navigation.audit_logs',
      path: '/super-admin/audit-logs',
      icon: <FileText size={20} />,
      roles: ['super_admin']
    },
    {
      name: 'Schools',
      labelKey: 'navigation.schools',
      path: '/super-admin/schools',
      icon: <Building2 size={20} />,
      roles: ['super_admin']
    },
    {
      name: 'Financial Insights',
      labelKey: 'navigation.financial_oversight',
      path: '/super-admin/financial',
      icon: <BarChart3 size={20} />,
      roles: ['super_admin']
    },
    {
      name: 'Academics',
      labelKey: 'navigation.academics',
      path: '/academics',
      icon: <BookOpen size={20} />,
      roles: ['admin']
    },
    {
      name: 'Students',
      labelKey: 'navigation.students',
      path: '/students',
      icon: <GraduationCap size={20} />,
      roles: ['admin']
    },
    {
      name: 'My Children',
      labelKey: 'navigation.my_children',
      path: '/parent-portal',
      icon: <Users size={20} />,
      roles: ['parent']
    },
    {
      name: 'Admissions',
      labelKey: 'navigation.admissions',
      path: '/admissions',
      icon: <FilePlus2 size={20} />,
      roles: ['parent', 'admin']
    },
    {
      name: 'Teachers',
      labelKey: 'navigation.teachers',
      path: '/teachers',
      icon: <Users size={20} />,
      roles: ['admin']
    },
    {
      name: 'Schedule',
      labelKey: 'navigation.schedule',
      path: '/schedule',
      icon: <Calendar size={20} />,
      roles: ['admin']
    },
    {
      name: 'Schedule',
      labelKey: 'navigation.schedule',
      path: '/parent/schedule',
      icon: <Calendar size={20} />,
      roles: ['parent']
    },
    {
      name: 'Library',
      labelKey: 'navigation.library',
      path: '/library',
      icon: <Library size={20} />,
      roles: ['admin']
    },
    {
      name: 'Messages',
      labelKey: 'navigation.messages',
      path: '/messages',
      icon: <MessageSquare size={20} />,
      roles: ['admin', 'parent']
    },
    {
      name: 'Notifications',
      labelKey: 'navigation.notifications',
      path: '/notifications',
      icon: <Bell size={20} />,
      roles: ['admin', 'parent']
    },
    {
      name: 'My Classes',
      labelKey: 'navigation.classes',
      path: '/student/classes',
      icon: <BookOpen size={20} />,
      roles: ['student']
    },
    {
      name: 'Assignments',
      labelKey: 'navigation.assignments',
      path: '/student/assignments',
      icon: <ClipboardList size={20} />,
      roles: ['student']
    },
    {
      name: 'Grades',
      labelKey: 'navigation.grades',
      path: '/student/grades',
      icon: <BadgeCheck size={20} />,
      roles: ['student']
    },
    {
      name: 'Timetable',
      labelKey: 'navigation.timetable',
      path: '/student/timetable',
      icon: <Calendar size={20} />,
      roles: ['student']
    },
    {
      name: 'Student Messages',
      labelKey: 'navigation.messages',
      path: '/student/messages',
      icon: <MessageSquare size={20} />,
      roles: ['student']
    },
    {
      name: 'Student Notifications',
      labelKey: 'navigation.notifications',
      path: '/student/notifications',
      icon: <Bell size={20} />,
      roles: ['student']
    },

    {
      name: 'My Classes',
      labelKey: 'navigation.classes',
      path: '/teacher/classes',
      icon: <BookOpen size={20} />,
      roles: ['teacher']
    },
    {
      name: 'Timetable',
      labelKey: 'navigation.timetable',
      path: '/teacher/timetable',
      icon: <Calendar size={20} />,
      roles: ['teacher']
    },
    {
      name: 'Teacher Messages',
      labelKey: 'navigation.messages',
      path: '/teacher/messages',
      icon: <MessageSquare size={20} />,
      roles: ['teacher']
    },
    {
      name: 'Teacher Notifications',
      labelKey: 'navigation.notifications',
      path: '/teacher/notifications',
      icon: <Bell size={20} />,
      roles: ['teacher']
    },
    {
      name: 'Fees',
      labelKey: 'navigation.fees',
      path: user?.role === 'parent' ? '/parent-portal?tab=fees' : '/fees',
      icon: <CreditCard size={20} />,
      roles: ['admin']
    },
    {
      name: 'Settings',
      labelKey: 'navigation.settings',
      path: '/settings',
      icon: <Settings size={20} />
    }
  ];

  // Filter navigation items based on user role and select top 5 most relevant
  const getFilteredNavItems = (): NavItem[] => {
    if (!user || !user.role) return allNavItems.slice(0, 5);
    
    const roleBasedItems = allNavItems.filter(item => 
      !item.roles || item.roles.includes(user.role)
    );

    // Prioritize items based on user role
    switch(user.role) {
      case 'super_admin':
        return [
          roleBasedItems.find(item => item.name === 'Dashboard')!,
          roleBasedItems.find(item => item.name === 'Users')!,
          roleBasedItems.find(item => item.name === 'Schools')!,
          roleBasedItems.find(item => item.name === 'Financial Insights')!,
          { ...roleBasedItems.find(item => item.name === 'Settings')!, path: '/super-admin/settings' }
        ].filter(Boolean);
      case 'admin':
        return [
          roleBasedItems.find(item => item.name === 'Dashboard')!,
          roleBasedItems.find(item => item.name === 'Students')!,
          roleBasedItems.find(item => item.name === 'Teachers')!,
          roleBasedItems.find(item => item.name === 'Academics')!,
          roleBasedItems.find(item => item.name === 'Settings')!
        ].filter(Boolean);
      case 'teacher':
        return [
          roleBasedItems.find(item => item.name === 'Dashboard')!,
          roleBasedItems.find(item => item.name === 'My Classes')!,
          roleBasedItems.find(item => item.name === 'Timetable')!,
          roleBasedItems.find(item => item.name === 'Teacher Messages')!,
          roleBasedItems.find(item => item.name === 'Teacher Notifications')!
        ].filter(Boolean);
      case 'student':
        return [
          roleBasedItems.find(item => item.name === 'Dashboard')!,
          roleBasedItems.find(item => item.name === 'My Classes')!,
          roleBasedItems.find(item => item.name === 'Assignments')!,
          roleBasedItems.find(item => item.name === 'Student Messages')!,
          roleBasedItems.find(item => item.name === 'Student Notifications')!
        ].filter(Boolean);
      case 'parent':
        return [
          roleBasedItems.find(item => item.name === 'Dashboard')!,
          roleBasedItems.find(item => item.name === 'Schedule')!,
          roleBasedItems.find(item => item.name === 'My Children')!,
          roleBasedItems.find(item => item.name === 'Notifications')!,
          roleBasedItems.find(item => item.name === 'Messages')!
        ].filter(Boolean);
      default:
        return roleBasedItems.slice(0, 5);
    }
  };

  // Check if a path is active
  const isActive = (path: string) => {
    const basePath = path.split('?')[0];
    if (basePath === '/dashboard' && location.pathname === '/dashboard') {
      return true;
    }
    return basePath !== '/dashboard' && location.pathname.startsWith(basePath);
  };

  // Don't render on desktop or if not mobile
  if (!isMobile) {
    return null;
  }

  const navItems = getFilteredNavItems();

  return (
    <nav 
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200',
        'dark:bg-slate-900/95 dark:border-slate-700',
        'safe-area-inset-bottom', // Handle iPhone notch
        className
      )}
      role="navigation"
      aria-label={t('common.mobile_bottom_navigation', 'Mobile bottom navigation')}
    >
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {navItems.map((item) => {
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-2 rounded-lg',
                'transition-all duration-200 ease-in-out',
                'touch-manipulation', // Optimize for touch
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                active
                  ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800'
              )}
              aria-label={t(item.labelKey, item.name)}
            >
              {/* Icon */}
              <div className={cn(
                'flex items-center justify-center w-6 h-6 mb-1',
                'transition-transform duration-200',
                active && 'scale-110'
              )}>
                {React.cloneElement(item.icon as React.ReactElement, {
                  size: 20,
                  className: cn(
                    'transition-colors duration-200',
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-current'
                  )
                })}
              </div>
              
              {/* Label */}
              <span className={cn(
                'text-xs font-medium leading-none truncate max-w-full',
                'transition-colors duration-200',
                active ? 'text-blue-600 dark:text-blue-400' : 'text-current'
              )}>
                {t(item.labelKey, item.name)}
              </span>
              
              {/* Active indicator */}
              {active && (
                <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNavigation;
