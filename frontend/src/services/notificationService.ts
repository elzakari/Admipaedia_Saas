import api from '../lib/api';
import { PaginatedResponse } from '../types';

export interface NotificationCreate {
  recipient_id: number;
  recipient_type: 'student' | 'parent' | 'teacher' | 'admin';
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  related_to?: string;
  related_id?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'message' | 'announcement';
  category: 'system' | 'academic' | 'administrative' | 'social' | 'security';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sender?: {
    id: number;
    name: string;
    avatar?: string;
    role: string;
  };
  created_at: string;
  read_at?: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: string;
  url?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  this_week: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface NotificationFilters {
  user_id?: number;
  category?: string;
  priority?: string;
  archived?: boolean;
  starred?: boolean;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  categories: Record<string, boolean>;
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

export interface AttendanceNotificationResult {
  notifications_sent: number;
  failed_notifications: number;
  notification_ids: string[];
}

const notificationService = {
  // Get notifications with filtering
  getNotifications: async (filters: NotificationFilters = {}): Promise<PaginatedResponse<NotificationItem>> => {
    try {
      const response = await api.get('/notifications', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  // Get notification statistics
  getNotificationStats: async (userId: number): Promise<NotificationStats> => {
    try {
      const response = await api.get(`/notifications/stats/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
      throw error;
    }
  },

  // Mark notifications as read
  markAsRead: async (notificationIds: string[]): Promise<void> => {
    try {
      await api.patch('/notifications/mark-read', { notification_ids: notificationIds });
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  },

  // Mark notifications as unread
  markAsUnread: async (notificationIds: string[]): Promise<void> => {
    try {
      await api.patch('/notifications/mark-unread', { notification_ids: notificationIds });
    } catch (error) {
      console.error('Failed to mark notifications as unread:', error);
      throw error;
    }
  },

  // Mark notifications as starred
  markAsStarred: async (notificationIds: string[], starred: boolean): Promise<void> => {
    try {
      await api.patch('/notifications/star', { 
        notification_ids: notificationIds,
        starred 
      });
    } catch (error) {
      console.error('Failed to update starred status:', error);
      throw error;
    }
  },

  // Archive notifications
  archiveNotifications: async (notificationIds: string[]): Promise<void> => {
    try {
      await api.patch('/notifications/archive', { notification_ids: notificationIds });
    } catch (error) {
      console.error('Failed to archive notifications:', error);
      throw error;
    }
  },

  // Delete notifications
  deleteNotifications: async (notificationIds: string[]): Promise<void> => {
    try {
      await api.delete('/notifications', { data: { notification_ids: notificationIds } });
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      throw error;
    }
  },

  // Get notification by ID
  getNotificationById: async (notificationId: string): Promise<NotificationItem> => {
    try {
      const response = await api.get(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notification:', error);
      throw error;
    }
  },

  // Create notification
  createNotification: async (notification: Partial<NotificationItem>): Promise<NotificationItem> => {
    try {
      const response = await api.post('/notifications', notification);
      return response.data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  },

  // Update notification preferences
  updatePreferences: async (preferences: NotificationPreferences): Promise<void> => {
    try {
      await api.put('/notifications/preferences', preferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  },

  getPreferences: async (userId: number): Promise<NotificationPreferences> => {
    try {
      const response = await api.get(`/notifications/preferences/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      throw error;
    }
  },

  // Send attendance notifications
  sendAttendanceNotifications: async (classId: number, date: string, absentStudentIds: number[]): Promise<AttendanceNotificationResult> => {
    try {
      const response = await api.post('/notifications/attendance', {
        class_id: classId,
        date,
        absent_student_ids: absentStudentIds
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send attendance notifications:', error);
      throw error;
    }
  }
};

export default notificationService;