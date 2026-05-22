import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MessageSquare, Send } from 'lucide-react';
import { studentService } from '../../services/studentService';

const StudentMessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const [threads, setThreads] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await studentService.getConversations();
      setThreads(data);
      if (data.length > 0 && !activeId) {
        setActiveId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching conversations', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [activeId, threads]);

  const handleSend = async () => {
    if (!active || !draft.trim()) return;
    try {
      await studentService.sendMessage(active.teacher_user_id, draft.trim());
      setDraft('');
      fetchConversations(); // refresh threads
    } catch (error) {
      console.error('Error sending message', error);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('messages.student_title', 'Messages')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('messages.student_subtitle', 'Contact teachers and view replies')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
        <Card className="lg:col-span-1 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-indigo-600" /> {t('messages.threads', 'Threads')}</CardTitle>
            <CardDescription>{t('messages.select_conversation', 'Select a conversation')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1 overflow-y-auto pb-4">
            {loading && threads.length === 0 ? (
              <div className="text-sm text-slate-500">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="text-sm text-slate-500">No conversations.</div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveId(thread.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${thread.id === activeId ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{thread.title}</div>
                    {thread.unread && <span className="w-2 h-2 rounded-full bg-rose-500" title="Unread"></span>}
                  </div>
                  <div className="text-xs text-slate-500">{thread.participants}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col h-full">
          <CardHeader>
            <CardTitle>{active?.title ?? t('messages.select_conversation', 'Select a conversation')}</CardTitle>
            <CardDescription>{active?.participants ?? ''}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
              {active?.messages.map((m: any) => (
                <div key={m.id} className={`rounded-lg p-3 border ${m.sender === 'You' ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.sender}</div>
                    <div className="text-xs text-slate-500">{m.sentAt ? new Date(m.sentAt).toLocaleString() : ''}</div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{m.body}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 shrink-0">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('messages.input_placeholder', 'Type a message...')}
                className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
              />
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSend}
                disabled={!active || !draft.trim()}
              >
                <Send className="h-4 w-4 mr-2 sm:hidden" />
                <span className="hidden sm:inline">{t('messages.send_action', 'Send')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentMessagesPage;

