import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'teacher' | 'student' | 'class' | 'parent';
  entityId?: string;
  data: any;
  url: string;
  method: string;
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  resolver?: (clientData: any, serverData: any) => any;
}

export const useEnhancedOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const queryClient = useQueryClient();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOperations();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending operations on mount
  useEffect(() => {
    loadPendingOperations();
  }, []);

  // Enhanced IndexedDB operations
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdmipaediaOfflineDB', 2);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('offlineOperations')) {
          const store = db.createObjectStore('offlineOperations', { keyPath: 'id' });
          store.createIndex('entity', 'entity', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' });
          cacheStore.createIndex('entity', 'entity', { unique: false });
          cacheStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  // Load pending operations from IndexedDB
  const loadPendingOperations = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('offlineOperations', 'readonly');
      const store = tx.objectStore('offlineOperations');
      
      const request = store.getAll();
      const operations = await new Promise<OfflineOperation[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      setPendingOperations(operations);
      db.close();
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }, [openDB]);

  // Queue operation for offline sync
  const queueOperation = useCallback(async (
    operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> => {
    const operationWithMeta: OfflineOperation = {
      ...operation,
      id: `${operation.entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      const db = await openDB();
      const tx = db.transaction('offlineOperations', 'readwrite');
      const store = tx.objectStore('offlineOperations');
      
      await store.add(operationWithMeta);
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error);
      });
      
      setPendingOperations(prev => [...prev, operationWithMeta]);
      db.close();
      
      // Try to sync immediately if online
      if (isOnline) {
        syncPendingOperations();
      }
      
      return operationWithMeta.id;
    } catch (error) {
      console.error('Error queuing operation:', error);
      throw error;
    }
  }, [openDB, isOnline]);

  // Sync pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || syncInProgress || pendingOperations.length === 0) {
      return;
    }

    setSyncInProgress(true);
    
    try {
      const db = await openDB();
      const tx = db.transaction('offlineOperations', 'readwrite');
      const store = tx.objectStore('offlineOperations');
      
      const successfulOperations: string[] = [];
      const failedOperations: OfflineOperation[] = [];
      
      for (const operation of pendingOperations) {
        try {
          const response = await fetch(operation.url, {
            method: operation.method,
            headers: operation.headers,
            body: operation.data ? JSON.stringify(operation.data) : undefined,
          });
          
          if (response.ok) {
            // Operation successful, remove from queue
            await store.delete(operation.id);
            successfulOperations.push(operation.id);
            
            // Invalidate related queries - Fixed entity reference
            const entityKey = operation.entity === 'class' ? 'classes' : operation.entity;
            queryClient.invalidateQueries({ 
              queryKey: queryKeys[entityKey as keyof typeof queryKeys].all 
            });
          } else if (response.status >= 400 && response.status < 500) {
            // Client error, don't retry
            await store.delete(operation.id);
            successfulOperations.push(operation.id);
            console.error(`Operation ${operation.id} failed with client error:`, response.status);
          } else {
            // Server error, retry if under limit
            if (operation.retryCount < operation.maxRetries) {
              const updatedOperation = {
                ...operation,
                retryCount: operation.retryCount + 1,
              };
              await store.put(updatedOperation);
              failedOperations.push(updatedOperation);
            } else {
              // Max retries reached, remove from queue
              await store.delete(operation.id);
              successfulOperations.push(operation.id);
              console.error(`Operation ${operation.id} failed after max retries`);
            }
          }
        } catch (error) {
          // Network error, retry if under limit
          if (operation.retryCount < operation.maxRetries) {
            const updatedOperation = {
              ...operation,
              retryCount: operation.retryCount + 1,
            };
            await store.put(updatedOperation);
            failedOperations.push(updatedOperation);
          } else {
            await store.delete(operation.id);
            successfulOperations.push(operation.id);
          }
        }
      }
      
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error);
      });
      
      // Update local state
      setPendingOperations(failedOperations);
      db.close();
      
    } catch (error) {
      console.error('Error syncing operations:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [isOnline, syncInProgress, pendingOperations, openDB, queryClient]);

  // Cache data for offline use
  const cacheData = useCallback(async (
    key: string,
    data: any,
    entity: string,
    ttl: number = 24 * 60 * 60 * 1000 // 24 hours default
  ) => {
    try {
      const db = await openDB();
      const tx = db.transaction('cachedData', 'readwrite');
      const store = tx.objectStore('cachedData');
      
      const cacheEntry = {
        key,
        data,
        entity,
        lastUpdated: Date.now(),
        ttl,
      };
      
      await store.put(cacheEntry);
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error);
      });
      
      db.close();
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }, [openDB]);

  // Get cached data
  const getCachedData = useCallback(async (key: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction('cachedData', 'readonly');
      const store = tx.objectStore('cachedData');
      
      const request = store.get(key);
      const result = await new Promise<any>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      if (result && (Date.now() - result.lastUpdated) < result.ttl) {
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }, [openDB]);

  return {
    isOnline,
    pendingOperations,
    syncInProgress,
    queueOperation,
    syncPendingOperations,
    cacheData,
    getCachedData,
  };
};