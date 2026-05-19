import React, { useEffect, useState } from 'react';
import StatisticsGrid from '../../components/dashboard/StatisticsGrid';
import CalendarWidget from '../../components/dashboard/CalendarWidget';
import NotificationList from '../../components/dashboard/NotificationList';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '../../components/layout/DashboardShell';

interface DashboardPageProps {}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [greeting, setGreeting] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    let greetingText = '';
    
    if (hour < 12) {
      greetingText = 'Good morning';
    } else if (hour < 18) {
      greetingText = 'Good afternoon';
    } else {
      greetingText = 'Good evening';
    }
    
    // Use username as the display name
    const displayName = user?.username || 'User';
    setGreeting(`${greetingText}, ${displayName}`);
  }, [user]);

  const activeUser = {
    name: user?.username || 'User',
    role: user?.role || 'Admin',
    initials: user?.username?.substring(0, 2).toUpperCase() || 'AD'
  };

  if (authLoading) {
    return (
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
    );
  }

  return (
    <DashboardShell
      isMenuOpen={isMenuOpen}
      toggleMenu={toggleMenu}
      handleLogout={logout}
      activeUser={activeUser}
    >
      <div className="dashboard-container">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{greeting}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Here's what's happening in your school today.</p>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Overview</h2>
          <StatisticsGrid />
        </div>
        
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
  );
};

export default DashboardPage;