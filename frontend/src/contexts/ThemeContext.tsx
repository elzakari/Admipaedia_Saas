import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'gradient' | 'casaos' | 'system';
type Theme = 'light' | 'dark' | 'gradient' | 'casaos';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track both the actual theme and the user's preference
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('themeMode') as ThemeMode;
    return savedTheme || 'casaos';
  });
  
  const [theme, setTheme] = useState<Theme>(() => {
    const savedThemeMode = localStorage.getItem('themeMode') as ThemeMode;
    
    // If user explicitly chose a theme, use that
    if (savedThemeMode === 'light') return 'light';
    if (savedThemeMode === 'dark') return 'dark';
    if (savedThemeMode === 'gradient') return 'gradient';
    if (savedThemeMode === 'casaos') return 'casaos';
    
    // Default to casaos if nothing saved
    return 'casaos';
  });

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);
  
  // Update theme when themeMode changes
  useEffect(() => {
    if (themeMode === 'system') {
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDarkMode ? 'dark' : 'light');
    } else {
      setTheme(themeMode as Theme);
    }
    
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);
  
  // Update document with theme class
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'gradient-theme', 'casaos-theme');
    
    if (theme === 'gradient') {
      root.classList.add('gradient-theme');
    } else if (theme === 'casaos') {
      root.classList.add('casaos-theme');
    } else {
      root.classList.add(theme);
    }
    
    // Add data attribute for easier CSS targeting
    root.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Toggle between light, dark, gradient, and casaos
  const toggleTheme = () => {
    setThemeMode(prevMode => {
      if (prevMode === 'light') return 'dark';
      if (prevMode === 'dark') return 'gradient';
      if (prevMode === 'gradient') return 'casaos';
      if (prevMode === 'casaos') return 'system';
      return 'light';
    });
  };
  
  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};