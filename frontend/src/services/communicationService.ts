import api from '../lib/api';
import { StandardPaginatedResponse, StandardApiResponse } from '../types';
import { ApiResponseStandardizer } from '../lib/apiResponseStandardizer';

// Types for message data
export interface MessageParticipant {
  id: number;
  username: string;
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'user' | 'class';
  display_name: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  size?: number | null;
  mime_type?: string | null;
  download_url?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  sender_type: 'admin' | 'teacher' | 'student' | 'parent';
  recipient_id: number;
  recipient_type: 'admin' | 'teacher' | 'student' | 'parent' | 'class';
  subject: string;
  content: string;
  is_read: boolean;
  attachments?: Array<string | MessageAttachment>;
  sender?: MessageParticipant | null;
  recipient?: MessageParticipant | null;
  created_at: string;
  updated_at: string;
}

export interface MessageCreate {
  recipient_id: number;
  recipient_type: 'admin' | 'teacher' | 'student' | 'parent' | 'class';
  subject: string;
  content: string;
  reply_to?: number;
  attachments?: File[];
}

export interface MessageUpdate {
  is_read?: boolean;
}

export interface BulkMessageCreate {
  recipient_ids: number[];
  recipient_type: 'admin' | 'teacher' | 'student' | 'parent';
  subject: string;
  content: string;
  attachments?: File[];
}

// Define the communicationService object
const communicationService = {
  // Get messages with pagination and filtering
  getMessages: async (params?: {
    page?: number;
    per_page?: number;
    folder?: 'inbox' | 'sent' | 'trash';
    is_read?: boolean;
  }): Promise<StandardPaginatedResponse<Message>> => {
    try {
      const response = await api.get('/messages', { params });
      const standardized = ApiResponseStandardizer.standardizePaginatedResponse<Message>(response, 'messages');
      const messages = standardized.data;
      return Object.assign(standardized, { messages }) as any;
    } catch (error) {
      console.error('Error fetching messages:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get a specific message by ID
  getMessage: async (messageId: number): Promise<StandardApiResponse<Message>> => {
    try {
      const response = await api.get(`/messages/${messageId}`);
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<Message>(response, 'message');
      if ((response?.data?.data as any) && !(standardized as any).data?.id) {
        return { ...standardized, data: response.data.data } as any;
      }
      return standardized;
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Send a new message
  sendMessage: async (messageData: MessageCreate): Promise<StandardApiResponse<Message>> => {
    try {
      const formData = new FormData();
      Object.entries(messageData).forEach(([key, value]) => {
        if (key === 'attachments' && value) {
          (value as File[]).forEach(file => formData.append('attachments', file));
        } else {
          formData.append(key, value as string);
        }
      });

      const response = await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return ApiResponseStandardizer.standardizeSingleResponse<Message>(response, 'message');
    } catch (error) {
      console.error('Error sending message:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },
  
  // Create a new message
  createMessage: async (messageData: MessageCreate): Promise<Message> => {
    try {
      if (messageData.attachments && messageData.attachments.length > 0) {
        const formData = new FormData();
        formData.append('recipient_id', messageData.recipient_id.toString());
        formData.append('recipient_type', messageData.recipient_type);
        formData.append('subject', messageData.subject);
        formData.append('content', messageData.content);
        messageData.attachments.forEach((file) => formData.append('attachments', file));
        const response = await api.post('/messages/send', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data?.data || response.data?.message;
      }

      const response = await api.post('/messages/send', messageData);
      return response.data?.data || response.data?.message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },
  
  // Create bulk messages
  createBulkMessage: async (messageData: BulkMessageCreate): Promise<{ success: boolean; count: number }> => {
    try {
      // Handle file uploads if attachments are present
      if (messageData.attachments && messageData.attachments.length > 0) {
        const formData = new FormData();
        
        // Add message data to form
        formData.append('recipient_ids', JSON.stringify(messageData.recipient_ids));
        formData.append('recipient_type', messageData.recipient_type);
        formData.append('subject', messageData.subject);
        formData.append('content', messageData.content);
        
        // Add attachments
        messageData.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });
        
        const response = await api.post('/messages/bulk', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        return response.data;
      } else {
        // Regular JSON request without attachments
        const response = await api.post('/messages/bulk', messageData);
        return response.data;
      }
    } catch (error) {
      console.error('Error creating bulk message:', error);
      throw error;
    }
  },
  
  // Update a message (mark as read/unread)
  updateMessage: async (messageId: number, updateData: MessageUpdate): Promise<Message> => {
    try {
      const response = await api.put(`/messages/${messageId}`, updateData);
      return response.data?.data || response.data?.message;
    } catch (error) {
      console.error(`Error updating message ${messageId}:`, error);
      throw error;
    }
  },

  // Delete a message
  deleteMessage: async (messageId: number, permanent: boolean = false): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete(`/messages/${messageId}`, {
        params: { permanent }
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting message ${messageId}:`, error);
      throw error;
    }
  },

  // Download message attachment
  downloadAttachment: async (messageId: number, attachmentName: string): Promise<Blob> => {
    try {
      const response = await api.get(`/messages/${messageId}/attachments/${attachmentName}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error(`Error downloading attachment ${attachmentName} from message ${messageId}:`, error);
      throw error;
    }
  }
};

export default communicationService;
