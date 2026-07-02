import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings, User } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

const Header: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  const notificationPath =
    user?.role === 'teacher' ? '/teacher/notifications' :
    user?.role === 'student' ? '/student/notifications' :
    '/notifications';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm h-14 flex items-center justify-between px-4 transition-colors">
      <div className="flex items-center">
        <Link to="/dashboard" className="text-lg font-bold text-indigo-900 dark:text-indigo-300 tracking-tight">
          ADMIPEDIA
        </Link>
      </div>
      <div className="flex items-center space-x-3">
        <LanguageSwitcher />
        <ThemeToggle />
        <Link to={notificationPath} className="relative text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400" aria-label="View Notifications">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white font-bold text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link to="/settings" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400">
          <Settings size={20} />
        </Link>
        <Link to="/profile" className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-200 shadow-inner">
            <User size={14} />
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
