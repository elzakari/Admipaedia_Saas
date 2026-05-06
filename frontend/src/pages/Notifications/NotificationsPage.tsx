import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, CheckCircle, ChevronLeft, Clock, Filter, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedNotifications } from '../../hooks/useEnhancedDashboardData';

type NotificationItem = {
  id: string | number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  time: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
};

const typeMeta: Record<NotificationItem['type'], { icon: any; color: string; label: string }> = {
  info: { icon: Bell, color: 'bg-blue-500', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'bg-amber-500', label: 'Warnings' },
  success: { icon: CheckCircle, color: 'bg-green-500', label: 'Success' },
  error: { icon: AlertTriangle, color: 'bg-red-500', label: 'Errors' },
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications: raw, isLoading, isError, markAsRead, markAllAsRead } = useEnhancedNotifications({ limit: 50 });

  const notifications: NotificationItem[] = useMemo(() => {
    if (!Array.isArray(raw)) return [];
    return raw.map((n: any) => {
      const t: NotificationItem['type'] = (n?.type || 'info') as NotificationItem['type'];
      return {
        id: n?.id,
        type: t,
        title: String(n?.title || 'Notification'),
        description: String(n?.message || ''),
        time: String(n?.time || ''),
        read: Boolean(n?.read),
        priority: t === 'error' || t === 'warning' ? 'high' : 'medium',
      };
    });
  }, [raw]);

  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationItem['type']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notifications.filter((n) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unread' && !n.read) ||
        filter === n.type;

      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [filter, notifications, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const indexOfLastItem = safePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNotifications.slice(indexOfFirstItem, indexOfLastItem);

  const getPriorityBadge = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    setSelectedNotification(n);
    if (!n.read) {
      try {
        await markAsRead(String(n.id));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your alerts and updates</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <button
                onClick={() => markAllAsRead()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </button>
            </div>
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            Failed to load notifications.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center mb-3">
                  <Filter className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Filter</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                      filter === 'all'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                      filter === 'unread'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Unread
                  </button>
                  {(['info', 'warning', 'success', 'error'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilter(t)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                        filter === t
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {typeMeta[t].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading notifications...</div>
              ) : currentItems.length > 0 ? (
                currentItems.map((n) => {
                  const meta = typeMeta[n.type] || typeMeta.info;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={String(n.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedNotification?.id === n.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : n.read
                            ? 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                            : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-start">
                        <div className={`${meta.color} p-2 rounded-full flex-shrink-0`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p
                              className={`text-sm font-medium ${
                                n.read ? 'text-gray-900 dark:text-gray-200' : 'text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {n.title}
                            </p>
                            {!n.read && <span className="h-2 w-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1"></span>}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{n.description}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{n.time}</span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(n.priority)}`}>
                              {n.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No notifications</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No notifications match your search.' : "You're all caught up!"}
                  </p>
                </div>
              )}
            </div>

            {filteredNotifications.length > itemsPerPage && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={safePage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md ${
                    safePage === 1
                      ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={safePage === totalPages}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md ${
                    safePage === totalPages
                      ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Details</h2>
            </div>
            <div className="min-h-[420px]">
              {selectedNotification ? (
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className={`${typeMeta[selectedNotification.type].color} p-2 rounded-full`}>
                        {React.createElement(typeMeta[selectedNotification.type].icon, { className: 'h-5 w-5 text-white' })}
                      </div>
                      <div className="ml-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedNotification.title}</h2>
                        <div className="flex items-center mt-1">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">{selectedNotification.time}</span>
                          <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${getPriorityBadge(selectedNotification.priority)}`}>
                            {selectedNotification.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedNotification(null)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-6">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{selectedNotification.description}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-200">No notification selected</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a notification from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

