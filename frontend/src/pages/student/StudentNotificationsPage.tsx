import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Bell, Check } from 'lucide-react';
import api from '../../lib/api';

type Filter = 'all' | 'unread';

const StudentNotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: async () => {
      const res = await api.get('/dashboard/notifications', { params: { limit: 50 } });
      return res.data?.notifications || [];
    },
    staleTime: 30_000
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/dashboard/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-notifications'] });
    }
  });

  const items = useMemo(() => {
    const list = (data || []).map((n: any) => ({
      id: String(n.id),
      title: n.title,
      body: n.message,
      createdAt: n.time,
      kind: n.type,
      unread: !n.read
    }));
    if (filter === 'unread') return list.filter((n: any) => n.unread);
    return list;
  }, [data, filter]);

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
            {isLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : error ? (
              <div className="text-sm text-slate-600">Failed to load notifications.</div>
            ) : (
              items.map((n: any) => (
                <div key={n.id} className={`rounded-lg border p-3 ${n.unread ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''} • {n.kind}</div>
                    </div>
                    {n.unread ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => markRead.mutate(n.id)}
                        disabled={markRead.isPending}
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

export default StudentNotificationsPage;

