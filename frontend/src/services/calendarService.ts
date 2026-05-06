import { ReactNode } from 'react';
import api from '../lib/api';

export interface CalendarEvent {
  color?: string;
  day?: number;
  startTime?: string;
  endTime?: string;
  id: string;
  title: string;
  date: string;
  type: 'class' | 'exam' | 'meeting' | 'holiday';
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  shared_by?: string;
}

export interface CreateEventParams {
  title: string;
  date: string;
  type: 'class' | 'exam' | 'meeting' | 'holiday';
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  target_roles?: ('admin' | 'teacher' | 'student' | 'parent')[];
  send_notification?: boolean;
}

export interface EventSubscription {
  user_id: number;
  event_types: ('class' | 'exam' | 'meeting' | 'holiday')[];
  notification_methods: ('in-app' | 'email' | 'push')[];
  reminder_time: 'day_before' | 'hour_before' | 'thirty_minutes' | 'fifteen_minutes';
}

export interface EventConflict {
  id: string;
  event_id: string;
  conflict_type: 'time_overlap' | 'resource_conflict' | 'capacity_exceeded';
  description: string;
  suggested_resolution?: string;
}

export interface SyncResult {
  created: { temp_id: string; server_id: string }[];
  updated: CalendarEvent[];
  conflicts: EventConflict[];
  success: boolean;
}

