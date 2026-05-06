import React, { useState, useEffect } from 'react';
// Add import for AITeacherService
import { AITeacherService } from "../../../services/aiTeacherService";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { 
  MessageSquare, 
  Send, 
  Users, 
  UserPlus, 
  Search, 
  Brain,
  Zap,
  Star,
  Archive,
  Filter
} from "lucide-react";
// Add these imports at the top of the file
import { 
  Plus,
  FileDown,
  Printer,
  Share2
} from "lucide-react";
import { QuickActions } from "../../../components/common/quick-actions";
import { useToast } from "../../../components/ui/use-toast";

interface EnhancedMessagesTabProps {
  teacherId: number;
}

export function EnhancedMessagesTab({ teacherId }: EnhancedMessagesTabProps) {
  const [activeTab, setActiveTab] = useState("inbox");
  const [messageText, setMessageText] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Add state for AI responses
  const [aiResponse, setAiResponse] = useState<string>("");
  const [responseLoading, setResponseLoading] = useState(false);

  // Add this function to generate AI responses
  const generateAIResponse = (message: string) => {
    // Simple keyword matching for demo purposes
    if (message.toLowerCase().includes('meeting')) {
      return "I'd be happy to schedule a meeting. I'm available Tuesday and Thursday afternoons. Please let me know your preference.";
    } else if (message.toLowerCase().includes('assignment') || message.toLowerCase().includes('homework')) {
      return "Thank you for submitting your assignment. I'll review it and provide feedback by tomorrow.";
    } else if (message.toLowerCase().includes('test') || message.toLowerCase().includes('exam')) {
      return "The upcoming test will cover chapters 5-7. Make sure to review the practice problems we discussed in class.";
    } else {
      return "Thank you for your message. I'll get back to you soon.";
    }
  };

  // Generate AI response when needed
  const handleGenerateResponse = async (message: string) => {
    try {
      setResponseLoading(true);
      // Use generatePersonalizedRecommendations for message responses
      const recommendations = await AITeacherService.generatePersonalizedRecommendations(teacherId);
      
      // Simple keyword matching for demo purposes
      const responses = {
        "homework": "I understand you're asking about homework. The assignment is due next Friday. Please check the class portal for detailed instructions.",
        "grades": "Regarding grades, I'll review your recent assessments and provide feedback by tomorrow. Keep up the good work!",
        "meeting": "I'd be happy to schedule a meeting. I'm available Tuesday and Thursday afternoons. Please let me know your preference."
      };
      
      const key = Object.keys(responses).find(k => message.toLowerCase().includes(k));
      const response = key ? responses[key as keyof typeof responses] : "Thank you for your message. I'll get back to you soon.";
      
      setAiResponse(response);
    } catch (error) {
      console.error('Failed to generate AI response:', error);
      setAiResponse("Thank you for your message. I'll get back to you soon.");
    } finally {
      setResponseLoading(false);
    }
  };

  const conversations = [
    { 
      id: 1, 
      name: "John Smith", 
      role: "Parent", 
      avatar: "", 
      lastMessage: "Can we schedule a meeting to discuss my son's progress?", 
      time: "10:30 AM", 
      unread: true,
      priority: "high"
    },
    { 
      id: 2, 
      name: "Sarah Johnson", 
      role: "Student", 
      avatar: "", 
      lastMessage: "I've submitted my assignment. Could you please check it?", 
      time: "Yesterday", 
      unread: false,
      priority: "medium"
    },
    { 
      id: 3, 
      name: "Class 10A Group", 
      role: "Group", 
      avatar: "", 
      lastMessage: "Reminder: Math test tomorrow at 9 AM", 
      time: "May 10", 
      unread: false,
      priority: "low"
    },
  ];

  const { toast } = useToast();

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        toast({
          title: "New Message",
          description: "Opening message composer...",
          id: ''
        });
        break;
      case 'export':
        // Generate and download CSV of messages data
        const csvContent = "Name,Role,Message,Time\n" +
          "John Smith,Parent,Can we schedule a meeting to discuss my son's progress?,10:30 AM\n" +
          "Sarah Johnson,Student,I've submitted my assignment. Could you please check it?,Yesterday";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "messages_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Export Successful",
          description: "Messages data has been exported to CSV",
          id: ''
        });
        break;
      case 'print':
        // Print the current page
        window.print();
        toast({
          title: "Print Initiated",
          description: "Preparing messages for printing",
          id: ''
        });
        break;
      case 'share':
        // Copy the current URL to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Messages page URL copied to clipboard",
          id: ''
        });
        break;
      default:
        break;
    }
  };

  // Define quick actions
  const quickActions = [
    {
      icon: Plus,
      label: "New Message",
      onClick: () => handleQuickAction('add')
    },
    {
      icon: FileDown,
      label: "Export Messages",
      onClick: () => handleQuickAction('export')
    },
    {
      icon: Printer,
      label: "Print Conversations",
      onClick: () => handleQuickAction('print')
    },
    {
      icon: Share2,
      label: "Share",
      onClick: () => handleQuickAction('share')
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Messages</h3>
        <div className="flex gap-2">
          <Button className="glass-button">
            <Brain className="h-4 w-4 mr-2" />
            AI Assistant
          </Button>
          <Button className="glass-button">
            <UserPlus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Conversations</CardTitle>
                <Button size="sm" variant="ghost">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search messages..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.id}
                    className={`p-3 cursor-pointer hover:bg-indigo-50 border-l-4 ${
                      conversation.priority === 'high' ? 'border-red-500' :
                      conversation.priority === 'medium' ? 'border-orange-500' : 'border-transparent'
                    } ${
                      selectedConversation?.id === conversation.id ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conversation.avatar} />
                        <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.name}
                          </p>
                          <div className="flex items-center space-x-1">
                            {conversation.priority === 'high' && (
                              <Star className="h-3 w-3 text-red-500" />
                            )}
                            {conversation.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{conversation.role}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-xs text-gray-400">{conversation.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-[600px] flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={selectedConversation.avatar} />
                        <AvatarFallback>{selectedConversation.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{selectedConversation.name}</h4>
                        <p className="text-sm text-gray-500">{selectedConversation.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Zap className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {/* Sample messages */}
                    <div className="flex justify-start">
                      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
                        <p className="text-sm">{selectedConversation.lastMessage}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedConversation.time}</p>
                      </div>
                    </div>
                    
                    {/* AI Suggested Response */}
                    <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700">AI Suggested Response</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {generateAIResponse(selectedConversation.lastMessage)}
                      </p>
                      <Button size="sm" className="mt-2" variant="outline">
                        Use This Response
                      </Button>
                    </div>
                  </div>
                </CardContent>
                
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <Textarea 
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <div className="flex flex-col gap-2">
                      <Button size="sm" className="glass-button">
                        <Brain className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="glass-button">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}