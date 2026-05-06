import api from '../lib/api';
import cacheService from './cacheService';

export interface DashboardStatistic {
  id: string;
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'success' | 'warning' | 'danger';
  icon?: string;
  description?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'class' | 'exam' | 'meeting' | 'holiday';
  description?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: string | number | Date;
  isRead: boolean;
}

// Dashboard statistics interface
export interface DashboardStats {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_subjects: number;
  attendance_rate: number;
  average_grade: number;
  pending_assignments: number;
  upcoming_exams: number;
  [key: string]: number; // Allow for additional numeric stats
}

// Notification interface
export interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  created_at: string;
  expires_at?: string;
}

// Recent activity interface
export interface RecentActivity {
  id: number;
  type: 'grade_added' | 'attendance_marked' | 'assignment_submitted' | 'exam_scheduled' | 'announcement_posted';
  description: string;
  user_id: number;
  user_name: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Dashboard data interface
export interface DashboardData {
  stats: DashboardStats;
  notifications: DashboardNotification[];
  recent_activities: RecentActivity[];
  quick_actions: {
    id: string;
    title: string;
    description: string;
    icon: string;
    url: string;
    permissions: string[];
  }[];
}

const dashboardService = {
  getDashboardData: async (): Promise<DashboardData> => {
    try {
      const response = await api.get('/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Get dashboard statistics
  getStatistics: async (userRole?: string): Promise<DashboardStatistic[]> => {
    try {
      const response = await api.get('/dashboard/statistics', {
        params: { role: userRole }
      });
      return response?.data?.statistics || [];
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      return [];
    }
  },

  // Get calendar events for dashboard
  getCalendarEvents: async (month?: number, year?: number): Promise<CalendarEvent[]> => {
    try {
      const response = await api.get('/dashboard/events', {
        params: { month, year }
      });
      return response?.data?.events || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  },

  // Get notifications for dashboard
  getNotifications: async (limit?: number): Promise<Notification[]> => {
    try {
      const response = await api.get('/dashboard/notifications', {
        params: { limit }
      });
      return response?.data?.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  markNotificationAsRead: async (id: string): Promise<boolean> => {
    try {
      const response = await api.put(`/dashboard/notifications/${id}/read`);
      return response.data?.success || false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async (): Promise<boolean> => {
    try {
      const res = await api.put('/dashboard/notifications/read-all');
      return res.data?.success || false;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  },

  // Cache methods for offline functionality
  cacheStatistics: (data: DashboardStatistic[]) => {
    cacheService.set('dashboard_statistics', data, { namespace: 'dash_' });
  },

  cacheCalendarEvents: (data: CalendarEvent[]) => {
    cacheService.set('dashboard_calendar_events', data, { namespace: 'dash_' });
  },

  cacheNotifications: (data: Notification[]) => {
    cacheService.set('dashboard_notifications', data, { namespace: 'dash_' });
  }
};

export { dashboardService };
export default dashboardService;
