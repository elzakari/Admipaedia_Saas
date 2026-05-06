import { useCallback, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { API_BASE_URL } from '../config/constants';
import dashboardService, { DashboardStatistic, CalendarEvent, Notification } from '../services/dashboardService';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import cacheService from '../services/cacheService';

// Advanced cache configuration
interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate: boolean;
  backgroundRefresh: boolean;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  statistics: {
    key: 'dashboard_statistics',
    ttl: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    backgroundRefresh: true,
  },
  events: {
    key: 'dashboard_events',
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    backgroundRefresh: false,
  },
  notifications: {
    key: 'dashboard_notifications',
    ttl: 30 * 1000, // 30 seconds
    staleWhileRevalidate: true,
    backgroundRefresh: true,
  },
};

// Enhanced fetcher with retry logic and error handling
const createEnhancedFetcher = (retries = 3, delay = 1000) => {
  return async (url: string): Promise<any> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const tenantId = localStorage.getItem('saas_current_tenant_id');
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Cache-Control': 'no-cache',
            ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError!;
  };
};

// Memory cache for frequently accessed data
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 50;

  set(key: string, data: any, ttl: number) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const memoryCache = new MemoryCache();

// Enhanced statistics hook with performance optimizations
export function useEnhancedStatistics(filters?: { startDate?: string | null; endDate?: string | null; category?: string | null }) {
  const config = CACHE_CONFIGS.statistics;
  const fetcher = createEnhancedFetcher();

  const queryParams = new URLSearchParams();
  if (filters?.startDate) queryParams.append('startDate', filters.startDate);
  if (filters?.endDate) queryParams.append('endDate', filters.endDate);
  if (filters?.category) queryParams.append('category', filters.category);

  const queryString = queryParams.toString();
  const cacheKey = `${config?.key || 'statistics'}_${queryString}`;
  const url = `${API_BASE_URL}/api/v1/dashboard/statistics${queryString ? `?${queryString}` : ''}`;

  // Check memory cache first, then persistent cache
  const cachedData = memoryCache.get(cacheKey) || cacheService.get<DashboardStatistic[]>(cacheKey, 'dash_');

  const { data, error, mutate: swrMutate, isValidating } = useSWR<DashboardStatistic[]>(
    url,
    fetcher,
    {
      fallbackData: cachedData || [],
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: config?.backgroundRefresh && config.ttl ? config.ttl : 0,
      dedupingInterval: (config?.ttl || 0) / 2,
      onSuccess: (responseData) => {
        const stats = (responseData as any).statistics || responseData;
        if (config && config.ttl) {
          memoryCache.set(cacheKey, stats, config.ttl);
          cacheService.set(cacheKey, stats, { ttl: config.ttl * 2, namespace: 'dash_' });
        }
      },
    }
  );

  const optimizedMutate = useCallback(async (newData?: DashboardStatistic[]) => {
    if (newData && config?.ttl) {
      memoryCache.set(cacheKey, newData, config.ttl);
    }
    return swrMutate(newData);
  }, [swrMutate, config, cacheKey]); // Removed memoryCache from dependencies

  const refresh = useCallback(() => {
    memoryCache.invalidate(cacheKey);
    return swrMutate();
  }, [cacheKey, swrMutate]);

  return useMemo(() => ({
    statistics: Array.isArray((data as any)?.statistics) 
      ? (data as any).statistics 
      : Array.isArray(data) 
        ? data 
        : [],
    isLoading: !error && !data && !cachedData,
    isError: error,
    isValidating,
    mutate: optimizedMutate,
    refresh,
  }), [data, error, cachedData, isValidating, optimizedMutate, refresh]);
}

