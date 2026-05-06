import React, { useEffect } from 'react';
import { useEnhancedNotifications } from '../../hooks/useEnhancedDashboardData';
import { DashboardFiltersState } from '../../hooks/useDashboardFilters';
import dashboardService from '../../services/dashboardService';
import { DASHBOARD } from '../../config/constants';

interface NotificationListProps {
  filters?: DashboardFiltersState;
  onRefresh?: () => void;
  className?: string;
}

const NotificationList: React.FC<NotificationListProps> = ({ filters }) => {
  const {
    notifications,
    isLoading,
    isError,
    markAsRead,
    markAllAsRead
  } = useEnhancedNotifications({
    limit: DASHBOARD.NOTIFICATION_LIMIT,
    startDate: filters?.startDate || null,
    endDate: filters?.endDate || null
  });

  // Cache notifications for offline use
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      dashboardService.cacheNotifications(notifications);
    }
  }, [notifications]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4" role="region" aria-label="Notifications center">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <button
          onClick={markAllAsRead}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          disabled={isLoading || (notifications && notifications.length > 0 && notifications.every((n: any) => n.read))}
          aria-label="Mark all notifications as read"
        >
          Mark all as read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-3 rounded-md bg-gray-100">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-red-500 p-4 text-center">
          Failed to load notifications
          <button
            onClick={() => window.location.reload()}
            className="ml-2 text-sm underline"
          >
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-gray-500 p-4 text-center">No notifications</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto" role="list" aria-live="polite">
          {notifications.map((notification: any) => (
            <div
              key={notification.id}
              className={`p-3 rounded-md ${notification.read ? 'opacity-70' : 'bg-blue-50/30'} hover:bg-gray-100 transition-colors duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2`}
              onClick={() => !notification.read && markAsRead(notification.id)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!notification.read) markAsRead(notification.id);
                }
              }}
              aria-label={`${notification.read ? 'Read' : 'Unread'} ${notification.type} notification: ${notification.title}. ${notification.message}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium flex items-center">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${getTypeStyles(notification.type)}`}
                      aria-hidden="true"
                    ></span>
                    {notification.title}
                    {!notification.read && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded" aria-hidden="true">New</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                </div>
                <span className="text-xs text-gray-500">{notification.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-center">
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationList;