import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import communicationService, { Message, MessageCreate } from '../../services/communicationService';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Image, 
  File, 
  Smile, 
  Search, 
  Star, 
  Clock, 
  CheckCheck, 
  Check, 
  User, 
  Users, 
  Filter, 
  ChevronDown, 
  MoreVertical, 
  Phone, 
  Video, 
  Info, 
  ArrowLeft, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  Bookmark, 
  X,
  Plus,
  Mic,
  ThumbsUp,
  ThumbsDown,
  PenTool,
  Paperclip as Attachment,
  AtSign,
  Zap
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';

// Define interfaces for conversation objects
interface ConversationGroup {
  participant_id: number;
  participant_name: string;
  participant_type: 'admin' | 'teacher' | 'student' | 'parent';
  participant_avatar?: string;
  last_message: Message;
  unread_count: number;
  is_online?: boolean;
  messages: Message[];
}

// Define interface for attachment objects
interface AttachmentFile {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  file?: File;
}

// AI suggestion templates
const aiSuggestions = [
  "Thank you for reaching out. I'll review this and get back to you soon.",
  "I've noted your concerns and will address them promptly.",
  "Could we schedule a meeting to discuss this in more detail?",
  "I appreciate your feedback and will incorporate it into our plans.",
  "Let me check with the administration and I'll update you."
];

