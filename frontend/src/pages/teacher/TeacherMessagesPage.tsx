import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MessageSquare, Send, Loader2, Plus, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import { profileService } from '../../services/profileService';

const TeacherMessagesPage: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Compose message state
  const [isComposing, setIsComposing] = useState(false);
  const [composeRecipientId, setComposeRecipientId] = useState('');
  const [composeRecipientType, setComposeRecipientType] = useState<'admin' | 'teacher' | 'student' | 'parent'>('student');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [composeSending, setComposeSending] = useState(false);

  // Active thread selection
  const [activeId, setActiveId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [replying, setReplying] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await profileService.getMe();
      const userId = userRes.user?.id;
      setCurrentUserId(userId);

      // Fetch inbox and sent messages
      const [inboxRes, sentRes] = await Promise.all([
        api.get('/messages', { params: { folder: 'inbox', per_page: 100 } }),
        api.get('/messages', { params: { folder: 'sent', per_page: 100 } })
      ]);

      const inboxList = inboxRes.data?.data || inboxRes.data?.messages || [];
      const sentList = sentRes.data?.data || sentRes.data?.messages || [];
      
      setMessages([...inboxList, ...sentList]);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compile individual messages into threads grouped by subject (case-insensitive, trimmed)
  const threads = useMemo(() => {
    if (!currentUserId) return [];
    
    const compiled: Record<string, any> = {};
    for (const m of messages) {
      const subjectKey = (m.subject || 'No Subject').trim().toLowerCase();
      if (!compiled[subjectKey]) {
        // Determine other participant details
        const isOutgoing = m.sender_id === currentUserId;
        const otherId = isOutgoing ? m.recipient_id : m.sender_id;
        const otherType = isOutgoing ? m.recipient_type : m.sender_type;
        const otherLabel = `${otherType.charAt(0).toUpperCase() + otherType.slice(1)} #${otherId}`;

        compiled[subjectKey] = {
          id: subjectKey,
          subject: m.subject || 'No Subject',
          otherParticipantId: otherId,
          otherParticipantType: otherType,
          otherParticipantName: otherLabel,
          messages: []
        };
      }
      compiled[subjectKey].messages.push(m);
    }

    const sorted = Object.values(compiled).map((t: any) => {
      // Sort messages within the thread ascending (oldest first)
      t.messages.sort((a: any, b: any) => new Date(a.created_at || a.sentAt).getTime() - new Date(b.created_at || b.sentAt).getTime());
      const lastMsg = t.messages[t.messages.length - 1];
      return {
        id: t.id,
        title: t.subject,
        participants: t.otherParticipantName,
        lastMessageAt: lastMsg?.created_at || lastMsg?.sentAt || '',
        otherParticipantId: t.otherParticipantId,
        otherParticipantType: t.otherParticipantType,
        messages: t.messages.map((msg: any) => ({
          id: msg.id.toString(),
          sender: msg.sender_id === currentUserId ? 'You' : t.otherParticipantName,
          body: msg.content,
          sentAt: msg.created_at || msg.sentAt || ''
        }))
      };
    });

    // Sort threads descending (most recent first)
    sorted.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return sorted;
  }, [messages, currentUserId]);

  const active = useMemo(() => {
    return threads.find((t) => t.id === activeId) ?? null;
  }, [threads, activeId]);

  // Set default active thread once threads load
  useEffect(() => {
    if (threads.length > 0 && !activeId) {
      setActiveId(threads[0].id);
    }
  }, [threads, activeId]);

  const handleSendMessage = async () => {
    if (!active || !draft.trim() || replying) return;
    try {
      setReplying(true);
      const res = await api.post('/messages', {
        recipient_id: active.otherParticipantId,
        recipient_type: active.otherParticipantType,
        subject: active.title,
        content: draft.trim()
      });
      const newMsg = res.data?.data || res.data;
      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
        setDraft('');
      }
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setReplying(false);
    }
  };

  const handleCreateNewThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeRecipientId || !composeSubject.trim() || !composeContent.trim() || composeSending) return;
    try {
      setComposeSending(true);
      const res = await api.post('/messages', {
        recipient_id: parseInt(composeRecipientId),
        recipient_type: composeRecipientType,
        subject: composeSubject.trim(),
        content: composeContent.trim()
      });
      const newMsg = res.data?.data || res.data;
      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
        setActiveId(composeSubject.trim().toLowerCase());
        setIsComposing(false);
        setComposeRecipientId('');
        setComposeSubject('');
        setComposeContent('');
      }
    } catch (err) {
      console.error('Failed to send new message:', err);
    } finally {
      setComposeSending(false);
    }
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Messages</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Conversations scoped to your classes</p>
        </div>
        <Button onClick={() => setIsComposing(!isComposing)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
          {isComposing ? (
            <>
              <ArrowLeft className="h-4 w-4" /> Back to Threads
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> New Message
            </>
          )}
        </Button>
      </div>

      {isComposing ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Compose New Message</CardTitle>
            <CardDescription>Send a message to a student, parent, teacher or administrator</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateNewThread} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Recipient Role</label>
                  <select
                    value={composeRecipientType}
                    onChange={(e) => setComposeRecipientType(e.target.value as any)}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Recipient User ID</label>
                  <input
                    type="number"
                    value={composeRecipientId}
                    onChange={(e) => setComposeRecipientId(e.target.value)}
                    required
                    placeholder="Enter ID"
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                  placeholder="e.g. Grade 10-A — Homework Help"
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Message Content</label>
                <textarea
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  required
                  rows={5}
                  placeholder="Type your message here..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsComposing(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={composeSending} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                  {composeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Message
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-indigo-600" /> Threads</CardTitle>
              <CardDescription>Select a conversation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {threads.length === 0 ? (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                  No message threads found
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${t.id === activeId ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{t.title}</div>
                    <div className="text-xs text-slate-500 truncate">{t.participants}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{active?.title ?? 'Select a thread'}</CardTitle>
              <CardDescription>{active?.participants ?? ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[360px] overflow-y-auto space-y-2 p-1 border rounded-lg border-slate-100 dark:border-slate-800 min-h-[200px]">
                {active?.messages.length ? active.messages.map((m: any) => (
                  <div key={m.id} className={`rounded-lg p-3 border ${m.sender === 'You' ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.sender}</div>
                      <div className="text-xs text-slate-500">{new Date(m.sentAt).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap">{m.body}</div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    No active thread selected
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  disabled={!active || replying}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm disabled:opacity-50"
                />
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                  onClick={handleSendMessage}
                  disabled={!active || !draft.trim() || replying}
                >
                  {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeacherMessagesPage;

