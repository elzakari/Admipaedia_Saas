import React, { useState } from 'react';
import NavigationEnhancedDashboard from '../../components/dashboard/NavigationEnhancedDashboard';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { useAuth } from '../../contexts/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminDashboard: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const isMobileViewport = useMediaQuery('(max-width: 820px)');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const activeUser = {
    name: user?.username || 'admin',
    role: user?.role || 'Admin',
    initials: user?.username?.substring(0, 2).toUpperCase() || 'AD'
  };

  if (isMobileViewport) {
    return (
      <div className="adm-phone-viewport-only">
        <DashboardShell
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          handleLogout={logout}
          activeUser={activeUser}
        >
          <NavigationEnhancedDashboard />
        </DashboardShell>
      </div>
    );
  }

  // Pure untouched desktop structure
  return <NavigationEnhancedDashboard />;
};

export default AdminDashboard;
