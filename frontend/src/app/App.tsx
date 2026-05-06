import React, { useState, useEffect } from 'react';
import AppRoutes from './AppRoutes';
import { useAuth } from '@/contexts/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';
import ResponsiveTest from '../components/dev/ResponsiveTest';
import PerformanceMonitor from '../components/performance/PerformanceMonitor';
import { initializePerformanceOptimizations } from '../utils/performanceOptimization';

import OfflineStatusBanner from '../components/common/OfflineStatusBanner';
import CountryLanguageAutoSwitch from '@/components/common/CountryLanguageAutoSwitch';

const App: React.FC = () => {
  const { isLoading } = useAuth();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // Initialize performance optimizations
  useEffect(() => {
    initializePerformanceOptimizations();
  }, []);

  // Keyboard shortcut to toggle performance monitor (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setShowPerformanceMonitor(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <OfflineStatusBanner />
      <CountryLanguageAutoSwitch />
      <AppRoutes />
      {isDevelopment && <ResponsiveTest />}
      {(isDevelopment || showPerformanceMonitor) && (
        <PerformanceMonitor
          isVisible={showPerformanceMonitor}
          onToggle={() => setShowPerformanceMonitor(prev => !prev)}
        />
      )}
    </>
  );
};

export default App;
