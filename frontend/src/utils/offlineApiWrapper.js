import axios from 'axios';
import { addItem, getAllItems, deleteItem } from './offline';
import { toast } from 'react-hot-toast';

// Create an axios instance with offline support
const offlineApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
offlineApi.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check if we're offline
    if (!navigator.onLine) {
      // For GET requests, we'll try to get from cache in the response interceptor
      // For other methods, we need to queue them for later
      if (config.method !== 'get') {
        // Determine the type based on the URL
        let type = 'unknown';
        if (config.url.includes('/grades')) {
          type = 'pending-grades';
        } else if (config.url.includes('/attendance')) {
          type = 'pending-attendance';
        } else if (config.url.includes('/exams')) {
          type = 'pending-exams';
        }
        
        // Queue the request for later
        if (type !== 'unknown') {
          try {
            await addItem(type, {
              url: config.url,
              method: config.method,
              data: config.data,
              token: token
            });
            
            // Notify user
            toast.success('Data saved offline. Will sync when back online.');
            
            // Register for background sync if supported
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
              const registration = await navigator.serviceWorker.ready;
              await registration.sync.register(`sync-${type}`);
            }
            
            // Return a mock response
            return Promise.reject({
              config,
              response: {
                status: 503,
                data: {
                  success: true,
                  message: 'Data saved offline and will be synced when online',
                  offline: true
                }
              }
            });
          } catch (error) {
            console.error('Error saving offline data:', error);
          }
        }
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor
offlineApi.interceptors.response.use(
  (response) => {
    // Cache successful GET responses for offline use
    if (response.config.method === 'get' && response.status === 200) {
      cacheApiResponse(response.config.url, response.data);
    }
    return response;
  },
  async (error) => {
    // Handle offline GET requests
    if (!navigator.onLine && error.config && error.config.method === 'get') {
      try {
        const cachedData = await getCachedApiResponse(error.config.url);
        if (cachedData) {
          return Promise.resolve({
            ...error.response,
            status: 200,
            data: {
              ...cachedData,
              fromCache: true
            }
          });
        }
      } catch (cacheError) {
        console.error('Error retrieving cached data:', cacheError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Cache API response in IndexedDB
export const cacheApiResponse = async (url, data) => {
  try {
    await addItem('api-cache', {
      url,
      data,
      timestamp: new Date().getTime()
    });
  } catch (error) {
    console.error('Error caching API response:', error);
  }
};

// Get cached API response from IndexedDB
export const getCachedApiResponse = async (url) => {
  try {
    const allCachedItems = await getAllItems('api-cache');
    const cachedItem = allCachedItems.find(item => item.url === url);
    return cachedItem ? cachedItem.data : null;
  } catch (error) {
    console.error('Error getting cached API response:', error);
    return null;
  }
};

// Function to check if there are pending offline items
export const hasPendingOfflineItems = async () => {
  try {
    const pendingGrades = await getAllItems('pending-grades');
    const pendingAttendance = await getAllItems('pending-attendance');
    const pendingExams = await getAllItems('pending-exams');
    
    return pendingGrades.length > 0 || pendingAttendance.length > 0 || pendingExams.length > 0;
  } catch (error) {
    console.error('Error checking pending offline items:', error);
    return false;
  }
};

// Function to manually trigger sync
export const triggerSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-new-grades');
      await registration.sync.register('sync-attendance');
      await registration.sync.register('sync-exams');
      return true;
    } catch (error) {
      console.error('Error triggering sync:', error);
      return false;
    }
  } else {
    // Fallback for browsers that don't support background sync
    // Implement manual sync logic here
    return false;
  }
};

export default offlineApi;