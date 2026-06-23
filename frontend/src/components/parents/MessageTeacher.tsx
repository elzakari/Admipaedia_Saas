import { useState, useEffect } from 'react';
import { useWebSocket } from '../../services/websocketService';
import parentService from '../../services/parentService';
import type { MessageData, TeacherInfo } from '../../services/parentService';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Send, AlertCircle } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import communicationService from '../../services/communicationService';
import api from '../../lib/api';

interface MessageTeacherProps {
  currentChild: any;
  currentAcademicData: any;
  onClose: () => void;
}

const MessageTeacher = ({ currentChild, currentAcademicData, onClose }: MessageTeacherProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const { toast } = useToast();
  
  // Connect to WebSocket for real-time updates
  const { isConnected, subscribe } = useWebSocket('/messages');
  
  // Handle new incoming message
  const handleNewMessage = (messageData: any) => {
    const senderId = Number(messageData?.sender_id ?? messageData?.senderId ?? messageData?.sender?.id ?? 0);
    const resolvedTeacherObj = teachers.find(t => t.id === selectedTeacher);
    const teacherUserId = resolvedTeacherObj?.user_id;

    // Only add to recent messages if it's from the selected teacher
    if (senderId && teacherUserId && senderId === teacherUserId) {
      const normalized: any = {
        id: Number(messageData?.id ?? Date.now()),
        subject: String(messageData?.subject ?? ''),
        message: String(messageData?.content ?? messageData?.message ?? ''),
        content: String(messageData?.content ?? messageData?.message ?? ''),
        sender: 'Teacher',
        recipient: 'You',
        date: String(messageData?.created_at ?? messageData?.date ?? new Date().toISOString()),
        created_at: String(messageData?.created_at ?? messageData?.date ?? new Date().toISOString()),
        read: Boolean(messageData?.read ?? messageData?.is_read ?? false),
        sender_id: senderId,
        recipient_id: Number(messageData?.recipient_id ?? messageData?.recipientId ?? 0),
      };
      setRecentMessages(prev => [normalized, ...prev]);
      
      // Show toast notification
      toast({
        title: 'New message received',
        description: `${normalized.subject}`,
        variant: 'default',
        id: ''
      });
    }
  };
  
  // Fetch teachers when component mounts
  useEffect(() => {
    if (currentChild?.class_id) {
      setIsLoading(true);
      parentService.getTeachersForClass(currentChild.class_id)
        .then((data) => {
          setTeachers(data);
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.error('Error fetching teachers:', err);
          setIsLoading(false);
        });
    }
  }, [currentChild?.class_id]);
  
  const refreshMessages = async () => {
    if (!selectedTeacher || !currentUserId) return;
    try {
      setIsLoading(true);
      const teacherObj = teachers.find(t => t.id === selectedTeacher);
      const teacherUserId = teacherObj?.user_id;
      
      if (!teacherUserId) {
        console.warn("Selected teacher's user_id not found.");
        setIsLoading(false);
        return;
      }

      const [inboxRes, sentRes] = await Promise.all([
        api.get('/messages', { params: { folder: 'inbox', per_page: 100 } }),
        api.get('/messages', { params: { folder: 'sent', per_page: 100 } })
      ]);

      const inboxList = inboxRes.data?.data || inboxRes.data?.messages || [];
      const sentList = sentRes.data?.data || sentRes.data?.messages || [];
      const allMessages = [...inboxList, ...sentList];

      const filtered = allMessages.filter((m: any) => 
        (m.sender_id === currentUserId && m.recipient_id === teacherUserId) ||
        (m.sender_id === teacherUserId && m.recipient_id === currentUserId)
      );

      filtered.sort((a: any, b: any) => new Date(b.created_at || b.sentAt).getTime() - new Date(a.created_at || a.sentAt).getTime());

      const normalizedList = filtered.map((m: any) => ({
        id: m.id,
        subject: m.subject || '',
        message: m.content || '',
        content: m.content || '',
        sender_id: m.sender_id,
        recipient_id: m.recipient_id,
        sender: m.sender_id === currentUserId ? 'You' : 'Teacher',
        recipient: m.recipient_id === currentUserId ? 'You' : 'Teacher',
        date: m.created_at || new Date().toISOString(),
        created_at: m.created_at || new Date().toISOString(),
        read: m.is_read || false
      }));

      setRecentMessages(normalizedList);
    } catch (err) {
      console.error('Error refreshing messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recent messages when teacher is selected
  useEffect(() => {
    if (selectedTeacher && currentUserId) {
      refreshMessages();
    }
  }, [selectedTeacher, currentUserId, teachers]);
  
  // Subscribe to specific message events
  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe('new_message', handleNewMessage);
      return () => {
        unsubscribe();
      };
    }
  }, [isConnected, selectedTeacher, subscribe, teachers]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !message.trim() || !subject.trim()) {
      return;
    }
    
    setIsLoading(true);
    try {
      const recipientId = Number(selectedTeacher);
      await communicationService.createMessage({
        recipient_id: recipientId,
        recipient_type: 'teacher',
        subject: subject,
        content: message
      });
      
      // Clear form
      setMessage('');
      setSubject('');
      
      // Show success toast
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully',
        variant: 'default',
        id: ''
      });

      // Refresh recent messages via REST
      await refreshMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
        id: ''
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Message Teacher</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {/* Teacher selection dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Teacher
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={selectedTeacher || ''}
              onChange={(e) => setSelectedTeacher(Number(e.target.value))}
              required
            >
              <option value="">Select a teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.subject})
                </option>
              ))}
            </select>
          </div>
          
          {/* Subject field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Message subject"
            />
          </div>
          
          {/* Message textarea */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="Type your message here..."
              className="min-h-[120px]"
            />
          </div>
        </form>
        
        {/* Recent messages section */}
        {selectedTeacher && recentMessages.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Conversation</h3>
            <div className="space-y-3 max-h-[200px] overflow-y-auto p-2">
              {recentMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`p-3 rounded-lg ${msg.sender_id === currentUserId ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium">
                      {msg.sender_id === currentUserId ? 'You' : 'Teacher'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.date || msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{msg.subject}</p>
                  <p className="text-sm">{msg.content || msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!isConnected && (
          <div className="flex items-center text-amber-600 text-sm mt-4">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>Real-time updates disconnected (using REST persistence fallback)</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          type="submit" 
          disabled={isLoading || !selectedTeacher}
          onClick={handleSubmit}
        >
          {isLoading ? 'Sending...' : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MessageTeacher;