// Enhanced calendar events hook with intelligent caching
export function useEnhancedCalendarEvents(options: {
  month?: number;
  year?: number;
  startDate?: string | null;
  endDate?: string | null;
} = {}) {
  const { month, year, startDate, endDate } = options;
  const currentDate = new Date();
  const currentMonth = month !== undefined ? month : currentDate.getMonth();
  const currentYear = year !== undefined ? year : currentDate.getFullYear();

  const config = CACHE_CONFIGS.events;
  const cacheKey = startDate && endDate
    ? `${config?.key || 'events'}_range_${startDate}_${endDate}`
    : `${config?.key || 'events'}_${currentMonth}_${currentYear}`;

  const fetcher = createEnhancedFetcher();

  const url = startDate && endDate
    ? `${API_BASE_URL}/api/v1/dashboard/events?startDate=${startDate}&endDate=${endDate}`
    : `${API_BASE_URL}/api/v1/dashboard/events?month=${currentMonth}&year=${currentYear}`;

  const cachedData = memoryCache.get(cacheKey) || cacheService.get<CalendarEvent[]>(cacheKey, 'dash_');

  const { data, error, mutate: swrMutate, isValidating } = useSWR<CalendarEvent[]>(
    url,
    fetcher,
    {
      fallbackData: cachedData || [],
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: config?.ttl || 0,
      dedupingInterval: (config?.ttl || 0) / 2,
      onSuccess: (responseData) => {
        const events = (responseData as any).events || responseData;
        if (config && config.ttl) {
          memoryCache.set(cacheKey, events, config.ttl);
          cacheService.set(cacheKey, events, { ttl: config.ttl * 2, namespace: 'dash_' });
        }
      },
    }
  );

  // Prefetch adjacent months for better UX
  const prefetchAdjacentMonths = useCallback(() => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    // Prefetch previous month
    mutate(
      `${API_BASE_URL}/api/v1/dashboard/events?month=${prevMonth}&year=${prevYear}`,
      fetcher(`${API_BASE_URL}/api/v1/dashboard/events?month=${prevMonth}&year=${prevYear}`),
      false
    );

    // Prefetch next month
    mutate(
      `${API_BASE_URL}/api/v1/dashboard/events?month=${nextMonth}&year=${nextYear}`,
      fetcher(`${API_BASE_URL}/api/v1/dashboard/events?month=${nextMonth}&year=${nextYear}`),
      false
    );
  }, [currentMonth, currentYear, fetcher]);

  useEffect(() => {
    if (data && !isValidating) {
      // Prefetch adjacent months after current month data is loaded
      const timer = setTimeout(prefetchAdjacentMonths, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [data, isValidating, prefetchAdjacentMonths]);

  return {
    events: (data as any)?.events || data || [],
    isLoading: !error && !data && !cachedData,
    isError: error,
    isValidating,
    mutate: swrMutate,
    prefetchAdjacentMonths,
  };
}

// Enhanced notifications hook with real-time updates
export function useEnhancedNotifications(options: { limit?: number; startDate?: string | null; endDate?: string | null } = {}) {
  const { limit = 10, startDate, endDate } = options;
  const config = CACHE_CONFIGS.notifications;
  const fetcher = createEnhancedFetcher();
  const { performOptimisticUpdate } = useOptimisticUpdates();

  const getCacheKey = useCallback(() => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return `${config?.key || 'notifications'}_${params.toString()}`;
  }, [config?.key, limit, startDate, endDate]);

  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  const url = `${API_BASE_URL}/api/v1/dashboard/notifications?${queryParams.toString()}`;

  const cachedData = memoryCache.get(getCacheKey()) || cacheService.get<Notification[]>(getCacheKey(), 'dash_');

  const { data, error, mutate: swrMutate, isValidating } = useSWR<Notification[]>(
    url,
    fetcher,
    {
      fallbackData: cachedData || [],
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: config?.ttl || 0,
      dedupingInterval: (config?.ttl || 0) / 4,
      onSuccess: (responseData) => {
        const notifications = (responseData as any).notifications || responseData;
        if (config && config.ttl) {
          memoryCache.set(getCacheKey(), notifications, config.ttl);
          cacheService.set(getCacheKey(), notifications, { ttl: config.ttl * 2, namespace: 'dash_' });
        }
      },
    }
  );

  const markAsRead = useCallback(async (id: string) => {
    try {
      await performOptimisticUpdate(
        {
          queryKey: [getCacheKey()],
          updateFn: (oldData: Notification[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(notification =>
              notification.id === id ? { ...notification, read: true } : notification
            );
          },
        },
        {
          type: 'UPDATE',
          entity: 'teacher', // Using 'teacher' as placeholder since notifications aren't in the enum
          entityId: id,
          url: `${API_BASE_URL}/api/v1/dashboard/notifications/${id}/read`,
          method: 'PUT',
        }
      );

      // Update memory cache
      const currentData = memoryCache.get(getCacheKey());
      if (currentData) {
        const updatedData = currentData.map((notification: Notification) =>
          notification.id === id ? { ...notification, read: true } : notification
        );
        if (config && config.ttl) {
          memoryCache.set(getCacheKey(), updatedData, config.ttl);
          cacheService.set(getCacheKey(), updatedData, { ttl: config.ttl * 2, namespace: 'dash_' });
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }, [performOptimisticUpdate, getCacheKey(), config?.ttl]);

  const markAllAsRead = useCallback(async () => {
    try {
      await performOptimisticUpdate(
        {
          queryKey: [getCacheKey()],
          updateFn: (oldData: Notification[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(notification => ({ ...notification, read: true }));
          },
        },
        {
          type: 'UPDATE',
          entity: 'teacher',
          url: `${API_BASE_URL}/api/v1/dashboard/notifications/read-all`,
          method: 'PUT',
        }
      );

      // Update memory cache
      const currentData = memoryCache.get(getCacheKey());
      if (currentData) {
        const updatedData = currentData.map((notification: Notification) =>
          ({ ...notification, read: true })
        );
        if (config && config.ttl) {
          memoryCache.set(getCacheKey(), updatedData, config.ttl);
        }
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }, [performOptimisticUpdate, getCacheKey(), config?.ttl]);

  return {
    notifications: (data as any)?.notifications || data || [],
    isLoading: !error && !data && !cachedData,
    isError: error,
    isValidating,
    markAsRead,
    markAllAsRead,
    mutate: swrMutate,
    unreadCount: useMemo(() => {
      const notifications = (data as any)?.notifications || data || [];
      return Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;
    }, [data]),
  };
}

// Dashboard data aggregator with performance optimizations
export function useEnhancedDashboardData(options: {
  enableStatistics?: boolean;
  enableEvents?: boolean;
  enableNotifications?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  category?: string | null;
  month?: number;
  year?: number;
  notificationLimit?: number;
} = {}) {
  const {
    startDate = null,
    endDate = null,
    category = null,
    enableStatistics = true,
    enableEvents = true,
    enableNotifications = true,
    month,
    year,
    notificationLimit = 10
  } = options;

  const statisticsResult = useEnhancedStatistics({ startDate, endDate, category });

  const eventsOptions: {
    startDate: string | null;
    endDate: string | null;
    month?: number;
    year?: number;
  } = { startDate, endDate };

  if (month !== undefined) eventsOptions.month = month;
  if (year !== undefined) eventsOptions.year = year;

  const eventsResult = useEnhancedCalendarEvents(eventsOptions);
  const notificationsResult = useEnhancedNotifications({
    limit: notificationLimit,
    startDate,
    endDate
  });

  const isLoading = useMemo(() => {
    return (
      (enableStatistics && statisticsResult.isLoading) ||
      (enableEvents && eventsResult.isLoading) ||
      (enableNotifications && notificationsResult.isLoading)
    );
  }, [
    enableStatistics, statisticsResult.isLoading,
    enableEvents, eventsResult.isLoading,
    enableNotifications, notificationsResult.isLoading,
  ]);

  const hasError = useMemo(() => {
    return (
      (enableStatistics && statisticsResult.isError) ||
      (enableEvents && eventsResult.isError) ||
      (enableNotifications && notificationsResult.isError)
    );
  }, [
    enableStatistics, statisticsResult.isError,
    enableEvents, eventsResult.isError,
    enableNotifications, notificationsResult.isError,
  ]);

  const refreshAll = useCallback(async () => {
    const promises = [];

    if (enableStatistics) promises.push(statisticsResult.refresh());
    if (enableEvents) promises.push(eventsResult.mutate());
    if (enableNotifications) promises.push(notificationsResult.mutate());

    await Promise.all(promises);
  }, [
    enableStatistics, statisticsResult.refresh,
    enableEvents, eventsResult.mutate,
    enableNotifications, notificationsResult.mutate,
  ]);

  return useMemo(() => ({
    statistics: enableStatistics ? statisticsResult : null,
    events: enableEvents ? eventsResult : null,
    notifications: enableNotifications ? notificationsResult : null,
    isLoading,
    hasError,
    refreshAll,
    clearCache: () => memoryCache.clear(),
  }), [
    enableStatistics, statisticsResult,
    enableEvents, eventsResult,
    enableNotifications, notificationsResult,
    isLoading, hasError, refreshAll
  ]);
}
