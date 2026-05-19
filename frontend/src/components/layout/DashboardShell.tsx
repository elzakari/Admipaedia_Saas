import React, { useEffect } from 'react';
import { Home, Users, Calendar, BarChart3, Settings, Menu } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
  isMenuOpen: boolean;
  toggleMenu: () => void;
  handleLogout?: () => void;
  activeUser?: {
    name?: string;
    role?: string;
    initials?: string;
  };
}

export function DashboardShell({ children, isMenuOpen, toggleMenu, handleLogout, activeUser }: DashboardShellProps) {
  useEffect(() => {
    // Escape closes mobile responsive menu
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        toggleMenu();
      }
      
      // Global Ctrl + K search focus hook
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.adm-search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, toggleMenu]);

  // Ensure body has the premium design class on mount
  useEffect(() => {
    document.body.classList.add('adm-premium-design');
    return () => {
      document.body.classList.remove('adm-premium-design');
    };
  }, []);

  return (
    <div className={`adm-dashboard-shell ${isMenuOpen ? 'is-menu-open' : ''}`}>
      {/* Dark Overlay for Mobile Sidebar Canvas */}
      <div className="adm-sidebar-overlay" onClick={toggleMenu} aria-hidden="true" />

      {/* Semantic Sidebar Component */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand">
          <div className="adm-brand-icon-wrapper" />
          <div className="adm-brand-info">
            <span className="adm-brand-name">COLLEGE-GERMINOS</span>
            <div className="adm-status-indicator">
              <span className="adm-status-dot" />
              <span className="adm-status-text">Système en ligne</span>
            </div>
          </div>
        </div>

        <nav className="adm-sidebar-nav">
          <a href="/app/dashboard" className="adm-nav-item active">
            <i className="adm-icon-dashboard" />
            <span className="adm-nav-label">Tableau de bord</span>
          </a>
          <a href="/app/students" className="adm-nav-item">
            <i className="adm-icon-students" />
            <span className="adm-nav-label">Élèves</span>
          </a>
          <a href="/app/billing/plan" className="adm-nav-item">
            <i className="adm-icon-fees" />
            <span className="adm-nav-label">Frais</span>
          </a>
        </nav>

        <div className="adm-sidebar-footer">
          <button onClick={handleLogout} className="adm-btn-terminate" aria-label="Terminate Session">
            <span>Terminer la session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="adm-main-container">
        {/* Deep-blue Mobile Brand Header */}
        <header className="adm-mobile-header">
          <div className="adm-mobile-brand-left">
            <div className="adm-mobile-logo-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="adm-mobile-logo h-5 w-5 text-white animate-pulse">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="adm-mobile-brand-title">ADMIPAEDIA</span>
          </div>
          <button 
            className="adm-mobile-menu-trigger" 
            onClick={toggleMenu} 
            aria-expanded={isMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-6 w-6 text-white" />
          </button>
        </header>

        <header className="adm-topbar">
          <button className="adm-mobile-menu-trigger" onClick={toggleMenu} aria-label="Toggle Navigation Menu">
            <span className="adm-menu-bar" />
          </button>
          
          <div className="adm-topbar-left">
            <h1 className="adm-topbar-title">Tableau de bord</h1>
            <div className="adm-search-wrapper">
              <input type="text" placeholder="Rechercher... (Ctrl+K)" className="adm-search-input" />
              <kbd className="adm-search-hint">Ctrl + K</kbd>
            </div>
          </div>

          <div className="adm-topbar-right">
            <button className="adm-btn-commands">Commandes</button>
            <div className="adm-notification-bell-wrapper">
              <button className="adm-icon-button" aria-label="View Notifications">
                <span className="adm-notif-badge">10</span>
              </button>
            </div>
            <div className="adm-user-profile-block">
              <div className="adm-avatar-initials">{activeUser?.initials || "SM"}</div>
              <div className="adm-user-meta">
                <span className="adm-user-name">{activeUser?.name || "syd_maurice"}</span>
                <span className="adm-user-role">{activeUser?.role || "Admin"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="adm-content-wrapper">
          {/* Dashboard Header Blocks */}
          <section className="adm-dashboard-header">
            <div className="adm-header-left">
              <span className="adm-eyebrow-pill">System dashboard</span>
              <h2 className="adm-header-title">Monitor your school operations with clarity.</h2>
              <p className="adm-header-subtitle">
                Track performance, manage daily actions, review academic activity, and keep your educational platform running smoothly from one centralized workspace.
              </p>
            </div>
          </section>

          {/* Layout Configuration Panel */}
          <div className="adm-layout-config-card">
            <div className="adm-config-info">
              <h3>Layout Configuration</h3>
              <p>Customize the dashboard widgets and workspace view.</p>
            </div>
            <div className="adm-config-tabs">
              <button className="adm-tab-item active">Overview <span className="adm-badge">4 widgets</span></button>
              <button className="adm-tab-item">Statistics</button>
              <button className="adm-tab-item">Calendar</button>
              <button className="adm-tab-item">Notifications</button>
            </div>
          </div>

          {children}
        </main>
      </div>

      {/* Sticky Fixed Bottom Navigation Bar */}
      <nav className="adm-mobile-bottom-nav">
        <a href="/admin/dashboard" className="adm-mobile-nav-tab active" aria-label="Dashboard">
          <div className="adm-mobile-tab-icon-wrapper">
            <Home className="adm-mobile-tab-icon" />
            <span className="adm-mobile-active-dot" />
          </div>
          <span className="adm-mobile-tab-label">Dashboard</span>
        </a>
        <a href="/students" className="adm-mobile-nav-tab" aria-label="Students">
          <Users className="adm-mobile-tab-icon" />
          <span className="adm-mobile-tab-label">Students</span>
        </a>
        <a href="/attendance" className="adm-mobile-nav-tab" aria-label="Attendance">
          <Calendar className="adm-mobile-tab-icon" />
          <span className="adm-mobile-tab-label">Attendance</span>
        </a>
        <a href="/reports" className="adm-mobile-nav-tab" aria-label="Reports">
          <BarChart3 className="adm-mobile-tab-icon" />
          <span className="adm-mobile-tab-label">Reports</span>
        </a>
        <a href="/settings" className="adm-mobile-nav-tab" aria-label="Settings">
          <Settings className="adm-mobile-tab-icon" />
          <span className="adm-mobile-tab-label">Settings</span>
        </a>
      </nav>
    </div>
  );
}

export default DashboardShell;
