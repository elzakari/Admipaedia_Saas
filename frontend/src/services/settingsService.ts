import { api } from '../lib/api';
import { PaginatedResponse } from '../types';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'teacher' | 'student' | 'parent';
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security' | 'api';
  metadata?: Record<string, any>;
}

export interface AuditLogFilters {
  searchTerm?: string;
  category?: string;
  severity?: string;
  status?: string;
  userRole?: string;
  dateFrom?: string;
  dateTo?: string;
  action?: string;
  resource?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditStats {
  totalLogs: number;
  successRate: number;
  criticalEvents: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  recentFailures: number;
}

export interface FilterOptions {
  categories: string[];
  actions: string[];
  resources: string[];
}

export const settingsService = {
  // Audit Logs
  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> => {
    try {
      const params: Record<string, string | number> = {
        page: filters.page || 1,
        per_page: filters.pageSize || 20,
      };

      const setParam = (key: string, value: string | number | undefined) => {
        if (value === undefined) return;
        if (typeof value === 'string' && (value.trim() === '' || value === 'all')) return;
        params[key] = typeof value === 'string' ? value.trim() : value;
      };

      setParam('search', filters.searchTerm);
      setParam('category', filters.category);
      setParam('severity', filters.severity);
      setParam('status', filters.status);
      setParam('user_role', filters.userRole);
      setParam('date_from', filters.dateFrom);
      setParam('date_to', filters.dateTo);
      setParam('action', filters.action);
      setParam('resource', filters.resource);

      const response = await api.get('/settings/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  getAuditStats: async (filters: AuditLogFilters = {}): Promise<AuditStats> => {
    try {
      const params: Record<string, string> = {};

      const setParam = (key: string, value: string | undefined) => {
        if (!value) return;
        const v = value.trim();
        if (!v || v === 'all') return;
        params[key] = v;
      };

      setParam('date_from', filters.dateFrom);
      setParam('date_to', filters.dateTo);
      setParam('category', filters.category);
      setParam('severity', filters.severity);
      setParam('status', filters.status);
      setParam('user_role', filters.userRole);

      const response = await api.get('/settings/audit-stats', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      throw error;
    }
  },

  getAuditFilterOptions: async (): Promise<FilterOptions> => {
    try {
      const response = await api.get('/settings/audit-filter-options');
      return response.data;
    } catch (error) {
      console.error('Error fetching audit filter options:', error);
      throw error;
    }
  },

  exportAuditLogs: async (filters: AuditLogFilters & { format?: 'csv' | 'excel' } = {}): Promise<Blob> => {
    try {
      const params: Record<string, string> = {
        format: filters.format || 'csv',
      };

      const setParam = (key: string, value: string | undefined) => {
        if (!value) return;
        const v = value.trim();
        if (!v || v === 'all') return;
        params[key] = v;
      };

      setParam('date_from', filters.dateFrom);
      setParam('date_to', filters.dateTo);
      setParam('category', filters.category);
      setParam('severity', filters.severity);
      setParam('status', filters.status);
      setParam('user_role', filters.userRole);
      setParam('action', filters.action);
      setParam('resource', filters.resource);

      const response = await api.get('/settings/audit-logs/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  },

  // General Settings
  getGeneralSettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/general');
      return response.data;
    } catch (error) {
      console.error('Error fetching general settings:', error);
      throw error;
    }
  },

  updateGeneralSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/general', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating general settings:', error);
      throw error;
    }
  },

  // Notification Settings
  getNotificationSettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/notifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      throw error;
    }
  },

  updateNotificationSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/notifications', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  },

  testEmailConfiguration: async (payload: Record<string, any>): Promise<{ success: boolean }> => {
    try {
      const response = await api.post('/settings/notifications/test-email', payload);
      return response.data;
    } catch (error) {
      console.error('Error testing email configuration:', error);
      throw error;
    }
  },

  testSmsConfiguration: async (payload: Record<string, any>): Promise<{ success: boolean }> => {
    try {
      const response = await api.post('/settings/notifications/test-sms', payload);
      return response.data;
    } catch (error) {
      console.error('Error testing SMS configuration:', error);
      throw error;
    }
  },

  // Security Settings
  getSecuritySettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/security');
      return response.data;
    } catch (error) {
      console.error('Error fetching security settings:', error);
      throw error;
    }
  },

  updateSecuritySettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/security', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw error;
    }
  },

  // Backup Settings
  getBackupSettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/backup');
      return response.data;
    } catch (error) {
      console.error('Error fetching backup settings:', error);
      throw error;
    }
  },

  updateBackupSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/backup', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating backup settings:', error);
      throw error;
    }
  },

  getBackupHistory: async (): Promise<any[]> => {
    try {
      const response = await api.get('/settings/backup/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching backup history:', error);
      throw error;
    }
  },

  getBackupSchedule: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/backup/schedule');
      return response.data;
    } catch (error) {
      console.error('Error fetching backup schedule:', error);
      throw error;
    }
  },

  createBackup: async (type: 'manual' | 'automatic'): Promise<Record<string, any>> => {
    try {
      const response = await api.post('/settings/backup/create', { type });
      return response.data;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  },

  restoreBackup: async (backupId: string): Promise<Record<string, any>> => {
    try {
      const response = await api.post(`/settings/backup/restore/${backupId}`);
      return response.data;
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  },

  deleteBackup: async (backupId: string): Promise<Record<string, any>> => {
    try {
      const response = await api.delete(`/settings/backup/${backupId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  },

  // Integration Settings
  getIntegrationSettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/integrations');
      return response.data;
    } catch (error) {
      console.error('Error fetching integration settings:', error);
      throw error;
    }
  },

  updateIntegrationSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/integrations', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating integration settings:', error);
      throw error;
    }
  },

  getIntegrationTests: async (): Promise<any[]> => {
    try {
      const response = await api.get('/settings/integrations/tests');
      return response.data;
    } catch (error) {
      console.error('Error fetching integration tests:', error);
      throw error;
    }
  },

  testIntegration: async (service: string, type: string): Promise<any> => {
    try {
      const response = await api.post('/settings/integrations/test', { service, type });
      return response.data;
    } catch (error) {
      console.error('Error testing integration:', error);
      throw error;
    }
  },

  // Theme Settings
  getThemeSettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/theme');
      return response.data;
    } catch (error) {
      console.error('Error fetching theme settings:', error);
      throw error;
    }
  },

  updateThemeSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/theme', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating theme settings:', error);
      throw error;
    }
  },

  getSchoolSettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/school');
      return response.data;
    } catch (error) {
      console.error('Error fetching school settings:', error);
      throw error;
    }
  },

  updateSchoolSettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/school', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating school settings:', error);
      throw error;
    }
  },

  // AI Settings
  getAISettings: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/ai');
      return response.data;
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      throw error;
    }
  },

  updateAISettings: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/ai', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating AI settings:', error);
      throw error;
    }
  },

  // Academic Configuration
  getAcademicConfiguration: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/settings/academic');
      return response.data;
    } catch (error) {
      console.error('Error fetching academic configuration:', error);
      throw error;
    }
  },

  updateAcademicConfiguration: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    try {
      const response = await api.put('/settings/academic', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating academic configuration:', error);
      throw error;
    }
  },
};

export default settingsService;
