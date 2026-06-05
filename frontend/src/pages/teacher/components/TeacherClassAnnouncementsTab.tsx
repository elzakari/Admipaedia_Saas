import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Paperclip, X, Loader2 } from 'lucide-react';
import type { TeacherClass } from '../teacherMockData';
import api from '../../../lib/api';

type Announcement = { id: string; title: string; body: string; createdAt: string; attachments?: string[] };

export function TeacherClassAnnouncementsTab({ cls }: { cls: TeacherClass }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    let active = true;
    async function loadAnnouncements() {
      if (!cls.id) return;
      try {
        setLoading(true);
        const res = await api.get(`/classes/${cls.id}/announcements`);
        const list = res.data?.announcements || res.data?.data || [];
        if (active) {
          setItems(list.map((a: any) => ({
            id: a.id.toString(),
            title: a.title,
            body: a.content || a.message || a.body || '',
            createdAt: (a.created_at || a.time || '').slice(0, 10),
            attachments: a.attachments || []
          })));
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load announcements');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadAnnouncements();
    return () => { active = false; };
  }, [cls.id]);

  const handleFileAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const add = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      const res = await api.post(`/classes/${cls.id}/announcements`, {
        title: title.trim(),
        content: body.trim(),
        recipients: 'all',
        send_email: false,
        is_published: true
      });
      
      if (res.status === 201) {
        const newAnnouncement = res.data?.announcement;
        if (newAnnouncement) {
          const item: Announcement = {
            id: newAnnouncement.id.toString(),
            title: newAnnouncement.title,
            body: newAnnouncement.content || newAnnouncement.message || newAnnouncement.body || '',
            createdAt: (newAnnouncement.created_at || '').slice(0, 10),
            attachments: attachments.map(f => f.name)
          };
          setItems(prev => [item, ...prev]);
        }
        setTitle('');
        setBody('');
        setAttachments([]);
      }
    } catch (err: any) {
      console.error('Failed to post announcement', err);
      alert('Failed to post announcement. ' + (err.response?.data?.message || err.message));
    }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Post Announcement</h2>
        <p className="text-sm text-slate-500">Share updates and reminders with students in this class.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all duration-200 overflow-hidden">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full border-none bg-transparent focus:outline-none focus:ring-0 px-4 py-3 text-sm font-semibold border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
        
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write announcement body..."
          className="w-full border-none bg-transparent focus:outline-none focus:ring-0 px-4 py-3 text-sm min-h-[110px] resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-750">
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1">
            <label className="p-2 text-slate-500 hover:text-violet-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
              <Paperclip className="w-5 h-5" />
              <input type="file" multiple className="hidden" onChange={handleFileAttachmentChange} />
            </label>
          </div>
          <Button 
            className="rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-medium px-5" 
            onClick={add}
          >
            Post
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
          <CardDescription>{sorted.length} item(s) shared</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : error ? (
            <div className="text-sm text-rose-500 py-4">{error}</div>
          ) : sorted.length ? sorted.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
              <div className="flex justify-between items-start">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.title}</div>
                <div className="text-xs text-slate-500">{a.createdAt}</div>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap">{a.body}</div>
              
              {a.attachments && a.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {a.attachments.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 rounded border border-slate-250 dark:border-slate-700">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )) : (
            <div className="text-sm text-slate-600 dark:text-slate-400 py-4">No announcements posted yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

