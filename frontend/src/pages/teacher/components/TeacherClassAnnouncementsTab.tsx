import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';

type Announcement = { id: string; title: string; body: string; createdAt: string };
const announcementsKey = (classId: string) => `admipaedia.teacher.announcements.v1.${classId}`;

export function TeacherClassAnnouncementsTab({ cls }: { cls: TeacherClass }) {
  const loadAnnouncements = (): Announcement[] => {
    try {
      const raw = localStorage.getItem(announcementsKey(cls.id));
      if (!raw) return [];
      return JSON.parse(raw) as Announcement[];
    } catch {
      return [];
    }
  };

  const [items, setItems] = useState<Announcement[]>(() => loadAnnouncements());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const add = () => {
    if (!title.trim() || !body.trim()) return;
    const item: Announcement = {
      id: `an-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString().slice(0, 10)
    };
    const next = [item, ...items];
    setItems(next);
    localStorage.setItem(announcementsKey(cls.id), JSON.stringify(next));
    setTitle('');
    setBody('');
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Post announcement</CardTitle>
          <CardDescription>Visible to students in this class</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            className="min-h-[90px] rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900"
          />
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={add}>Post</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>{sorted.length} item(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length ? sorted.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.title}</div>
              <div className="text-xs text-slate-500">{a.createdAt}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{a.body}</div>
            </div>
          )) : (
            <div className="text-sm text-slate-600 dark:text-slate-400">No announcements yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

