import React, { useEffect, useState } from 'react';
import { Home, Users, Calendar, BarChart3, Settings, Menu, LayoutGrid, User, Activity, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MobileBottomNavigation } from '../navigation/MobileBottomNavigation';
import { useSaasTenant } from '../../hooks/useSaasTenant';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

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
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { current } = useSaasTenant();
  const { unreadCount } = useUnreadNotifications();

  const schoolBrandName = current?.tenant?.name || current?.tenant?.slug?.toUpperCase() || 'ADMIPAEDIA';
  const schoolBrandLogo = current?.tenant?.logo_url || '/assets/images/Admipaedia_Logo.png';
  const notificationPath =
    activeUser?.role === 'teacher' ? '/teacher/notifications' :
    activeUser?.role === 'student' ? '/student/notifications' :
    '/notifications';

  useEffect(() => {
    const scrollContainer = document.querySelector('.adm-main-container');
    
    const handleScroll = () => {
      const currentScrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
      
      // Determine scrolling direction and toggle header visibility based on directional velocity
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling Down: hide the header
        setShowHeader(false);
      } else {
        // Scrolling Up: show the header
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

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
          <div className="adm-brand-icon-wrapper overflow-hidden rounded-2xl bg-white/10 flex items-center justify-center">
            <img
              src={schoolBrandLogo}
              alt={`${schoolBrandName} Logo`}
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="adm-brand-info">
            <span className="adm-brand-name truncate">{schoolBrandName}</span>
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
        <header className={`adm-mobile-header transition-transform duration-300 transform ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
          <button 
            className="adm-mobile-menu-trigger" 
            onClick={toggleMenu} 
            aria-expanded={isMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-6 w-6 text-white" />
          </button>

          <div className="adm-mobile-brand-center flex items-center gap-2">
            <div className="adm-mobile-logo-wrapper overflow-hidden rounded-xl bg-white/10 flex items-center justify-center">
              <img
                src={schoolBrandLogo}
                alt={`${schoolBrandName} Logo`}
                className="adm-mobile-logo h-6 w-6 object-contain"
              />
            </div>
            <span className="adm-mobile-brand-title truncate max-w-[10rem] sm:max-w-none">{schoolBrandName}</span>
          </div>

          <div className="adm-mobile-actions-right flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {activeUser?.initials || "SM"}
            </div>
            <Link to={notificationPath} className="relative text-white hover:text-indigo-200" aria-label="View Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white font-bold text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <header className="adm-topbar hidden md:flex">
          <button className="adm-mobile-menu-trigger" onClick={toggleMenu} aria-label="Toggle Navigation Menu">
            <span className="adm-menu-bar" />
          </button>
          
          <div className="adm-topbar-left">
            <div className="adm-search-wrapper">
              <input type="text" placeholder="Rechercher... (Ctrl+K)" className="adm-search-input" />
              <kbd className="adm-search-hint">Ctrl + K</kbd>
            </div>
          </div>

          <div className="adm-topbar-right">
            <button className="adm-btn-commands">Commandes</button>
            <div className="adm-notification-bell-wrapper">
              <Link to={notificationPath} className="adm-icon-button relative" aria-label="View Notifications">
                {unreadCount > 0 && (
                  <span className="adm-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
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
          {/* Active Purple Layout Menu Interface Module */}
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-3">
              <button className="flex flex-col items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-102">
                <LayoutGrid className="h-5 w-5 mb-1.5 text-white animate-pulse" />
                <span className="text-[10px] font-bold text-center tracking-tight">Tableau de bord</span>
              </button>
              
              <a href="/students" className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all text-slate-700 dark:text-slate-200">
                <Users className="h-5 w-5 mb-1.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-center tracking-tight">Élèves</span>
              </a>

              <a href="/teachers" className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all text-slate-700 dark:text-slate-200">
                <Users className="h-5 w-5 mb-1.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-center tracking-tight">Enseignants</span>
              </a>

              <a href="/profile" className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all text-slate-700 dark:text-slate-200">
                <User className="h-5 w-5 mb-1.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-center tracking-tight">Profils</span>
              </a>

              <button className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all text-slate-700 dark:text-slate-200">
                <Activity className="h-5 w-5 mb-1.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-center tracking-tight">Rapides</span>
              </button>

              <a href="/calendar" className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all text-slate-700 dark:text-slate-200">
                <Calendar className="h-5 w-5 mb-1.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-center tracking-tight">Calendrier</span>
              </a>

              <a href="/reports" className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all text-slate-700 dark:text-slate-200">
                <BarChart3 className="h-5 w-5 mb-1.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-center tracking-tight">Overrlevs</span>
              </a>

              <a href="/settings" className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all text-slate-700 dark:text-slate-200">
                <Settings className="h-5 w-5 mb-1.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-center tracking-tight">Contalmer</span>
              </a>
            </div>
          </div>

          {children}

          {/* Mobile Footer Status & Terminate Session */}
          <div className="adm-mobile-footer mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between pb-8">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Système en ligne</span>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors bg-white dark:bg-slate-850 shadow-sm"
            >
              Terminer la session
            </button>
          </div>
        </main>
      </div>

      {/* Sticky Fixed Bottom Navigation Bar */}
      <MobileBottomNavigation />
    </div>
  );
}

export default DashboardShell;
