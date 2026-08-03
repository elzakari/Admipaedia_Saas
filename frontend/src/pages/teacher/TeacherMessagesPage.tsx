import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MessageSquare, Send, Loader2, Plus, ArrowLeft, Megaphone, Calendar, Info } from 'lucide-react';
import api from '../../lib/api';
import { profileService } from '../../services/profileService';
import announcementService, { Announcement } from '../../services/announcementService';
import communicationService from '../../services/communicationService';

const getOtherParticipantDetails = (message: any, currentUserId: number | null) => {
  const isOutgoing = message.sender_id === currentUserId;
  const participant = isOutgoing ? message.recipient : message.sender;
  const participantType = isOutgoing ? message.recipient_type : message.sender_type;
  const participantId = isOutgoing ? message.recipient_id : message.sender_id;
  const participantName = participant?.display_name
    || participant?.username
    || `${participantType.charAt(0).toUpperCase() + participantType.slice(1)} #${participantId}`;

  return {
    participantId,
    participantType,
    participantName,
  };
};

const parseRecipientOption = (option: any) => {
  const ref = typeof option?.ref === 'string' ? option.ref : '';
  const fallbackValue = option?.id ?? option?.user_id ?? '';
  return {
    key: ref || String(fallbackValue),
    value: ref || String(fallbackValue),
    label: option?.label || 'Unknown recipient',
    subtitle: option?.subtitle || option?.recipient_type || '',
  };
};

const TeacherMessagesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'threads' | 'broadcasts'>('threads');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Compose message state
  const [isComposing, setIsComposing] = useState(false);
  const [composeRecipientId, setComposeRecipientId] = useState('');
  const [composeRecipientType, setComposeRecipientType] = useState<'admin' | 'teacher' | 'student' | 'parent' | 'class'>('student');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [composeSending, setComposeSending] = useState(false);

  // Searchable recipient selector state
  const [recipientOptions, setRecipientOptions] = useState<any[]>([]);
  const [composeSearch, setComposeSearch] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRecipients = async () => {
      if (!isComposing) return;
      setLoadingRecipients(true);
      try {
        const res = await api.get('/messages/recipients', {
          params: {
            type: composeRecipientType,
            search: composeSearch.trim() || undefined
          }
        });
        const list = res.data?.data?.recipients || res.data?.recipients || [];
        if (active) {
          setRecipientOptions(list);
        }
      } catch (err) {
        console.error('Error fetching recipient options:', err);
        if (active) {
          setRecipientOptions([]);
        }
      } finally {
        if (active) {
          setLoadingRecipients(false);
        }
      }
    };

    fetchRecipients();
    return () => {
      active = false;
    };
  }, [composeRecipientType, composeSearch, isComposing]);

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

      // Fetch inbox and sent messages, and announcements
      const [inboxRes, sentRes, annRes] = await Promise.all([
        api.get('/messages', { params: { folder: 'inbox', per_page: 100 } }),
        api.get('/messages', { params: { folder: 'sent', per_page: 100 } }),
        announcementService.getAnnouncements({ per_page: 50 })
      ]);

      const inboxList = inboxRes.data?.data || inboxRes.data?.messages || [];
      const sentList = sentRes.data?.data || sentRes.data?.messages || [];
      
      setMessages([...inboxList, ...sentList]);
      setAnnouncements(annRes.announcements || []);
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
        const other = getOtherParticipantDetails(m, currentUserId);

        compiled[subjectKey] = {
          id: subjectKey,
          subject: m.subject || 'No Subject',
          otherParticipantId: other.participantId,
          otherParticipantType: other.participantType,
          otherParticipantName: other.participantName,
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
          sender: msg.sender_id === currentUserId ? 'You' : (msg.sender?.display_name || t.otherParticipantName),
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
      const newMsg = await communicationService.createMessage({
        recipient_id: active.otherParticipantId,
        recipient_type: active.otherParticipantType,
        subject: active.title,
        content: draft.trim()
      });
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
    const selectedOption = recipientOptions.find((option) => parseRecipientOption(option).value === composeRecipientId);
    const parsedOption = selectedOption ? parseRecipientOption(selectedOption) : null;
    const numericRecipientId = Number(composeRecipientId);

    if (!parsedOption || !composeSubject.trim() || !composeContent.trim() || composeSending) return;
    try {
      setComposeSending(true);
      const newMsg = await communicationService.createMessage({
        recipient_ref: parsedOption.value.includes(':') ? parsedOption.value : undefined,
        recipient_id: Number.isFinite(numericRecipientId) && numericRecipientId > 0 ? numericRecipientId : undefined,
        recipient_type: parsedOption.value.includes(':')
          ? undefined
          : (composeRecipientType === 'class' ? 'class' : composeRecipientType),
        subject: composeSubject.trim(),
        content: composeContent.trim()
      });
      if (newMsg) {
        await loadData();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">Messages & Communications</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Interagissez avec les messages directs et lisez les annonces officielles de l'établissement</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Tabs Navigation */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex-1 sm:flex-none">
            <button
              onClick={() => { setActiveTab('threads'); setIsComposing(false); }}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'threads'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Discussions directes
            </button>
            <button
              onClick={() => { setActiveTab('broadcasts'); setIsComposing(false); }}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'broadcasts'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Annonces
            </button>
          </div>

          {activeTab === 'threads' && (
            <Button onClick={() => setIsComposing(!isComposing)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 w-full sm:w-auto">
              {isComposing ? (
                <>
                  <ArrowLeft className="h-4 w-4" /> Retour
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Nouveau message
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'threads' ? (
        isComposing ? (
          <Card className="max-w-2xl mx-auto hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Rédiger un nouveau message</CardTitle>
              <CardDescription>Envoyez un message à un élève, un parent, un enseignant ou un administrateur</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateNewThread} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rôle du destinataire</label>
                    <select
                      value={composeRecipientType}
                      onChange={(e) => {
                        setComposeRecipientType(e.target.value as any);
                        setComposeRecipientId('');
                        setComposeSearch('');
                      }}
                      className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="student">Élève</option>
                      <option value="parent">Parent</option>
                      <option value="teacher">Enseignant</option>
                      <option value="admin">Administrateur</option>
                      <option value="class">Groupe classe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Destinataire</label>
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={composeSearch}
                          onChange={(e) => setComposeSearch(e.target.value)}
                          placeholder="Rechercher un nom ou un groupe..."
                          className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                        {loadingRecipients && (
                          <div className="absolute right-3 top-3">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          </div>
                        )}
                      </div>
                      <select
                      value={composeRecipientId}
                      onChange={(e) => setComposeRecipientId(e.target.value)}
                        required
                        className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="">Sélectionner un destinataire...</option>
                        {recipientOptions.map((opt) => {
                          const parsed = parseRecipientOption(opt);
                          return (
                          <option key={parsed.key} value={parsed.value}>
                            {parsed.label} ({parsed.subtitle})
                          </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Sujet</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    required
                    placeholder="ex. Classe de 6ème A — Aide aux devoirs"
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Contenu du message</label>
                  <textarea
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                    required
                    rows={5}
                    placeholder="Saisissez votre message ici..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsComposing(false)} className="rounded-xl">Annuler</Button>
                  <Button type="submit" disabled={composeSending} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                    {composeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer le message
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <span className="font-bold">Fil de discussions</span>
                </CardTitle>
                <CardDescription>Sélectionnez une discussion directe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto p-4">
                {threads.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Info className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-medium">Aucune discussion directe démarrée</p>
                  </div>
                ) : (
                  threads.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveId(t.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        t.id === activeId
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{t.title}</div>
                      <div className="text-xs text-slate-500 truncate mt-1">{t.participants}</div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">{active?.title ?? 'Sélectionnez une discussion'}</CardTitle>
                <CardDescription>{active?.participants ?? 'Choisissez une discussion dans le panneau latéral pour afficher l\'historique'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="max-h-[360px] overflow-y-auto space-y-3 p-3 border rounded-xl border-slate-100 dark:border-slate-800 min-h-[240px] bg-slate-50/20 dark:bg-slate-950/20">
                  {active?.messages.length ? active.messages.map((m: any) => (
                    <div
                      key={m.id}
                      className={`rounded-xl p-4 border max-w-[85%] transition-all ${
                        m.sender === 'Vous' || m.sender === 'You'
                          ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/40 ml-auto'
                          : 'border-slate-200 dark:border-slate-700 mr-auto'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.sender === 'You' ? 'Vous' : m.sender}</div>
                        <div className="text-[10px] text-slate-500">{new Date(m.sentAt).toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{m.body}</div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-slate-500 dark:text-slate-400">
                      <MessageSquare className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">Aucune discussion active sélectionnée</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Écrire un message…"
                    disabled={!active || replying}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                    className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-4 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                  />
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-5"
                    onClick={handleSendMessage}
                    disabled={!active || !draft.trim() || replying}
                  >
                    {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Megaphone className="h-5 w-5" />
              </div>
              <span className="font-bold">Annonces officielles</span>
            </CardTitle>
            <CardDescription>Annonces officielles de l'administration pour l'établissement et le corps enseignant</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                  <Info className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-600">Aucune annonce active</p>
                </div>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-950 dark:text-slate-50">{a.title}</h4>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {a.created_at ? new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}</span>
                          {a.author_name && <span>Par : {a.author_name}</span>}
                          {a.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              a.priority === 'urgent' || a.priority === 'high'
                                ? 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {a.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed whitespace-pre-wrap border-t border-slate-100 dark:border-slate-800 pt-3">{a.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherMessagesPage;
