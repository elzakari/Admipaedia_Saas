import useSWR from 'swr';
import { API_BASE_URL } from '../config/constants';
import dashboardService, { DashboardStatistic, CalendarEvent, Notification } from '../services/dashboardService';

// Custom fetcher that handles errors
const fetcher = async (url: string) => {
  try {
    const tenantId = localStorage.getItem('saas_current_tenant_id');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    
    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export function useStatistics() {
  const { data, error, mutate } = useSWR<DashboardStatistic[]>(
    `${API_BASE_URL}/api/v1/dashboard/statistics`,
    fetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true }
  );

  return {
    statistics: (data as any)?.statistics || data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useCalendarEvents(month?: number, year?: number) {
  const currentDate = new Date();
  const currentMonth = month !== undefined ? month : currentDate.getMonth();
  const currentYear = year !== undefined ? year : currentDate.getFullYear();
  
  const { data, error, mutate } = useSWR<CalendarEvent[]>(
    `${API_BASE_URL}/api/v1/dashboard/events?month=${currentMonth}&year=${currentYear}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  );

  return {
    events: (data as any)?.events || data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useNotifications(limit?: number) {
  const { data, error, mutate } = useSWR<Notification[]>(
    `${API_BASE_URL}/api/v1/dashboard/notifications?limit=${limit || 10}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const markAsRead = async (id: string) => {
    try {
      await dashboardService.markNotificationAsRead(id);
      mutate(
        data?.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        ),
        false
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await dashboardService.markAllNotificationsAsRead();
      mutate(
        data?.map(notification => ({ ...notification, read: true })),
        false
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications: (data as any)?.notifications || data || [],
    isLoading: !error && !data,
    isError: error,
    markAsRead,
    markAllAsRead,
    mutate,
  };
}
