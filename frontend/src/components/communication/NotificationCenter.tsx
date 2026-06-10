import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Bell, Search, Clock, Trash2, ArrowLeft, Paperclip, Download,
  MessageSquare, Megaphone, AlertTriangle, CheckCircle,
  BookOpen, Calendar, Award, DollarSign, Cpu, History
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { notificationService } from '../../services/notificationService';
import { announcementService } from '../../services/announcementService';
import { toast } from 'sonner';

interface AttachmentItem {
  id: string;
  filename: string;
  size?: number;
  mime_type?: string;
  download_url: string;
}

interface Notification {
  id: string | number;
  title: string;
  message: string;
  type: string;
  priority: string;
  read: boolean;
  is_read: boolean;
  created_at: string;
  time?: string;
  scope?: string;
  related_entity_type?: string;
  related_entity_id?: string | number;
  action_url?: string;
  attachments?: AttachmentItem[];
}

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
  compact?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  maxHeight = 'calc(100vh - 200px)',
  compact = false
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [teacherViewMode, setTeacherViewMode] = useState<'received' | 'sent'>('received');
  
  // Mobile navigation helper
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);

  const isTeacher = user?.role === 'teacher';

  // WebSocket connection for real-time notifications
  const { socket, isConnected } = useWebSocket('/notifications', {
    onConnect: () => {
      socket?.emit('join_notification_room', { user_id: user?.id });
    },
    onMessage: (event, data) => {
      if (event === 'new_notification') {
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        toast.info(data.title || 'New Notification Received');
      }
    }
  });

  // Fetch received notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const response = await notificationService.getNotifications({ user_id: user?.id });
      return response.data || response || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  // Fetch teacher's sent announcements for Delivery History
  const { data: sentAnnouncementsData, isLoading: isLoadingSent } = useQuery({
    queryKey: ['sentAnnouncements', user?.id],
    queryFn: async () => {
      if (!isTeacher) return [];
      const response = await announcementService.getAnnouncements({ page: 1, per_page: 50 });
      // Filter those posted by this teacher
      return response.announcements || [];
    },
    enabled: !!user?.id && isTeacher && teacherViewMode === 'sent'
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await notificationService.markAsRead([String(id)]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await notificationService.deleteNotifications([String(id)]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotif(null);
      setShowDetailOnMobile(false);
      toast.success('Notification deleted');
    }
  });

  const rawNotifications = useMemo(() => {
    if (Array.isArray(notificationsData)) {
      return notificationsData;
    }
    if (notificationsData && Array.isArray((notificationsData as any).data)) {
      return (notificationsData as any).data;
    }
    return [];
  }, [notificationsData]);

  // Dynamic grouping and type resolution logic
  const filterByTab = (notif: Notification, tab: string) => {
    if (tab === 'all') return true;
    if (tab === 'unread') return !notif.read;

    const text = (notif.title + ' ' + notif.message).toLowerCase();
    const entityType = notif.related_entity_type?.toLowerCase() || '';
    const notifType = notif.type?.toLowerCase() || '';

    switch (tab) {
      case 'assignments':
        return entityType === 'assignment' || notifType === 'assignment' || text.includes('assignment') || text.includes('homework') || text.includes('project');
      case 'announcements':
        return entityType === 'announcement' || notifType === 'announcement' || text.includes('announcement');
      case 'messages':
        return entityType === 'message' || notifType === 'message' || text.includes('message') || text.includes('conversation');
      case 'attendance':
        return entityType === 'attendance' || text.includes('attendance') || text.includes('absent') || text.includes('late');
      case 'grades':
        return entityType === 'grade' || text.includes('grade') || text.includes('score') || text.includes('mark') || text.includes('result');
      case 'fees':
        return entityType === 'fee' || text.includes('fee') || text.includes('payment') || text.includes('invoice') || text.includes('billing');
      case 'system':
        return !['assignments', 'announcements', 'messages', 'attendance', 'grades', 'fees'].some(cat => 
          filterByTab(notif, cat)
        );
      default:
        return true;
    }
  };

  const filteredNotifications = useMemo(() => {
    let list = rawNotifications;

    list = list.filter((n: Notification) => filterByTab(n, activeTab));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((n: Notification) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rawNotifications, activeTab, searchQuery]);

  const getCategoryIcon = (notif: Notification) => {
    const text = (notif.title + ' ' + notif.message).toLowerCase();
    const entityType = notif.related_entity_type?.toLowerCase() || '';

    if (entityType === 'assignment' || text.includes('assignment') || text.includes('homework')) {
      return <BookOpen className="w-4 h-4 text-emerald-500" />;
    }
    if (entityType === 'announcement' || text.includes('announcement')) {
      return <Megaphone className="w-4 h-4 text-amber-500" />;
    }
    if (entityType === 'message' || text.includes('message')) {
      return <MessageSquare className="w-4 h-4 text-sky-500" />;
    }
    if (entityType === 'attendance' || text.includes('attendance') || text.includes('absent')) {
      return <Calendar className="w-4 h-4 text-violet-500" />;
    }
    if (entityType === 'grade' || text.includes('grade') || text.includes('score')) {
      return <Award className="w-4 h-4 text-indigo-500" />;
    }
    if (entityType === 'fee' || text.includes('fee') || text.includes('payment')) {
      return <DollarSign className="w-4 h-4 text-rose-500" />;
    }
    return <Cpu className="w-4 h-4 text-slate-500" />;
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || 'normal').toLowerCase();
    if (p === 'urgent') return <Badge variant="destructive" className="capitalize text-2xs">Urgent</Badge>;
    if (p === 'high') return <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-white capitalize text-2xs">High</Badge>;
    return <Badge variant="outline" className="capitalize text-2xs text-slate-600">Normal</Badge>;
  };

  const handleSelectNotification = (notif: Notification) => {
    setSelectedNotif(notif);
    setShowDetailOnMobile(true);
    if (!notif.read) {
      markAsReadMutation.mutate(notif.id);
    }
  };

  const handleDownloadAttachment = (url: string) => {
    window.open(url, '_blank');
  };

  const handleActionClick = (url?: string) => {
    if (url) {
      window.location.href = url;
    }
  };

  const renderFiltersList = () => {
    const filters = [
      { id: 'all', label: 'All' },
      { id: 'unread', label: 'Unread' },
      { id: 'assignments', label: 'Assignments' },
      { id: 'announcements', label: 'Announcements' },
      { id: 'messages', label: 'Messages' },
      { id: 'attendance', label: 'Attendance' },
      { id: 'grades', label: 'Grades' },
      { id: 'fees', label: 'Fees' },
      { id: 'system', label: 'System' }
    ];

    return (
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none px-4">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => {
              setActiveTab(filter.id);
              setSelectedNotif(null);
            }}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === filter.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl overflow-hidden ${className}`} style={{ height: maxHeight }}>
      {/* List Column */}
      <div className={`lg:col-span-2 flex flex-col border-r border-slate-200 dark:border-slate-800 h-full bg-white dark:bg-slate-950 ${showDetailOnMobile ? 'hidden lg:flex' : 'flex'}`}>
        <CardHeader className="py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600 animate-pulse" />
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Notification Hub</CardTitle>
            </div>
            {isTeacher && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setTeacherViewMode('received')}
                  className={`px-2 py-1 rounded-md transition-colors ${teacherViewMode === 'received' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Inbox
                </button>
                <button
                  onClick={() => setTeacherViewMode('sent')}
                  className={`px-2 py-1 rounded-md transition-colors ${teacherViewMode === 'sent' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Sent Activity
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>

        {teacherViewMode === 'received' ? (
          <>
            <div className="py-2 border-b border-slate-100 dark:border-slate-800">
              {renderFiltersList()}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="text-center text-xs text-slate-500 py-6">Loading notifications...</div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8">
                  <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  No notifications match this category.
                </div>
              ) : (
                filteredNotifications.map((notif: Notification) => (
                  <div
                    key={notif.id}
                    onClick={() => handleSelectNotification(notif)}
                    className={`group relative flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/40 ${
                      selectedNotif?.id === notif.id
                        ? 'border-indigo-500 bg-indigo-50/35 dark:bg-indigo-950/10'
                        : notif.read
                        ? 'border-slate-100 bg-white dark:bg-slate-950 dark:border-slate-900'
                        : 'border-blue-200 bg-blue-50/15 dark:border-blue-900/30'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getCategoryIcon(notif)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold truncate ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-3xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {new Date(notif.created_at || notif.time || '').toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {notif.attachments && notif.attachments.length > 0 && (
                            <Paperclip className="w-3 h-3 text-slate-400" />
                          )}
                          {getPriorityBadge(notif.priority)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Teacher Sent Activity / Delivery History view */
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
              <History className="w-4 h-4 text-indigo-500" /> Delivery history for sent announcements
            </div>
            {isLoadingSent ? (
              <div className="text-center text-xs text-slate-500 py-6">Loading sent items...</div>
            ) : sentAnnouncementsData.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">
                No sent activities found. Use the communication tools to send announcements.
              </div>
            ) : (
              sentAnnouncementsData.map((ann: any) => (
                <div
                  key={ann.id}
                  className="p-3.5 border border-slate-100 dark:border-slate-900 rounded-xl bg-white dark:bg-slate-950 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{ann.title}</span>
                    <Badge variant="secondary" className="text-3xs">{ann.recipients || 'Class'}</Badge>
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 line-clamp-2">{ann.content}</p>
                  <div className="flex items-center justify-between text-3xs text-slate-400 pt-1 border-t border-slate-50 dark:border-slate-900">
                    <span>Sent: {new Date(ann.created_at).toLocaleDateString()}</span>
                    <span>Status: Published</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail Column */}
      <div className={`lg:col-span-3 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 ${!showDetailOnMobile ? 'hidden lg:flex' : 'flex'}`}>
        {selectedNotif ? (
          <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Header / Actions bar */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-1.5"
                onClick={() => setShowDetailOnMobile(false)}
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
              <div className="flex-1 min-w-0">
                <span className="text-3xs font-semibold text-slate-400 tracking-wider uppercase block">
                  {selectedNotif.scope ? `${selectedNotif.scope} Category` : 'Notification'}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Received on {new Date(selectedNotif.created_at || selectedNotif.time || '').toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getPriorityBadge(selectedNotif.priority)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNotificationMutation.mutate(selectedNotif.id)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{selectedNotif.title}</h2>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedNotif.message}
              </div>

              {/* Attachments Section */}
              {selectedNotif.attachments && selectedNotif.attachments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Attachments ({selectedNotif.attachments.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedNotif.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate font-medium">{att.filename}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownloadAttachment(att.download_url)}
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {selectedNotif.action_url && (
                <div className="pt-4">
                  <Button
                    onClick={() => handleActionClick(selectedNotif.action_url)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  >
                    View Related Action
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 dark:text-slate-600">
            <Bell className="w-16 h-16 opacity-30 mb-4 stroke-1 animate-pulse" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-400 mb-1">Select a notification</h3>
            <p className="text-xs max-w-xs leading-normal">Choose a notification card from the list to expand and inspect full details, attachments, and actions.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
