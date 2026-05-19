import React, { useState } from 'react';
import NavigationEnhancedDashboard from '../../components/dashboard/NavigationEnhancedDashboard';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout, user } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const activeUser = {
    name: user?.username || 'admin',
    role: user?.role || 'Admin',
    initials: user?.username?.substring(0, 2).toUpperCase() || 'AD'
  };

  return (
    <DashboardShell
      isMenuOpen={isMenuOpen}
      toggleMenu={toggleMenu}
      handleLogout={logout}
      activeUser={activeUser}
    >
      <NavigationEnhancedDashboard />
    </DashboardShell>
  );
};

export default AdminDashboard;
