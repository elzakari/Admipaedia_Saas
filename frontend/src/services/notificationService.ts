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

type NotificationApiResponse = {
  success?: boolean;
  data?: any[];
  notifications?: any[];
};

const normalizeNotification = (item: any): NotificationItem => ({
  id: String(item.id),
  title: item.title || 'Notification',
  message: item.message || '',
  type: item.type || 'info',
  category: item.category || 'system',
  priority: item.priority || 'medium',
  created_at: item.created_at || item.time || new Date().toISOString(),
  read_at: item.read || item.is_read ? (item.created_at || item.time || new Date().toISOString()) : undefined,
  is_read: Boolean(item.is_read ?? item.read),
  is_starred: Boolean(item.is_starred),
  is_archived: Boolean(item.is_archived),
  actions: item.actions,
  metadata: {
    ...(item.metadata || {}),
    url: item.action_url || item.metadata?.url,
    scope: item.scope || item.metadata?.scope,
    related_entity_type: item.related_entity_type,
    related_entity_id: item.related_entity_id,
    attachments: item.attachments || [],
  },
});

const extractNotifications = (payload: NotificationApiResponse | any): NotificationItem[] => {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.notifications || [];

  return Array.isArray(raw) ? raw.map(normalizeNotification) : [];
};

const buildNotificationStats = (notifications: NotificationItem[]): NotificationStats => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  return notifications.reduce<NotificationStats>((stats, notification) => {
    const createdAt = new Date(notification.created_at);
    stats.total += 1;
    if (!notification.is_read) stats.unread += 1;
    if (createdAt >= startOfToday) stats.today += 1;
    if (createdAt >= weekAgo) stats.this_week += 1;
    stats.by_category[notification.category] = (stats.by_category[notification.category] || 0) + 1;
    stats.by_priority[notification.priority] = (stats.by_priority[notification.priority] || 0) + 1;
    return stats;
  }, {
    total: 0,
    unread: 0,
    today: 0,
    this_week: 0,
    by_category: {},
    by_priority: {},
  });
};

const notificationService = {
  // Get notifications with filtering
  getNotifications: async (filters: NotificationFilters = {}): Promise<NotificationItem[]> => {
    try {
      const response = await api.get('/notifications', { params: filters });
      return extractNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  // Get notification statistics
  getNotificationStats: async (userId: number): Promise<NotificationStats> => {
    try {
      const notifications = await notificationService.getNotifications({ user_id: userId });
      return buildNotificationStats(notifications);
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
    console.warn('markAsUnread is not supported by the current backend notifications API.', notificationIds);
  },

  // Mark notifications as starred
  markAsStarred: async (notificationIds: string[], starred: boolean): Promise<void> => {
    console.warn('markAsStarred is not supported by the current backend notifications API.', { notificationIds, starred });
  },

  // Archive notifications
  archiveNotifications: async (notificationIds: string[]): Promise<void> => {
    console.warn('archiveNotifications is not supported by the current backend notifications API.', notificationIds);
  },

  // Delete notifications
  deleteNotifications: async (notificationIds: string[]): Promise<void> => {
    console.warn('deleteNotifications is not supported by the current backend notifications API.', notificationIds);
  },

  // Get notification by ID
  getNotificationById: async (notificationId: string): Promise<NotificationItem> => {
    try {
      const notifications = await notificationService.getNotifications();
      const notification = notifications.find((item) => item.id === notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      return notification;
    } catch (error) {
      console.error('Failed to fetch notification:', error);
      throw error;
    }
  },

  // Create notification
  createNotification: async (notification: Partial<NotificationItem>): Promise<NotificationItem> => {
    throw new Error('Creating notifications is not supported by the current backend notifications API.');
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
      const response = await api.get('/notifications/preferences', { params: { user_id: userId } });
      return response.data?.data || response.data;
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
