import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive';

interface UseMobileNavigationReturn {
  showBottomNav: boolean;
  hideBottomNav: () => void;
  showBottomNavigation: () => void;
}

export const useMobileNavigation = (): UseMobileNavigationReturn => {
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const { isMobile } = useResponsive();

  // Hide/show bottom nav based on scroll direction
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY);
      
      // Only hide/show if scroll difference is significant (avoid jitter)
      if (scrollDifference > 10) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down - hide bottom nav
          setShowBottomNav(false);
        } else {
          // Scrolling up - show bottom nav
          setShowBottomNav(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    const throttledHandleScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [lastScrollY, isMobile]);

  // Show bottom nav when route changes
  useEffect(() => {
    setShowBottomNav(true);
  }, [location.pathname]);

  const hideBottomNav = () => setShowBottomNav(false);
  const showBottomNavigation = () => setShowBottomNav(true);

  return {
    showBottomNav: isMobile ? showBottomNav : false,
    hideBottomNav,
    showBottomNavigation
  };
};

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default useMobileNavigation;