export function MessagesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipientType, setComposeRecipientType] = useState<'admin' | 'teacher' | 'student' | 'parent' | 'class'>('teacher');
  const [composeRecipientId, setComposeRecipientId] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeContent, setComposeContent] = useState<string>('');
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [composeSearch, setComposeSearch] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch messages with React Query
  const {
    data: messagesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['messages', filter, searchQuery],
    queryFn: () => communicationService.getMessages({
      folder: filter,
      page: 1,
      per_page: 50
    }),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time feel
  });

  // Fetch messages for selected conversation
  // Fix the conversation messages query - remove invalid parameters
  const {
    data: conversationMessages,
    isLoading: isLoadingMessages
  } = useQuery({
    queryKey: ['conversation-messages', selectedConversation?.participant_id],
    queryFn: () => {
      if (!selectedConversation) return Promise.resolve([]);
      // Remove participant_id and participant_type - they're not supported
      return communicationService.getMessages({
        folder: filter,
        page: 1,
        per_page: 100
      }).then(data => {
        const list: Message[] = (data as any).messages || (data as any).data || [];
        // Filter messages for the selected conversation on the client side
        const filteredMessages = list.filter(message => {
          const participantId = filter === 'sent' ? message.recipient_id : message.sender_id;
          return participantId === selectedConversation.participant_id;
        });
        return filteredMessages;
      });
    },
    enabled: !!selectedConversation,
  });

  // Update messages when conversation messages change
  useEffect(() => {
    if (conversationMessages) {
      setMessages(conversationMessages);
    }
  }, [conversationMessages]);

  // Group messages into conversations
  const conversations = React.useMemo(() => {
    const list = (messagesData as any)?.messages || (messagesData as any)?.data;
    if (!Array.isArray(list)) return [];
    
    const grouped = list.reduce((acc: any, message: Message) => {
      const participantId = filter === 'sent' ? message.recipient_id : message.sender_id;
      const participantType = filter === 'sent' ? message.recipient_type : message.sender_type;
      
      if (!acc[participantId]) {
        acc[participantId] = {
          participant_id: participantId,
          participant_name: `${participantType} ${participantId}`, // You'll need user service to get names
          participant_type: participantType,
          messages: [],
          unread_count: 0
        };
      }
      
      acc[participantId].messages.push(message);
      if (!message.is_read && filter === 'inbox') {
        acc[participantId].unread_count++;
      }
      
      return acc;
    }, {} as Record<number, any>);
    
    return Object.values(grouped).map((group: any) => ({
      ...group,
      last_message: group.messages[group.messages.length - 1]
    })) as ConversationGroup[];
  }, [(messagesData as any)?.messages, (messagesData as any)?.data, filter]);

  const { data: recipientOptions } = useQuery({
    queryKey: ['message-recipients', composeRecipientType, composeSearch],
    queryFn: async () => {
      if (!composeOpen) return [];
      const q = composeSearch.trim().toLowerCase();
      if (composeRecipientType === 'class') {
        const res = await api.get('/classes', { params: { per_page: 200 } });
        const classes = Array.isArray(res.data?.classes) ? res.data.classes : [];
        return classes
          .map((c: any) => ({ id: c.id, label: c.name || `Class ${c.id}` }))
          .filter((x: any) => !q || x.label.toLowerCase().includes(q));
      }
      if (composeRecipientType === 'student') {
        const res = await api.get('/students', { params: { per_page: 200 } });
        const students = Array.isArray(res.data?.students) ? res.data.students : [];
        return students
          .map((s: any) => ({
            id: s.id,
            label: `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Student ${s.id}`
          }))
          .filter((x: any) => !q || x.label.toLowerCase().includes(q));
      }
      if (composeRecipientType === 'teacher') {
        try {
          const res = await api.get('/teachers', { params: { per_page: 200, search: composeSearch.trim() || undefined } });
          const teachers = Array.isArray(res.data?.teachers) ? res.data.teachers : [];
          return teachers
            .map((t: any) => ({
              id: t.id,
              label: `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Teacher ${t.id}`
            }))
            .filter((x: any) => !q || x.label.toLowerCase().includes(q));
        } catch {
          return [];
        }
      }
      if (composeRecipientType === 'parent') {
        if (user?.role !== 'admin' && user?.role !== 'super_admin') return [];
        try {
          const res = await api.get('/parents', { params: { per_page: 200, search: composeSearch.trim() || undefined } });
          const parents = Array.isArray(res.data?.data?.parents)
            ? res.data.data.parents
            : Array.isArray(res.data?.parents)
              ? res.data.parents
              : [];
          return parents
            .map((p: any) => ({
              id: p.id,
              label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Parent ${p.id}`
            }))
            .filter((x: any) => !q || x.label.toLowerCase().includes(q));
        } catch {
          return [];
        }
      }
      return [];
    },
    enabled: composeOpen
  });

  const recipientList = Array.isArray(recipientOptions) ? recipientOptions : [];
  const selectedRecipientLabel = recipientList.find((r: any) => String(r.id) === String(composeRecipientId))?.label;

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: MessageCreate) => communicationService.createMessage(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      toast.success('Message sent successfully');
      setMessageText('');
      setAttachments([]);
      setShowAiSuggestions(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: number) => communicationService.updateMessage(messageId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const handleSelectConversation = async (conversation: ConversationGroup) => {
    setSelectedConversation(conversation);
    if (filter !== 'inbox') return;
    const unread = (conversation.messages || []).filter((m) => !m.is_read && m.recipient_id === user?.id);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((m) => markAsReadMutation.mutateAsync(m.id)));
    } catch {
      // ignore
    }
  };

  const handleOpenCompose = () => {
    setComposeRecipientType('teacher');
    setComposeRecipientId('');
    setComposeSubject('');
    setComposeContent('');
    setComposeAttachments([]);
    setComposeSearch('');
    setComposeOpen(true);
  };

  useEffect(() => {
    const compose = searchParams.get('compose');
    if (!compose) return;
    const recipient_type = (searchParams.get('recipient_type') || 'teacher') as any;
    const recipient_id = searchParams.get('recipient_id') || '';
    const subject = searchParams.get('subject') || '';

    setComposeRecipientType(recipient_type);
    setComposeRecipientId(recipient_id);
    setComposeSubject(subject);
    setComposeOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('compose');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const sendNewMessageMutation = useMutation({
    mutationFn: async () => {
      const rid = Number(composeRecipientId);
      if (!composeRecipientType || !Number.isFinite(rid) || rid <= 0) {
        throw new Error('Select a valid recipient');
      }
      const content = (composeContent || '').trim();
      if (!content && composeAttachments.length === 0) {
        throw new Error('Message cannot be empty');
      }
      return communicationService.createMessage({
        recipient_id: rid,
        recipient_type: composeRecipientType,
        subject: (composeSubject || '').trim() || 'Message',
        content: composeContent,
        attachments: composeAttachments
      } as any);
    },
    onSuccess: () => {
      toast.success('Message sent');
      setComposeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Failed to send message');
    }
  });

  const onComposeFilesSelected = (files: File[]) => {
    const next = [...composeAttachments, ...files];
    setComposeAttachments(next);
  };

  const removeComposeFile = (name: string) => {
    setComposeAttachments((prev) => prev.filter((f) => f.name !== name));
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (!selectedConversation || (!messageText.trim() && attachments.length === 0)) return;
    
    const messageData: MessageCreate = {
      recipient_id: selectedConversation.participant_id,
      recipient_type: selectedConversation.participant_type,
      subject: 'Chat Message',
      content: messageText,
    };

    // Handle file attachments if any
    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append('recipient_id', selectedConversation.participant_id.toString());
      formData.append('recipient_type', selectedConversation.participant_type);
      formData.append('subject', 'Chat Message');
      formData.append('content', messageText);
      
      attachments.forEach((attachment, index) => {
        if (attachment.file) {
          formData.append(`attachments`, attachment.file);
        }
      });
      
      // Use the file upload version
      sendMessageMutation.mutate(formData as any);
    } else {
      sendMessageMutation.mutate(messageData);
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          conversation.last_message.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      name: file.name,
      type: file.type.split('/')[1] || 'file',
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      url: URL.createObjectURL(file),
      file
    }));
    
    setAttachments([...attachments, ...newAttachments]);
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(attachment => attachment.id !== id));
  };

  // Apply AI suggestion
  const applyAiSuggestion = (suggestion: string) => {
    setMessageText(suggestion);
    setShowAiSuggestions(false);
  };

  // Get message status icon
  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-4 w-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get attachment icon based on file type
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <File className="h-5 w-5 text-red-500" />;
      case 'docx':
      case 'doc':
        return <File className="h-5 w-5 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <File className="h-5 w-5 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-5 w-5 text-purple-500" />;
      default:
        return <Attachment className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('parent_messages.loading', 'Loading messages...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{t('parent_messages.load_failed', 'Failed to load messages')}</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            {t('parent_messages.try_again', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('parent_messages.title', 'Messages')}</h1>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('parent_messages.back_dashboard', 'Back to Dashboard')}
              </button>
              <button
                onClick={handleOpenCompose}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('parent_messages.new_message', 'New Message')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800">
            {/* Search and filter */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 text-sm text-gray-900 dark:text-gray-100"
                  placeholder={t('parent_messages.search', 'Search messages...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('inbox')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                    filter === 'inbox' 
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('parent_messages.inbox', 'Inbox')}
                </button>
                <button
                  onClick={() => setFilter('sent')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                    filter === 'sent' 
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('parent_messages.sent', 'Sent')}
                </button>
                <button
                  onClick={() => setFilter('trash')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                    filter === 'trash' 
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('parent_messages.trash', 'Trash')}
                </button>
              </div>
            </div>
            
            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('parent_messages.no_conversations', 'No conversations found')}</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.participant_id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`p-4 border-b border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 ${
                      selectedConversation?.participant_id === conversation.participant_id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-2 border-r-indigo-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {conversation.participant_avatar ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={conversation.participant_avatar}
                            alt={conversation.participant_name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        {conversation.is_online && (
                          <div className="absolute -mt-2 -ml-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white dark:border-slate-800"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conversation.participant_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatMessageTime(conversation.last_message.created_at)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                          {conversation.participant_type}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                          {conversation.last_message.content}
                        </p>
                        {conversation.unread_count > 0 && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                              {conversation.unread_count} new
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedConversation.participant_avatar ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={selectedConversation.participant_avatar}
                          alt={selectedConversation.participant_name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedConversation.participant_name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {selectedConversation.participant_type}
                          {selectedConversation.is_online && (
                            <span className="ml-2 text-green-500">• Online</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => toast.info('Calling is coming soon')} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Phone className="h-5 w-5" />
                      </button>
                      <button onClick={() => toast.info('Video is coming soon')} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Video className="h-5 w-5" />
                      </button>
                      <button onClick={() => toast.info('Conversation info is coming soon')} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Info className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOutgoing = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isOutgoing
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment, index) => {
                                  const fileExtension =
                                    typeof attachment === 'string'
                                      ? attachment.split('.').pop()?.toLowerCase() || 'file'
                                      : 'file';
                                  const fileName =
                                    typeof attachment === 'string' ? attachment : `attachment-${index}`;

                                  return (
                                    <div key={index} className="flex items-center space-x-2 text-xs">
                                      {getAttachmentIcon(fileExtension)}
                                      <span className="truncate">{fileName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-75">
                                {formatMessageTime(message.created_at)}
                              </span>
                              {isOutgoing ? (
                                <div className="ml-2">
                                  {getMessageStatusIcon(message.is_read ? 'read' : 'delivered')}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message input */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700">
                  {/* Attachments preview */}
                  {attachments.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center space-x-2 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2"
                      >
                        {getAttachmentIcon(attachment.type)}
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-32">
                          {attachment.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                  
                  {/* AI suggestions */}
                  {showAiSuggestions && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          AI Suggestions
                        </span>
                        <button
                          onClick={() => setShowAiSuggestions(false)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => applyAiSuggestion(suggestion)}
                            className="block w-full text-left text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-800/30"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={t('parent_messages.type_message', 'Type your message...')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                      >
                        <Paperclip className="h-5 w-5" />
                      </label>
                      <button
                        onClick={() => setShowAiSuggestions(!showAiSuggestions)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Zap className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending || (!messageText.trim() && attachments.length === 0)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendMessageMutation.isPending ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No conversation selected */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('parent_messages.select_conversation', 'Select a conversation')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('parent_messages.select_desc', 'Choose a conversation from the sidebar to start messaging')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('parent_messages.new_message_dialog', 'New message')}</DialogTitle>
            <DialogDescription>{t('parent_messages.compose_desc', 'Compose and send a new message.')}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="space-y-2">
                <Label>{t('parent_messages.recipient_type', 'Recipient type')}</Label>
                <Select
                  value={composeRecipientType}
                  onValueChange={(v) => {
                    setComposeRecipientType(v as any);
                    setComposeRecipientId('');
                    setComposeSearch('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">{t('parent_messages.recipient_types.teacher', 'Teacher')}</SelectItem>
                    <SelectItem value="student">{t('parent_messages.recipient_types.student', 'Student')}</SelectItem>
                    <SelectItem value="parent">{t('parent_messages.recipient_types.parent', 'Parent')}</SelectItem>
                    <SelectItem value="admin">{t('parent_messages.recipient_types.admin', 'Admin')}</SelectItem>
                    <SelectItem value="class">{t('parent_messages.recipient_types.class', 'Class')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('parent_messages.recipient', 'Recipient')}</Label>
                  {selectedRecipientLabel ? (
                    <Badge variant="secondary" className="max-w-[180px] truncate">{selectedRecipientLabel}</Badge>
                  ) : null}
                </div>

                {recipientList.length > 0 ? (
                  <div className="space-y-2">
                    <Input
                      value={composeSearch}
                      onChange={(e) => setComposeSearch(e.target.value)}
                      placeholder={t('parent_messages.search_recipients', 'Search recipients…')}
                    />
                    <Select value={composeRecipientId} onValueChange={(v) => setComposeRecipientId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('parent_messages.select_recipient', 'Select…')} />
                      </SelectTrigger>
                      <SelectContent>
                        {recipientList.map((r: any) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">{t('parent_messages.not_seeing_hint', 'Not seeing someone? Change type or search by name.')}</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={composeRecipientId}
                      onChange={(e) => setComposeRecipientId(e.target.value)}
                      placeholder={t('parent_messages.recipient_id_placeholder', 'Enter recipient ID')}
                      inputMode="numeric"
                    />
                    <div className="text-xs text-muted-foreground">{t('parent_messages.admin_tip', 'Tip: admins can search users; otherwise use the numeric ID.')}</div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('parent_messages.subject', 'Subject')}</Label>
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder={t('parent_messages.optional', 'Optional')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('parent_messages.attachments', 'Attachments')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="compose-files"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      if (files.length > 0) onComposeFilesSelected(files);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button variant="outline" onClick={() => document.getElementById('compose-files')?.click()}>
                    <Paperclip className="h-4 w-4 mr-2" />
                    {t('parent_messages.add_files', 'Add files')}
                  </Button>
                  <div className="text-xs text-muted-foreground">{composeAttachments.length} selected</div>
                </div>

                {composeAttachments.length > 0 ? (
                  <div className="rounded-lg border p-3 space-y-2">
                    {composeAttachments.map((f) => (
                      <div key={f.name} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{(f.size / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeComposeFile(f.name)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('parent_messages.message_label', 'Message')}</Label>
                <div className="text-xs text-muted-foreground">{t('parent_messages.ctrl_enter', 'Ctrl+Enter to send')}</div>
              </div>
              <Textarea
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                placeholder={t('parent_messages.write_placeholder', 'Write your message…')}
                className="min-h-[260px]"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    sendNewMessageMutation.mutate();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              {t('parent_messages.cancel', 'Cancel')}
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={sendNewMessageMutation.isPending}
              onClick={() => sendNewMessageMutation.mutate()}
            >
              {sendNewMessageMutation.isPending ? t('parent_messages.sending', 'Sending…') : t('parent_messages.send_message', 'Send message')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
