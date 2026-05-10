import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MessageSquare, Send } from 'lucide-react';
import communicationService from '../../services/communicationService';

const StudentMessagesPage: React.FC = () => {
  const qc = useQueryClient();
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', folder],
    queryFn: () => communicationService.getMessages({ folder, page: 1, per_page: 30 }),
    staleTime: 15_000
  });

  const messages = useMemo(() => (data as any)?.messages || [], [data]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = useMemo(() => messages.find((m: any) => Number(m.id) === activeId) ?? null, [activeId, messages]);
  const [draft, setDraft] = useState('');

  const send = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const receiver_type = active.sender_type;
      const receiver_id = active.sender_id;
      await communicationService.sendMessage({
        receiver_type,
        receiver_id,
        subject: active.subject || 'Re:',
        content: draft
      } as any);
    },
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Messages</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Contact teachers and view replies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-indigo-600" /> Threads</CardTitle>
            <CardDescription>Select a message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 pb-2">
              <Button variant={folder === 'inbox' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setFolder('inbox')}>Inbox</Button>
              <Button variant={folder === 'sent' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setFolder('sent')}>Sent</Button>
              <Button variant={folder === 'trash' ? 'default' : 'outline'} className="rounded-xl" onClick={() => setFolder('trash')}>Trash</Button>
            </div>

            {isLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : error ? (
              <div className="text-sm text-slate-600">Failed to load messages.</div>
            ) : !messages.length ? (
              <div className="text-sm text-slate-600">No messages.</div>
            ) : (
              messages.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => setActiveId(Number(m.id))}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${Number(m.id) === activeId ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.subject || '(no subject)'}</div>
                  <div className="text-xs text-slate-500">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{active?.subject ?? 'Select a message'}</CardTitle>
            <CardDescription>{active ? `${active.sender_type || 'sender'} ${active.sender_id ?? ''}`.trim() : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[360px] overflow-auto space-y-2">
              {!active ? (
                <div className="text-sm text-slate-600">Select a message to view.</div>
              ) : (
                <div className="rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{active.sender_type} {active.sender_id}</div>
                    <div className="text-xs text-slate-500">{active.created_at ? new Date(active.created_at).toLocaleString() : ''}</div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap">{active.content}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => send.mutate()}
                disabled={!active || !draft.trim() || send.isPending || folder !== 'inbox'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentMessagesPage;

