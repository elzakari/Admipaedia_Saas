// Dashboard configuration constants
export const DASHBOARD = {
  // Refresh intervals (in milliseconds)
  STATISTICS_REFRESH_INTERVAL: 60000, // 1 minute
  EVENTS_REFRESH_INTERVAL: 300000,    // 5 minutes
  NOTIFICATIONS_REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Limits
  NOTIFICATION_LIMIT: 10,
  
  // Cache keys
  CACHE_KEYS: {
    STATISTICS: 'dashboard_statistics',
    EVENTS: 'dashboard_events',
    NOTIFICATIONS: 'dashboard_notifications'
  }
};