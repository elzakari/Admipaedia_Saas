// API configuration
export const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;

// Dashboard configuration
export const DASHBOARD = {
  NOTIFICATION_LIMIT: 10,
  REFRESH_INTERVAL: 30000, // 30 seconds
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// Status options
export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];
export const TEACHER_STATUSES = ['active', 'inactive', 'on_leave'];

// Date formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
