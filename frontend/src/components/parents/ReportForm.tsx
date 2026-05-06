import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";
import { Paperclip, Send, X } from "lucide-react";

interface ReportFormProps {
  currentChild: any;
  onClose: () => void;
}

const ReportForm = ({ currentChild, onClose }: ReportFormProps) => {
  const [reportType, setReportType] = useState("");
  const [priority, setPriority] = useState("medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const reportTypes = [
    { value: "academic", label: "Academic Issue" },
    { value: "behavior", label: "Behavioral Concern" },
    { value: "facility", label: "Facility Problem" },
    { value: "bullying", label: "Bullying Incident" },
    { value: "suggestion", label: "Suggestion" },
    { value: "other", label: "Other" },
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
    setIsSubmitting(true);
    
    // Simulate submitting report
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setReportType("");
        setPriority("medium");
        setSubject("");
        setDescription("");
        setAttachments([]);
        setIsSubmitted(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <Card className="glass-card overflow-hidden border border-indigo-100">
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px]">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-indigo-900 mb-2">Report Submitted!</h3>
          <p className="text-indigo-700 text-center mb-6">Your report has been submitted successfully. We will review it shortly.</p>
          <Button onClick={onClose} className="glass-button">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden border border-indigo-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-indigo-900">Submit a Report</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Student</label>
            <div className="p-3 bg-white bg-opacity-50 rounded-md flex items-center">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                {currentChild.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-indigo-900">{currentChild.name}</p>
                <p className="text-xs text-indigo-700">Class {currentChild.class} • ID: {currentChild.studentId || currentChild.admissionNumber}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Report Type</label>
            <Select value={reportType} onValueChange={setReportType} required>
              <SelectTrigger className="glass-button-outline">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Priority</label>
            <RadioGroup value={priority} onValueChange={setPriority} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="text-indigo-700">Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-indigo-700">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="text-indigo-700">High</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Subject</label>
            <Input 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="Enter report subject"
              className="glass-button-outline"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Description</label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Provide details about your report..."
              className="glass-button-outline min-h-[150px]"
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReportForm;