// Enhanced Service Worker with better offline sync
const CACHE_NAME = 'admipaedia-v3';
const API_CACHE_NAME = 'admipaedia-api-v3';
const OFFLINE_CACHE_NAME = 'admipaedia-offline-v3';
const SYNC_CACHE_NAME = 'admipaedia-sync-v3';

const IS_DEV_HOST = (
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]'
);

const DEV_PORTS = new Set(['3000', '5173']);
const IS_DEV_RUNTIME = IS_DEV_HOST && DEV_PORTS.has(self.location.port);

// Critical resources to cache
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/assets/images/Admipaedia_Logo.png'
];

// API endpoints to cache for offline access
const CACHEABLE_API_ENDPOINTS = [
  '/api/v1/students',
  '/api/v1/teachers',
  '/api/v1/classes',
  '/api/v1/subjects',
  '/api/v1/attendance',
  '/api/v1/grades',
  '/api/v1/dashboard'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  if (IS_DEV_RUNTIME) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      caches.open(API_CACHE_NAME),
      caches.open(OFFLINE_CACHE_NAME),
      caches.open(SYNC_CACHE_NAME)
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  if (IS_DEV_RUNTIME) {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        await self.clients.claim();
        await self.registration.unregister();
      })()
    );
    return;
  }
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME, OFFLINE_CACHE_NAME, SYNC_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Enhanced fetch handler with intelligent caching
self.addEventListener('fetch', (event) => {
  if (IS_DEV_RUNTIME) {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/v1/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle static resources
  else if (request.destination === 'document' || 
           request.destination === 'script' || 
           request.destination === 'style' ||
           request.destination === 'image') {
    event.respondWith(handleStaticRequest(request));
  }
  // Handle other requests
  else {
    event.respondWith(handleOtherRequest(request));
  }
});

// Handle API requests with cache-first strategy for GET, network-first for others
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cache = await caches.open(API_CACHE_NAME);
  
  // For GET requests, try cache first
  if (request.method === 'GET') {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached response and update in background
      updateCacheInBackground(request, cache);
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (request.method === 'GET' && networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    // Handle offline sync for POST/PUT/DELETE
    if (!networkResponse.ok && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await storeForSync(request);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Request queued for sync when online',
          offline: true 
        }),
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network request failed:', error);
    
    // For GET requests, return cached version if available
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE, store for later sync
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await storeForSync(request);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Request queued for sync when online',
          offline: true 
        }),
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineCache = await caches.open(CACHE_NAME);
      return offlineCache.match('/offline.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Handle static resources with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Static resource fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return cache.match('/offline.html');
    }
    
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Handle other requests
async function handleOtherRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('Service Worker: Other request failed:', error);
    return new Response('Request failed', { status: 503 });
  }
}

// Update cache in background
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.log('Service Worker: Background cache update failed:', error);
  }
}

// Store failed requests for later sync
async function storeForSync(request) {
  const syncCache = await caches.open(SYNC_CACHE_NAME);
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  };
  
  const syncRequest = new Request(`sync-${Date.now()}`, {
    method: 'POST',
    body: JSON.stringify(requestData),
    headers: { 'Content-Type': 'application/json' }
  });
  
  await syncCache.put(syncRequest, new Response(JSON.stringify(requestData)));
  
  // Register background sync if supported
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register('background-sync');
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests when back online
async function syncPendingRequests() {
  const syncCache = await caches.open(SYNC_CACHE_NAME);
  const requests = await syncCache.keys();
  
  for (const request of requests) {
    try {
      const response = await syncCache.match(request);
      const requestData = await response.json();
      
      // Recreate the original request
      const originalRequest = new Request(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      // Attempt to send the request
      const networkResponse = await fetch(originalRequest);
      
      if (networkResponse.ok) {
        // Remove from sync cache on success
        await syncCache.delete(request);
        console.log('Service Worker: Synced request:', requestData.url);
        
        // Notify clients of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              url: requestData.url,
              method: requestData.method
            });
          });
        });
      }
    } catch (error) {
      console.log('Service Worker: Sync failed for request:', error);
    }
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Get cache status
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCacheEntries());
  }
});

// Clean up old cache entries
async function cleanupOldCacheEntries() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  
  const cacheNames = [API_CACHE_NAME, OFFLINE_CACHE_NAME];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader) {
        const cacheDate = new Date(dateHeader).getTime();
        if (now - cacheDate > maxAge) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Enhanced caching strategies for lazy-loaded chunks
const CHUNK_CACHE = 'admipaedia-chunks-v1';
const ROUTE_CACHE = 'admipaedia-routes-v1';

// Cache lazy-loaded chunks with network-first strategy
const cacheChunks = async (request) => {
  const cache = await caches.open(CHUNK_CACHE);
  
  try {
    // Try network first for chunks to get latest versions
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
};

// Enhanced route-based caching
const cacheRouteData = async (request) => {
  const cache = await caches.open(ROUTE_CACHE);
  const url = new URL(request.url);
  
  // Cache API responses for offline access
  if (url.pathname.startsWith('/api/')) {
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Cache successful API responses with timestamp
        const responseData = await networkResponse.clone().json();
        const cachedData = {
          data: responseData,
          timestamp: Date.now(),
          url: request.url
        };
        
        await cache.put(request, new Response(JSON.stringify(cachedData), {
          headers: { 'Content-Type': 'application/json' }
        }));
        
        return networkResponse;
      }
    } catch (error) {
      // Return cached data if available
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        const cachedData = await cachedResponse.json();
        
        // Check if cached data is not too old (24 hours)
        if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
          return new Response(JSON.stringify(cachedData.data), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
  
  return fetch(request);
};

// Enhanced fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.destination === 'script' && url.pathname.includes('chunk')) {
    // Handle lazy-loaded chunks
    event.respondWith(cacheChunks(request));
  } else if (url.pathname.startsWith('/api/')) {
    // Handle API requests with offline support
    event.respondWith(cacheRouteData(request));
  } else if (request.destination === 'document') {
    // Handle navigation requests
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  } else {
    // Handle other static resources
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when connection is restored
const syncOfflineActions = async () => {
  const offlineActions = await getOfflineActions();
  
  for (const action of offlineActions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      // Remove successful action from offline storage
      await removeOfflineAction(action.id);
    } catch (error) {
      console.error('Failed to sync offline action:', error);
    }
  }
};

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_REPORT') {
    // Log performance metrics
    console.log('Performance report:', event.data.metrics);
    
    // Could send to analytics service
    // sendToAnalytics(event.data.metrics);
  }
});

console.log('Service Worker: Enhanced service worker loaded');
