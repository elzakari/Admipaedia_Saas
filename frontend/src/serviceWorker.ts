// This optional code is used to register a service worker.
// register() is not called by default.

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

const OFFLINE_DB_NAME = 'AdmipaediaOfflineDB';
const OFFLINE_DB_VERSION = 3;

export function register(config?: Config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // Ensure PUBLIC_URL is defined before using it
    const publicUrlStr = process.env.PUBLIC_URL || '';
    const publicUrl = new URL(publicUrlStr, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${publicUrlStr}/service-worker.js`;

      registerValidSW(swUrl, config);
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('New content is available and will be used when all tabs for this page are closed.');

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              console.log('Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

// This code would go in your service worker file
const CACHE_NAME = 'admipaedia-teacher-cache-v1';
const API_CACHE_NAME = 'admipaedia-api-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets
];

// Install event - cache static assets
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - network first, then cache for API requests
self.addEventListener('fetch', (event: any) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // For API requests, use network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();
          
          caches.open(API_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(request);
        })
    );
  } else {
    // For non-API requests, use cache first, then network
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          // Don't cache non-GET requests
          if (request.method !== 'GET') return fetchResponse;
          
          // Clone the response to store in cache
          const responseToCache = fetchResponse.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return fetchResponse;
        });
      })
    );
  }
});

// Handle sync events for offline data
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'teacher-update') {
    event.waitUntil(syncTeacherData());
  }
});

// Function to sync offline teacher data
async function syncTeacherData() {
  const db = await openIndexedDB();
  const tx = db.transaction('offlineTeacherUpdates', 'readwrite');
  const store = tx.objectStore('offlineTeacherUpdates');
  
  // Fix: Convert IDBRequest to a Promise and resolve it
  const updates = await new Promise<any[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  for (const update of updates) {
    try {
      const response = await fetch(update.url, {
        method: update.method,
        headers: update.headers,
        body: update.body,
      });
      
      if (response.ok) {
        // If successful, remove from IndexedDB
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = store.delete(update.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }
  
  // Fix: Use proper Promise-based approach for transaction completion
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  
  db.close();
}

// Helper function to open IndexedDB
function openIndexedDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offlineTeacherUpdates')) {
        db.createObjectStore('offlineTeacherUpdates', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('offlineOperations')) {
        const operationStore = db.createObjectStore('offlineOperations', { keyPath: 'id' });
        operationStore.createIndex('entity', 'entity', { unique: false });
        operationStore.createIndex('timestamp', 'timestamp', { unique: false });
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
}
