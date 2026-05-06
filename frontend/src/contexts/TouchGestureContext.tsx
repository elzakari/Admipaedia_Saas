import React, { createContext, useContext, useState, useCallback } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface TouchGestureSettings {
  swipeThreshold: number;
  longPressDelay: number;
  doubleTapDelay: number;
  enableHapticFeedback: boolean;
  enableSwipeGestures: boolean;
  enableLongPress: boolean;
  enableDoubleTap: boolean;
}

interface TouchGestureContextType {
  settings: TouchGestureSettings;
  updateSettings: (newSettings: Partial<TouchGestureSettings>) => void;
  triggerHapticFeedback: (type?: 'light' | 'medium' | 'heavy') => void;
  isTouchDevice: boolean;
}

const defaultSettings: TouchGestureSettings = {
  swipeThreshold: 100,
  longPressDelay: 500,
  doubleTapDelay: 300,
  enableHapticFeedback: true,
  enableSwipeGestures: true,
  enableLongPress: true,
  enableDoubleTap: true
};

const TouchGestureContext = createContext<TouchGestureContextType | undefined>(undefined);

export const TouchGestureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<TouchGestureSettings>(defaultSettings);
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

  const updateSettings = useCallback((newSettings: Partial<TouchGestureSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!settings.enableHapticFeedback || !isTouchDevice) return;
    
    // Use the Vibration API if available
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, [settings.enableHapticFeedback, isTouchDevice]);

  const value = {
    settings,
    updateSettings,
    triggerHapticFeedback,
    isTouchDevice
  };

  return (
    <TouchGestureContext.Provider value={value}>
      {children}
    </TouchGestureContext.Provider>
  );
};

export const useTouchGesture = () => {
  const context = useContext(TouchGestureContext);
  if (context === undefined) {
    throw new Error('useTouchGesture must be used within a TouchGestureProvider');
  }
  return context;
};