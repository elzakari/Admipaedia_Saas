// IndexedDB utility for offline data storage

const DB_NAME = 'admipaedia-offline-db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  GRADES: 'pending-grades',
  ATTENDANCE: 'pending-attendance',
  EXAMS: 'pending-exams',
  CACHE: 'api-cache'
};

// Open the IndexedDB database
export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const target = event.target as IDBOpenDBRequest | null;
      const db = target?.result;
      if (!db) return;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.GRADES)) {
        db.createObjectStore(STORES.GRADES, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
        db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.EXAMS)) {
        db.createObjectStore(STORES.EXAMS, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'url' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Add an item to a store
export const addItem = async (storeName: string, item: Record<string, unknown>): Promise<IDBValidKey> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Add timestamp for tracking
    const itemWithTimestamp = {
      ...item,
      timestamp: new Date().getTime()
    };

    const request = store.add(itemWithTimestamp);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all items from a store
export const getAllItems = async (storeName: string): Promise<any[]> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as any[]);
    request.onerror = () => reject(request.error);
  });
};

// Delete an item from a store
export const deleteItem = async (storeName: string, id: IDBValidKey): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Clear all items from a store
export const clearStore = async (storeName: string): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Cache API response
export const cacheApiResponse = async (url: string, data: unknown): Promise<boolean> => {
  try {
    await addItem(STORES.CACHE, {
      url,
      data,
      timestamp: new Date().getTime()
    });
    return true;
  } catch (error) {
    console.error('Error caching API response:', error);
    return false;
  }
};

// Get cached API response
export const getCachedApiResponse = async (url: string): Promise<any | null> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHE, 'readonly');
    const store = transaction.objectStore(STORES.CACHE);
    const request = store.get(url);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Queue data for background sync
export const queueDataForSync = async (storeName: string, data: unknown, token: string): Promise<IDBValidKey> => {
  try {
    const id = await addItem(storeName, {
      data,
      token,
      status: 'pending',
      retryCount: 0,
      lastError: null
    });

    console.log(`[Offline] Queued data for sync in ${storeName} with ID: ${id}`);

    // Register for background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;

        let syncTag;
        switch (storeName) {
          case STORES.GRADES:
            syncTag = 'sync-new-grades';
            break;
          case STORES.ATTENDANCE:
            syncTag = 'sync-attendance';
            break;
          case STORES.EXAMS:
            syncTag = 'sync-exams';
            break;
          default:
            syncTag = 'sync-data';
        }

        await registration.sync.register(syncTag);
        console.log(`[Offline] Registered sync tag: ${syncTag}`);
      } catch (syncError) {
        console.warn('[Offline] Background sync registration failed, will retry on next load:', syncError);
      }
    }

    return id;
  } catch (error) {
    console.error(`[Offline] Error queuing data for sync in ${storeName}:`, error);
    throw error;
  }
};

// Get current sync queue status for UI
export const getSyncQueueStatus = async () => {
  try {
    const pendingGrades = await getAllItems(STORES.GRADES);
    const pendingAttendance = await getAllItems(STORES.ATTENDANCE);
    const pendingExams = await getAllItems(STORES.EXAMS);

    return {
      total: pendingGrades.length + pendingAttendance.length + pendingExams.length,
      details: {
        grades: pendingGrades.length,
        attendance: pendingAttendance.length,
        exams: pendingExams.length
      }
    };
  } catch (error) {
    console.error('[Offline] Error getting sync queue status:', error);
    return { total: 0, details: { grades: 0, attendance: 0, exams: 0 } };
  }
};

// Check if there's pending data to sync
export const hasPendingData = async () => {
  try {
    const pendingGrades = await getAllItems(STORES.GRADES);
    const pendingAttendance = await getAllItems(STORES.ATTENDANCE);
    const pendingExams = await getAllItems(STORES.EXAMS);

    return (
      pendingGrades.length > 0 ||
      pendingAttendance.length > 0 ||
      pendingExams.length > 0
    );
  } catch (error) {
    console.error('Error checking pending data:', error);
    return false;
  }
};

// Clean up old cached data (older than specified days)
export const cleanupOldCache = async (maxAgeDays = 7) => {
  try {
    const db = await openDatabase();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTime = new Date().getTime() - maxAgeMs;

    const transaction = db.transaction(STORES.CACHE, 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const index = store.index('timestamp');

    // Get all entries older than the cutoff time
    const range = IDBKeyRange.upperBound(cutoffTime);
    const request = index.openCursor(range);

    return new Promise((resolve) => {
      let deletedCount = 0;

      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

        if (cursor) {
          store.delete(cursor.primaryKey);
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedCount} old cached items`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Error cleaning up cache:', request.error);
        resolve(0);
      };
    });
  } catch (error) {
    console.error('Error in cleanupOldCache:', error);
    return 0;
  }
};
