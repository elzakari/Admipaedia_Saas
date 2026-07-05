import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Search, Filter, Star, Trash, Reply, Mail, MailOpen, Archive } from "lucide-react";
import { Input } from "../../components/ui/input";
import { parentPortalPrimaryButtonClass, parentPortalSecondaryButtonClass } from "../../lib/parentPortalUi";

interface MessagesTabProps {
  messagesData: any[];
  onComposeClick?: () => void; // Add this prop
}

const MessagesTab = ({ messagesData, onComposeClick }: MessagesTabProps) => {
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedMessages = messagesData.map((message, index) => {
    const isoDate = typeof message.date === "string" ? message.date : "";
    const parsedDate = isoDate ? new Date(isoDate) : null;
    const hasValidDate = !!parsedDate && !Number.isNaN(parsedDate.getTime());

    return {
      id: String(message.id ?? index),
      from: message.from || message.sender || "School",
      subject: message.subject || "Message",
      content: message.content || message.message || "",
      date: hasValidDate ? parsedDate.toLocaleDateString() : (isoDate || "Unknown date"),
      time: hasValidDate ? parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      read: Boolean(message.read),
      archived: Boolean(message.archived),
      starred: Boolean(message.starred),
      avatar: message.avatar || undefined,
    };
  });

  // Filter messages based on active folder and search query
  const filteredMessages = normalizedMessages.filter(message => {
    const matchesSearch = 
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.from.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFolder === "inbox") return matchesSearch && !message.archived;
    if (activeFolder === "starred") return matchesSearch && message.starred;
    if (activeFolder === "archived") return matchesSearch && message.archived;
    return matchesSearch;
  });

  const currentMessage = normalizedMessages.find(m => m.id === selectedMessage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-indigo-900">Messages</h2>
        <Button 
          className={parentPortalPrimaryButtonClass}
          onClick={onComposeClick} // Use the prop here
        >
          Compose New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Message folders */}
        <Card className="glass-card lg:col-span-1">
          <CardContent className="p-4">
            <div className="space-y-2">
              <button 
                onClick={() => setActiveFolder("inbox")}
                className={`w-full flex items-center justify-between p-2 rounded-md ${
                  activeFolder === "inbox" 
                    ? "bg-indigo-100 text-indigo-900" 
                    : "hover:bg-indigo-50 text-indigo-700"
                }`}
              >
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Inbox</span>
                </div>
                <Badge variant="outline">{normalizedMessages.filter(m => !m.archived).length}</Badge>
              </button>
              
              <button 
                onClick={() => setActiveFolder("starred")}
                className={`w-full flex items-center justify-between p-2 rounded-md ${
                  activeFolder === "starred" 
                    ? "bg-indigo-100 text-indigo-900" 
                    : "hover:bg-indigo-50 text-indigo-700"
                }`}
              >
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  <span>Starred</span>
                </div>
                <Badge variant="outline">{normalizedMessages.filter(m => m.starred).length}</Badge>
              </button>
              
              <button 
                onClick={() => setActiveFolder("archived")}
                className={`w-full flex items-center justify-between p-2 rounded-md ${
                  activeFolder === "archived" 
                    ? "bg-indigo-100 text-indigo-900" 
                    : "hover:bg-indigo-50 text-indigo-700"
                }`}
              >
                <div className="flex items-center">
                  <Archive className="h-4 w-4 mr-2" />
                  <span>Archived</span>
                </div>
                <Badge variant="outline">{normalizedMessages.filter(m => m.archived).length}</Badge>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Message list and detail view */}
        <Card className="glass-card lg:col-span-3">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row h-[600px]">
              {/* Message list */}
              <div className={`w-full md:w-2/5 border-r border-indigo-100 ${selectedMessage && 'hidden md:block'}`}>
                <div className="p-4 border-b border-indigo-100">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-indigo-400" />
                      <Input
                        placeholder="Search messages..."
                        className="pl-8 bg-white bg-opacity-50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="icon" className={parentPortalSecondaryButtonClass}>
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="overflow-y-auto h-[calc(600px-65px)]">
                  {filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <MailOpen className="h-12 w-12 text-indigo-300 mb-2" />
                      <p className="text-indigo-700">No messages found</p>
                      <p className="text-xs text-indigo-500 mt-1">Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    filteredMessages.map(message => (
                      <div 
                        key={message.id}
                        onClick={() => setSelectedMessage(message.id)}
                        className={`p-4 border-b border-indigo-100 cursor-pointer ${
                          message.id === selectedMessage 
                            ? 'bg-indigo-50' 
                            : 'hover:bg-indigo-50'
                        } ${!message.read ? 'bg-white' : 'bg-opacity-60'}`}
                      >
                        <div className="flex items-start">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={message.avatar} alt={message.from} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-700">
                              {message.from.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium ${!message.read ? 'text-indigo-900' : 'text-indigo-700'}`}>
                                {message.from}
                              </p>
                              <div className="flex items-center">
                                <p className="text-xs text-indigo-500">{message.time}</p>
                                {!message.read && (
                                  <div className="ml-2 h-2 w-2 rounded-full bg-blue-500"></div>
                                )}
                              </div>
                            </div>
                            <p className={`text-sm mt-1 truncate ${!message.read ? 'font-medium text-indigo-800' : 'text-indigo-700'}`}>
                              {message.subject}
                            </p>
                            <p className="text-xs text-indigo-500 mt-1 line-clamp-1">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Message detail */}
              <div className={`w-full md:w-3/5 ${!selectedMessage && 'hidden md:block'}`}>
                {selectedMessage && currentMessage ? (
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-indigo-100 flex items-center justify-between">
                      <h3 className="font-medium text-indigo-900">{currentMessage.subject}</h3>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon" className="text-indigo-700 hover:text-indigo-900">
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-indigo-700 hover:text-indigo-900">
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-indigo-700 hover:text-indigo-900">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 overflow-y-auto flex-1">
                      <div className="flex items-center mb-4">
                        <Avatar className="h-12 w-12 mr-3">
                          <AvatarImage src={currentMessage.avatar} alt={currentMessage.from} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700">
                            {currentMessage.from.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-indigo-900">{currentMessage.from}</p>
                          <p className="text-xs text-indigo-500">
                            To: You • {currentMessage.date}{currentMessage.time ? ` at ${currentMessage.time}` : ""}
                          </p>
                        </div>
                      </div>
                      
                      <div className="prose prose-indigo max-w-none">
                        <p className="text-indigo-800 whitespace-pre-line">{currentMessage.content}</p>
                        
                        {currentMessage.attachments && currentMessage.attachments.length > 0 && (
                          <div className="mt-6">
                            <p className="text-sm font-medium text-indigo-900 mb-2">Attachments ({currentMessage.attachments.length})</p>
                            <div className="grid grid-cols-2 gap-2">
                              {currentMessage.attachments.map((attachment: any, index: number) => (
                                <div key={index} className="p-2 border border-indigo-100 rounded-md bg-white bg-opacity-50">
                                  <p className="text-xs font-medium text-indigo-700 truncate">{attachment.name}</p>
                                  <p className="text-xs text-indigo-500">{attachment.size}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 border-t border-indigo-100">
                      <Button className="w-full glass-button">
                        Reply to Message
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <Mail className="h-16 w-16 text-indigo-200 mb-4" />
                    <p className="text-indigo-700 font-medium">Select a message to view</p>
                    <p className="text-xs text-indigo-500 mt-1">Choose a message from the list to view its contents</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessagesTab;
