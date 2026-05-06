// Cache names
const CACHE_NAME = 'admipaedia-cache-v1';
const API_CACHE_NAME = 'admipaedia-api-cache-v1';

// Resources to cache on install
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/logo.png'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Helper function to determine if a request is for an API
function isApiRequest(request) {
  return request.url.includes('/api/v1/');
}

// Helper function to determine if we're online
function isOnline() {
  return self.navigator.onLine;
}

// Fetch event - network first for API, cache first for static resources
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle API requests (network first, then cache)
  if (isApiRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();
          
          // Only cache successful responses
          if (response.status === 200) {
            caches.open(API_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                // Add a header to indicate this is from cache
                const headers = new Headers(cachedResponse.headers);
                headers.append('X-Admipaedia-Cache', 'true');
                
                return new Response(cachedResponse.body, {
                  status: cachedResponse.status,
                  statusText: cachedResponse.statusText,
                  headers: headers
                });
              }
              
              // If not in cache, return a generic offline response
              return new Response(JSON.stringify({
                error: 'You are offline and this data is not cached.'
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
  } 
  // Handle static resources (cache first, then network)
  else {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Return cached response if available
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Otherwise fetch from network
          return fetch(event.request)
            .then((response) => {
              // Clone the response to store in cache
              const responseToCache = response.clone();
              
              // Only cache successful responses
              if (response.status === 200) {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              
              return response;
            })
            .catch(() => {
              // If both cache and network fail, return offline page
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('/offline.html');
              }
              
              // For other resources, return a simple error
              return new Response('Offline and resource not cached', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// Background sync for pending operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'teacher-operations') {
    event.waitUntil(syncTeacherOperations());
  }
});

// Function to sync pending teacher operations
async function syncTeacherOperations() {
  try {
    // Open IndexedDB
    const db = await openDatabase();
    const tx = db.transaction('pendingOperations', 'readwrite');
    const store = tx.objectStore('pendingOperations');
    
    // Get all pending operations
    const operations = await store.getAll();
    
    // Process each operation
    for (const operation of operations) {
      try {
        // Attempt to send to server
        const response = await fetch(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body
        });
        
        if (response.ok) {
          // If successful, remove from pending operations
          await store.delete(operation.id);
        }
      } catch (error) {
        console.error('Failed to sync operation:', error);
      }
    }
    
    await tx.complete;
  } catch (error) {
    console.error('Error syncing teacher operations:', error);
  }
}

// Helper function to open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('admipaedia-offline', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingOperations')) {
        // Create the object store with an auto-incrementing key
        db.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}
