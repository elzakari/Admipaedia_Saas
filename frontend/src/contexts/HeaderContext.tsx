import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderContextType {
  headerSearch: ReactNode | null;
  setHeaderSearch: (content: ReactNode | null) => void;
  headerActions: ReactNode | null;
  setHeaderActions: (content: ReactNode | null) => void;
  hideGlobalHeader: boolean;
  setHideGlobalHeader: (hide: boolean) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [headerSearch, setHeaderSearch] = useState<ReactNode | null>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [hideGlobalHeader, setHideGlobalHeader] = useState<boolean>(false);

  return (
    <HeaderContext.Provider 
      value={{ 
        headerSearch, 
        setHeaderSearch, 
        headerActions, 
        setHeaderActions,
        hideGlobalHeader,
        setHideGlobalHeader
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};
