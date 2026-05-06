import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { studentNotifications } from './studentMockData';
import { Bell, Check } from 'lucide-react';

type Filter = 'all' | 'unread';

const StudentNotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set(studentNotifications.filter((n) => !n.unread).map((n) => n.id)));

  const items = useMemo(() => {
    const list = studentNotifications.map((n) => ({ ...n, unread: !readIds.has(n.id) }));
    if (filter === 'unread') return list.filter((n) => n.unread);
    return list;
  }, [filter, readIds]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Announcements and updates</p>
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
            {items.map((n) => (
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
                      onClick={() => setReadIds((prev) => new Set([...Array.from(prev), n.id]))}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{n.body}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentNotificationsPage;

