import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Bell, BellRing, Search, Filter, MoreVertical, 
  MessageSquare, Megaphone, AlertTriangle, 
  CheckCircle, Clock, Trash2, Archive,
  Settings, Volume2, VolumeX
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { notificationService } from '../../services/notificationService';
import { communicationService } from '../../services/communicationService';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
  expires_at?: string;
  category: 'system' | 'academic' | 'administrative' | 'social';
  actions?: Array<{
    label: string;
    action: string;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
}

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  compact?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  maxHeight = '600px',
  showHeader = true,
  compact = false
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // WebSocket connection for real-time notifications
  const { socket, isConnected } = useWebSocket('/notifications', {
    onConnect: () => {
      socket?.emit('join_notification_room', { user_id: user?.id });
    },
    onMessage: (event, data) => {
      if (event === 'new_notification') {
        handleNewNotification(data);
      }
    }
  });

  // Fetch notifications
  const { data: notificationsData, isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getUserNotifications(user?.id || 0),
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 10000
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(user?.id || 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all notifications as read');
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
    onError: () => {
      toast.error('Failed to delete notification');
    }
  });

  // Handle new notification from WebSocket
  const handleNewNotification = (notification: Notification) => {
    // Play sound if enabled
    if (soundEnabled && notification.priority !== 'low') {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {}); // Ignore errors
    }

    // Show toast for high priority notifications
    if (notification.priority === 'urgent') {
      toast.error(notification.title, {
        description: notification.message,
        duration: 10000
      });
    } else if (notification.priority === 'high') {
      toast.warning(notification.title, {
        description: notification.message,
        duration: 5000
      });
    }

    // Update query cache
    queryClient.setQueryData(['notifications', user?.id], (oldData: any) => {
      if (!oldData) return { notifications: [notification] };
      return {
        ...oldData,
        notifications: [notification, ...oldData.notifications]
      };
    });
  };

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    if (!notificationsData?.notifications) return [];

    let filtered = notificationsData.notifications;

    // Filter by read status
    if (showUnreadOnly) {
      filtered = filtered.filter((n: Notification) => !n.read);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((n: Notification) => n.type === filterType);
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter((n: Notification) => n.category === filterCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((n: Notification) =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notificationsData?.notifications, showUnreadOnly, filterType, filterCategory, searchQuery]);

  // Get notification icon
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'destructive',
      high: 'secondary',
      normal: 'outline',
      low: 'outline'
    };
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] as any} className="text-xs">
        {priority}
      </Badge>
    );
  };

  // Handle notification action
  const handleNotificationAction = async (notification: Notification, action: string) => {
    try {
      await communicationService.handleNotificationAction(notification.id, action);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Action completed successfully');
    } catch (error) {
      toast.error('Failed to complete action');
    }
  };

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle className="text-lg">Notifications</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} style={{ maxHeight }}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">
                Notifications
                {isConnected && (
                  <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block" />
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={unreadCount === 0}
              >
                Mark All Read
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={showUnreadOnly ? 'bg-blue-50 border-blue-200' : ''}
            >
              <Filter className="w-4 h-4 mr-1" />
              {showUnreadOnly ? 'Unread' : 'All'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-full">
          <div className="p-4">
            <AnimatePresence>
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                        notification.read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-white border-blue-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className={`font-medium text-sm ${
                                notification.read ? 'text-gray-700' : 'text-gray-900'
                              }`}>
                                {notification.title}
                              </h4>
                              <p className={`text-sm mt-1 ${
                                notification.read ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                                {notification.message}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(notification.priority)}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {new Date(notification.created_at).toLocaleString()}
                            </div>

                            <div className="flex items-center gap-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsReadMutation.mutate(notification.id)}
                                  className="text-xs h-6 px-2"
                                >
                                  Mark Read
                                </Button>
                              )}
                              
                              {notification.actions?.map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant || 'outline'}
                                  size="sm"
                                  onClick={() => handleNotificationAction(notification, action.action)}
                                  className="text-xs h-6 px-2"
                                >
                                  {action.label}
                                </Button>
                              ))}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;
