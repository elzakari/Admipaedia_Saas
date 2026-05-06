import React, { createContext, useContext, ReactNode } from 'react';

interface TouchGestureSettings {
  hapticFeedback: boolean;
  swipeThreshold: number;
  longPressDelay: number;
  doubleTapDelay: number;
  enableSwipeGestures: boolean;
  enableLongPress: boolean;
  enableDoubleTap: boolean;
}

interface TouchGestureContextType {
  settings: TouchGestureSettings;
  updateSettings: (newSettings: Partial<TouchGestureSettings>) => void;
  triggerHaptic: (intensity?: number) => void;
}

const defaultSettings: TouchGestureSettings = {
  hapticFeedback: true,
  swipeThreshold: 80,
  longPressDelay: 500,
  doubleTapDelay: 300,
  enableSwipeGestures: true,
  enableLongPress: true,
  enableDoubleTap: true
};

const TouchGestureContext = createContext<TouchGestureContextType | undefined>(undefined);

interface TouchGestureProviderProps {
  children: ReactNode;
  initialSettings?: Partial<TouchGestureSettings>;
}

export const TouchGestureProvider: React.FC<TouchGestureProviderProps> = ({
  children,
  initialSettings = {}
}) => {
  const [settings, setSettings] = React.useState<TouchGestureSettings>({
    ...defaultSettings,
    ...initialSettings
  });

  const updateSettings = React.useCallback((newSettings: Partial<TouchGestureSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const triggerHaptic = React.useCallback((intensity: number = 10) => {
    if (settings.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(intensity);
    }
  }, [settings.hapticFeedback]);

  const value = React.useMemo(() => ({
    settings,
    updateSettings,
    triggerHaptic
  }), [settings, updateSettings, triggerHaptic]);

  return (
    <TouchGestureContext.Provider value={value}>
      {children}
    </TouchGestureContext.Provider>
  );
};

export const useTouchGesture = (): TouchGestureContextType => {
  const context = useContext(TouchGestureContext);
  if (!context) {
    throw new Error('useTouchGesture must be used within a TouchGestureProvider');
  }
  return context;
};