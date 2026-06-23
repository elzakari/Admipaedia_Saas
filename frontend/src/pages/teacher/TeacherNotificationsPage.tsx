import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Bell, Check, Loader2 } from 'lucide-react';
import notificationService from '../../services/notificationService';

type Filter = 'all' | 'unread';

const TeacherNotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getNotifications();
      setNotifications(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead([id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const items = useMemo(() => {
    const list = notifications.map((n) => ({
      id: n.id.toString(),
      title: n.title,
      body: n.message || n.body,
      createdAt: n.created_at ? new Date(n.created_at).toLocaleDateString() : (n.time || ''),
      unread: !(n.read || n.is_read),
      kind: n.type || 'general'
    }));
    if (filter === 'unread') return list.filter((n) => n.unread);
    return list;
  }, [filter, notifications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Teaching updates and announcements</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} className="rounded-xl">All</Button>
          <Button variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => setFilter('unread')} className="rounded-xl">Unread</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-indigo-600" /> Inbox</CardTitle>
          <CardDescription>Mark items as read</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400 border border-dashed rounded-lg border-slate-200 dark:border-slate-800">
                No notifications found
              </div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`rounded-lg border p-3 ${n.unread ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{n.createdAt} • {n.kind}</div>
                    </div>
                    {n.unread ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => handleMarkAsRead(n.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{n.body}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherNotificationsPage;

