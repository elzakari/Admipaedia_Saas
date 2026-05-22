import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Bell, Check, Trash2, CheckSquare } from 'lucide-react';
import { studentService } from '../../services/studentService';

type Filter = 'all' | 'unread';

const StudentNotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await studentService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await studentService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await studentService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await studentService.clearNotificationHistory();
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications', error);
    }
  };

  const items = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications;
  }, [filter, notifications]);

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('notifications.student_title', 'Notifications')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('notifications.student_subtitle', 'Announcements and updates')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} className="rounded-xl">All</Button>
          <Button variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => setFilter('unread')} className="rounded-xl">Unread</Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-indigo-600 dark:text-indigo-400">
          <CheckSquare className="w-4 h-4 mr-2" />
          {t('notifications.mark_all_read', 'Mark all as read')}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-rose-600 dark:text-rose-400">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('notifications.clear_history', 'Clear history')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-indigo-600" /> {t('notifications.inbox', 'Inbox')}</CardTitle>
          <CardDescription>{t('notifications.mark_item_read', 'Mark items as read')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500 py-4">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
              <p>{t('notifications.empty_state', 'You are all caught up!')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <div key={n.id} className={`rounded-lg border p-3 ${!n.read ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatRelativeTime(n.createdAt)} {n.kind ? `• ${n.kind}` : ''}</div>
                    </div>
                    {!n.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 w-8 p-0"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        <Check className="h-4 w-4 text-indigo-600" />
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentNotificationsPage;

