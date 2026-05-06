import { useState, useEffect } from 'react';

interface OfflineUpdate {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

// Add this interface for TypeScript to recognize the sync property
interface SyncManager {
  register(tag: string): Promise<void>;
}

// Extend ServiceWorkerRegistration interface
declare global {
  interface ServiceWorkerRegistration {
    sync: SyncManager;
  }
}

export const useOfflineData = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineUpdates, setOfflineUpdates] = useState<OfflineUpdate[]>([]);
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Load offline updates from IndexedDB
  useEffect(() => {
    const loadOfflineUpdates = async () => {
      try {
        const db = await openIndexedDB();
        const tx = db.transaction('offlineTeacherUpdates', 'readonly');
        const store = tx.objectStore('offlineTeacherUpdates');
        
        // Fix: Convert IDBRequest to a Promise and await its result
        const request = store.getAll();
        const updates = await new Promise<OfflineUpdate[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        setOfflineUpdates(updates);
        
        await tx.oncomplete;
        db.close();
      } catch (error) {
        console.error('Error loading offline updates:', error);
      }
    };
    
    loadOfflineUpdates();
  }, [isOnline]); // Reload when online status changes
  
  // Save an update for offline sync
  const saveForOfflineSync = async (update: Omit<OfflineUpdate, 'id' | 'timestamp'>) => {
    try {
      const db = await openIndexedDB();
      const tx = db.transaction('offlineTeacherUpdates', 'readwrite');
      const store = tx.objectStore('offlineTeacherUpdates');
      
      const newUpdate: OfflineUpdate = {
        ...update,
        timestamp: Date.now(),
      };
      
      await store.add(newUpdate);
      await tx.oncomplete;
      db.close();
      
      // Trigger background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('teacher-update');
      }
      
      // Update local state
      setOfflineUpdates(prev => [...prev, newUpdate]);
      
      return true;
    } catch (error) {
      console.error('Error saving for offline sync:', error);
      return false;
    }
  };
  
  // Helper function to open IndexedDB
  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdmipaediaOfflineDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('offlineTeacherUpdates')) {
          db.createObjectStore('offlineTeacherUpdates', { keyPath: 'id', autoIncrement: true });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };
  
  return {
    isOnline,
    offlineUpdates,
    saveForOfflineSync,
  };
};