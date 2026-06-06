import React, { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft, MoreVertical, ShieldAlert } from 'lucide-react';

// Define explicit Type contracts for our message payloads
interface MessagePayload {
  id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  timestamp: string;
}

interface ChatWindowProps {
  currentUserId: number;
  recipientName: string;
  initialMessages: MessagePayload[];
  onSendMessage: (text: string) => Promise<boolean>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUserId,
  recipientName,
  initialMessages,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<MessagePayload[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Define reference handles for scroll targeting
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /**
   * Autoscroll execution wrapper anchoring view window down to the latest element
   */
  const scrollToLatestMessage = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Trigger absolute positioning drop upon initial template mounting frame
  useEffect(() => {
    scrollToLatestMessage('auto');
  }, []);

  // Monitor layout stream array mutations to dynamically drop the view down
  useEffect(() => {
    scrollToLatestMessage('smooth');
  }, [messages]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const targetedText = inputMessage.trim();
    setIsSending(true);
    setNetworkError(null);

    try {
      const success = await onSendMessage(targetedText);
      
      if (success) {
        // Append message to visual layout grid state locally upon secure DB commit callback
        const mockSavedMessage: MessagePayload = {
          id: Date.now(),
          sender_id: currentUserId,
          sender_name: 'You',
          body: targetedText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, mockSavedMessage]);
        setInputMessage('');
      } else {
        setNetworkError("Impossible d'envoyer le message. Problème de synchronisation.");
      }
    } catch (err) {
      setNetworkError("Échec de la connexion. Message non enregistré.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
      
      {/* 1. Header Toolbar Component */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{recipientName}</h3>
            <span className="text-xs font-medium text-emerald-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En ligne
            </span>
          </div>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Messages Body Canvas Layer */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'} animate-fade-in`}
            >
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed whitespace-pre-wrap ${
                  isMe
                    ? 'bg-violet-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.body}
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}
        {/* The target invisible terminal element for our intersection hook anchor point */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error alert tracking strip element */}
      {networkError && (
        <div className="mx-6 my-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2 animate-slide-in">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-medium">{networkError}</span>
        </div>
      )}

      {/* 3. Message Input Form Container Layer */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Écrivez votre message ici..."
          disabled={isSending}
          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:opacity-60 transition-all"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isSending}
          className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl disabled:opacity-40 active:scale-95 shadow-sm shadow-violet-500/10 transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
