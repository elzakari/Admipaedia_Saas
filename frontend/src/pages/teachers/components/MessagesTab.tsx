import React, { useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { MessageSquare, Send, Users, UserPlus, Search } from "lucide-react";

interface MessagesTabProps {
  teacherId: number;
}

export function MessagesTab({ teacherId }: MessagesTabProps) {
  // In a real implementation, you would fetch messages data using a custom hook
  // const { data, isLoading, error } = useTeacherMessages(teacherId);
  
  const [activeMessageTab, setActiveMessageTab] = useState("inbox");
  const [messageText, setMessageText] = useState("");
  
  // Mock data for demonstration
  const conversations = [
    { 
      id: 1, 
      name: "John Smith", 
      role: "Parent", 
      avatar: "", 
      lastMessage: "Can we schedule a meeting to discuss my son's progress?", 
      time: "10:30 AM", 
      unread: true 
    },
    { 
      id: 2, 
      name: "Sarah Johnson", 
      role: "Student", 
      avatar: "", 
      lastMessage: "I've submitted my assignment. Could you please check it?", 
      time: "Yesterday", 
      unread: false 
    },
    { 
      id: 3, 
      name: "Michael Brown", 
      role: "Teacher", 
      avatar: "", 
      lastMessage: "The department meeting has been rescheduled to Friday.", 
      time: "May 10", 
      unread: false 
    },
  ];
  
  // Mock messages for the selected conversation
  const messages = [
    { id: 1, sender: "John Smith", text: "Hello, I hope you're doing well.", time: "10:15 AM", isSelf: false },
    { id: 2, sender: "John Smith", text: "Can we schedule a meeting to discuss my son's progress?", time: "10:30 AM", isSelf: false },
    { id: 3, sender: "Me", text: "Hello Mr. Smith. Yes, I'm available this Thursday at 4 PM. Would that work for you?", time: "11:05 AM", isSelf: true },
  ];

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // In a real app, you would send this message to the API
      console.log("Sending message:", messageText);
      setMessageText("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Messages</h3>
        <Button className="flex items-center glass-button">
          <UserPlus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="glass-card overflow-hidden md:col-span-1">
          <div className="p-3 border-b border-indigo-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-400" />
              <Input
                placeholder="Search messages..."
                className="pl-8 glass-input"
              />
            </div>
          </div>
          
          <Tabs defaultValue="inbox" value={activeMessageTab} onValueChange={setActiveMessageTab}>
            <TabsList className="glass-tabs w-full justify-start p-2">
              <TabsTrigger value="inbox" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Inbox
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Groups
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="inbox" className="m-0 max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-indigo-100">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="p-3 hover:bg-indigo-50 cursor-pointer flex items-start">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={conversation.avatar} />
                      <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-indigo-900 truncate">{conversation.name}</h4>
                        <span className="text-xs text-indigo-600">{conversation.time}</span>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 text-xs">{conversation.role}</Badge>
                        {conversation.unread && <Badge variant="destructive" className="h-2 w-2 rounded-full p-0" />}
                      </div>
                      <p className="text-sm text-indigo-700 truncate mt-1">{conversation.lastMessage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="groups" className="m-0 p-4 text-center">
              <p className="text-indigo-700">No group conversations yet.</p>
            </TabsContent>
          </Tabs>
        </Card>
        
        {/* Message Thread */}
        <Card className="glass-card overflow-hidden md:col-span-2 flex flex-col" style={{ height: '500px' }}>
          <div className="p-3 border-b border-indigo-100 flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src="" />
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-indigo-900">John Smith</h4>
              <Badge variant="outline" className="text-xs">Parent</Badge>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${message.isSelf ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-900'} rounded-lg p-3`}>
                  <p className="text-sm">{message.text}</p>
                  <span className={`text-xs ${message.isSelf ? 'text-indigo-200' : 'text-indigo-600'} block text-right mt-1`}>
                    {message.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-indigo-100 flex items-center">
            <Input
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="glass-input mr-2"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button 
              className="glass-button" 
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}