// Helper functions for IndexedDB operations
const dbPromise = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('calendarDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('conflicts')) {
        db.createObjectStore('conflicts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

async function storeEventsInIndexedDB(events: CalendarEvent[], syncToken: string) {
  const db = await dbPromise();
  const tx = db.transaction(['events', 'metadata'], 'readwrite');
  
  // Store each event
  const eventStore = tx.objectStore('events');
  for (const event of events) {
    eventStore.put(event);
  }
  
  // Store the sync token
  const metadataStore = tx.objectStore('metadata');
  metadataStore.put({ key: 'syncToken', value: syncToken });
  
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getEventsFromIndexedDB() {
  const db = await dbPromise();
  const tx = db.transaction(['events', 'metadata'], 'readonly');
  
  // Get all events
  const eventStore = tx.objectStore('events');
  const eventsRequest = eventStore.getAll();
  
  // Get the sync token
  const metadataStore = tx.objectStore('metadata');
  const syncTokenRequest = metadataStore.get('syncToken');
  
  return new Promise<{ events: CalendarEvent[], syncToken: string }>((resolve, reject) => {
    tx.oncomplete = () => {
      const events = eventsRequest.result;
      const syncTokenResult = syncTokenRequest.result;
      resolve({
        events: events || [],
        syncToken: syncTokenResult?.value || ''
      });
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function updateLocalEventsWithServerIds(createdEvents: Array<{ temp_id: string; server_id: string }>) {
  const db = await dbPromise();
  const tx = db.transaction('events', 'readwrite');
  const store = tx.objectStore('events');
  
  for (const { temp_id, server_id } of createdEvents) {
    const eventRequest = store.get(temp_id);
    
    // Properly handle the IDBRequest to get the event
    const event = await new Promise<any>((resolve, reject) => {
      eventRequest.onsuccess = () => resolve(eventRequest.result);
      eventRequest.onerror = () => reject(eventRequest.error);
    });
    
    if (event) {
      // Update the event with the new server ID
      event.id = server_id;
      await store.delete(temp_id);
      await store.put(event);
    }
  }
}

async function storeConflictsInIndexedDB(conflicts: EventConflict[]) {
  const db = await dbPromise();
  const tx = db.transaction('conflicts', 'readwrite');
  const store = tx.objectStore('conflicts');
  
  for (const conflict of conflicts) {
    store.put(conflict);
  }
  
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function queueSyncForLater(events: CalendarEvent[]) {
  const db = await dbPromise();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  
  store.add({
    events,
    timestamp: new Date().toISOString()
  });
  
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const calendarService = {
  // Get calendar events
  getEvents: async (params?: {
    start_date?: string;
    end_date?: string;
    type?: string;
  }): Promise<CalendarEvent[]> => {
    try {
      const response = await api.get('/calendar/events', { params });
      return response.data?.data?.events || response.data?.events || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  },

  // Get shared calendar events
  getSharedEvents: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<CalendarEvent[]> => {
    try {
      const response = await api.get('/calendar/events/shared', { params });
      return response.data?.data?.events || response.data?.events || [];
    } catch (error) {
      console.error('Error fetching shared calendar events:', error);
      throw error;
    }
  },

  // Create a new calendar event
  createEvent: async (eventData: CreateEventParams): Promise<CalendarEvent> => {
    try {
      const response = await api.post('/calendar/events', eventData);
      return response.data?.data?.event || response.data?.event;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  },

  // Update a calendar event
  updateEvent: async (eventId: string, eventData: Partial<CreateEventParams>): Promise<CalendarEvent> => {
    try {
      const response = await api.put(`/calendar/events/${eventId}`, eventData);
      return response.data?.data?.event || response.data?.event;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  },

  // Delete a calendar event
  deleteEvent: async (eventId: string): Promise<boolean> => {
    try {
      await api.delete(`/calendar/events/${eventId}`);
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  },

  // Cache calendar events in localStorage
  cacheCalendarEvents: (events: CalendarEvent[]): void => {
    try {
      localStorage.setItem('cached_calendar_events', JSON.stringify(events));
    } catch (error) {
      console.error('Error caching calendar events:', error);
    }
  },

  // Get cached calendar events from localStorage
  getCachedCalendarEvents: (): CalendarEvent[] => {
    try {
      const cached = localStorage.getItem('cached_calendar_events');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached calendar events:', error);
      return [];
    }
  },

  // Cache shared calendar events in localStorage
  cacheSharedCalendarEvents: (events: CalendarEvent[]): void => {
    try {
      localStorage.setItem('cached_shared_calendar_events', JSON.stringify(events));
    } catch (error) {
      console.error('Error caching shared calendar events:', error);
    }
  },

  // Get cached shared calendar events from localStorage
  getCachedSharedCalendarEvents: (): CalendarEvent[] => {
    try {
      const cached = localStorage.getItem('cached_shared_calendar_events');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached shared calendar events:', error);
      return [];
    }
  },

  // Get events with sync token for offline support
  getEventsWithSyncToken: async (params?: {
    sync_token?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ events: CalendarEvent[], sync_token: string }> => {
    try {
      const response = await api.get('/calendar/events/sync', { params });
      
      // Store events and sync token in IndexedDB
      await storeEventsInIndexedDB(response.data.events, response.data.sync_token);
      
      return {
        events: response.data.events,
        sync_token: response.data.sync_token
      };
    } catch (error) {
      console.error('Error fetching calendar events with sync token:', error);
      // If offline, try to get from IndexedDB
      const cachedData = await getEventsFromIndexedDB();
      return {
        events: cachedData.events,
        sync_token: cachedData.syncToken
      };
    }
  },

  // Sync offline changes with server
  syncOfflineChanges: async (events: CalendarEvent[]): Promise<SyncResult> => {
    try {
      // Try to sync with server
      const response = await api.post('/calendar/events/sync', { events });
      
      // Process sync results
      const { created, updated, conflicts } = response.data;
      
      // Update local database with new server IDs for created events
      if (created && created.length > 0) {
        await updateLocalEventsWithServerIds(created);
      }
      
      // Handle conflicts if any
      if (conflicts && conflicts.length > 0) {
        // Store conflicts for user resolution
        await storeConflictsInIndexedDB(conflicts);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error syncing offline changes:', error);
      // If offline, queue the sync for later
      await queueSyncForLater(events);
      throw error;
    }
  },
  
  // Subscribe to event type notifications
  subscribeToEventType: async (subscription: EventSubscription): Promise<boolean> => {
    try {
      const response = await api.post('/calendar/subscriptions', subscription);
      return response.data.success;
    } catch (error) {
      console.error('Error subscribing to event type:', error);
      throw error;
    }
  },

  // Unsubscribe from event type notifications
  unsubscribeFromEventType: async (user_id: number, event_type: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/calendar/subscriptions/${user_id}/${event_type}`);
      return response.data.success;
    } catch (error) {
      console.error('Error unsubscribing from event type:', error);
      throw error;
    }
  },

  // Get user's event subscriptions
  getUserSubscriptions: async (user_id: number): Promise<EventSubscription> => {
    try {
      const response = await api.get(`/calendar/subscriptions/${user_id}`);
      return response.data.subscription;
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      throw error;
    }
  }
};

export default calendarService;
