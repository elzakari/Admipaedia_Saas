import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings, User } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import LanguageSwitcher from '../common/LanguageSwitcher';

const Header: React.FC = () => {
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
        <button className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400">
          <Bell size={20} />
        </button>
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
