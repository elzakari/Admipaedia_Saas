import api from '../lib/api';
import { PaginatedResponse } from '../types';

// Announcement interfaces
export interface Announcement {
  id: number;
  title: string;
  content: string;
  class_id?: number;
  teacher_id?: number | null;
  recipients?: string;
  send_email?: boolean;
  scheduled_date?: string | null;
  is_published?: boolean;

  author_id?: number;
  author_name?: string;
  target_audience?: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  publish_date?: string;
  expiry_date?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
  read_count?: number;
  is_read?: boolean;
}

export interface AnnouncementCreate {
  title: string;
  content: string;
  target_audience: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_published?: boolean;
  publish_date?: string;
  expiry_date?: string;
  attachments?: string[];
}

export interface AnnouncementUpdate {
  title?: string;
  content?: string;
  recipients?: string;
  send_email?: boolean;
  scheduled_date?: string | null;
  is_published?: boolean;
}

export interface AdminAnnouncementCreate {
  title: string;
  content: string;
  class_id: number;
  target_roles: string[];
  send_email?: boolean;
  scheduled_date?: string | null;
  recipients?: string;
}

export interface AnnouncementFilters {
  page?: number;
  per_page?: number;
}

const announcementService = {
  // Get announcements with pagination and filtering
  getAnnouncements: async (filters: AnnouncementFilters = {}): Promise<PaginatedResponse<Announcement>> => {
    try {
      const response = await api.get('/announcements', { params: filters });
      const data = response.data || {};
      const announcements = data.announcements || [];
      const pagination = data.pagination || {
        total: data.total || 0,
        page: data.page || filters.page || 1,
        per_page: data.per_page || filters.per_page || 10,
        pages: data.pages || 1
      };

      return { announcements, pagination } as any;
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  },

  // Get announcement by ID
  getAnnouncementById: async (id: number): Promise<Announcement> => {
    try {
      const response = await api.get(`/announcements/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching announcement ${id}:`, error);
      throw error;
    }
  },

  // Create announcement
  createAnnouncement: async (announcementData: AnnouncementCreate): Promise<Announcement> => {
    try {
      const response = await api.post('/announcements', announcementData);
      return response.data;
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  },

  createGlobalAnnouncement: async (data: AdminAnnouncementCreate): Promise<any> => {
    const response = await api.post('/announcements', data);
    return response.data;
  },

  createClassAnnouncement: async (classId: number, data: Omit<AdminAnnouncementCreate, 'class_id'>): Promise<any> => {
    const response = await api.post('/announcements', { ...data, class_id: classId });
    return response.data;
  },

  // Update announcement
  updateAnnouncement: async (id: number, announcementData: AnnouncementUpdate): Promise<Announcement> => {
    try {
      const response = await api.put(`/announcements/${id}`, announcementData);
      return response.data;
    } catch (error) {
      console.error(`Error updating announcement ${id}:`, error);
      throw error;
    }
  },

  // Delete announcement
  deleteAnnouncement: async (id: number): Promise<void> => {
    try {
      await api.delete(`/announcements/${id}`);
    } catch (error) {
      console.error(`Error deleting announcement ${id}:`, error);
      throw error;
    }
  },

  // Mark announcement as read
  markAsRead: async (id: number): Promise<void> => {
    try {
      await api.post(`/announcements/${id}/read`);
    } catch (error) {
      console.error(`Error marking announcement ${id} as read:`, error);
      throw error;
    }
  },

  // Get user's unread announcements
  getUnreadAnnouncements: async (): Promise<Announcement[]> => {
    try {
      const response = await api.get('/announcements/unread');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread announcements:', error);
      throw error;
    }
  },

  // Publish announcement
  publishAnnouncement: async (id: number): Promise<Announcement> => {
    try {
      const response = await api.post(`/announcements/${id}/publish`);
      return response.data;
    } catch (error) {
      console.error(`Error publishing announcement ${id}:`, error);
      throw error;
    }
  },

  // Unpublish announcement
  unpublishAnnouncement: async (id: number): Promise<Announcement> => {
    try {
      const response = await api.post(`/announcements/${id}/unpublish`);
      return response.data;
    } catch (error) {
      console.error(`Error unpublishing announcement ${id}:`, error);
      throw error;
    }
  },

  // Get announcement statistics
  getAnnouncementStats: async (id: number): Promise<{
    total_recipients: number;
    read_count: number;
    read_percentage: number;
    read_by_audience: Record<string, number>;
  }> => {
    try {
      const response = await api.get(`/announcements/${id}/stats`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching announcement ${id} stats:`, error);
      throw error;
    }
  }
};

export default announcementService;
