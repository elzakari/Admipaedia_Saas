import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../lib/utils'; // Import the cn utility function

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  headerContent?: React.ReactNode;
  mainClassName?: string;
  footerContent?: React.ReactNode;
  showResponsiveHelper?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebarContent,
  headerContent,
  mainClassName,
  footerContent,
  showResponsiveHelper = false
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1023px)');
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  // Close sidebar when switching to desktop view
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop]);
  
  // Handle keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && sidebarOpen) {
      setSidebarOpen(false);
    }
  };
  
  // Announce sidebar state changes for screen readers
  useEffect(() => {
    if (sidebarOpen) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('className', 'sr-only');
      announcement.textContent = 'Sidebar menu opened';
      document.body.appendChild(announcement);
      
      return () => {
        announcement.textContent = 'Sidebar menu closed';
        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      };
    }
  }, [sidebarOpen]);

  return (
    <div 
      className="min-h-screen bg-background text-foreground flex flex-col" 
      onKeyDown={handleKeyDown}
    >
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring">
        Skip to content
      </a>
      
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Mobile menu button */}
          {!isDesktop && sidebarContent && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-foreground hover:bg-background-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
              aria-label="Toggle sidebar menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          {/* Header content */}
          {headerContent}
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6 flex-grow">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - desktop */}
          {isDesktop && sidebarContent && (
            <aside 
              className="lg:w-1/4 sticky top-20 self-start" 
              aria-label="Sidebar navigation"
            >
              {sidebarContent}
            </aside>
          )}
          
          {/* Sidebar - mobile */}
          {!isDesktop && sidebarContent && (
            <div 
              id="sidebar"
              className={`
                fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              `}
              aria-hidden={!sidebarOpen}
              role="dialog"
              aria-modal="true"
              aria-label="Sidebar navigation"
            >
              <div 
                className="absolute inset-0 bg-black bg-opacity-50" 
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                role="button"
                tabIndex={sidebarOpen ? 0 : -1}
              ></div>
              <aside 
                className="relative w-3/4 max-w-xs h-full bg-background shadow-xl p-4 overflow-y-auto"
                role="navigation"
              >
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-md text-foreground hover:bg-background-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Close sidebar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {sidebarContent}
              </aside>
            </div>
          )}
          
          {/* Main content */}
          <main 
            id="main-content" 
            className={cn(
              isDesktop && sidebarContent ? 'lg:w-3/4' : 'w-full',
              isMobile ? 'px-2' : 'px-4',
              mainClassName
            )}
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      {footerContent && (
        <footer className="w-full bg-background border-t border-border mt-auto">
          <div className="container mx-auto px-4 py-6">
            {footerContent}
          </div>
        </footer>
      )}

      {/* Responsive helper for development */}
      {showResponsiveHelper && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-background border border-border rounded-lg shadow-lg text-xs">
          <div className="font-bold mb-1">Viewport:</div>
          <div className="sm:hidden">Mobile</div>
          <div className="hidden sm:block md:hidden">Small Tablet</div>
          <div className="hidden md:block lg:hidden">Tablet</div>
          <div className="hidden lg:block xl:hidden">Desktop</div>
          <div className="hidden xl:block 2xl:hidden">Large Desktop</div>
          <div className="hidden 2xl:block">Extra Large</div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveLayout;