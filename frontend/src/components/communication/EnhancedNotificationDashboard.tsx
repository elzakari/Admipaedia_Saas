import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Bell, BellRing, Search, Filter, Settings, 
  MessageSquare, Megaphone, AlertTriangle, 
  CheckCircle, Clock,
  Volume2, VolumeX,
  Calendar, Users, BookOpen, DollarSign,
  TrendingUp, Activity, Zap, Shield
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import notificationService from '../../services/notificationService';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'message' | 'announcement';
  category: 'system' | 'academic' | 'administrative' | 'social' | 'security';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sender?: {
    id: number;
    name: string;
    avatar?: string;
    role: string;
  };
  created_at: string;
  read_at?: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: string;
  url?: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  this_week: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

interface EnhancedNotificationDashboardProps {
  className?: string;
  maxHeight?: string;
  showStats?: boolean;
  enableRealTime?: boolean;
}

import { useWebSocket } from '../../services/websocketService';

export const EnhancedNotificationDashboard: React.FC<EnhancedNotificationDashboardProps> = ({
  className = '',
  maxHeight = '800px',
  showStats = true,
  enableRealTime = true
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // WebSocket connection for real-time notifications
  const { isConnected } = useWebSocket('/notifications', {
    enabled: enableRealTime,
    onMessage: (event: string, data: any) => {
      switch (event) {
        case 'new_notification':
        case 'notification_created':
          handleNewNotification(data);
          break;
        case 'notification_updated':
          handleNotificationUpdate(data);
          break;
        case 'bulk_notification':
          handleBulkNotification(data);
          break;
      }
    }
  });

  // Fetch notifications with advanced filtering
  const { data: notificationsData, isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getNotifications({
      user_id: user?.id,
    }),
    enabled: !!user?.id,
    refetchInterval: enableRealTime ? 30000 : 60000,
    staleTime: 10000
  });

  // Fetch notification statistics
  const { data: statsData } = useQuery({
    queryKey: ['notification-stats', user?.id],
    queryFn: () => notificationService.getNotificationStats(user?.id || 0),
    enabled: !!user?.id && showStats,
    refetchInterval: 60000
  });

  // Mutations for notification actions
  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: string[]) => notificationService.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    }
  });

  // Handle new notification from WebSocket
  const handleNewNotification = (notification: NotificationItem) => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Play sound if enabled
    if (soundEnabled && notification.priority === 'urgent') {
      playNotificationSound();
    }

    // Show toast notification
    toast(notification.title, {
      description: notification.message,
      action: {
        label: 'View',
        onClick: () => handleNotificationClick(notification)
      }
    });
  };

  const handleNotificationUpdate = (data: { id: string; updates: Partial<NotificationItem> }) => {
    queryClient.setQueryData(['notifications'], (oldData: any) => {
      if (!oldData) return oldData;
      if (!Array.isArray(oldData)) return oldData;
      return oldData.map((notif: NotificationItem) =>
        notif.id === data.id ? { ...notif, ...data.updates } : notif
      );
    });
  };

  const handleBulkNotification = (notifications: NotificationItem[]) => {
    queryClient.setQueryData(['notifications'], (oldData: any) => {
      if (!oldData) return notifications;
      if (!Array.isArray(oldData)) return oldData;
      return [...notifications, ...oldData];
    });
  };

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    const notifications = Array.isArray(notificationsData) ? notificationsData : [];
    let filtered = [...notifications];

    if (activeTab === 'unread') {
      filtered = filtered.filter((notif) => !notif.is_read);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((notif) => notif.category === filterCategory);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((notif) => notif.priority === filterPriority);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((notif: NotificationItem) =>
        notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply unread filter
    if (showUnreadOnly) {
      filtered = filtered.filter((notif: NotificationItem) => !notif.is_read);
    }

    return filtered;
  }, [
    notificationsData,
    activeTab,
    filterCategory,
    filterPriority,
    searchQuery,
    showUnreadOnly
  ]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {};
    
    filteredNotifications.forEach((notif: NotificationItem) => {
      const date = new Date(notif.created_at);
      let groupKey: string;
      
      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else {
        groupKey = format(date, 'MMMM d, yyyy');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notif);
    });

    return groups;
  }, [filteredNotifications]);

  // Notification action handlers
  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate([notification.id]);
    }
    
    // Handle notification-specific actions
    if (notification.metadata?.url) {
      window.open(notification.metadata.url, '_blank');
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedNotifications.length === 0) return;

    switch (action) {
      case 'mark_read':
        markAsReadMutation.mutate(selectedNotifications);
        break;
    }
    
    setSelectedNotifications([]);
  };

  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(() => {
      // Ignore audio play errors (user interaction required)
    });
  };

  // Get notification icon based on type and category
  const getNotificationIcon = (notification: NotificationItem) => {
    const iconMap = {
      message: MessageSquare,
      announcement: Megaphone,
      warning: AlertTriangle,
      success: CheckCircle,
      error: AlertTriangle,
      info: Bell
    };

    const Icon = iconMap[notification.type] || Bell;
    return <Icon className="w-5 h-5" />;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colorMap = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colorMap[priority as keyof typeof colorMap] || colorMap.medium;
  };

  // Render notification item
  const renderNotificationItem = (notification: NotificationItem) => (
    <motion.div
      key={notification.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        notification.is_read ? 'bg-gray-50' : 'bg-white border-blue-200'
      } ${selectedNotifications.includes(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start space-x-3">
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={selectedNotifications.includes(notification.id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setSelectedNotifications(prev => [...prev, notification.id]);
            } else {
              setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
            }
          }}
          className="mt-1"
        />

        {/* Notification icon */}
        <div className={`p-2 rounded-full ${
          notification.is_read ? 'bg-gray-100' : 'bg-blue-100'
        }`}>
          {getNotificationIcon(notification)}
        </div>

        {/* Notification content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                notification.is_read ? 'text-gray-700' : 'text-gray-900'
              }`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 ${
                notification.is_read ? 'text-gray-500' : 'text-gray-700'
              }`}>
                {notification.message}
              </p>
              
              {/* Sender info */}
              {notification.sender && (
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <span>From: {notification.sender.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {notification.sender.role}
                  </Badge>
                </div>
              )}
            </div>

            {/* Notification metadata */}
            <div className="flex flex-col items-end space-y-1 ml-4">
              <Badge className={getPriorityColor(notification.priority)}>
                {notification.priority}
              </Badge>
              
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
              
            </div>
          </div>

          {/* Notification actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.type === 'primary' ? 'default' : 'outline'}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle action
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Render statistics cards
  const renderStatsCards = () => {
    if (!showStats || !statsData) return null;

    const stats = [
      { label: 'Total', value: statsData.total, icon: Bell, color: 'text-blue-600' },
      { label: 'Unread', value: statsData.unread, icon: BellRing, color: 'text-red-600' },
      { label: 'Today', value: statsData.today, icon: Clock, color: 'text-green-600' },
      { label: 'This Week', value: statsData.this_week, icon: Calendar, color: 'text-purple-600' }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className={`notification-dashboard ${className}`} style={{ maxHeight }}>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
              {statsData?.unread > 0 && (
                <Badge variant="destructive">{statsData.unread}</Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Sound toggle */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="sound-toggle" className="text-sm">Sound</Label>
                <Switch
                  id="sound-toggle"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              
              {/* Settings button */}
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Statistics cards */}
          <div className="p-6 pb-0">
            {renderStatsCards()}
          </div>

          {/* Filters and search */}
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category filter */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority filter */}
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              {/* Unread only toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="unread-only"
                  checked={showUnreadOnly}
                  onCheckedChange={setShowUnreadOnly}
                />
                <Label htmlFor="unread-only" className="text-sm whitespace-nowrap">
                  Unread only
                </Label>
              </div>
            </div>

            {/* Bulk actions */}
            {selectedNotifications.length > 0 && (
              <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedNotifications.length} notification(s) selected
                </span>
                <Button size="sm" onClick={() => handleBulkAction('mark_read')}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark Read
                </Button>
              </div>
            )}
          </div>

          {/* Notification tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-6 border-b">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0 h-full">
              <div className="p-6" style={{ maxHeight: 'calc(100% - 200px)', overflowY: 'auto' }}>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <p className="text-gray-600">Failed to load notifications</p>
                  </div>
                ) : Object.keys(groupedNotifications).length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">No notifications found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <AnimatePresence>
                      {Object.entries(groupedNotifications).map(([date, notifications]) => (
                        <div key={date}>
                          <h3 className="text-sm font-semibold text-gray-700 mb-3 sticky top-0 bg-white py-2">
                            {date}
                          </h3>
                          <div className="space-y-3">
                            {notifications.map(renderNotificationItem)}
                          </div>
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="unread" className="mt-0 h-full">
              <div className="p-6" style={{ maxHeight: 'calc(100% - 200px)', overflowY: 'auto' }}>
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-gray-600">All caught up! No unread notifications.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredNotifications.map(renderNotificationItem)}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedNotificationDashboard;
