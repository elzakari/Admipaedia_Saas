import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Send, Paperclip, X } from "lucide-react";

interface ComposeMessageProps {
  onClose: () => void;
  onSend: (message: any) => void;
}

const ComposeMessage = ({ onClose, onSend }: ComposeMessageProps) => {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const recipientOptions = [
    { value: "principal", label: "Principal Adams" },
    { value: "vp_academics", label: "Vice Principal (Academics)" },
    { value: "vp_admin", label: "Vice Principal (Administration)" },
    { value: "accounts", label: "Accounts Department" },
    { value: "admin", label: "Administrative Office" },
    { value: "it", label: "IT Support" },
  ];

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    
    // Create message object
    const newMessage = {
      id: `M${Date.now()}`,
      to: recipient,
      subject,
      content: message,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: attachments.map(file => ({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type
      })),
      sent: true
    };
    
    // Simulate sending message
    setTimeout(() => {
      setIsSending(false);
      onSend(newMessage);
      onClose();
    }, 1500);
  };

  return (
    <Card className="glass-card overflow-hidden border border-indigo-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-indigo-900">Compose New Message</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">To</label>
            <Select value={recipient} onValueChange={setRecipient} required>
              <SelectTrigger className="glass-button-outline">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {recipientOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Subject</label>
            <Input 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="Enter message subject"
              className="glass-button-outline"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Message</label>
            <Textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Type your message here..."
              className="glass-button-outline min-h-[200px]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Attachments (Optional)</label>
            <div className="flex items-center">
              <label className="flex items-center px-4 py-2 bg-white bg-opacity-50 text-indigo-700 rounded-md border border-indigo-200 cursor-pointer hover:bg-indigo-50">
                <Paperclip className="h-4 w-4 mr-2" />
                <span>Add Files</span>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={handleAttachmentChange} 
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white bg-opacity-50 rounded-md">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-indigo-100 rounded-md flex items-center justify-center mr-2">
                        <span className="text-xs text-indigo-700">{file.name.split('.').pop()?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-900 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-indigo-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeAttachment(index)}
                      className="h-6 w-6 text-indigo-700 hover:text-indigo-900"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="glass-button-outline"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="glass-button" 
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ComposeMessage;