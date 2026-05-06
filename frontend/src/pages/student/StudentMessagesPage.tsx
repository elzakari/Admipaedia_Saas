import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { studentThreads } from './studentMockData';
import { MessageSquare, Send } from 'lucide-react';

const StudentMessagesPage: React.FC = () => {
  const [activeId, setActiveId] = useState(studentThreads[0]?.id ?? '');
  const active = useMemo(() => studentThreads.find((t) => t.id === activeId) ?? null, [activeId]);
  const [draft, setDraft] = useState('');

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
            <CardDescription>Select a conversation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {studentThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${t.id === activeId ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</div>
                <div className="text-xs text-slate-500">{t.participants}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{active?.title ?? 'Select a thread'}</CardTitle>
            <CardDescription>{active?.participants ?? ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[360px] overflow-auto space-y-2">
              {active?.messages.map((m) => (
                <div key={m.id} className={`rounded-lg p-3 border ${m.sender === 'You' ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.sender}</div>
                    <div className="text-xs text-slate-500">{new Date(m.sentAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{m.body}</div>
                </div>
              ))}
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
                onClick={() => setDraft('')}
                disabled={!active || !draft.trim()}
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

