import { useWebSocket } from './websocketService';
import { useState, useEffect, useCallback } from 'react';

export interface AnnouncementWebSocketMessage {
  id: number;
  title: string;
  content: string;
  class_id: number;
  teacher_id: number | null;
  recipients: string;
  created_at: string;
  updated_at: string;
  is_update?: boolean;
  is_deleted?: boolean;
}

export const useAnnouncementWebSocket = (classId?: number, role?: string) => {
  const [announcements, setAnnouncements] = useState<AnnouncementWebSocketMessage[]>([]);
  const { isConnected, error, subscribe, sendMessage } = useWebSocket('/ws/announcements');
  
  // Handle new announcements
  const handleNewAnnouncement = useCallback((data: AnnouncementWebSocketMessage) => {
    if (data.is_deleted) {
      // Remove the deleted announcement
      setAnnouncements(prev => prev.filter(a => a.id !== data.id));
    } else if (data.is_update) {
      // Update existing announcement
      setAnnouncements(prev => 
        prev.map(a => a.id === data.id ? data : a)
      );
    } else {
      // Add new announcement
      setAnnouncements(prev => [data, ...prev]);
    }
  }, []);
  
  // Subscribe to class announcements
  const subscribeToClass = useCallback((classId: number) => {
    if (isConnected) {
      sendMessage('subscribe_to_class', { class_id: classId });
    }
  }, [isConnected, sendMessage]);
  
  // Subscribe to role-based announcements
  const subscribeToRole = useCallback((role: string) => {
    const normalized = (() => {
      const r = String(role || '').toLowerCase()
      if (r === 'admin') return 'admins'
      if (r === 'teacher') return 'teachers'
      if (r === 'student') return 'students'
      if (r === 'parent') return 'parents'
      return r
    })()

    if (isConnected && ['students', 'parents', 'teachers', 'admins'].includes(normalized)) {
      sendMessage('subscribe_to_role', { role: normalized });
    }
  }, [isConnected, sendMessage]);
  
  // Set up subscriptions when connected
  useEffect(() => {
    if (isConnected) {
      // Subscribe to new announcements
      const unsubscribe = subscribe('new_announcement', handleNewAnnouncement);
      
      // Subscribe to class if provided
      if (classId) {
        subscribeToClass(classId);
      }
      
      // Subscribe to role if provided
      if (role) {
        subscribeToRole(role);
      }
      
      return () => {
        unsubscribe();
      };
    }
  }, [isConnected, classId, role, subscribe, handleNewAnnouncement, subscribeToClass, subscribeToRole]);
  
  return {
    isConnected,
    error,
    announcements,
    subscribeToClass,
    subscribeToRole
  };
};
