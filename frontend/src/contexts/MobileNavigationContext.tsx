import React, { createContext, useContext, useState, useCallback } from 'react';

interface MobileNavigationContextType {
  isBottomNavVisible: boolean;
  hideBottomNav: () => void;
  showBottomNav: () => void;
  toggleBottomNav: () => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextType | undefined>(undefined);

interface MobileNavigationProviderProps {
  children: React.ReactNode;
}

export const MobileNavigationProvider: React.FC<MobileNavigationProviderProps> = ({ children }) => {
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);

  const hideBottomNav = useCallback(() => {
    setIsBottomNavVisible(false);
  }, []);

  const showBottomNav = useCallback(() => {
    setIsBottomNavVisible(true);
  }, []);

  const toggleBottomNav = useCallback(() => {
    setIsBottomNavVisible(prev => !prev);
  }, []);

  const value = {
    isBottomNavVisible,
    hideBottomNav,
    showBottomNav,
    toggleBottomNav
  };

  return (
    <MobileNavigationContext.Provider value={value}>
      {children}
    </MobileNavigationContext.Provider>
  );
};

export const useMobileNavigationContext = (): MobileNavigationContextType => {
  const context = useContext(MobileNavigationContext);
  if (context === undefined) {
    throw new Error('useMobileNavigationContext must be used within a MobileNavigationProvider');
  }
  return context;
};

export default MobileNavigationContext;