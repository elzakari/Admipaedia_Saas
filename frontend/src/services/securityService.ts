import api from '../lib/api';
import { PaginatedResponse } from '../types';

// Security Interfaces
export interface SecuritySettings {
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    expiry_days: number;
  };
  session_settings: {
    timeout_minutes: number;
    max_concurrent_sessions: number;
    require_2fa: boolean;
  };
  access_control: {
    failed_login_attempts: number;
    lockout_duration_minutes: number;
    ip_whitelist: string[];
  };
  audit_settings: {
    log_user_actions: boolean;
    log_system_events: boolean;
    retention_days: number;
  };
}

export interface SecurityEvent {
  id: number;
  event_type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'data_access' | 'system_error';
  user_id?: number;
  username?: string;
  ip_address: string;
  user_agent: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  additional_data?: Record<string, unknown>;
}

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  expiry_days: number;
  history_count: number;
}

export interface SecurityAlert {
  id: number;
  type: 'suspicious_login' | 'multiple_failed_attempts' | 'unusual_activity' | 'system_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  user_id?: number;
  ip_address?: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  actions_taken?: string[];
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id?: number;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

const securityService = {
  // Security Settings
  getSecuritySettings: async (): Promise<SecuritySettings> => {
    const response = await api.get('/security/settings');
    return response.data;
  },

  updateSecuritySettings: async (settings: Partial<SecuritySettings>): Promise<SecuritySettings> => {
    const response = await api.put('/security/settings', settings);
    return response.data;
  },

  // Security Events
  getSecurityEvents: async (filters: {
    page?: number;
    per_page?: number;
    event_type?: string;
    severity?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<PaginatedResponse<SecurityEvent>> => {
    try {
      const response = await api.get('/security/events', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching security events:', error);
      throw error;
    }
  },

  getSecurityEventById: async (id: number): Promise<SecurityEvent> => {
    const response = await api.get(`/security/events/${id}`);
    return response.data;
  },

  // Security Alerts
  getSecurityAlerts: async (filters: {
    type?: string;
    severity?: string;
    status?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<SecurityAlert[]> => {
    const response = await api.get('/security/alerts', { params: filters });
    return response.data;
  },

  acknowledgeAlert: async (alertId: number): Promise<SecurityAlert> => {
    const response = await api.post(`/security/alerts/${alertId}/acknowledge`);
    return response.data;
  },

  resolveAlert: async (alertId: number, resolution: string): Promise<SecurityAlert> => {
    const response = await api.post(`/security/alerts/${alertId}/resolve`, { resolution });
    return response.data;
  },

  // Password Policy
  getPasswordPolicy: async (): Promise<PasswordPolicy> => {
    const response = await api.get('/security/password-policy');
    return response.data;
  },

  updatePasswordPolicy: async (policy: Partial<PasswordPolicy>): Promise<PasswordPolicy> => {
    const response = await api.put('/security/password-policy', policy);
    return response.data;
  },

  validatePassword: async (password: string): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await api.post('/security/validate-password', { password });
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (filters: {
    page?: number;
    per_page?: number;
    user_id?: number;
    action?: string;
    resource_type?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<PaginatedResponse<AuditLog>> => {
    try {
      const response = await api.get('/security/audit-logs', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  exportAuditLogs: async (filters: {
    date_from: string;
    date_to: string;
    format?: 'csv' | 'excel';
  }): Promise<Blob> => {
    const response = await api.get('/security/audit-logs/export', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },

  // Security Monitoring
  getSecurityDashboard: async (): Promise<{
    recent_events: SecurityEvent[];
    active_alerts: SecurityAlert[];
    security_metrics: {
      failed_logins_today: number;
      successful_logins_today: number;
      active_sessions: number;
      security_score: number;
    };
  }> => {
    const response = await api.get('/security/dashboard');
    return response.data;
  },

  // Event Subscription
  subscribeToSecurityEvents: async (callback: (event: SecurityEvent) => void): Promise<() => void> => {
    // Implementation would depend on WebSocket or SSE setup
    // This is a placeholder for the subscription mechanism
    const eventSource = new EventSource('/api/security/events/stream');
    
    eventSource.onmessage = (event) => {
      const securityEvent: SecurityEvent = JSON.parse(event.data);
      callback(securityEvent);
    };

    return () => {
      eventSource.close();
    };
  },

  // IP Management
  addToWhitelist: async (ipAddress: string): Promise<void> => {
    await api.post('/security/whitelist', { ip_address: ipAddress });
  },

  removeFromWhitelist: async (ipAddress: string): Promise<void> => {
    await api.delete(`/security/whitelist/${encodeURIComponent(ipAddress)}`);
  },

  getWhitelist: async (): Promise<string[]> => {
    const response = await api.get('/security/whitelist');
    return response.data;
  },

  // Session Management
  getActiveSessions: async (): Promise<Array<{
    session_id: string;
    user_id: number;
    username: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    last_activity: string;
  }>> => {
    const response = await api.get('/security/sessions');
    return response.data;
  },

  terminateSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/security/sessions/${sessionId}`);
  },

  terminateAllSessions: async (userId: number): Promise<void> => {
    await api.delete(`/security/sessions/user/${userId}`);
  }
};

export default securityService;