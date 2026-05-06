import { useState, useEffect } from 'react';
import { hasPendingData } from '../utils/offline';

const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check for pending items
    const checkPendingItems = async () => {
      try {
        const hasPending = await hasPendingData();
        setHasPendingItems(hasPending);
      } catch (error) {
        console.error('Error checking pending data:', error);
      }
    };
    
    checkPendingItems();
    const interval = setInterval(checkPendingItems, 30000); // Check every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);
  
  const syncOfflineData = async () => {
    if (!navigator.onLine) return;
    
    setIsSyncing(true);
    try {
      // Implement your sync logic here
      // For example: await syncPendingData();
      setHasPendingItems(false);
    } catch (error) {
      console.error('Error syncing offline data:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  return {
    isOnline: !isOffline,
    isOffline,
    hasPendingItems,
    isSyncing,
    syncOfflineData
  };
};

export default useOffline;