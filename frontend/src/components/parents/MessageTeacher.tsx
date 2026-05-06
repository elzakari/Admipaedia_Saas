// Create or update MessageTeacher.tsx
import { useState, useEffect, SetStateAction } from 'react';
import { useWebSocket } from '../../services/websocketService';
import parentService from '../../services/parentService';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Send, AlertCircle } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface MessageTeacherProps {
  currentChild: any;
  currentAcademicData: any;
  onClose: () => void;
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject: string;
  content: string;
  created_at: string;
  read: boolean;
}

const MessageTeacher = ({ currentChild, currentAcademicData, onClose }: MessageTeacherProps) => {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  
  // Connect to WebSocket for real-time messaging
  const { sendMessage, isConnected, subscribe } = useWebSocket('/messages', (data) => {
    // Handle incoming messages
    if (data.type === 'new_message') {
      handleNewMessage(data.data);
    }
  });
  
  // Handle new incoming message
  const handleNewMessage = (messageData: Message) => {
    // Only add to recent messages if it's from the selected teacher
    if (messageData.sender_id === selectedTeacher) {
      setRecentMessages(prev => [messageData, ...prev]);
      
      // Show toast notification
      toast({
        title: 'New message received',
        description: `${messageData.subject}`,
        variant: 'default',
        id: ''
      });
    }
  };
  
  // Fetch teachers when component mounts
  useEffect(() => {
    // Fetch teachers for the current child's class
    if (currentChild?.class_id) {
      setIsLoading(true);
      parentService.getTeachersForClass(currentChild.class_id)
        .then((data: { teachers: SetStateAction<any[]>; }) => {
          setTeachers(data.teachers);
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.error('Error fetching teachers:', err);
          setIsLoading(false);
        });
    }
  }, [currentChild?.class_id]);
  
  // Fetch recent messages when teacher is selected
  useEffect(() => {
    if (selectedTeacher && currentChild?.parent_id) {
      setIsLoading(true);
      parentService.getRecentMessages(currentChild.parent_id, selectedTeacher)
        .then((data: { messages: SetStateAction<Message[]>; }) => {
          setRecentMessages(data.messages);
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.error('Error fetching recent messages:', err);
          setIsLoading(false);
        });
    }
  }, [selectedTeacher, currentChild?.parent_id]);
  
  // Subscribe to specific message events
  useEffect(() => {
    if (isConnected && currentChild?.parent_id) {
      // Subscribe to messages for this parent
      const unsubscribe = subscribe('new_message', handleNewMessage);
      
      // Cleanup subscription on unmount
      return () => {
        unsubscribe();
      };
    }
  }, [isConnected, currentChild?.parent_id, subscribe]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !message.trim() || !subject.trim()) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await parentService.sendMessageToTeacher({
        parentId: currentChild.parent_id,
        teacherId: selectedTeacher,
        subject,
        message
      });
      
      // Add the sent message to the recent messages list
      if (response.message) {
        setRecentMessages(prev => [response.message, ...prev]);
      }
      
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
                  className={`p-3 rounded-lg ${msg.sender_id === currentChild.parent_id ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium">
                      {msg.sender_id === currentChild.parent_id ? 'You' : 'Teacher'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{msg.subject}</p>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!isConnected && (
          <div className="flex items-center text-amber-600 text-sm mt-4">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>Not connected to messaging service</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          type="submit" 
          disabled={isLoading || !selectedTeacher || !isConnected}
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