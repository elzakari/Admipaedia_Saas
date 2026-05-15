import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import {
  Send, Paperclip, Image, Smile, Phone, Video, 
  MoreVertical, Search, Users, Settings, 
  Mic, MicOff, ThumbsUp, Heart, Laugh,
  File, Download, Eye, EyeOff, Clock,
  CheckCheck, Check, AlertCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import communicationService, { Message, MessageCreate } from '../../services/communicationService';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface ChatUser {
  id: number;
  name: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
}

interface ChatMessage extends Message {
  reactions?: { emoji: string; users: number[]; count: number }[];
  isEdited?: boolean;
  replyTo?: number;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read';
}

interface RealTimeChatProps {
  chatId?: string;
  recipientId?: number;
  recipientType: 'user' | 'class' | 'group';
  className?: string;
  height?: string;
}

export const RealTimeChatComponent: React.FC<RealTimeChatProps> = ({
  chatId,
  recipientId,
  recipientType,
  className = '',
  height = '600px'
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<ChatUser[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // WebSocket connection for real-time chat
  const { socket, isConnected } = useWebSocket('/chat', {
    onConnect: () => {
      if (chatId) {
        socket?.emit('join_chat', { chat_id: chatId, user_id: user?.id });
      }
    },
    onMessage: (event, data) => {
      switch (event) {
        case 'new_message':
          handleNewMessage(data);
          break;
        case 'user_typing':
          handleUserTyping(data);
          break;
        case 'user_stopped_typing':
          handleUserStoppedTyping(data);
          break;
        case 'message_read':
          handleMessageRead(data);
          break;
        case 'user_online':
          handleUserOnline(data);
          break;
        case 'user_offline':
          handleUserOffline(data);
          break;
      }
    }
  });

  // Fetch chat messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: () => communicationService.getMessages({ chat_id: chatId }),
    enabled: !!chatId,
    refetchInterval: 30000
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: MessageCreate) => communicationService.createMessage(messageData),
    onSuccess: () => {
      setMessage('');
      setSelectedFiles([]);
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      scrollToBottom();
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  // Handle new message from WebSocket
  const handleNewMessage = useCallback((messageData: ChatMessage) => {
    queryClient.setQueryData(['chat-messages', chatId], (oldData: any) => {
      if (!oldData) return { messages: [messageData] };
      return {
        ...oldData,
        messages: [...oldData.messages, messageData]
      };
    });
    scrollToBottom();
  }, [chatId, queryClient]);

  // Handle typing indicators
  const handleUserTyping = useCallback((data: { user: ChatUser }) => {
    setTypingUsers(prev => {
      const exists = prev.find(u => u.id === data.user.id);
      if (!exists) {
        return [...prev, { ...data.user, isTyping: true }];
      }
      return prev;
    });
  }, []);

  const handleUserStoppedTyping = useCallback((data: { user_id: number }) => {
    setTypingUsers(prev => prev.filter(u => u.id !== data.user_id));
  }, []);

  // Handle message read status
  const handleMessageRead = useCallback((data: { message_id: number, user_id: number }) => {
    queryClient.setQueryData(['chat-messages', chatId], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        messages: oldData.messages.map((msg: ChatMessage) =>
          msg.id === data.message_id
            ? { ...msg, deliveryStatus: 'read' }
            : msg
        )
      };
    });
  }, [chatId, queryClient]);

  // Handle user online/offline status
  const handleUserOnline = useCallback((data: { user_id: number }) => {
    // Update user online status in chat
  }, []);

  const handleUserOffline = useCallback((data: { user_id: number }) => {
    // Update user offline status in chat
  }, []);

  // Typing indicator logic
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      socket?.emit('typing_start', { chat_id: chatId, user_id: user?.id });
    } else if (!message.trim() && isTyping) {
      setIsTyping(false);
      socket?.emit('typing_stop', { chat_id: chatId, user_id: user?.id });
    }
  }, [message, isTyping, socket, chatId, user?.id]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesData]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;

    const messageData: MessageCreate = {
      recipient_id: recipientId || 0,
      recipient_type: recipientType as any,
      subject: '',
      content: message.trim(),
      attachments: selectedFiles
    };

    if (replyingTo) {
      messageData.reply_to = replyingTo.id;
    }

    sendMessageMutation.mutate(messageData);
  };

  // File upload handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Message reactions
  const handleReaction = (messageId: number, emoji: string) => {
    socket?.emit('add_reaction', {
      message_id: messageId,
      emoji,
      user_id: user?.id
    });
  };

  // Voice recording
  const startRecording = () => {
    setIsRecording(true);
    // Implement voice recording logic
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
    // Implement stop recording and send voice message
  };

  // Render message component
  const renderMessage = (msg: ChatMessage, index: number) => {
    const isOwnMessage = msg.sender_id === user?.id;
    const list = ((messagesData as any)?.messages || (messagesData as any)?.data || []) as ChatMessage[];
    const showAvatar = index === 0 || list[index - 1]?.sender_id !== msg.sender_id;

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
          {showAvatar && !isOwnMessage && (
            <Avatar className="w-8 h-8 mr-2">
              <AvatarImage src={`/api/users/${msg.sender_id}/avatar`} />
              <AvatarFallback>
                {msg.sender_type?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className={`relative ${isOwnMessage ? 'mr-2' : 'ml-2'}`}>
            {/* Reply indicator */}
            {msg.replyTo && (
              <div className="text-xs text-gray-500 mb-1 p-2 bg-gray-100 rounded">
                Replying to previous message
              </div>
            )}
            
            {/* Message bubble */}
            <div
              className={`px-4 py-2 rounded-lg ${
                isOwnMessage
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              
              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.attachments.map((attachment, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      <File className="w-4 h-4" />
                      <span>{attachment}</span>
                      <Button size="sm" variant="ghost">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Message reactions */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {msg.reactions.map((reaction, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => handleReaction(msg.id, reaction.emoji)}
                    >
                      {reaction.emoji} {reaction.count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Message metadata */}
            <div className={`flex items-center mt-1 text-xs text-gray-500 ${
              isOwnMessage ? 'justify-end' : 'justify-start'
            }`}>
              <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
              {isOwnMessage && (
                <div className="ml-1">
                  {msg.deliveryStatus === 'read' && <CheckCheck className="w-3 h-3 text-blue-500" />}
                  {msg.deliveryStatus === 'delivered' && <CheckCheck className="w-3 h-3" />}
                  {msg.deliveryStatus === 'sent' && <Check className="w-3 h-3" />}
                  {msg.deliveryStatus === 'sending' && <Clock className="w-3 h-3" />}
                </div>
              )}
              {msg.isEdited && <span className="ml-1">(edited)</span>}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className={`flex flex-col ${className}`} style={{ height }}>
      {/* Chat Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={`/api/users/${recipientId}/avatar`} />
              <AvatarFallback>
                {recipientType === 'class' ? 'C' : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {recipientType === 'class' ? `Class ${recipientId}` : `User ${recipientId}`}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost">
              <Phone className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Video className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Search className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {(((messagesData as any)?.messages || (messagesData as any)?.data || []) as ChatMessage[])?.map((msg, index) => renderMessage(msg, index))}
              
              {/* Typing indicators */}
              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>
                    {typingUsers.map(u => u.name).join(', ')} 
                    {typingUsers.length === 1 ? ' is' : ' are'} typing...
                  </span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <Separator />

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Replying to:</span>
              <p className="text-gray-600 truncate">{replyingTo.content}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyingTo(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 bg-white px-2 py-1 rounded">
                <File className="w-4 h-4" />
                <span className="text-sm truncate max-w-[100px]">{file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 border rounded-lg p-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="border-0 focus:ring-0 flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  className={isRecording ? 'bg-red-100' : ''}
                >
                  {isRecording ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() && selectedFiles.length === 0}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {isRecording && (
          <div className="mt-2 text-sm text-red-500 flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
            Recording... {recordingTime}s
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />
    </Card>
  );
};

export default RealTimeChatComponent;
