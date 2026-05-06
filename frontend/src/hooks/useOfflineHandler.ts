import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useOfflineHandler() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success('Connection Restored', {
          description: 'You are back online. Syncing data...',
          duration: 3000
        });
        setWasOffline(false);
        
        // Trigger data sync
        window.dispatchEvent(new CustomEvent('online-sync'));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.warning('Connection Lost', {
        description: 'You are offline. Some features may be limited.',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}