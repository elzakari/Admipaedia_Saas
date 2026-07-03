const CACHE_NAME = 'admipaedia-cache-v1';
const DYNAMIC_CACHE = 'admipaedia-dynamic-cache-v1';

const IS_DEV_HOST = (
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]'
);

const DEV_PORTS = new Set(['3000', '5173']);
const IS_DEV_RUNTIME = IS_DEV_HOST && DEV_PORTS.has(self.location.port);

// Resources to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/logo192.png',
  '/logo512.png'
];

// API routes to cache
const API_ROUTES = [
  '/api/v1/academics/grading-scheme',
  '/api/v1/dashboard/statistics',
  '/api/v1/dashboard/notifications',
  '/api/v1/dashboard/events'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');

  if (IS_DEV_RUNTIME) {
    self.skipWaiting();
    return;
  }

  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching App Shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');

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

  // Claim clients to ensure the service worker takes control immediately
  event.waitUntil(self.clients.claim());

  // Remove old caches
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );

  return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  if (IS_DEV_RUNTIME) {
    return;
  }

  const url = new URL(event.request.url);

  // Handle API requests
  if (event.request.url.includes('/api/')) {
    // For API requests, try network first, then cache
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // For static assets, use cache first strategy
  event.respondWith(cacheFirstStrategy(event.request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache valid responses in the dynamic cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // If both cache and network fail, return a fallback for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }

    // For other resources, we can't provide a fallback
    throw error;
  }
}

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse && networkResponse.status === 200) {
      // Only cache GET requests
      if (request.method === 'GET') {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    // If network fails, try to get from cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If the API is in our predefined list, return a fallback
    if (API_ROUTES.some(route => request.url.includes(route))) {
      return new Response(
        JSON.stringify({
          offline: true,
          message: 'You are offline. This is cached data.'
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Otherwise, propagate the error
    throw error;
  }
}

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Syncing', event.tag);

  if (event.tag === 'sync-new-grades') {
    event.waitUntil(syncGrades());
  } else if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  } else if (event.tag === 'sync-exams') {
    event.waitUntil(syncExams());
  }
});

// Sync functions for different data types
async function syncGrades() {
  try {
    const db = await openIndexedDB();
    const pendingGrades = await getAllPendingItems(db, 'pending-grades');

    for (const grade of pendingGrades) {
      try {
        const response = await fetch('/api/v1/grades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${grade.token}`
          },
          body: JSON.stringify(grade.data)
        });

        if (response.ok) {
          // Remove from IndexedDB if successfully synced
          await deleteItem(db, 'pending-grades', grade.id);
        }
      } catch (error) {
        console.error('Error syncing grade:', error);
      }
    }
  } catch (error) {
    console.error('Error in syncGrades:', error);
  }
}

async function syncAttendance() {
  try {
    const db = await openIndexedDB();
    const pendingAttendance = await getAllPendingItems(db, 'pending-attendance');

    for (const record of pendingAttendance) {
      try {
        const isBulkAttendance = Array.isArray(record?.data?.attendances) || Array.isArray(record?.data?.attendance_records);
        const response = await fetch(isBulkAttendance ? '/api/v1/attendances/bulk' : '/api/v1/attendances', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${record.token}`
          },
          body: JSON.stringify(record.data)
        });

        if (response.ok) {
          await deleteItem(db, 'pending-attendance', record.id);
          console.log(`[Service Worker] Successfully synced attendance record: ${record.id}`);
        }
      } catch (error) {
        console.error('[Service Worker] Error syncing attendance:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error in syncAttendance:', error);
  }
}

async function syncExams() {
  try {
    const db = await openIndexedDB();
    const pendingExams = await getAllPendingItems(db, 'pending-exams');

    for (const exam of pendingExams) {
      try {
        // Exams might be bulk grade updates or exam creation
        // We'll use the endpoint specified in the record data if available, or default to grades/bulk
        const endpoint = exam.endpoint || '/api/v1/grades/bulk';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${exam.token}`
          },
          body: JSON.stringify(exam.data)
        });

        if (response.ok) {
          await deleteItem(db, 'pending-exams', exam.id);
          console.log(`[Service Worker] Successfully synced exam data: ${exam.id}`);
        }
      } catch (error) {
        console.error('[Service Worker] Error syncing exam data:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error in syncExams:', error);
  }
}

// IndexedDB helper functions
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('admipaedia-offline-db', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('pending-grades')) {
        db.createObjectStore('pending-grades', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('pending-attendance')) {
        db.createObjectStore('pending-attendance', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('pending-exams')) {
        db.createObjectStore('pending-exams', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function getAllPendingItems(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteItem(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Notification received', event);

  let data = { title: 'New Notification', body: 'Something new happened!' };

  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const url = notification.data.url;

  notification.close();

  // Open the app and navigate to the specified URL
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }

      // If no window/tab is open or URL doesn't match, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
