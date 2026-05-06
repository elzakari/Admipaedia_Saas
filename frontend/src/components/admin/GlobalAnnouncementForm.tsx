import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../ui/use-toast";
import { announcementService } from "../../services";

export function GlobalAnnouncementForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    target_roles: 'all', // all, students, teachers, parents
    send_notification: true,
    send_email: false
  });
  
  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: (data: any) => announcementService.createGlobalAnnouncement(data),
    onSuccess: () => {
      // Reset form
      setAnnouncementForm({
        title: '',
        content: '',
        target_roles: 'all',
        send_notification: true,
        send_email: false
      });
      
      // Show success message
      toast({
        title: "Announcement Created",
        description: "Your announcement has been broadcast successfully.",
        variant: "default",
        id: ''
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive",
        id: ''
      });
    }
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAnnouncementForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setAnnouncementForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setAnnouncementForm(prev => ({ ...prev, [name]: checked }));
  };
  
  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAnnouncementMutation.mutate(announcementForm);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast Announcement</CardTitle>
        <CardDescription>
          Create a new announcement to broadcast to the entire school or specific roles.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              name="title"
              value={announcementForm.title}
              onChange={handleInputChange}
              placeholder="Enter announcement title" 
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea 
              id="content" 
              name="content"
              value={announcementForm.content}
              onChange={handleInputChange}
              placeholder="Enter announcement content" 
              rows={5} 
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select 
              value={announcementForm.target_roles}
              onValueChange={(value) => handleSelectChange('target_roles', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="students">Students Only</SelectItem>
                <SelectItem value="teachers">Teachers Only</SelectItem>
                <SelectItem value="parents">Parents Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="send_notification" 
              checked={announcementForm.send_notification}
              onCheckedChange={(checked) => 
                handleCheckboxChange('send_notification', checked as boolean)
              }
            />
            <Label htmlFor="send_notification">Send as notification</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="send_email" 
              checked={announcementForm.send_email}
              onCheckedChange={(checked) => 
                handleCheckboxChange('send_email', checked as boolean)
              }
            />
            <Label htmlFor="send_email">Also send as email</Label>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            disabled={createAnnouncementMutation.isPending}
          >
            {createAnnouncementMutation.isPending ? "Sending..." : "Broadcast Announcement"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}